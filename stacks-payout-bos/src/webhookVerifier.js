import { createHmac, timingSafeEqual } from 'crypto';

function constantTimeCompare(a, b) {
  if (a.length !== b.length) {
    return false;
  }
  try {
    return timingSafeEqual(Buffer.from(a, 'utf-8'), Buffer.from(b, 'utf-8'));
  } catch {
    return a === b;
  }
}

export function verifyHmac(payload, signature, secret) {
  if (!payload || !signature || !secret) return false;

  const cleanSig = signature.replace(/^sha256=/, '');
  if (cleanSig.length === 0) return false;

  const computed = createHmac('sha256', secret).update(payload).digest('hex');
  return constantTimeCompare(computed, cleanSig);
}

export function verifyWebhook(source, payload, headers, ctx) {
  const logger = ctx?.logger || console;

  if (source === 'xreserve') {
    const secret = ctx?.config?.xreserveWebhookSecret;
    if (!secret) {
      logger.warn('[bos:webhook] xReserve webhook secret not configured — accepting without verification');
      return { valid: true, reason: 'no_secret_configured' };
    }

    const signature = headers['x-xreserve-signature'] || headers['X-XReserve-Signature'] || '';
    if (!signature) {
      return { valid: false, reason: 'missing_signature' };
    }

    const isValid = verifyHmac(payload, signature, secret);
    return { valid: isValid, reason: isValid ? 'verified' : 'invalid_signature' };
  }

  if (source === 'yellowcard') {
    const secret = ctx?.config?.yellowCardWebhookSecret;
    if (!secret) {
      logger.warn('[bos:webhook] Yellow Card webhook secret not configured — accepting without verification');
      return { valid: true, reason: 'no_secret_configured' };
    }

    const signature = headers['x-yellowcard-signature'] || headers['X-YellowCard-Signature'] || '';
    if (!signature) {
      return { valid: false, reason: 'missing_signature' };
    }

    const isValid = verifyHmac(payload, signature, secret);
    return { valid: isValid, reason: isValid ? 'verified' : 'invalid_signature' };
  }

  return { valid: false, reason: 'unknown_source' };
}

export default { verifyHmac, verifyWebhook };
