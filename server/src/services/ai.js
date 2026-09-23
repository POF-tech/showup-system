const config = require('../config');
const logger = require('../logger');

class AiProviderError extends Error {
  constructor(message, statusCode, providerRequestId) {
    super(message);
    this.name = 'AiProviderError';
    this.statusCode = statusCode;
    this.providerRequestId = providerRequestId;
  }
}

async function generateJson(prompt, maxTokens = 1500) {
  if (config.isPlaceholder(config.anthropicApiKey)) {
    throw new AiProviderError('AI service is not configured. Set ANTHROPIC_API_KEY in server/.env.', 503);
  }
  const startedAt = Date.now();
  logger.info('ai.generate.start', { model: config.anthropicModel, maxTokens, timeoutMs: config.aiTimeoutMs });
  let response;
  try {
    response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': config.anthropicApiKey,
        'anthropic-version': '2023-06-01'
      },
      signal: AbortSignal.timeout(config.aiTimeoutMs),
      body: JSON.stringify({ model: config.anthropicModel, max_tokens: maxTokens, messages: [{ role: 'user', content: [{ type: 'text', text: prompt }] }] })
    });
  } catch (error) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      logger.error('ai.generate.timeout', { model: config.anthropicModel, timeoutMs: config.aiTimeoutMs, durationMs: Date.now() - startedAt });
      throw new AiProviderError(`AI provider timed out after ${config.aiTimeoutMs}ms.`, 504);
    }
    throw error;
  }
  const data = await response.json();
  if (!response.ok) {
    const providerRequestId = response.headers.get('request-id') || response.headers.get('x-request-id') || undefined;
    logger.error('ai.generate.failure', { statusCode: response.status, providerRequestId, durationMs: Date.now() - startedAt });
    const message = response.status === 401 ? 'AI provider authentication failed. Check ANTHROPIC_API_KEY.' : 'AI provider request failed.';
    throw new AiProviderError(message, 502, providerRequestId);
  }
  const text = Array.isArray(data.content) ? data.content.map((item) => item.text || '').join('') : '';
  try {
    const result = JSON.parse(text.replace(/```json\n?/g, '').replace(/```/g, '').trim());
    logger.info('ai.generate.success', { model: config.anthropicModel, durationMs: Date.now() - startedAt });
    return result;
  } catch (error) {
    logger.error('ai.generate.invalid_json', { durationMs: Date.now() - startedAt, err: error });
    throw new AiProviderError('AI provider returned invalid JSON.', 502);
  }
}

module.exports = { generateJson, AiProviderError };
