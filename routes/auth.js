const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { requireLogin } = require('../middleware/auth');

const router = express.Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, age, gender } = req.body;
    if (!name || !String(name).trim()) return res.status(400).json({ message: 'Name is required' });
    if (!email || !EMAIL_RE.test(email)) return res.status(400).json({ message: 'Enter a valid email address' });
    if (!password || String(password).length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });

    const exists = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (exists) return res.status(400).json({ message: 'That email is already registered' });

    const hash = await bcrypt.hash(String(password), 10);
    await User.create({ name: String(name).trim(), email, password: hash, age: age || undefined, gender: gender || '' });
    res.status(201).json({ message: 'Registered' });
  } catch (err) { next(err); }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = email && password ? await User.findOne({ email: String(email).toLowerCase().trim() }) : null;
    const ok = user && await bcrypt.compare(String(password), user.password);
    if (!ok) return res.status(401).json({ message: 'Email or password is incorrect' });

    req.session.regenerate(err => {
      if (err) return next(err);
      req.session.userId = String(user._id);
      req.session.name = user.name;
      res.json({ user: { userId: String(user._id), name: user.name } });
    });
  } catch (err) { next(err); }
});

// POST /api/auth/logout
router.post('/logout', (req, res, next) => {
  req.session.destroy(err => {
    if (err) return next(err);
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out' });
  });
});

// GET /api/auth/me  (handy for checking the session)
router.get('/me', requireLogin, (req, res) => {
  res.json({ user: { userId: req.session.userId, name: req.session.name } });
});

module.exports = router;
