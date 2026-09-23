const crypto = require('node:crypto');
const { getDb } = require('../db');
const config = require('../config');
const { sendInvitationEmail } = require('./convertKit');

const INVITATION_STATUSES = Object.freeze({ PENDING: 'PENDING', REDEEMED: 'REDEEMED', REVOKED: 'REVOKED', EXPIRED: 'EXPIRED' });

function normalizeEmail(email) { return String(email || '').trim().toLowerCase(); }
function hashToken(token) { return crypto.createHash('sha256').update(token).digest('hex'); }
function createRawToken() { return crypto.randomBytes(32).toString('base64url'); }
function expiryDate() { return new Date(Date.now() + config.invitationExpiryDays * 24 * 60 * 60 * 1000); }

async function createInvitation(email, name = '') {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !normalizedEmail.includes('@')) throw new Error('A valid email is required');
  const db = await getDb();
  const existing = await db.collection('invitations').findOne({ email: normalizedEmail, status: INVITATION_STATUSES.PENDING });
  const rawToken = createRawToken();
  const invitation = { email: normalizedEmail, name, tokenHash: hashToken(rawToken), status: INVITATION_STATUSES.PENDING, expiresAt: expiryDate(), createdAt: new Date() };
  if (existing) {
    await db.collection('invitations').updateOne({ _id: existing._id }, { $set: { ...invitation, resentAt: new Date() } });
    invitation.id = existing._id;
  } else {
    const result = await db.collection('invitations').insertOne(invitation);
    invitation.id = result.insertedId;
  }
  const invitationUrl = `${config.publicAppUrl.replace(/\/$/, '')}/register?token=${encodeURIComponent(rawToken)}`;
  const emailSent = await sendInvitationEmail({ email: normalizedEmail, name, invitationUrl, expiresAt: invitation.expiresAt });
  return { invitation, invitationUrl, emailSent };
}

async function findValidInvitation(token) {
  if (!token || typeof token !== 'string') return { invitation: null, reason: 'invalid' };
  const db = await getDb();
  const invitation = await db.collection('invitations').findOne({ tokenHash: hashToken(token) });
  if (!invitation) return { invitation: null, reason: 'invalid' };
  if (invitation.status !== INVITATION_STATUSES.PENDING) return { invitation: null, reason: invitation.status.toLowerCase() };
  if (new Date(invitation.expiresAt) <= new Date()) {
    await db.collection('invitations').updateOne({ _id: invitation._id, status: INVITATION_STATUSES.PENDING }, { $set: { status: INVITATION_STATUSES.EXPIRED, expiredAt: new Date() } });
    return { invitation: null, reason: 'expired' };
  }
  return { invitation, reason: null };
}

async function redeemInvitation(token, userId, session) {
  const db = await getDb();
  const result = await db.collection('invitations').findOneAndUpdate(
    { tokenHash: hashToken(token), status: INVITATION_STATUSES.PENDING, expiresAt: { $gt: new Date() } },
    { $set: { status: INVITATION_STATUSES.REDEEMED, redeemedAt: new Date(), redeemedUserId: userId } },
    { returnDocument: 'after', ...(session ? { session } : {}) }
  );
  return result.value || result;
}

function publicInvitation(invitation) { return { id: (invitation._id || invitation.id).toString(), email: invitation.email, status: invitation.status, expiresAt: invitation.expiresAt, createdAt: invitation.createdAt, redeemedAt: invitation.redeemedAt || null }; }

module.exports = { INVITATION_STATUSES, normalizeEmail, hashToken, createInvitation, findValidInvitation, redeemInvitation, publicInvitation };