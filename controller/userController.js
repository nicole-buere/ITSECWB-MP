const { supabase } = require('../model/database');
const bcrypt = require("bcrypt");
const crypto = require('crypto');
const APP_BASE_URL = process.env.APP_BASE_URL || ''; // optional override for links


const { hashAnswer, verifyAnswer } = require('../utils/kba');

const PASSWORD_HISTORY_LIMIT = 3; // block reuse of the last N passwords
const BCRYPT_ROUNDS = 12;
const MS_24H = 24 * 60 * 60 * 1000; // 24h in ms

const MAX_FAILED_BEFORE_LOCK = 5; // Threshold before exponential lockout
const BASE_LOCK_SECONDS = 2;      // Base seconds for exponential backoff

const RESET_TOKEN_TTL_MIN = 15; // Token validity in minutes
const RESET_TOKEN_PEPPER = process.env.RESET_TOKEN_PEPPER || 'change-me-in-prod'; 
const COMPLEXITY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@#$%^&+=]).{8,}$/;

const nodemailer = require('nodemailer');
const { sendMail } = require('../utils/mailer');
const mailer = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: Number(process.env.SMTP_PORT) === 465, // true for 465
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});


function hashToken(token) {
  return crypto.createHmac('sha256', RESET_TOKEN_PEPPER)
               .update(token)
               .digest('hex');
}

