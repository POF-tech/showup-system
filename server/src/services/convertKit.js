const config = require('../config');

async function subscribeUser(email, name) {
  if (!config.convertKitApiKey || !config.convertKitTagId) return;
  const response = await fetch(`https://api.convertkit.com/v3/tags/${config.convertKitTagId}/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: config.convertKitApiKey, email, first_name: name || '' })
  });
  if (!response.ok) throw new Error(`ConvertKit returned ${response.status}`);
}

module.exports = { subscribeUser };
