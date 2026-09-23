const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('./config');

function assertJwtConfigured() {
  if (!config.jwtSecret) throw new Error('JWT_SECRET is not configured');
}

async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function createToken(user) {
  assertJwtConfigured();
  return jwt.sign({ sub: user._id.toString() }, config.jwtSecret, { expiresIn: '7d' });
}

function requireAuth(req, res, next) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token || !config.jwtSecret) return res.status(401).json({ success: false, error: 'Unauthorized' });
  try {
    req.auth = jwt.verify(token, config.jwtSecret);
    next();
  } catch {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}

module.exports = { hashPassword, verifyPassword, createToken, requireAuth };
