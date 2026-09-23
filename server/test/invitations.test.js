const test = require('node:test');
const assert = require('node:assert/strict');
const { INVITATION_STATUSES, hashToken, normalizeEmail, publicInvitation } = require('../src/services/invitations');

test('invitation tokens are one-way hashed and emails normalize', () => {
  const token = 'secure-random-token';
  assert.notEqual(hashToken(token), token);
  assert.equal(hashToken(token), hashToken(token));
  assert.equal(normalizeEmail(' Member@Example.COM '), 'member@example.com');
});

test('invitation lifecycle states are explicit', () => {
  assert.deepEqual(INVITATION_STATUSES, { PENDING: 'PENDING', REDEEMED: 'REDEEMED', REVOKED: 'REVOKED', EXPIRED: 'EXPIRED' });
});

test('public invitation serialization supports new and persisted records', () => {
  const fields = { email: 'member@example.com', status: 'PENDING', expiresAt: new Date(), createdAt: new Date() };
  assert.equal(publicInvitation({ ...fields, id: 'new-id' }).id, 'new-id');
  assert.equal(publicInvitation({ ...fields, _id: { toString: () => 'stored-id' } }).id, 'stored-id');
});