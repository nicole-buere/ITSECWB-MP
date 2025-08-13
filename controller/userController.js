// controller/userController.js
const { supabase } = require('../model/database');
const bcrypt = require('bcrypt');
const { randomUUID } = require('crypto');

const PASSWORD_HISTORY_LIMIT = 3; // block reuse of the last N passwords
const BCRYPT_ROUNDS = 12;
const MS_24H = 24 * 60 * 60 * 1000;

/**
 * Change password: verify current, enforce min age (24h), block reuse of last N,
 * rotate history, update password + password_changed_at, trim history.
 */
// AFTER your existing imports and constants…

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ message: 'Missing fields' });
    if (newPassword.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters!' });
    if (!req.session?.username) return res.status(401).json({ message: 'Not authenticated' });

    // 1) Load user
    const { data: user, error: findErr } = await supabase
      .from('users')
      .select('id, username, password, password_changed_at, created_at')
      .eq('username', req.session.username)
      .single();
    if (findErr || !user) return res.status(401).json({ message: 'User not found' });

    // 2) Verify current
    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) return res.status(400).json({ message: 'Current password is incorrect' });

    // 3) Enforce min age (24h)
    const lastChangedAt = user.password_changed_at || user.created_at;
    if (lastChangedAt) {
      const now = Date.now();
      const last = new Date(lastChangedAt).getTime();
      const msLeft = (last + MS_24H) - now;

      // 👇 Add this log temporarily
      console.log('PW AGE DEBUG', {
        username: user.username,
        password_changed_at: user.password_changed_at,
        created_at: user.created_at,
        hoursSinceLast: (now - last) / 3600000,
        msLeft
      });

      if (msLeft > 0) {
        const hoursLeft = Math.ceil(msLeft / 3600000);
        return res.status(429).json({ message: `Password was changed recently. Try again in ${hoursLeft} hour(s).` });
      }
    }

    // 4) Block same-as-current
    if (await bcrypt.compare(newPassword, user.password)) {
      return res.status(400).json({ message: 'New password must be different from the current password' });
    }

    // 5) Block reuse of last N
    const { data: history, error: histErr } = await supabase
      .from('user_password_history')
      .select('hash')
      .eq('user_id', user.id)
      .order('changed_at', { ascending: false })
      .limit(PASSWORD_HISTORY_LIMIT);
    if (histErr) return res.status(500).json({ message: 'Database error (history)' });

    for (const row of history || []) {
      if (await bcrypt.compare(newPassword, row.hash)) {
        return res.status(400).json({ message: 'New password was used recently. Choose a different one.' });
      }
    }

    // 6) Hash new
    const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    // 7) Rotate old into history
    const { error: histInsErr } = await supabase
      .from('user_password_history')
      .insert([{ user_id: user.id, username: user.username, hash: user.password }]);
    if (histInsErr) return res.status(500).json({ message: 'Could not update password history' });

    // 8) Update user AND RETURN the updated row
    const { data: updated, error: updErr } = await supabase
      .from('users')
      .update({ password: newHash, password_changed_at: new Date().toISOString() })
      .eq('id', user.id)
      .select('id, password, password_changed_at')
      .single();
    if (updErr) return res.status(500).json({ message: 'Could not update password' });

    // 8b) Verify the new password actually matches the updated hash
    const matches = await bcrypt.compare(newPassword, updated.password);
    if (!matches) {
      console.error('Password update discrepancy: updated row does not match supplied new password', {
        userId: user.id, username: user.username
      });
      return res.status(500).json({ message: 'Password update did not persist' });
    }

    // 9) Trim history
    const { data: allRows } = await supabase
      .from('user_password_history')
      .select('id')
      .eq('user_id', user.id)
      .order('changed_at', { ascending: false });

    if (allRows && allRows.length > PASSWORD_HISTORY_LIMIT) {
      const extraIds = allRows.slice(PASSWORD_HISTORY_LIMIT).map(r => r.id);
      await supabase.from('user_password_history').delete().in('id', extraIds);
    }

    return res.status(200).json({ message: 'Password changed successfully' });
  } catch (e) {
    console.error('changePassword error:', e);
    return res.status(500).json({ message: 'Internal server error' });
  }
};


/**
 * Register user: splits `name` into first/last, generates UUID id (remove if DB default),
 * hashes password, initializes password_changed_at.
 */