// GET /api/users/kba/questions
exports.listKbaQuestions = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('security_questions')
      .select('id, prompt, min_answer_len')
      .order('id', { ascending: true });

    if (error) throw error;

    // Fallback pool if table is empty
    const fallback = [
      { id: 101, prompt: 'What is a nickname only one family member used for you?', min_answer_len: 12 },
      { id: 102, prompt: 'What non-obvious object was in your bedroom growing up?', min_answer_len: 10 },
      { id: 103, prompt: 'Exact name of a place you regularly visited as a child (not school/home)?', min_answer_len: 12 },
      { id: 104, prompt: 'A line from a lullaby/poem a family member used to say (write it exactly).', min_answer_len: 16 },
      { id: 105, prompt: 'Make and color of a bicycle/toy you used the most?', min_answer_len: 10 },
      { id: 106, prompt: 'What unusual snack or combo did you love as a kid?', min_answer_len: 10 },
      { id: 107, prompt: 'Title of a book you owned (not school/library) in elementary school?', min_answer_len: 10 },
      { id: 108, prompt: 'Color/pattern of a blanket you used in childhood?', min_answer_len: 10 },
      { id: 109, prompt: 'A family saying or phrase you remember (exact wording).', min_answer_len: 16 },
    ];

    return res.json((data && data.length) ? data : fallback);
  } catch (e) {
    console.error('listKbaQuestions error:', e);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/users/kba/me   -> returns whether user already enrolled
// GET /api/users/kba/me
exports.getMyKbaStatus = async (req, res) => {
  try {
    const userId = req.session?.user?.id;
    if (!userId) return res.status(401).json({ message: 'Not authenticated' });

    const { data, count, error } = await supabase
      .from('user_security_answers')
      .select('question_id', { count: 'exact' })
      .eq('user_id', userId);

    if (error) throw error;

    const total = typeof count === 'number' ? count : (data?.length || 0);
    return res.json({ enrolled: total >= 2, count: total });
  } catch (e) {
    console.error('getMyKbaStatus error:', e);
    return res.status(500).json({ message: 'Internal server error' });
  }
};


// POST /api/users/kba/enroll
// Body: { answers: [{question_id, answer}, ...] }  // or { passphrase }
// POST /api/users/kba/enroll
exports.enrollKba = async (req, res) => {
  try {
    const userId = req.session?.user?.id;
    if (!userId) return res.status(401).json({ message: 'Not authenticated' });

    const { answers, passphrase } = req.body || {};

    // Option A: recovery passphrase
    if (passphrase) {
      if (passphrase.trim().length < 20) {
        return res.status(400).json({ message: 'Passphrase must be at least 20 characters.' });
      }
      const hash = await hashAnswer(passphrase);
      await supabase
        .from('user_security_answers')
        .upsert([{ user_id: userId, question_id: -1, answer_hash: hash }], { onConflict: 'user_id,question_id' });
      return res.status(200).json({ message: 'Recovery passphrase saved.' });
    }

    // Option B: 3 questions
    if (!Array.isArray(answers) || answers.length !== 3) {
      return res.status(400).json({ message: 'Please provide answers to exactly 3 questions.' });
    }

    // IDs must be unique
    const ids = answers.map(a => +a?.question_id || 0);
    if (ids.some(id => !id) || new Set(ids).size !== 3) {
      return res.status(400).json({ message: 'Choose 3 different valid questions.' });
    }

    // Pull min lengths from DB (fallback to 10 if not found)
    const { data: qs, error: qErr } = await supabase
      .from('security_questions')
      .select('id, min_answer_len')
      .in('id', ids);
    if (qErr) throw qErr;

    const minMap = Object.fromEntries((qs || []).map(q => [q.id, q.min_answer_len || 10]));
    for (let i = 0; i < answers.length; i++) {
      const a = (answers[i].answer || '').trim();
      const min = minMap[ids[i]] ?? 10;
      if (a.length < min) {
        return res.status(400).json({ message: `Answer ${i + 1} must be at least ${min} characters.` });
      }
    }

    // Hash & save
    const rows = [];
    for (let i = 0; i < answers.length; i++) {
      const hash = await hashAnswer(answers[i].answer);
      rows.push({ user_id: userId, question_id: ids[i], answer_hash: hash });
    }

    // Replace prior answers
    await supabase.from('user_security_answers').delete().eq('user_id', userId);
    const { error } = await supabase.from('user_security_answers').insert(rows);
    if (error) throw error;

    return res.status(200).json({ message: 'Security answers saved.' });
  } catch (e) {
    console.error('enrollKba error:', e);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
exports.getKbaQuestionForToken = async (req, res) => {
  try {
    const { token } = req.query || {};
    if (!token) return res.status(400).json({ message: 'Missing token' });

    const tokenHash = crypto.createHmac('sha256', RESET_TOKEN_PEPPER).update(token).digest('hex');

    const { data: rows } = await supabase
      .from('password_reset_tokens')
      .select('user_id, expires_at, consumed_at')
      .eq('token_hash', tokenHash)
      .limit(1);

    if (!rows || !rows.length) return res.status(404).json({ message: 'Invalid token' });
    const row = rows[0];
    if (row.consumed_at || new Date(row.expires_at).getTime() < Date.now()) {
      return res.status(404).json({ message: 'Invalid token' });
    }

    // Does this user have any KBA?
    const { data: kba } = await supabase
      .from('user_security_answers')
      .select('question_id')
      .eq('user_id', row.user_id);

    if (!kba || !kba.length) return res.status(204).end(); // no KBA set

    // Pick one at random and return the prompt
    const picked = kba[Math.floor(Math.random() * kba.length)];
    const { data: q } = await supabase
      .from('security_questions')
      .select('prompt')
      .eq('id', picked.question_id)
      .single();

    return res.json({ question_id: picked.question_id, prompt: q?.prompt || 'Answer your security question.' });
  } catch (e) {
    console.error('getKbaQuestionForToken error:', e);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/users/forgot-password
exports.requestPasswordReset = async (req, res) => {
  try {
    const { emailOrUsername } = req.body || {};
    if (!emailOrUsername) {
      return res.status(400).json({ message: 'Missing field' });
    }

    // Find by email OR username (do NOT leak whether user exists)
    const { data: user } = await supabase
      .from('users')
      .select('id, email, username') // include username for email body
      .or(`email.eq.${emailOrUsername},username.eq.${emailOrUsername}`)
      .single();

    // Always respond 200 (avoid enumeration)
    if (!user) {
      return res.status(200).json({ message: 'If an account exists, a reset link has been sent.' });
    }

    // Revoke any older unconsumed tokens for this user
    await supabase
      .from('password_reset_tokens')
      .delete()
      .eq('user_id', user.id)
      .is('consumed_at', null);

    // Create a new single-use token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken); // uses your helper/pepper
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MIN * 60 * 1000).toISOString();

    const { error: insErr } = await supabase
      .from('password_reset_tokens')
      .insert([{ user_id: user.id, token_hash: tokenHash, expires_at: expiresAt }]);

    if (insErr) {
      console.error('reset token insert error:', insErr);
      return res.status(500).json({ message: 'Could not start reset.' });
    }

    // Build link & send email
    const base = APP_BASE_URL || `${req.protocol}://${req.get('host')}`;
    const resetLink = `${base}/reset-password?token=${rawToken}`;

    try {
    await sendMail({
    to: user.email,
    subject: 'Reset your Labyrinth password',
    html: `
        <p>Hello ${user.username || ''},</p>
        <p>Click below to reset your password (valid ${RESET_TOKEN_TTL_MIN} minutes):</p>
        <p><a href="${resetLink}">Reset Password</a></p>
        <p style="font-size:12px;color:#666">Or copy: ${resetLink}</p>
    `,
    });

    } catch (e) {
      console.error('Email send failed:', e);
      // Still return generic success to avoid user enumeration
    }

    return res.status(200).json({ message: 'If an account exists, a reset link has been sent.' });
  } catch (e) {
    console.error('requestPasswordReset error:', e);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/users/reset-password
// POST /api/users/reset-password
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword, kbaAnswer, question_id } = req.body || {};
    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Missing fields' });
    }

    // Enforce password complexity (same regex as register/change)
    if (!COMPLEXITY.test(newPassword)) {
      return res.status(400).json({
        message: 'Password must be ≥8 chars and include uppercase, lowercase, a number, and a symbol (@#$%^&+=).'
      });
    }

    // Look up token
    const tokenHash = hashToken(token);
    const { data: tokens, error: findTokErr } = await supabase
      .from('password_reset_tokens')
      .select('id, user_id, expires_at, consumed_at')
      .eq('token_hash', tokenHash)
      .is('consumed_at', null)
      .limit(1);

    if (findTokErr || !tokens || tokens.length === 0) {
      return res.status(400).json({ message: 'Invalid or used token.' });
    }

    const tok = tokens[0];
    if (new Date(tok.expires_at).getTime() < Date.now()) {
      return res.status(400).json({ message: 'Token expired.' });
    }

    // Load user and current hash/timestamps
    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('id, username, password, password_changed_at, created_at')
      .eq('id', tok.user_id)
      .single();

    if (userErr || !user) {
      return res.status(400).json({ message: 'Invalid token.' });
    }

    // Prevent reuse: current hash
    if (await bcrypt.compare(newPassword, user.password)) {
      return res.status(400).json({ message: 'New password must differ from current.' });
    }

    // Prevent reuse: last N hashes
    const { data: history, error: histReadErr } = await supabase
      .from('user_password_history')
      .select('hash')
      .eq('user_id', user.id)
      .order('changed_at', { ascending: false })
      .limit(PASSWORD_HISTORY_LIMIT);

    if (histReadErr) {
      return res.status(500).json({ message: 'Could not read password history.' });
    }
    for (const h of history || []) {
      if (await bcrypt.compare(newPassword, h.hash)) {
        return res.status(400).json({ message: 'Password was used recently. Pick a different one.' });
      }
    }

    // --- KBA CHECK (if the user has KBA enrolled) ---
    const { data: kbaList } = await supabase
      .from('user_security_answers')
      .select('question_id, answer_hash')
      .eq('user_id', user.id);

    if (kbaList && kbaList.length > 0) {
      if (!kbaAnswer || !question_id) {
        return res.status(400).json({ message: 'Security answer required.' });
      }
      const entry = (kbaList || []).find(x => x.question_id === Number(question_id));
      if (!entry) {
        return res.status(400).json({ message: 'Security question mismatch.' });
      }
      const ok = await verifyAnswer(kbaAnswer, entry.answer_hash);
      if (!ok) {
        return res.status(401).json({ message: 'Security check failed.' });
      }
    }
    // -------------------------------------------------

    // Hash new password AFTER all checks pass
    const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    // Rotate history: store old hash
    const { error: histInsErr } = await supabase
      .from('user_password_history')
      .insert([{ user_id: user.id, username: user.username, hash: user.password }]);
    if (histInsErr) {
      return res.status(500).json({ message: 'Could not update password history.' });
    }

    // Update password + timestamp
    const { error: updErr } = await supabase
      .from('users')
      .update({ password: newHash, password_changed_at: new Date().toISOString() })
      .eq('id', user.id);

    if (updErr) {
      return res.status(500).json({ message: 'Could not update password.' });
    }

    // Consume this and any other open tokens for the user (so only one reset works)
    await supabase
      .from('password_reset_tokens')
      .update({ consumed_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('consumed_at', null);

    // Trim history beyond N
    const { data: allRows } = await supabase
      .from('user_password_history')
      .select('id')
      .eq('user_id', user.id)
      .order('changed_at', { ascending: false });

    if (allRows && allRows.length > PASSWORD_HISTORY_LIMIT) {
      const extraIds = allRows.slice(PASSWORD_HISTORY_LIMIT).map(r => r.id);
      await supabase.from('user_password_history').delete().in('id', extraIds);
    }

    await logActivity(user.id, 'Reset password via email link', req.ip);
    return res.status(200).json({ message: 'Password has been reset.' });
  } catch (e) {
    console.error('resetPassword error:', e);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Simple activity logger (non-blocking)
async function logActivity(userId, activity, ip) {
  try {
    if (!userId) return; // safety
    const text = ip ? `${activity} (ip: ${ip})` : activity;
    const { error } = await supabase
      .from('activity_logs')
      .insert([{ activity: text, activity_done_by: userId }]);
    if (error) console.warn('activity_logs insert error:', error);
  } catch (e) {
    console.warn('activity_logs unexpected error:', e);
  }
}



/// Helper function for logging logins and lockout mechanism
// Lockout mechanism is based on Amazon Cognito's exponential lockouts
async function logLoginAttempt(username, ip, success) {
    try {
        const now = new Date();

        // Check if username exists in users table
        const { data: user } = await supabase
            .from('users')
            .select('id')
            .eq('username', username)
            .single();

        const userID = user ? user.id : null;

        // Fetch current log row
        const { data: log } = await supabase
            .from('login_attempts_logs')
            .select('*')
            .eq('username', username)
            .single();

        if (success) {
            // Reset on successful login
            await supabase
                .from('login_attempts_logs')
                .upsert({
                    username,
                    userID,              
                    attemptNum: 0,
                    ip_address: ip,
                    attemptedAt: now,
                    status: true,
                    lockedUntil: null
                }, { onConflict: ['username'] });
            return;
        }

        // Failed Logins
        let newAttemptNum = 1;

        if (log) {
            // If account is locked, ignore any login attemmpts (do not increment) but update timestamp and ip
            if (log.lockedUntil && new Date(log.lockedUntil) > now) {
                await supabase
                    .from('login_attempts_logs')
                    .update({ attemptedAt: now, ip_address: ip })
                    .eq('username', username);
                return;
            }
            newAttemptNum = (log.attemptNum || 0) + 1;
        }

        // Calculate exponential lockout duration
        // lockSeconds = 2^(attemptsOverThreshold) * BASE_LOCK_SECONDS or 2^(n-5) seconds
        let lockedUntil = null;
        if (newAttemptNum > MAX_FAILED_BEFORE_LOCK) {
            const exponent = newAttemptNum - MAX_FAILED_BEFORE_LOCK;
            const lockSeconds = Math.pow(2, exponent) * BASE_LOCK_SECONDS;
            lockedUntil = new Date(now.getTime() + lockSeconds * 1000);
        }

        // Updates log row
        const updateData = {
            attemptNum: newAttemptNum,
            ip_address: ip,
            attemptedAt: now,
            status: false,
            lockedUntil,
            userID
        };

        if (log) {
            await supabase
                .from('login_attempts_logs')
                .update(updateData)
                .eq('username', username);
        } else {
            await supabase
                .from('login_attempts_logs')
                .insert([{ username, ...updateData }]);
        }

    } catch (err) {
        console.error("Unexpected error in logLoginAttempt:", err);
    }
}

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
    await logActivity(user.id, 'Changed password', req.ip);
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

        // Checks if password meets character requirements
        if (!/[A-Z]/.test(password)) {
            res.status(400).json({ message: "Password must have at least 1 uppercase character!" });
        }

        if (!/[a-z]/.test(password)) {
            res.status(400).json({ message: "Password must have at least 1 lowercase character" });
        }

        if (!/\d/.test(password)) {
            res.status(400).json({ message: "Password must have at least 1 numerical character!" });
        }

        if (!/[@#$%^&+=]/.test(password)) {
            res.status(400).json({ message: "Password must have at least 1 special character!" });
        }

        // Checks if 'Password' and 'Confirm Password' fields match
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
        const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

        // Find user in Supabase
        const { data: user, error: findError } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .single();
        
        if (findError || !user) {
            console.error("Error finding user:", findError);
            await logLoginAttempt(username, ipAddress, false);
            return res.status(401).json({ message: "Invalid credentials!" });
        }

        // Retrive row of corresponding username attempting to login
        const { data: log } = await supabase
            .from('login_attempts_logs')
            .select('*')
            .eq('username', username)
            .single();
        
        // Displays lockout timer
        if (log && log.lockedUntil && new Date(log.lockedUntil) > new Date()) {
            return res.status(403).json({
                message: `Account temporarily locked. Try again after ${new Date(log.lockedUntil).toLocaleTimeString()}`
            });
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

            await logLoginAttempt(username, ipAddress, true);
            // after setting authenticated + username
            req.session.user = { id: user.id, username: user.username, role: user.role || 'student' };


            if (user.role === 'admin') {
                req.session.admin = true;
            }
            return res.status(200).json(req.session);
        } else {
            await logLoginAttempt(username, ipAddress, false);
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
            .update({ profilePicture: req.body.pictureURL })
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

