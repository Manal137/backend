
const express = require('express'); 
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const router = express.Router();
require('dotenv').config();

// Register: user starts as not approved
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (username, email, password, is_approved) VALUES ($1, $2, $3, $4) RETURNING *',
      [username, email, hashed, false]
    );
    console.log('Registered user:', result.rows[0]);
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

// Admin setup: insert into admin table
router.post('/admin/setup', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const hashed = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO admin (username, password) VALUES ($1, $2) ON CONFLICT (username) DO NOTHING',
      [username, hashed]
    );
    res.json({ message: 'Admin credentials stored in database' });
  } catch (err) {
    console.error('Admin setup error:', err);
    res.status(500).json({ error: 'Failed to store admin credentials' });
  }
});

// ✅ Admin login: validate from DB and return admin object
router.post('/admin/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM admin WHERE username = $1', [username]);
    const admin = result.rows[0];
    if (!admin) return res.status(401).json({ error: 'Invalid admin credentials' });

    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) return res.status(401).json({ error: 'Invalid admin credentials' });

    const token = jwt.sign({ adminId: admin.id }, process.env.JWT_SECRET);
    res.json({
      token,
      admin: {
        id: admin.id,
        username: admin.username
      }
    });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin approves user access
router.post('/admin/approve', async (req, res) => {
  const { userId } = req.body;
  try {
    await pool.query('UPDATE users SET is_approved = true WHERE id = $1', [userId]);
    res.json({ message: 'User approved.' });
  } catch (err) {
    console.error('Admin approval error:', err);
    res.status(500).json({ error: 'Failed to approve user' });
  }
});

router.get('/admin/all-users', async (req, res) => {
  console.log('Fetching all users');
  try {
    const result = await pool.query('SELECT id, username, email, is_approved FROM users');
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/admin/delete-user/:id', async (req, res) => {
  const userId = req.params.id;
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

router.post('/admin/disapprove', async (req, res) => {
  const { userId } = req.body;
  try {
    await pool.query('UPDATE users SET is_approved = false WHERE id = $1', [userId]);
    res.json({ message: 'User disapproved.' });
  } catch (err) {
    console.error('Admin disapproval error:', err);
    res.status(500).json({ error: 'Failed to disapprove user' });
  }
});

module.exports = router;