exports.registerUser = async (req, res) => {
  try {
    const { name, email, username, password, confirmPassword, role } = req.body;

    const allowedRoles = ['student', 'labtech'];
    const safeRole = allowedRoles.includes((role || '').toLowerCase())
      ? role.toLowerCase()
      : 'student';

    // Normalize
    const normEmail = (email || '').trim().toLowerCase();
    const normUsername = (username || '').trim();

    // Email domain enforce
    if (!normEmail.endsWith('@dlsu.edu.ph')) {
      return res.status(400).json({ message: 'Email must be a valid @dlsu.edu.ph address' });
    }

    // Username uniqueness
    const { data: existingUser, error: findUserErr } = await supabase
      .from('users').select('username').eq('username', normUsername).maybeSingle();
    if (existingUser) return res.status(400).json({ message: 'Username is already taken!' });
    if (findUserErr && findUserErr.code && findUserErr.code !== 'PGRST116') {
      console.error('Error checking existing user:', findUserErr);
      return res.status(500).json({ message: 'Database error' });
    }

    // (Optional) Email uniqueness
    const { data: existingEmail } = await supabase
      .from('users').select('email').eq('email', normEmail).maybeSingle();
    if (existingEmail) return res.status(400).json({ message: 'Email is already in use!' });

    // Password checks
    if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters!' });
    if (password !== confirmPassword) return res.status(400).json({ message: 'Passwords do not match!' });

    // Hash
    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Split name
    let first_name = null, last_name = null;
    if (name && name.trim()) {
      const parts = name.trim().split(/\s+/);
      first_name = parts.shift();
      last_name = parts.length ? parts.join(' ') : null;
    }

    const newUser = {
      // remove if DB has DEFAULT gen_random_uuid()
      id: randomUUID(),
      first_name,
      last_name,
      email: normEmail,
      username: normUsername,
      password: hash,
      role: safeRole,
      status: 'active',
      description: '',
      profilePicture: 'https://www.redditstatic.com/avatars/avatar_default_02_4856A3.png',
      password_changed_at: new Date().toISOString(),
    };

    const { error: insertError } = await supabase.from('users').insert([newUser]);
    if (insertError) {
      console.error('Error inserting user:', insertError);
      return res.status(500).json({ message: 'Error creating user' });
    }

    return res.status(201).json({ message: 'User created' });
  } catch (e) {
    console.error('Error in registerUser:', e);
    return res.status(500).json({ message: e.message });
  }
};


exports.loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;

    const { data: user, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (findError || !user) {
      return res.status(401).json({ message: 'Invalid Username/Password' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid Username/Password' });
    }

    req.session = req.session || {};
    // (nice-to-have) rotate session id
    if (typeof req.session.regenerate === 'function') {
    await new Promise((res, rej) => req.session.regenerate(err => err ? rej(err) : res()));
    }
    req.session.authenticated = true;
    req.session.username = username;
    req.session.user = { username, role: user.role || 'student' }; // 'student' | 'labtech' | 'admin'
    if (user.role === 'admin') req.session.admin = true; // optional legacy flag

    return res.status(200).json(req.session);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getUser = async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', req.session.username)
      .single();

    if (error) {
      console.error('Error fetching user:', error);
      return res.status(500).json({ message: 'Error fetching user' });
    }

    return res.status(200).json(user);
  } catch (e) {
    console.error('Error in getUser:', e);
    return res.status(500).json({ message: e.message });
  }
};

exports.editDescription = async (req, res) => {
  try {
    const { error } = await supabase
      .from('users')
      .update({ description: req.body.description })
      .eq('username', req.session.username);

    if (error) {
      console.error('Error updating description:', error);
      return res.status(500).json({ message: 'Error updating description' });
    }

    return res.status(200).json({ message: 'Description updated' });
  } catch (e) {
    console.error('Error in editDescription:', e);
    return res.status(500).json({ message: e.message });
  }
};

exports.editPFP = async (req, res) => {
  try {
    const { error } = await supabase
      .from('users')
      .update({ profilePicture: req.body.pictureURL }) // <-- fixed column name
      .eq('username', req.session.username);

    if (error) {
      console.error('Error updating profile picture:', error);
      return res.status(500).json({ message: 'Error updating profile picture' });
    }

    return res.status(200).json({ message: 'Profile Picture updated' });
  } catch (e) {
    console.error('Error in editPFP:', e);
    return res.status(500).json({ message: e.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('username', req.session.username);

    if (error) {
      console.error('Error deleting user:', error);
      return res.status(500).json({ message: 'Error deleting user' });
    }

    req.session.destroy((err) => {
      if (err) {
        console.error('Error destroying session:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }
      return res.status(200).json({ message: 'User deleted' });
    });
  } catch (e) {
    console.error('Error in deleteUser:', e);
    return res.status(500).json({ message: e.message });
  }
};

exports.logoutUser = async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.error('Error destroying session:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }
      return res.status(200).json({ message: 'Logged out' });
    });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};
