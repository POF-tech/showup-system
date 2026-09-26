const test = require('node:test');
const assert = require('node:assert/strict');
const { generateCalendarParts } = require('../src/routes/generate');

test('merges posts from every calendar part', async () => {
  const fake = async (prompt) => ({ posts: [{ day: Number(prompt) }] });
  const result = await generateCalendarParts(['1', '2', '3'], 100, fake);
  assert.deepEqual(result.posts.map((post) => post.day), [1, 2, 3]);
  assert.equal(result.failedParts, 0);
});

test('keeps successful parts when one part fails', async () => {
  const fake = async (prompt) => { if (prompt === 'bad') throw new Error('boom'); return { posts: [{ day: 1 }] }; };
  const result = await generateCalendarParts(['ok', 'bad'], 100, fake);
  assert.equal(result.posts.length, 1);
  assert.equal(result.failedParts, 1);
});

test('throws when every part fails', async () => {
  const fake = async () => { throw new Error('provider down'); };
  await assert.rejects(generateCalendarParts(['a', 'b'], 100, fake), /provider down/);
});
