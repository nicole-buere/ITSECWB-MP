const { supabase } = require('../model/database');
const bcrypt = require("bcrypt");


exports.registerUser = async (req, res) => {
    try {
        const { name, email, username, password, confirmPassword, role } = req.body;

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

        // Find user in Supabase
        const { data: user, error: findError } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .single();

        if (findError) {
            console.error("Error finding user:", findError);
            return res.status(401).json({ message: "User not found!" });
        }

        if (!user) {
            return res.status(401).json({ message: "User not found!" });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (isPasswordValid) {
            // Create or update the session
            req.session = req.session || {};
            req.session.authenticated = true;
            req.session.username = username;

            if (user.role === 'admin') {
                req.session.admin = true;
            }
            return res.status(200).json(req.session);
        } else {
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

