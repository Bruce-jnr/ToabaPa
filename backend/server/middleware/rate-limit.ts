import { createHash } from 'node:crypto';
import type { Request } from 'express';
import { ipKeyGenerator, rateLimit, type Options } from 'express-rate-limit';

export function apiRateLimit(options: Partial<Options>) {
  return rateLimit({
    standardHeaders: 'draft-8',
    ...options,
  });
}

export function rateLimitKeyFromBody(field: string, includeIp = true) {
  return (req: Request) => {
    const value = req.body?.[field];
    const normalized = typeof value === 'string'
      ? value.trim().toLowerCase().slice(0, 254)
      : '';
    const digest = createHash('sha256').update(normalized).digest('hex');
    return includeIp ? `${ipKeyGenerator(req.ip || '')}:${digest}` : digest;
  };
}

export function rateLimitPhoneKeyFromBody(field: string) {
  return (req: Request) => {
    const value = req.body?.[field];
    const digits = typeof value === 'string' ? value.replace(/\D/g, '') : '';
    const normalized = digits.startsWith('233')
      ? digits
      : digits.startsWith('0')
        ? `233${digits.slice(1)}`
        : `233${digits}`;
    return createHash('sha256').update(normalized).digest('hex');
  };
}
