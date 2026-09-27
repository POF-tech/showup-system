export const QUESTION_SOURCES = ['Google People Also Ask', 'Reddit', 'Quora & public forums', 'Social media (TikTok, Instagram, YouTube)'];
export const PLATFORM_COLOURS = { Instagram: '#C2185B', LinkedIn: '#378ADD', TikTok: '#1a1a2e', YouTube: '#E02424', Facebook: '#1877F2', Pinterest: '#BD081C' };
const DEFAULT_TYPES = { Instagram: 'Reel', LinkedIn: 'Text post', TikTok: 'Short video', YouTube: 'Short', Facebook: 'Post', Pinterest: 'Pin' };
// Posting weekdays per weekly frequency (0 = Sunday, 1 = Monday ...).
const POSTING_WEEKDAYS = { 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 4, 5] };
const CALENDAR_CHUNK_SIZE = 6;
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const slug = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
const pad = (value) => String(value).padStart(2, '0');

export function parseMonth(month) {
  const match = /^(\d{4})-(\d{2})$/.exec(month || '');
  if (!match) { const now = new Date(); return { year: now.getFullYear(), monthIndex: now.getMonth() }; }
  return { year: Number(match[1]), monthIndex: Number(match[2]) - 1 };
}
export const daysInMonth = (month) => { const { year, monthIndex } = parseMonth(month); return new Date(year, monthIndex + 1, 0).getDate(); };
export const monthLabel = (month) => { const { year, monthIndex } = parseMonth(month); return new Date(year, monthIndex, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }); };
export const dateLabel = (month, day) => { const { year, monthIndex } = parseMonth(month); return new Date(year, monthIndex, day).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }); };

// Parses free text such as "12 - course launch, 20th: webinar" into [{ day: 12, label: 'course launch' }, ...].
export function parseKeyDates(text, month) {
  const lastDay = daysInMonth(month);
  return String(text || '').split(/[,;\n]/).map((part) => /^\s*(\d{1,2})(?:st|nd|rd|th)?\b\s*[-–:]?\s*(.*)$/i.exec(part)).filter(Boolean)
    .map((match) => ({ day: Number(match[1]), label: match[2].trim() || 'Important date' })).filter((item) => item.day >= 1 && item.day <= lastDay);
}

// Lays out posting slots across the whole selected month, rotating platforms, questions and pillars so nothing repeats back to back.
export function buildSchedule(form, questions = [], pillars = []) {
  const { year, monthIndex } = parseMonth(form.month);
  const weekdays = POSTING_WEEKDAYS[form.frequency] || POSTING_WEEKDAYS[3];
  const keyDates = parseKeyDates(form.dates, form.month);
  const platforms = form.platforms?.length ? form.platforms : ['Instagram'];
  const days = [];
  for (let day = 1; day <= daysInMonth(form.month); day += 1) {
    if (weekdays.includes(new Date(year, monthIndex, day).getDay()) || keyDates.some((item) => item.day === day)) days.push(day);
  }
  return days.map((day, index) => ({
    day,
    date: `${year}-${pad(monthIndex + 1)}-${pad(day)}`,
    weekday: WEEKDAYS[new Date(year, monthIndex, day).getDay()],
    platform: platforms[index % platforms.length],
    search: questions.length ? questions[index % questions.length].question : '',
    pillar: pillars.length ? pillars[index % pillars.length].name : '',
    keyDate: keyDates.find((item) => item.day === day)?.label || ''
  }));
}

const business = (form) => JSON.stringify({ niche: form.niche, idealClient: form.audience, offer: form.product, helpsWith: form.offer, painPoints: form.pains, platforms: form.platforms });

export function questionsPrompt(form) {
  return `Return valid JSON only, with no commentary. Research what this audience actively asks online about this business's topic. Business: ${business(form)}.
Return 32 questions: exactly 8 from each source below, written in the audience's own words the way they would type or post them. Use each source label exactly as written.
- "${QUESTION_SOURCES[0]}": questions shown in Google's People Also Ask boxes
- "${QUESTION_SOURCES[1]}": questions and struggles posted in relevant subreddits
- "${QUESTION_SOURCES[2]}": questions from Quora and niche community forums
- "${QUESTION_SOURCES[3]}": questions from comments, captions and in-app search on TikTok, Instagram and YouTube
Format: {"questions":[{"question":"...","source":"${QUESTION_SOURCES[1]}"}]}`;
}

export function pillarsPrompt(form, questions) {
  return `Return valid JSON only, with no commentary. Create 3 to 5 content pillars for a search-led social media calendar. Business: ${business(form)}. Audience questions to cover: ${JSON.stringify(questions.map((item) => item.question))}.
Format: {"pillars":[{"name":"<short pillar name>","description":"<one sentence on what this pillar covers and why it matters to the audience>"}]}`;
}

