const express = require('express');
const cors = require('cors');
const config = require('./config');
const authRoutes = require('./routes/auth');
const calendarRoutes = require('./routes/calendars');
const generateRoutes = require('./routes/generate');
const { getDb, closeDb } = require('./db');
const logger = require('./logger');

const app = express();
app.use(cors({ origin: config.frontendOrigin }));
app.use((req, res, next) => {
  const requestId = logger.requestId();
  const startedAt = Date.now();
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  res.on('finish', () => logger.info('http.request.completed', {
    requestId,
    method: req.method,
    path: req.path,
    statusCode: res.statusCode,
    durationMs: Date.now() - startedAt
  }));
  next();
});
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(express.text({ type: ['text/plain', 'application/json'], limit: '2mb' }));
app.get('/health', async (req, res) => {
  try {
    await getDb();
    res.json({ ok: true, database: 'connected' });
  } catch (error) {
    logger.warn('health.database.unavailable', { requestId: req.requestId, err: error });
    res.status(503).json({ ok: false, database: 'unavailable' });
  }
});
app.use('/api/auth', authRoutes);
app.use('/api/calendars', calendarRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/generate', generateRoutes);
app.use('/', generateRoutes);
app.use((req, res) => res.status(404).json({ success: false, error: 'Endpoint not found', requestId: req.requestId }));
app.use((error, req, res, next) => {
  logger.error('http.request.failure', { requestId: req.requestId, method: req.method, path: req.path, err: error });
  res.status(500).json({ success: false, error: 'Server error', requestId: req.requestId });
});

if (require.main === module) {
  try {
    config.validateConfig({ requireAi: true });
    const server = app.listen(config.port, () => logger.info('server.started', {
      port: config.port,
      environment: process.env.NODE_ENV || 'development',
      logLevel: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug')
    }));
    let isShuttingDown = false;
    const shutdown = (signal) => {
      if (isShuttingDown) return;
      isShuttingDown = true;
      logger.info('server.shutdown.start', { signal });
      server.close(async () => {
        await closeDb();
        logger.info('server.shutdown.complete', { signal });
        await logger.flush();
        process.exit(0);
      });
    };
    process.once('SIGINT', () => shutdown('SIGINT'));
    process.once('SIGTERM', () => shutdown('SIGTERM'));
    process.on('uncaughtException', (error) => {
      logger.fatal('process.uncaught_exception', { err: error });
      process.exit(1);
    });
    process.on('unhandledRejection', (error) => {
      logger.fatal('process.unhandled_rejection', { err: error });
      process.exit(1);
    });
  } catch (error) {
    logger.error('server.configuration.failure', { err: error });
    process.exitCode = 1;
  }
}
module.exports = app;
