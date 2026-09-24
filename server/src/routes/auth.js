const express = require('express');
const { ObjectId } = require('mongodb');
const { getDb } = require('../db');
const { hashPassword, verifyPassword, createToken, requireAuth } = require('../auth');
const { subscribeUser } = require('../services/convertKit');
const { findValidInvitation, redeemInvitation } = require('../services/invitations');
const { grantGrowthAccess } = require('../services/entitlements');
const config = require('../config');

const router = express.Router();
const publicUser = (user) => ({ email: user.email, name: user.name, plan: user.plan, role: user.role || 'USER', accountStatus: user.accountStatus || 'ACTIVE', usage_count: user.usageCount });

router.post('/signup', async (req, res, next) => {
  const { name = '', email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ success: false, error: 'Missing fields' });
  try {
    const db = await getDb();
    const user = { name, email: email.trim().toLowerCase(), password: await hashPassword(password), plan: 'free', usageCount: 0, calendarCount: 0, createdAt: new Date() };
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
    const normalizedEmail = email.trim().toLowerCase();
    const db = await getDb();
    const user = await db.collection('users').findOne({ email: normalizedEmail });
    if (!user || !(await verifyPassword(password, user.password))) return res.status(401).json({ success: false, error: 'Invalid credentials' });
    if (user.accountStatus === 'DEACTIVATED') return res.status(403).json({ success: false, error: 'This account is deactivated. Contact support.' });
    if (config.adminEmails.includes(normalizedEmail) && user.role !== 'ADMIN') {
      user.role = 'ADMIN';
      await db.collection('users').updateOne({ _id: user._id }, { $set: { role: 'ADMIN', updatedAt: new Date() } });
    }
    return res.json({ success: true, token: createToken(user), ...publicUser(user) });
  } catch (error) { next(error); }
});

router.post('/invitation-register', async (req, res, next) => {
  const { token, name = '', password } = req.body || {};
  if (!token || !password) return res.status(400).json({ success: false, error: 'Invitation token and password are required' });
  try {
    const valid = await findValidInvitation(token);
    if (!valid.invitation) return res.status(400).json({ success: false, error: `Invitation is ${valid.reason}` });
    const db = await getDb();
    const email = valid.invitation.email;
    const existing = await db.collection('users').findOne({ email });
    if (existing) {
      await grantGrowthAccess(existing._id, 'invitation');
      const redeemed = await redeemInvitation(token, existing._id);
      if (!redeemed) return res.status(409).json({ success: false, error: 'Invitation has already been used' });
      return res.json({ success: true, existingAccount: true, message: 'Your Growth Academy access is linked. Please log in to continue.' });
    }
    let user = existing;
    if (!user) {
      const result = await db.collection('users').insertOne({ name, email, password: await hashPassword(password), plan: 'free', usageCount: 0, calendarCount: 0, createdAt: new Date() });
      user = { _id: result.insertedId, email, name, plan: 'free', usageCount: 0, calendarCount: 0 };
      subscribeUser(email, name).catch(() => {});
    }
    await grantGrowthAccess(user._id, 'invitation');
    const redeemed = await redeemInvitation(token, user._id);
    if (!redeemed) return res.status(409).json({ success: false, error: 'Invitation has already been used' });
    return res.status(existing ? 200 : 201).json({ success: true, token: createToken(user), ...publicUser(user), growthAcademy: true });
  } catch (error) { next(error); }
});

router.post('/claim-invitation', requireAuth, async (req, res, next) => {
  const { token } = req.body || {};
  if (!token) return res.status(400).json({ success: false, error: 'Invitation token is required' });
  try {
    const valid = await findValidInvitation(token);
    if (!valid.invitation) return res.status(400).json({ success: false, error: `Invitation is ${valid.reason}` });
    const db = await getDb();
    const user = await db.collection('users').findOne({ _id: new ObjectId(req.auth.sub) });
    if (!user || user.email !== valid.invitation.email) return res.status(403).json({ success: false, error: 'Invitation email does not match this account' });
    await grantGrowthAccess(user._id, 'invitation');
    const redeemed = await redeemInvitation(token, user._id);
    if (!redeemed) return res.status(409).json({ success: false, error: 'Invitation has already been used' });
    return res.json({ success: true, growthAcademy: true });
  } catch (error) { next(error); }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await (await getDb()).collection('users').findOne({ _id: new ObjectId(req.auth.sub) });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    if (user.accountStatus === 'DEACTIVATED') return res.status(403).json({ success: false, error: 'This account is deactivated. Contact support.' });
    return res.json({ success: true, ...publicUser(user) });
  } catch (error) { next(error); }
});

module.exports = router;
