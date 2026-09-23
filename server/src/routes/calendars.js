const express = require('express');
const { ObjectId } = require('mongodb');
const { getDb } = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();
router.use(requireAuth);

router.post('/save', async (req, res, next) => {
  const { name, data } = req.body || {};
  if (typeof name !== 'string' || !Array.isArray(data)) return res.status(400).json({ success: false, error: 'Missing required fields' });
  try {
    const calendar = { userId: new ObjectId(req.auth.sub), name, data, createdAt: new Date() };
    const result = await (await getDb()).collection('calendars').insertOne(calendar);
    return res.json({ success: true, id: result.insertedId.toString(), message: 'Calendar saved successfully' });
  } catch (error) { next(error); }
});

router.get('/', async (req, res, next) => {
  try {
    const calendars = await (await getDb()).collection('calendars').find({ userId: new ObjectId(req.auth.sub) }).sort({ createdAt: -1 }).toArray();
    return res.json({ success: true, calendars: calendars.map(({ _id, name, data, createdAt }) => ({ id: _id.toString(), name, data, created_at: createdAt })) });
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
