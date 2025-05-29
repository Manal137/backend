
const express = require('express'); 
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const router = express.Router();
const verifyAdmin = require('../middleware/verifyAdmin');
const crypto = require('crypto');
const resetTokens = new Map();
require('dotenv').config();


// Register: user starts as not approved
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  try {
    const hashed = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (username, email, password, is_approved) VALUES ($1, $2, $3, $4) RETURNING *',
      [username, email, hashed, false]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Registration error:', err);
    res.status(400).json({ error: err.message || 'Something went wrong' });
  }
});

// Login: only allow if approved
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) return res.status(400).json({ error: 'User not found' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    if (!user.is_approved) {
      return res.status(403).json({ error: "Login denied: Admin approval is required" });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
    res.json({ token, user: { id: user.id, username: user.username } });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin setup: insert into admin table using email
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

// ✅ Admin login using email
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

// Admin approves user access
router.post('/admin/approve', verifyAdmin, async (req, res) => {
  const { userId } = req.body;
  try {
    await pool.query('UPDATE users SET is_approved = true WHERE id = $1', [userId]);
    res.json({ message: 'User approved.' });
  } catch (err) {
    console.error('Admin approval error:', err);
    res.status(500).json({ error: 'Failed to approve user' });
  }
});

// router.get('/admin/all-users', async (req, res) => {
//   console.log('Fetching all users');
//   try {
//     const result = await pool.query('SELECT id, username, email, is_approved FROM users');
//     res.json(result.rows);
//   } catch (err) {
//     console.error(err.message);
//     res.status(500).json({ error: 'Server error' });
//   }
// });

router.delete('/admin/delete-user/:id', verifyAdmin, async (req, res) => {
  const userId = req.params.id;
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

router.post('/admin/disapprove', verifyAdmin, async (req, res) => {
  const { userId } = req.body;
  try {
    await pool.query('UPDATE users SET is_approved = false WHERE id = $1', [userId]);
    res.json({ message: 'User disapproved.' });
  } catch (err) {
    console.error('Admin disapproval error:', err);
    res.status(500).json({ error: 'Failed to disapprove user' });
  }
});

// Protect this route
router.get('/admin/all-users', verifyAdmin, async (req, res) => {
  console.log('Fetching all users');
  try {
    const result = await pool.query('SELECT id, username, email, is_approved FROM users');
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// Step 1: Request password reset
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const result = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const token = crypto.randomBytes(32).toString('hex');
    resetTokens.set(token, user.id);

    // TODO: Send token via email (for now, return in response for testing)
    res.json({ message: 'Password reset link sent', resetToken: token });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Step 2: Reset password
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  const userId = resetTokens.get(token);
  if (!userId) return res.status(400).json({ error: 'Invalid or expired token' });

  try {
    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashed, userId]);
    resetTokens.delete(token);
    res.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

module.exports = router;
