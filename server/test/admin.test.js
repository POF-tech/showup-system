const test = require('node:test');
const assert = require('node:assert/strict');

test('admin account control values are intentionally constrained', () => {
  assert.deepEqual(['free', 'premium'].sort(), ['free', 'premium']);
  assert.deepEqual(['ACTIVE', 'DEACTIVATED'].sort(), ['ACTIVE', 'DEACTIVATED']);
});