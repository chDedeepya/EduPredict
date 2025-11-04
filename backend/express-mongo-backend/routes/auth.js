const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

// Helper to strip sensitive fields
function safeUser(user) {
  const u = user.toObject ? user.toObject() : { ...user };
  delete u.password;
  return u;
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    console.log(`[auth] login attempt for: ${normalizedEmail}`);

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      console.log('[auth] user not found:', normalizedEmail);
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    console.log('[auth] password match:', isMatch);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const payload = { id: user._id, role: user.role };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    return res.json({
      message: 'Login successful',
      token,
      user: safeUser(user),
    });
  } catch (err) {
    console.error('[auth] login error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Optional: simple register route (if your frontend calls it)
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role = 'student' } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password required' });
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) return res.status(409).json({ message: 'Email already in use' });

    const user = new User({ name: name.trim(), email: normalizedEmail, password, role });
    await user.save();

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    return res.status(201).json({ message: 'Registered', token, user: safeUser(user) });
  } catch (err) {
    console.error('[auth] register error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
