const express = require('express'); 
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const router = express.Router();
require('dotenv').config();

// Admin auth middleware to protect admin routes
const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) 
    return res.status(401).json({ error: 'No token provided' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.adminId) 
      return res.status(403).json({ error: 'Not authorized as admin' });
    req.adminId = decoded.adminId;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// -------- User registration --------
// User starts as not approved
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Missing username, email, or password' });
  }

  try {
    const hashed = await bcrypt.hash(password, 12); // increased salt rounds for better security

    const result = await pool.query(
      'INSERT INTO users (username, email, password, is_approved) VALUES ($1, $2, $3, $4) RETURNING id, username, email, is_approved',
      [username, email, hashed, false]
    );

    res.status(201).json({ 
      message: 'User registered. Await admin approval.', 
      user: result.rows[0] 
    });

  } catch (err) {
    // Check for unique constraint violation on email/username if any
    if (err.code === '23505') { // Postgres unique violation
      return res.status(409).json({ error: 'User with this email or username already exists' });
    }
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// -------- User login --------
// Only allow if approved, JWT expires in 1 hour
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) 
    return res.status(400).json({ error: 'Missing email or password' });

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) 
      return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) 
      return res.status(401).json({ error: 'Invalid credentials' });

    if (!user.is_approved) {
      return res.status(403).json({ error: "Login denied: Admin approval is required" });
    }

    const token = jwt.sign(
      { userId: user.id }, 
      process.env.JWT_SECRET, 
      { expiresIn: '1h' }
    );

    res.json({ 
      token, 
      user: { id: user.id, username: user.username, email: user.email } 
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// // -------- Admin setup --------
// // Create admin credentials (should be done once manually)
// router.post('/admin/setup', async (req, res) => {
//   const { username, password } = req.body;
//   if (!username || !password) {
//     return res.status(400).json({ error: 'Username and password are required' });
//   }

//   try {
//     const hashed = await bcrypt.hash(password, 12);

//     await pool.query(
//       'INSERT INTO admins (username, password) VALUES ($1, $2) ON CONFLICT (username) DO NOTHING',
//       [username, hashed]
//     );

//     res.json({ message: 'Admin credentials stored in database' });

//   } catch (err) {
//     console.error('Admin setup error:', err);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });

// // -------- Admin login --------
// router.post('/admin/login', async (req, res) => {
//   const { username, password } = req.body;
//   if (!username || !password) 
//     return res.status(400).json({ error: 'Missing username or password' });

//   try {
//     const result = await pool.query('SELECT * FROM admins WHERE username = $1', [username]);
//     const admin = result.rows[0];
//     if (!admin) 
//       return res.status(401).json({ error: 'Invalid admin credentials' });

//     const valid = await bcrypt.compare(password, admin.password);
//     if (!valid) 
//       return res.status(401).json({ error: 'Invalid admin credentials' });

//     const token = jwt.sign(
//       { adminId: admin.id }, 
//       process.env.JWT_SECRET, 
//       { expiresIn: '1h' }
//     );

//     res.json({
//       token,
//       admin: {
//         id: admin.id,
//         username: admin.username
//       }
//     });

//   } catch (err) {
//     console.error('Admin login error:', err);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });


// Admin setup: insert into admins table
router.post('/admin/setup', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const hashed = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO admins (email, password) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING',
      [email, hashed]
    );
    res.json({ message: 'Admin credentials stored in database' });
  } catch (err) {
    console.error('Admin setup error:', err);
    res.status(500).json({ error: 'Failed to store admin credentials' });
  }
});

// Admin login: validate from DB and return admin object
router.post('/admin/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM admins WHERE email = $1', [email]);
    const admin = result.rows[0];
    if (!admin) return res.status(401).json({ error: 'Invalid admin credentials' });

    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) return res.status(401).json({ error: 'Invalid admin credentials' });

    const token = jwt.sign({ adminId: admin.id }, process.env.JWT_SECRET);
    res.json({
      token,
      admin: {
        id: admin.id,
        email: admin.email
      }
    });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


// -------- Admin approves user --------
router.post('/admin/approve', authenticateAdmin, async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  try {
    const result = await pool.query(
      'UPDATE users SET is_approved = true WHERE id = $1 RETURNING id, username, email, is_approved',
      [userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User approved.', user: result.rows[0] });

  } catch (err) {
    console.error('Admin approval error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// -------- Admin disapproves user --------
router.post('/admin/disapprove', authenticateAdmin, async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  try {
    const result = await pool.query(
      'UPDATE users SET is_approved = false WHERE id = $1 RETURNING id, username, email, is_approved',
      [userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User disapproved.', user: result.rows[0] });

  } catch (err) {
    console.error('Admin disapproval error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// -------- Admin deletes user --------
router.delete('/admin/delete-user/:id', authenticateAdmin, async (req, res) => {
  const userId = req.params.id;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  try {
    const result = await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'User not found' });

    res.json({ message: 'User deleted successfully' });

  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// -------- Admin gets all users --------
router.get('/admin/all-users', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, email, is_approved FROM users ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch all users error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
