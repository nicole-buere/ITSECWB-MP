function checkRole(roles = []) {
    return function (req, res, next) {
        // Check if logged in
        if (!req.session || !req.session.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        // If no roles specified → allow any logged-in user
        if (roles.length === 0) {
            return next();
        }

        // Role check
        if (!roles.includes(req.session.user.role)) {
            return res.status(403).json({ message: 'Access denied: insufficient role' });
        }

        next();
    };
}

module.exports = checkRole;