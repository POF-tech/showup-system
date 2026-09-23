const { ObjectId } = require('mongodb');
const { getDb } = require('../db');

const GROWTH_ACADEMY = 'GROWTH_ACADEMY';

async function hasActiveGrowthAccess(userId) {
  const db = await getDb();
  const userObjectId = typeof userId === 'string' ? new ObjectId(userId) : userId;
  const entitlement = await db.collection('entitlements').findOne({ userId: userObjectId, type: GROWTH_ACADEMY, status: 'ACTIVE' });
  return Boolean(entitlement);
}

async function grantGrowthAccess(userId, source = 'invitation', session) {
  const db = await getDb();
  const userObjectId = typeof userId === 'string' ? new ObjectId(userId) : userId;
  await db.collection('entitlements').updateOne(
    { userId: userObjectId, type: GROWTH_ACADEMY },
    { $set: { status: 'ACTIVE', source, updatedAt: new Date() }, $setOnInsert: { userId: userObjectId, type: GROWTH_ACADEMY, createdAt: new Date() } },
    { upsert: true, ...(session ? { session } : {}) }
  );
}

module.exports = { GROWTH_ACADEMY, hasActiveGrowthAccess, grantGrowthAccess };