const fs = require('fs');
const path = require('path');

function logAccessFailure(username, role, route, reason) {    
    const logEntry = `[${new Date().toISOString()}] ACCESS DENIED: User: ${username || 'Unknown'}, Role: ${role || 'Unknown'}, Route: ${route}, Reason: ${reason}\n`;    
    fs.appendFileSync(path.join(__dirname, '../access.log'), logEntry);}
    
function checkRole(roles = []) {    
    return function (req, res, next) {        
        // Check if logged in        
        if (!req.session || !req.session.user) {            
            logAccessFailure(null, null, req.originalUrl, 'Not authenticated');            
            return res.status(401).json({ message: 'Not authenticated' });        
        }        
        
        // If no roles specified → allow any logged-in user        
        if (roles.length === 0) {            
            return next();        
        }        
        
        // Role check
        if (!roles.includes(req.session.user.role)) {
            logAccessFailure(req.session.user.username, req.session.user.role, req.originalUrl, 'Insufficient role');
            return res.status(403).json({ message: 'Access denied: insufficient role' });
        }

        next();
    };
}

module.exports = checkRole;