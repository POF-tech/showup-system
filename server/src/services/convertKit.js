const config = require('../config');
const logger = require('../logger');

class EmailProviderError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = 'EmailProviderError';
    this.statusCode = statusCode;
  }
}

async function subscribeUser(email, name) {
  if (!config.convertKitApiKey || !config.convertKitTagId) return;
  const response = await fetch(`https://api.convertkit.com/v3/tags/${config.convertKitTagId}/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: config.convertKitApiKey, email, first_name: name || '' })
  });
  if (!response.ok) throw new Error(`ConvertKit returned ${response.status}`);
}

async function sendInvitationEmail({ email, name, invitationUrl, expiresAt }) {
  if (config.convertKitApiKey && config.convertKitTagId) await subscribeUser(email, name);
  if (!config.resendApiKey || !config.emailFrom) {
    logger.warn('invitation.email.not_configured', { emailDomain: email.split('@')[1] });
    return false;
  }
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.resendApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: config.emailFrom, to: [email], subject: 'Your ShowUpp access is ready', html: `<p>${name ? `Hi ${name},` : 'Hi,'}</p><p>Your ShowUpp System access is ready.</p><p><a href="${invitationUrl}">Create your account</a></p><p>This invitation expires on ${new Date(expiresAt).toLocaleDateString()}.</p>` })
  });
  if (!response.ok) {
    logger.error('invitation.email.failure', { statusCode: response.status, emailDomain: email.split('@')[1] });
    const message = response.status === 401 || response.status === 403
      ? 'Invitation email provider rejected the credentials or sender address. Verify RESEND_API_KEY and EMAIL_FROM.'
      : `Invitation email provider returned ${response.status}`;
    throw new EmailProviderError(message, 502);
  }
  logger.info('invitation.email.sent', { emailDomain: email.split('@')[1] });
  return true;
}

module.exports = { subscribeUser, sendInvitationEmail, EmailProviderError };
