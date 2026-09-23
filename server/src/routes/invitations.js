const express = require('express');
const { findValidInvitation } = require('../services/invitations');

const router = express.Router();
router.get('/validate', async (req, res, next) => {
  try {
    const result = await findValidInvitation(req.query.token);
    if (!result.invitation) return res.json({ valid: false, reason: result.reason });
    return res.json({ valid: true, email: result.invitation.email, expiresAt: result.invitation.expiresAt });
  } catch (error) { next(error); }
});
module.exports = router;
