const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'academic_collaboration_secret_key_777';

// Middleware to authenticate JWT tokens
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  // Token can be inside "Bearer <token>"
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Authentication token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    
    // Attach user payload to request
    req.user = user;
    next();
  });
}

// Middleware to check if user status is active
// (In case an admin suspends the user, we query the db or pass the status)
// For simplicity, we can do direct database status checks in controllers or write a middleware:
const { query } = require('../config/db');
async function checkUserActive(req, res, next) {
  try {
    const result = await query(
      'SELECT email, full_name, avatar_url, role, institution_id, department_id, status, approval_status FROM users WHERE id = $1',
      [req.user.id],
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (result.rows[0].status === 'suspended') {
      return res.status(403).json({ message: 'Your account is suspended. Contact administrator.' });
    }
    if (result.rows[0].approval_status !== 'approved') {
      return res.status(403).json({ message: 'Your account must be approved by a System Administrator before it can be used.' });
    }
    // Use current authorization and institution data even when an older token is still active.
    req.user = { ...req.user, ...result.rows[0] };
    next();
  } catch {
    return res.status(500).json({ message: 'Server check status error' });
  }
}

// Middleware to authorize specific user roles
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Forbidden: Access restricted to roles: [${allowedRoles.join(', ')}]` 
      });
    }

    next();
  };
}

module.exports = {
  authenticateToken,
  checkUserActive,
  authorizeRoles,
};
