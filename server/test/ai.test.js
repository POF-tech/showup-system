const test = require('node:test');
const assert = require('node:assert/strict');
const { extractJsonValue } = require('../src/services/ai');

test('extracts JSON wrapped in Markdown and trailing text', () => {
  const result = extractJsonValue('Here is the result:\n```json\n{"questions":[{"question":"What do people need?"}]}\n```\nLet me know if you need anything else.');
  assert.deepEqual(result, { questions: [{ question: 'What do people need?' }] });
});

test('preserves braces and brackets inside JSON strings', () => {
  const result = extractJsonValue('{"topic":"Use { braces } and [brackets] safely"} trailing');
  assert.equal(result.topic, 'Use { braces } and [brackets] safely');
});

test('rejects responses without a complete JSON value', () => {
  assert.throws(() => extractJsonValue('The provider did not return structured data.'), /No complete JSON/);
});