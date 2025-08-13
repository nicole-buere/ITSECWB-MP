const { supabase } = require('../model/database');
const bcrypt = require("bcrypt");

const PASSWORD_HISTORY_LIMIT = 3; // block reuse of the last N passwords
const BCRYPT_ROUNDS = 12;
const MS_24H = 24 * 60 * 60 * 1000; // 24h in ms

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Missing fields' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters!' });
    }
    if (!req.session?.username) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // 1) Load user (need id, current hash, and timestamps)
    const { data: user, error: findErr } = await supabase
      .from('users')
      .select('id, username, password, password_changed_at, created_at')
      .eq('username', req.session.username)
      .single();
    if (findErr || !user) return res.status(401).json({ message: 'User not found' });

    // 2) Verify current password
    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) return res.status(400).json({ message: 'Current password is incorrect' });

    // 3) Enforce minimum password age (24h since last change or creation)
    const lastChangedAt = user.password_changed_at || user.created_at;
    if (lastChangedAt) {
      const now = Date.now();
      const last = new Date(lastChangedAt).getTime();
      const msLeft = (last + MS_24H) - now;
      if (msLeft > 0) {
        const hoursLeft = Math.ceil(msLeft / 3600000);
        return res.status(429).json({ message: `Password was changed recently. Try again in ${hoursLeft} hour(s).` });
      }
    }

    // 4) Block reuse of current password
    if (await bcrypt.compare(newPassword, user.password)) {
      return res.status(400).json({ message: 'New password must be different from the current password' });
    }

    // 5) Block reuse of last N history hashes
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

    // 6) Hash new password
    const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    // 7) Rotate: save old hash into history
    const { error: histInsErr } = await supabase
      .from('user_password_history')
      .insert([{ user_id: user.id, username: user.username, hash: user.password }]);
    if (histInsErr) return res.status(500).json({ message: 'Could not update password history' });

    // 8) Update user password + bump password_changed_at
    const { data: updated, error: updErr } = await supabase
      .from('users')
      .update({ password: newHash, password_changed_at: new Date().toISOString() })
      .eq('id', user.id)
      .select('password')
      .single();
    if (updErr) return res.status(500).json({ message: 'Could not update password' });

    // 8b) Verify persisted
    const matches = await bcrypt.compare(newPassword, updated.password);
    if (!matches) return res.status(500).json({ message: 'Password update did not persist' });

    // 9) Trim history to last N
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


exports.registerUser = async (req, res) => {
    try {
        const { name, email, username, password, confirmPassword, role } = req.body;

        // Debugging
        console.log("password ", password);
        console.log("confirmPassword", confirmPassword);

        // Check if the username already exists
        const { data: existingUser, error: findError } = await supabase
            .from('users')
            .select('username')
            .eq('username', username)
            .single();

        if (findError && findError.code !== 'PGRST116') { // PGRST116 is "not found" error
            console.error("Error checking existing user:", findError);
            return res.status(500).json({ message: "Database error" });
        }

        if (existingUser) {
            res.status(400).json({ message: "Username is already taken!" });
            return;
        }

        // Check if password meets minimum length (8)
        if (password.length < 8) {
            res.status(400).json({ message: "Password must be at least 8 characters!" });
            return;
        }

        // Check if 'Password' and 'Confirm Password' fields match
        if (password !== confirmPassword) {
            res.status(400).json({ message: "Passwords do not match!" });
            return;
        }

        // Hash the password before storing it in the database
        const saltRounds = 10;
        const hash = await bcrypt.hash(password, saltRounds);

        // Create a new user
        const newUser = {
            name,
            email,
            username,
            password: hash,
            role: role || 'student',
            description: '',
            profilePicture: 'https://www.redditstatic.com/avatars/avatar_default_02_4856A3.png',
        };

        // Save the new user to the database
        const { error: insertError } = await supabase
            .from('users')
            .insert([newUser]);

        if (insertError) {
            console.error("Error inserting user:", insertError);
            return res.status(500).json({ message: "Error creating user" });
        }

        res.status(201).json({ message: "User created" });
    } catch (e) {
        console.error("Error in registerUser:", e);
        res.status(500).json({ message: e.message });
    }
};

exports.loginUser = async (req, res) => {
    try {
        const { username, password } = req.body;

        // Find user in Supabase
        const { data: user, error: findError } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .single();

        if (findError) {
            console.error("Error finding user:", findError);
            return res.status(401).json({ message: "Invalid Username/Password" });
        }

        if (!user) {
            return res.status(401).json({ message: "Invalid Username/Password" });
        }

        // Debugging 
        console.log ("Inputted Password: ", password)
        console.log ("Stored Password: ", user.password)

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (isPasswordValid) {
            // Create or update the session
            req.session = req.session || {};
            req.session.authenticated = true;
            req.session.username = username;
            // after setting authenticated + username
            req.session.user = { id: user.id, username: user.username, role: user.role || 'student' };


            if (user.role === 'admin') {
                req.session.admin = true;
            }
            return res.status(200).json(req.session);
        } else {
            return res.status(401).json({ message: "Invalid Username/Password" });
        }
    } catch (e) {
        console.error(e);
        return res.status(500).json({ message: "Internal server error" });
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
            console.error("Error fetching user:", error);
            return res.status(500).json({ message: "Error fetching user" });
        }

        res.status(200).json(user);
    } catch (e) {
        console.error("Error in getUser:", e);
        res.status(500).json({ message: e.message });
    }
};




exports.editDescription = async (req, res) => {
    try {
        const { error } = await supabase
            .from('users')
            .update({ description: req.body.description })
            .eq('username', req.session.username);

        if (error) {
            console.error("Error updating description:", error);
            return res.status(500).json({ message: "Error updating description" });
        }

        res.status(200).json({ message: "Description updated" });
    } catch (e) {
        console.error("Error in editDescription:", e);
        res.status(500).json({ message: e.message });
    }
}

exports.editPFP = async (req, res) => {
    try {
        const { error } = await supabase
            .from('users')
            .update({ pictureURL: req.body.pictureURL })
            .eq('username', req.session.username);

        if (error) {
            console.error("Error updating profile picture:", error);
            return res.status(500).json({ message: "Error updating profile picture" });
        }

        res.status(200).json({ message: "Profile Picture updated" });
    } catch (e) {
        console.error("Error in editPFP:", e);
        res.status(500).json({ message: e.message });
    }
}     

exports.deleteUser = async (req, res) => {
    try {
        const { error } = await supabase
            .from('users')
            .delete()
            .eq('username', req.session.username);
        
        if (error) {
            console.error("Error deleting user:", error);
            return res.status(500).json({ message: "Error deleting user" });
        }
        
        // End the session
        req.session.destroy((err) => {
            if (err) {
                console.error("Error destroying session:", err);
                res.status(500).json({ message: "Internal server error" });
            } else {
                res.status(200).json({ message: "User deleted" });
            }
        });
    } catch (e) {
        console.error("Error in deleteUser:", e);
        res.status(500).json({ message: e.message });
    }
}

exports.logoutUser = async (req, res) => {
    try {
        // End the session
        req.session.destroy((err) => {
            if (err) {
                console.error("Error destroying session:", err);
                res.status(500).json({ message: "Internal server error" });
            } else {
                res.status(200).json({ message: "Logged out" });
            }
        });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
}

