const express = require('express');
const { ObjectId } = require('mongodb');
const { getDb } = require('../db');
const { requireAuth } = require('../auth');
const { generateJson } = require('../services/ai');
const logger = require('../logger');

const router = express.Router();
router.post('/', requireAuth, async (req, res, next) => {
  let parsedBody = req.body;
  if (typeof parsedBody === 'string') {
    try { parsedBody = JSON.parse(parsedBody); } catch { parsedBody = {}; }
  }
  const body = parsedBody && typeof parsedBody === 'object' ? parsedBody : {};
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
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
    if (user.plan === 'free' && user.usageCount >= 25) return res.status(403).json({ success: false, error: 'Upgrade required to continue' });
    phase = 'ai.generate';
    const result = await generateJson(prompt, body.max_tokens || 1500);
    phase = 'database.usage_update';
    await db.collection('users').updateOne({ _id: user._id }, { $inc: { usageCount: 1 } });
    return res.json(result);
  } catch (error) {
    logger.error('generate.request.failure', { requestId: req.requestId, phase, errorName: error.name, errorMessage: error.message, statusCode: error.statusCode || 500 });
    next(error);
  }
});
module.exports = router;
