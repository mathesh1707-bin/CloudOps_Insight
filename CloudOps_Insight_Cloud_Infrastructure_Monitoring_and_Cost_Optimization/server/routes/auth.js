const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../db');
const router  = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = await db.getAsync('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, avatarInitials: user.avatar_initials, avatarColor: user.avatar_color } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, and password required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const existing = await db.getAsync('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) return res.status(409).json({ error: 'An account with this email already exists' });

    const passwordHash = bcrypt.hashSync(password, 10);
    const userId       = `u${Date.now()}`;
    const initials     = name.trim().split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
    const avatarColor  = '#10b981';

    await db.runAsync(
      'INSERT INTO users (id, name, email, password_hash, role, avatar_initials, avatar_color) VALUES (?,?,?,?,?,?,?)',
      [userId, name.trim(), email.trim().toLowerCase(), passwordHash, 'viewer', initials, avatarColor]
    );

    const token = jwt.sign(
      { userId, email: email.trim().toLowerCase(), role: 'viewer' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    res.status(201).json({ token, user: { id: userId, name: name.trim(), email: email.trim().toLowerCase(), role: 'viewer', avatarInitials: initials, avatarColor } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
