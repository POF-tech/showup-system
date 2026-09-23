const express = require('express');
const { ObjectId } = require('mongodb');
const { getDb } = require('../db');
const { hashPassword, verifyPassword, createToken, requireAuth } = require('../auth');
const { subscribeUser } = require('../services/convertKit');

const router = express.Router();
const publicUser = (user) => ({ email: user.email, name: user.name, plan: user.plan, usage_count: user.usageCount });

router.post('/signup', async (req, res, next) => {
  const { name = '', email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ success: false, error: 'Missing fields' });
  try {
    const db = await getDb();
    const user = { name, email: email.trim().toLowerCase(), password: await hashPassword(password), plan: 'free', usageCount: 0, createdAt: new Date() };
    await db.collection('users').insertOne(user);
    subscribeUser(user.email, name).catch(() => {});
    return res.status(201).json({ success: true, message: 'User created' });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ success: false, error: 'Email already exists' });
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ success: false, error: 'Missing email or password' });
  try {
    const user = await (await getDb()).collection('users').findOne({ email: email.trim().toLowerCase() });
    if (!user || !(await verifyPassword(password, user.password))) return res.status(401).json({ success: false, error: 'Invalid credentials' });
    return res.json({ success: true, token: createToken(user), ...publicUser(user) });
  } catch (error) { next(error); }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await (await getDb()).collection('users').findOne({ _id: new ObjectId(req.auth.sub) });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    return res.json({ success: true, ...publicUser(user) });
  } catch (error) { next(error); }
});

module.exports = router;
