const express = require('express');
const { getDb } = require('../db');
const { requireAuth, requireAdmin } = require('../auth');
const { grantGrowthAccess, hasActiveGrowthAccess } = require('../services/entitlements');
const { ObjectId } = require('mongodb');
const { createInvitation, publicInvitation, INVITATION_STATUSES } = require('../services/invitations');

const router = express.Router();
router.use(requireAuth, requireAdmin);

router.post('/', async (req, res, next) => {
  try {
    const { email, name = '' } = req.body || {};
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const existing = await (await getDb()).collection('users').findOne({ email: normalizedEmail }, { projection: { _id: 1 } });
    if (existing && await hasActiveGrowthAccess(existing._id)) return res.status(409).json({ success: false, error: 'This user already has active Growth Academy access.' });
    const result = await createInvitation(email, name);
    return res.status(201).json({ success: true, invitation: publicInvitation(result.invitation), invitationUrl: result.invitationUrl, emailSent: result.emailSent, emailError: result.emailError });
  } catch (error) { next(error); }
});

router.get('/', async (req, res, next) => {
  try {
    const invitations = await (await getDb()).collection('invitations').find({}).sort({ createdAt: -1 }).limit(500).toArray();
    return res.json({ success: true, invitations: invitations.map(publicInvitation) });
  } catch (error) { next(error); }
});

router.post('/:id/resend', async (req, res, next) => {
  try {
    const db = await getDb();
    const current = await db.collection('invitations').findOne({ _id: new ObjectId(req.params.id) });
    if (!current) return res.status(404).json({ success: false, error: 'Invitation not found' });
    if (current.status === INVITATION_STATUSES.REDEEMED) return res.status(409).json({ success: false, error: 'Invitation has already been redeemed' });
    const result = await createInvitation(current.email, current.name || '');
    return res.json({ success: true, invitation: publicInvitation(result.invitation), invitationUrl: result.invitationUrl, emailSent: result.emailSent, emailError: result.emailError });
  } catch (error) { next(error); }
});

router.post('/:id/revoke', async (req, res, next) => {
  try {
    const result = await (await getDb()).collection('invitations').findOneAndUpdate(
      { _id: new ObjectId(req.params.id), status: INVITATION_STATUSES.PENDING },
      { $set: { status: INVITATION_STATUSES.REVOKED, revokedAt: new Date() } },
      { returnDocument: 'after' }
    );
    const invitation = result.value || result;
    if (!invitation) return res.status(404).json({ success: false, error: 'Pending invitation not found' });
    return res.json({ success: true, invitation: publicInvitation(invitation) });
  } catch (error) { next(error); }
});

router.get('/members', async (req, res, next) => {
  try {
    const db = await getDb();
    const page = Math.max(1, Number.parseInt(req.query.page || '1', 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit || '25', 10) || 25));
    const search = String(req.query.search || '').trim();
    const status = String(req.query.status || 'ALL').toUpperCase();
    const userFilter = search ? { $or: [{ email: { $regex: search, $options: 'i' } }, { name: { $regex: search, $options: 'i' } }] } : {};
    const users = await db.collection('users').find(userFilter, { projection: { password: 0 } }).sort({ createdAt: -1 }).toArray();
    const userIds = users.map((user) => user._id);
    const [entitlements, invitations] = await Promise.all([
      db.collection('entitlements').find({ userId: { $in: userIds }, type: 'GROWTH_ACADEMY' }).toArray(),
      db.collection('invitations').find(search ? { email: { $regex: search, $options: 'i' } } : {}).sort({ createdAt: -1 }).toArray()
    ]);
    const entitlementByUser = new Map(entitlements.map((item) => [item.userId.toString(), item]));
    const invitationByEmail = new Map(invitations.map((item) => [item.email, item]));
    const members = users.map((user) => ({ id: user._id.toString(), name: user.name, email: user.email, accountCreatedAt: user.createdAt, invitation: invitationByEmail.get(user.email) ? publicInvitation(invitationByEmail.get(user.email)) : null, access: entitlementByUser.get(user._id.toString())?.status || 'NONE', accessGrantedAt: entitlementByUser.get(user._id.toString())?.createdAt || null, updatedAt: entitlementByUser.get(user._id.toString())?.updatedAt || user.updatedAt || user.createdAt })).concat(invitations.filter((invitation) => !users.some((user) => user.email === invitation.email)).map((invitation) => ({ id: `invitation-${invitation._id.toString()}`, name: invitation.name || '', email: invitation.email, accountCreatedAt: null, invitation: publicInvitation(invitation), access: 'NONE', accessGrantedAt: null, updatedAt: invitation.createdAt }))).filter((member) => status === 'ALL' || member.access === status || member.invitation?.status === status);
    const pending = await db.collection('invitations').countDocuments({ status: 'PENDING' });
    const expired = await db.collection('invitations').countDocuments({ status: 'EXPIRED' });
    const revoked = await db.collection('entitlements').countDocuments({ type: 'GROWTH_ACADEMY', status: 'REVOKED' });
    const active = await db.collection('entitlements').countDocuments({ type: 'GROWTH_ACADEMY', status: 'ACTIVE' });
    const start = (page - 1) * limit;
    return res.json({ success: true, members: members.slice(start, start + limit), pagination: { page, limit, total: members.length, pages: Math.ceil(members.length / limit) }, summary: { total: members.length, active, pending, expired, revoked } });
  } catch (error) { next(error); }
});

router.get('/members/:id', async (req, res, next) => {
  try {
    const db = await getDb();
    const user = await db.collection('users').findOne({ _id: new ObjectId(req.params.id) }, { projection: { password: 0 } });
    if (!user) return res.status(404).json({ success: false, error: 'Member not found' });
    const [entitlement, invitation] = await Promise.all([db.collection('entitlements').findOne({ userId: user._id, type: 'GROWTH_ACADEMY' }), db.collection('invitations').findOne({ email: user.email }, { sort: { createdAt: -1 } })]);
    return res.json({ success: true, member: { id: user._id.toString(), name: user.name, email: user.email, accountCreatedAt: user.createdAt, access: entitlement?.status || 'NONE', accessGrantedAt: entitlement?.createdAt || null, accessRevokedAt: entitlement?.revokedAt || null, invitation: invitation ? publicInvitation(invitation) : null } });
  } catch (error) { next(error); }
});

router.post('/members/:id/revoke', async (req, res, next) => {
  try {
    const result = await (await getDb()).collection('entitlements').findOneAndUpdate({ userId: new ObjectId(req.params.id), type: 'GROWTH_ACADEMY' }, { $set: { status: 'REVOKED', revokedAt: new Date(), revokedBy: req.adminUser._id, updatedAt: new Date() } }, { returnDocument: 'after' });
    const entitlement = result.value || result;
    if (!entitlement) return res.status(404).json({ success: false, error: 'Active entitlement not found' });
    return res.json({ success: true, access: entitlement.status });
  } catch (error) { next(error); }
});

router.post('/members/:id/restore', async (req, res, next) => {
  try {
    await grantGrowthAccess(new ObjectId(req.params.id), 'admin');
    return res.json({ success: true, access: 'ACTIVE' });
  } catch (error) { next(error); }
});

module.exports = router;
