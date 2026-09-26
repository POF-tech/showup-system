import { buildSchedule, calendarPrompts, groupQuestions, monthForSaved, normalizeCalendar, parseKeyDates, questionsPrompt, toCsv } from './calendarUtils';

const form = { month: '2026-10', niche: 'Fitness', audience: 'Busy mums', product: 'Coaching', offer: '', pains: '', dates: '12 - course launch, 18th: webinar', platforms: ['Instagram', 'LinkedIn'], frequency: '3' };
const questions = [{ question: 'How do I start?', source: 'Reddit' }, { question: 'Is it worth it?', source: 'Google People Also Ask' }];

test('schedules posts across the whole month, including important dates', () => {
  const slots = buildSchedule(form, questions, [{ name: 'Basics' }]);
  // October 2026: 13 Mon/Wed/Fri days plus Sun 18th (Mon 12th is already a posting day).
  expect(slots).toHaveLength(14);
  expect(slots[0]).toMatchObject({ day: 2, date: '2026-10-02', platform: 'Instagram', search: 'How do I start?', pillar: 'Basics' });
  expect(slots[1].platform).toBe('LinkedIn');
  expect(slots[slots.length - 1].day).toBe(30);
  expect(slots.find((slot) => slot.day === 12).keyDate).toBe('course launch');
  expect(slots.find((slot) => slot.day === 18).keyDate).toBe('webinar');
});

test('splits the calendar into chunked prompts', () => {
  const slots = buildSchedule({ ...form, frequency: '5' }, questions, []);
  expect(calendarPrompts(form, slots, []).length).toBe(Math.ceil(slots.length / 8));
});

test('fills every slot even when the AI returns only some posts', () => {
  const slots = buildSchedule(form, questions, []);
  const rows = normalizeCalendar([{ day: 2, platform: 'TikTok', topic: 'Real post', hashtags: ['#a'] }], slots);
  expect(rows).toHaveLength(slots.length);
  expect(rows[0]).toMatchObject({ topic: 'Real post', platform: 'Instagram', placeholder: false });
  expect(rows[1].placeholder).toBe(true);
});

test('asks for questions from multiple sources and groups them', () => {
  expect(questionsPrompt(form)).toMatch(/Reddit/);
  expect(questionsPrompt(form)).toMatch(/Quora/);
  expect(groupQuestions(questions).map((group) => group.source)).toEqual(['Google People Also Ask', 'Reddit']);
});

test('builds a CSV with escaped values', () => {
  const csv = toCsv([{ day: 1, date: '2026-10-01', platform: 'Instagram', topic: 'Say "hi", friends', outline: ['a', 'b'], hashtags: ['#x', '#y'] }], '2026-10');
  expect(csv.startsWith('﻿"Date"')).toBe(true);
  expect(csv).toContain('"Say ""hi"", friends"');
  expect(csv).toContain('"a | b"');
  expect(csv).toContain('"#x #y"');
});

test('ignores key dates outside the month and finds a saved calendar month', () => {
  expect(parseKeyDates('31 - launch', '2026-09')).toEqual([]);
  expect(monthForSaved({ name: '2026-10 content calendar', data: [] })).toBe('2026-10');
  expect(monthForSaved({ month: '2026-11', name: 'x' })).toBe('2026-11');
});
