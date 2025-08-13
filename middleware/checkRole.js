const checkRole = (roles = []) => {
    return (req, res, next) => {
        if (!req.session.authenticated) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        if (roles.length === 0) {
            return next();
        }

        const userRole = req.session.admin ? 'admin' : 'student';
        
        if (!roles.includes(userRole)) {
            return res.status(403).json({ message: 'Insufficient permissions' });
        }

        next();
    };
};

module.exports = checkRole;