const { MongoClient } = require('mongodb');
const config = require('./config');
const logger = require('./logger');

let client;
let database;
let connectionPromise;

async function getDb() {
  if (database) return database;
  if (connectionPromise) return connectionPromise;
  if (!config.mongoUri) throw new Error('MONGO_URI is not configured');

  connectionPromise = (async () => {
    const startedAt = Date.now();
    logger.info('database.connect.start', { database: config.mongoDb });
    const nextClient = new MongoClient(config.mongoUri, { serverSelectionTimeoutMS: 10000, connectTimeoutMS: 10000 });
    try {
      await nextClient.connect();
      const nextDatabase = nextClient.db(config.mongoDb);
      await Promise.all([
        nextDatabase.collection('users').createIndex({ email: 1 }, { unique: true }),
        nextDatabase.collection('calendars').createIndex({ userId: 1, createdAt: -1 })
      ]);
      client = nextClient;
      database = nextDatabase;
      logger.info('database.connect.success', { database: config.mongoDb, durationMs: Date.now() - startedAt });
      return database;
    } catch (error) {
      await nextClient.close().catch(() => {});
      logger.error('database.connect.failure', { database: config.mongoDb, durationMs: Date.now() - startedAt, err: error });
      throw error;
    } finally {
      connectionPromise = undefined;
    }
  })();

  return connectionPromise;
}

async function closeDb() {
  if (client) await client.close();
  client = undefined;
  database = undefined;
  connectionPromise = undefined;
  logger.info('database.connection.closed');
}

module.exports = { getDb, closeDb };
