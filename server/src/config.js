const path = require('node:path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const config = {
  port: Number(process.env.PORT || 4000),
  mongoUri: process.env.MONGO_URI || process.env.MONGODB_URI,
  mongoDb: process.env.MONGODB_DB || 'show_up',
  jwtSecret: process.env.JWT_SECRET,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
  aiTimeoutMs: Number(process.env.AI_TIMEOUT_MS || 90000),
  invitationExpiryDays: Number(process.env.INVITATION_EXPIRY_DAYS || 7),
  publicAppUrl: process.env.PUBLIC_APP_URL || 'http://localhost:3000',
  adminEmails: String(process.env.ADMIN_EMAILS || '').split(',').map((email) => email.trim().toLowerCase()).filter(Boolean),
  resendApiKey: process.env.RESEND_API_KEY,
  emailFrom: process.env.EMAIL_FROM,
  convertKitApiKey: process.env.CONVERTKIT_API_KEY,
  convertKitTagId: process.env.CONVERTKIT_TAG_ID,
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000'
};

function validateConfig({ requireAi = false } = {}) {
  const required = [
    ['mongoUri', 'MONGO_URI'],
    ['jwtSecret', 'JWT_SECRET']
  ];
  if (requireAi) required.push(['anthropicApiKey', 'ANTHROPIC_API_KEY']);
  const missing = required.filter(([key]) => isPlaceholder(config[key]));
  if (missing.length) throw new Error(`Missing environment variables: ${missing.map(([, name]) => name).join(', ')}`);
  if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) {
    throw new Error('PORT must be a valid TCP port');
  }
  if (!Number.isInteger(config.aiTimeoutMs) || config.aiTimeoutMs < 1000 || config.aiTimeoutMs > 120000) {
    throw new Error('AI_TIMEOUT_MS must be between 1000 and 120000 milliseconds');
  }
  if (!Number.isInteger(config.invitationExpiryDays) || config.invitationExpiryDays < 1 || config.invitationExpiryDays > 30) {
    throw new Error('INVITATION_EXPIRY_DAYS must be between 1 and 30');
  }
}

function isPlaceholder(value) {
  return !value || String(value).startsWith('PASTE_') || String(value).includes('your_');
}

module.exports = { ...config, validateConfig, isPlaceholder };
