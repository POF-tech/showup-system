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
}

function isPlaceholder(value) {
  return !value || String(value).startsWith('PASTE_') || String(value).includes('your_');
}

module.exports = { ...config, validateConfig, isPlaceholder };
