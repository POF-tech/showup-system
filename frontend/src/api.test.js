import { api } from './api';

beforeEach(() => { global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ posts: [] }), headers: { get: () => null } })); });

test('accepts a calendar request made of chunked prompts', async () => {
  await expect(api.generate('token', { stage: 'calendar', prompts: ['part one', 'part two'] })).resolves.toEqual({ posts: [] });
  expect(JSON.parse(global.fetch.mock.calls[0][1].body).prompts).toHaveLength(2);
});

test('rejects a request with no prompt at all', () => {
  expect(() => api.generate('token', { stage: 'calendar', prompts: ['  '] })).toThrow(/prompt is empty/);
  expect(() => api.generate('token', { stage: 'questions', prompt: '' })).toThrow(/prompt is empty/);
});
