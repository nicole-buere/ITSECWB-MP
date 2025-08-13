module.exports = function checkRole(roles = []) {
  return function (req, res, next) {
    if (!req.session || !req.session.authenticated || !req.session.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const userRole = req.session.user.role;
    if (!['student', 'labtech', 'admin'].includes(userRole)) {
      return res.status(403).json({ message: 'Access denied: unknown role' });
    }

    if (!roles || roles.length === 0) return next();     // any logged-in user
    if (!roles.includes(userRole)) {
      return res.status(403).json({ message: 'Access denied: insufficient role' });
    }
    return next();
  };
};