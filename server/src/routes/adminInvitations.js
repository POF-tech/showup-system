const express = require('express');
const { ObjectId } = require('mongodb');
const { getDb } = require('../db');
const { requireAdmin } = require('../middleware/admin');
const { createInvitation, publicInvitation, INVITATION_STATUSES } = require('../services/invitations');

const router = express.Router();
router.use(requireAdmin);

router.post('/', async (req, res, next) => {
  try {
    const { email, name = '' } = req.body || {};
    const result = await createInvitation(email, name);
    return res.status(201).json({ success: true, invitation: publicInvitation(result.invitation), invitationUrl: result.invitationUrl, emailSent: result.emailSent });
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
    return res.json({ success: true, invitation: publicInvitation(result.invitation), invitationUrl: result.invitationUrl, emailSent: result.emailSent });
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

module.exports = router;
