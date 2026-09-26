const express = require('express');
const { ObjectId } = require('mongodb');
const { getDb } = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();
router.use(requireAuth);

router.post('/save', async (req, res, next) => {
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const { name, data, month } = body || {};
  if (typeof name !== 'string' || !name.trim() || !Array.isArray(data) || data.length === 0) {
    return res.status(400).json({ success: false, error: 'Calendar name and at least one calendar post are required', requestId: req.requestId });
  }
  try {
    const calendar = { userId: new ObjectId(req.auth.sub), name, data, ...(typeof month === 'string' && /^\d{4}-\d{2}$/.test(month) ? { month } : {}), createdAt: new Date() };
    const result = await (await getDb()).collection('calendars').insertOne(calendar);
    return res.json({ success: true, id: result.insertedId.toString(), message: 'Calendar saved successfully' });
  } catch (error) { next(error); }
});

router.get('/', async (req, res, next) => {
  try {
    const calendars = await (await getDb()).collection('calendars').find({ userId: new ObjectId(req.auth.sub) }).sort({ createdAt: -1 }).toArray();
    return res.json({ success: true, calendars: calendars.map(({ _id, name, data, month, createdAt }) => ({ id: _id.toString(), name, data, month, created_at: createdAt })) });
  } catch (error) { next(error); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const calendar = await (await getDb()).collection('calendars').findOne({ _id: new ObjectId(req.params.id), userId: new ObjectId(req.auth.sub) });
    if (!calendar) return res.status(404).json({ success: false, error: 'Calendar not found or unauthorized' });
    return res.json({ success: true, calendar: { ...calendar, id: calendar._id.toString() } });
  } catch (error) { next(error); }
});

module.exports = router;
