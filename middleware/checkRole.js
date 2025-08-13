// middleware/checkRole.js
function checkRole(roles = [], opts = {}) {
  const { allowAnonymous = false } = opts;

  return function (req, res, next) {
    const user = req.session?.user;

    // Not logged in
    if (!user) {
      if (allowAnonymous) return next();               // let public routes through
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Validate role value
    const role = user.role;
    if (!['student', 'labtech', 'admin'].includes(role)) {
      return res.status(403).json({ message: 'Access denied: unknown role' });
    }

    // If specific roles are required, enforce them
    if (roles.length > 0 && !roles.includes(role)) {
      return res.status(403).json({ message: 'Access denied: insufficient role' });
    }

    next();
  };
}

module.exports = checkRole;
