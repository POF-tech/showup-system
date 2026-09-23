const crypto = require('node:crypto');
const pino = require('pino');

const isDevelopment = process.env.NODE_ENV !== 'production';
const options = {
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  redact: {
    paths: [
      'password',
      'token',
      'authorization',
      'apiKey',
      'jwtSecret',
      'mongoUri',
      'prompt',
      'body',
      'req.headers.authorization'
    ],
    censor: '[REDACTED]'
  },
  serializers: { err: pino.stdSerializers.err }
};

if (isDevelopment) {
  options.transport = {
    target: 'pino-pretty',
    options: { colorize: true, translateTime: 'SYS:standard', singleLine: true, ignore: 'pid,hostname' }
  };
}

const baseLogger = pino(options);

function write(level, event, details = {}) {
  baseLogger[level]({ event, ...details }, event);
}

module.exports = {
  debug: (event, details) => write('debug', event, details),
  info: (event, details) => write('info', event, details),
  warn: (event, details) => write('warn', event, details),
  error: (event, details) => write('error', event, details),
  fatal: (event, details) => write('fatal', event, details),
  requestId: () => crypto.randomUUID(),
  flush: () => new Promise((resolve) => baseLogger.flush(resolve))
};
