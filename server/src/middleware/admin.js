const crypto = require('node:crypto');
const config = require('../config');

function requireAdmin(req, res, next) {
  const supplied = req.get('x-admin-key') || '';
  if (!config.adminApiKey || supplied.length !== config.adminApiKey.length || !crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(config.adminApiKey))) {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }
  next();
}

module.exports = { requireAdmin };
