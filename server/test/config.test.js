const test = require('node:test');
const assert = require('node:assert/strict');
const config = require('../src/config');

test('configuration exposes a selectable AI model', () => {
  assert.equal(typeof config.anthropicModel, 'string');
  assert.ok(config.anthropicModel.length > 0);
});

test('configuration accepts either Mongo URI naming convention', () => {
  assert.equal(config.mongoUri, process.env.MONGO_URI || process.env.MONGODB_URI || undefined);
});

test('administrator emails are normalized from configuration', () => {
  assert.ok(Array.isArray(config.adminEmails));
});
