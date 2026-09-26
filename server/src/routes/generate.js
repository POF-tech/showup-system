const express = require('express');
const { ObjectId } = require('mongodb');
const { getDb } = require('../db');
const { requireAuth } = require('../auth');
const { generateJson } = require('../services/ai');
const logger = require('../logger');
const { hasActiveGrowthAccess } = require('../services/entitlements');

const router = express.Router();
const MAX_CALENDAR_PARTS = 6;

// A calendar is generated as several smaller prompts in parallel so a full month fits within token and time limits.
async function generateCalendarParts(prompts, maxTokens, generate = generateJson) {
  const results = await Promise.allSettled(prompts.map((item) => generate(item, maxTokens)));
  const fulfilled = results.filter((result) => result.status === 'fulfilled');
  if (!fulfilled.length) throw results[0].reason;
  const posts = fulfilled.flatMap((result) => (Array.isArray(result.value?.posts) ? result.value.posts : []));
  return { posts, failedParts: results.length - fulfilled.length };
}
router.post('/', requireAuth, async (req, res, next) => {
  let parsedBody = req.body;
  if (typeof parsedBody === 'string') {
    try { parsedBody = JSON.parse(parsedBody); } catch { parsedBody = {}; }
  }
  const body = parsedBody && typeof parsedBody === 'object' ? parsedBody : {};
  const partPrompts = body.stage === 'calendar' && Array.isArray(body.prompts)
    ? body.prompts.filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim()).slice(0, MAX_CALENDAR_PARTS)
    : [];
  const prompt = partPrompts.length ? partPrompts[0] : (typeof body.prompt === 'string' ? body.prompt.trim() : '');
  logger.debug('generate.request.received', {
    requestId: req.requestId,
    contentType: req.get('content-type'),
    bodyType: typeof req.body,
    bodyKeys: Object.keys(body),
    hasPrompt: prompt.length > 0
  });
  if (!prompt) {
    logger.warn('generate.request.invalid', { requestId: req.requestId, reason: 'missing_prompt', contentType: req.get('content-type'), bodyType: typeof req.body, bodyKeys: Object.keys(body) });
    const response = { success: false, error: 'Missing prompt', requestId: req.requestId };
    if (process.env.NODE_ENV !== 'production') response.debug = { contentType: req.get('content-type') || null, bodyType: typeof req.body, bodyKeys: Object.keys(body) };
    return res.status(400).json(response);
  }
  let phase = 'database.connect';
  try {
    const db = await getDb();
    phase = 'database.user_lookup';
    const user = await db.collection('users').findOne({ _id: new ObjectId(req.auth.sub) });
    if (!user) return res.status(401).json({ success: false, error: 'User not found' });
    if (user.accountStatus === 'DEACTIVATED') return res.status(403).json({ success: false, error: 'This account is deactivated.' });
    const isCalendarGeneration = body.stage === 'calendar';
    const unlimited = user.plan === 'premium' || await hasActiveGrowthAccess(user._id);
    if (isCalendarGeneration && !unlimited) {
      const calendarCount = user.calendarCount || await db.collection('calendars').countDocuments({ userId: user._id });
      if (calendarCount >= 1) return res.status(403).json({ success: false, error: 'Your free calendar has already been used.' });
    }
    if (!isCalendarGeneration && !unlimited && user.plan === 'free' && user.usageCount >= 25) return res.status(403).json({ success: false, error: 'Usage limit reached' });
    phase = 'ai.generate';
    const maxTokens = Math.min(Number(body.max_tokens) || 1500, 8000);
    const result = partPrompts.length ? await generateCalendarParts(partPrompts, maxTokens) : await generateJson(prompt, maxTokens);
    phase = 'database.usage_update';
    await db.collection('users').updateOne({ _id: user._id }, { $inc: { usageCount: 1, ...(isCalendarGeneration ? { calendarCount: 1 } : {}) } });
    return res.json(result);
  } catch (error) {
    logger.error('generate.request.failure', { requestId: req.requestId, phase, errorName: error.name, errorMessage: error.message, statusCode: error.statusCode || 500 });
    next(error);
  }
});
module.exports = router;
module.exports.generateCalendarParts = generateCalendarParts;
