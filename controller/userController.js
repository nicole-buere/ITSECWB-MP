const { supabase } = require('../model/database');
const bcrypt = require("bcrypt");

const MAX_FAILED_BEFORE_LOCK = 5; // Threshold before exponential lockout
const BASE_LOCK_SECONDS = 2;      // Base seconds for exponential backoff

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

        // Hash the password before storing it in the database
        const saltRounds = 10;
        const hash = await bcrypt.hash(password, saltRounds);

        // Create a new user
        const newUser = {
            name,
            email,
            username,
            password: hash,
            role,
            description: '',
            profilePicture: 'https://www.redditstatic.com/avatars/avatar_default_02_4856A3.png',
            reservations: [],
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

            if (user.role === 'admin') {
                req.session.admin = true;
            }
            return res.status(200).json(req.session);
        } else {
            await logLoginAttempt(username, ipAddress, false);
            return res.status(401).json({ message: "Invalid credentials!" });
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