export function calendarPrompts(form, slots, pillars) {
  const chunks = [];
  for (let start = 0; start < slots.length; start += CALENDAR_CHUNK_SIZE) chunks.push(slots.slice(start, start + CALENDAR_CHUNK_SIZE));
  return chunks.map((chunk) => `Return valid JSON only, with no commentary. You are planning search-led social media content for this business: ${business(form)}.
Content pillars: ${JSON.stringify(pillars)}.
Write one post for each slot below. Keep day, date and platform exactly as given, answer the slot's audience question, and use its pillar. If a slot has a keyDate, tie the post to that event. Use a native format for each platform.
Slots: ${JSON.stringify(chunk)}
Format: {"posts":[{"day":1,"date":"YYYY-MM-DD","platform":"...","type":"<native format, e.g. Reel, Carousel, Text post, Short, Pin>","pillar":"...","search":"<the audience question>","topic":"<scroll-stopping post title>","hook":"<opening line or first 3 seconds>","outline":["<key point>","<key point>","<key point>"],"caption":"<ready-to-post caption, 2-4 short sentences>","cta":"<call to action>","visual":"<what to film, design or show>","hashtags":["#tag","#tag","#tag"],"bestTime":"<best posting time for this platform>","formatGuide":"<practical production notes for this platform and format>","why":"<one sentence on why this will get found and engage>"}]}`);
}

const starterPost = (slot) => ({
  ...slot,
  type: DEFAULT_TYPES[slot.platform] || 'Post',
  topic: slot.search || 'Answer a question your audience is asking',
  hook: '', outline: [], caption: '', visual: '', hashtags: [], why: '',
  cta: 'Save this post for later',
  bestTime: '9:00 AM',
  formatGuide: `Create a ${slot.platform} post with a clear hook, one useful insight and a simple call to action.`,
  placeholder: true
});

// Merges AI posts onto the schedule. The schedule stays authoritative for day, date and platform, so every slot is filled.
export function normalizeCalendar(aiPosts, slots) {
  const source = Array.isArray(aiPosts) ? aiPosts : [];
  return slots.map((slot) => {
    const post = source.find((item) => Number(item?.day) === slot.day);
    if (!post) return starterPost(slot);
    return { ...starterPost(slot), ...post, day: slot.day, date: slot.date, weekday: slot.weekday, platform: slot.platform, keyDate: slot.keyDate, placeholder: false,
      outline: Array.isArray(post.outline) ? post.outline : [], hashtags: Array.isArray(post.hashtags) ? post.hashtags : [] };
  });
}

// Saved calendars created before dates were stored only carry a name such as "2026-10 content calendar".
export function monthForSaved(calendar) {
  if (/^\d{4}-\d{2}$/.test(calendar.month || '')) return calendar.month;
  const fromName = /(\d{4}-\d{2})/.exec(calendar.name || '');
  if (fromName) return fromName[1];
  const fromDate = /^(\d{4}-\d{2})/.exec(calendar.data?.find((post) => post.date)?.date || '');
  return fromDate ? fromDate[1] : '';
}

export function groupQuestions(questions) {
  const groups = new Map(QUESTION_SOURCES.map((source) => [source, []]));
  questions.forEach((item, index) => { const source = item.source || 'Other searches'; if (!groups.has(source)) groups.set(source, []); groups.get(source).push({ ...item, index }); });
  return [...groups].filter(([, items]) => items.length).map(([source, items]) => ({ source, items }));
}

const list = (value) => (Array.isArray(value) ? value.join(value[0]?.startsWith?.('#') ? ' ' : ' | ') : value || '');

export function toCsv(rows, month) {
  const headers = ['Date', 'Day', 'Platform', 'Format', 'Pillar', 'Title', 'Hook', 'Key points', 'Caption', 'Call to action', 'Visual', 'Hashtags', 'Best time', 'Production notes', 'Audience question', 'Why it works', 'Important date'];
  const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const lines = rows.map((post) => [post.date || dateLabel(month, Number(post.day)), post.day, post.platform, post.type, post.pillar, post.topic, post.hook, list(post.outline), post.caption, post.cta, post.visual, list(post.hashtags), post.bestTime, post.formatGuide, post.search, post.why, post.keyDate]);
  // Leading BOM so Excel opens the file as UTF-8.
  return `﻿${[headers, ...lines].map((row) => row.map(escape).join(',')).join('\r\n')}`;
}

export function postToText(post, month) {
  return [
    `${dateLabel(month, Number(post.day))} - ${post.platform} ${post.type || ''}`.trim(),
    post.topic,
    post.hook && `Hook: ${post.hook}`,
    post.outline?.length && `Key points:\n${post.outline.map((point) => `- ${point}`).join('\n')}`,
    post.caption && `Caption: ${post.caption}`,
    post.cta && `Call to action: ${post.cta}`,
    post.visual && `Visual: ${post.visual}`,
    post.hashtags?.length && `Hashtags: ${post.hashtags.join(' ')}`,
    post.bestTime && `Best time to post: ${post.bestTime}`
  ].filter(Boolean).join('\n');
}
