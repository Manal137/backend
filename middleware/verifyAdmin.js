// const jwt = require('jsonwebtoken');
// require('dotenv').config();

// function verifyAdmin(req, res, next) {
//   const authHeader = req.headers['authorization'];
//   const token = authHeader?.split(' ')[1];

//   if (!token) return res.status(401).json({ error: 'No token provided' });

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     req.adminId = decoded.adminId;
//     next();
//   } catch (err) {
//     console.error('Token verification failed:', err);
//     return res.status(403).json({ error: 'Invalid token' });
//   }
// }

// module.exports = verifyAdmin;




const jwt = require('jsonwebtoken');
require('dotenv').config();

/**
 * Middleware to verify JWT for admin routes.
 * Expects the token in the Authorization header as: Bearer <token>
 */
function verifyAdmin(req, res, next) {
  const authHeader = req.headers['authorization'];

  // Check if the Authorization header is present and formatted correctly
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token missing or malformed' });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token not found' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Ensure the token contains the admin ID
    if (!decoded.adminId) {
      return res.status(403).json({ error: 'Access denied: not an admin token' });
    }

    req.adminId = decoded.adminId;
    next(); // Token is valid, proceed to the next middleware/route
  } catch (err) {
    console.error('Admin token verification failed:', err);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

module.exports = verifyAdmin;
