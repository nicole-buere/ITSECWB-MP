module.exports = function checkRole(roles = []) {
  return function (req, res, next) {
    if (!req.session?.authenticated || !req.session?.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    const role = req.session.user.role;
    if (!['student','labtech','admin'].includes(role)) {
      return res.status(403).json({ message: 'Access denied: unknown role' });
    }
    if (roles.length && !roles.includes(role)) {
      return res.status(403).json({ message: 'Access denied: insufficient role' });
    }
    next();
  };
};
