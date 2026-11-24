import { describe, expect, it } from 'vitest';
import type { Request } from 'express';
import { rateLimitPhoneKeyFromBody } from '../middleware/rate-limit.js';
import { createVoteOrder, createVoteOrderSchema } from '../services/vote-order.service.js';

describe('input hardening', () => {
  it('does not accept a caller-selected vote channel', () => {
    const parsed = createVoteOrderSchema.parse({
      candidateId: 'cm12345678901234567890123',
      quantity: 1,
      phone: '0244000000',
      channel: 'USSD',
    });
    expect(parsed).not.toHaveProperty('channel');
  });

  it('uses one rate-limit key for equivalent Ghana phone formats', () => {
    const key = rateLimitPhoneKeyFromBody('phone');
    const request = (phone: string) => ({ body: { phone } }) as Request;
    expect(key(request('0244000000'))).toBe(key(request('+233 24 400 0000')));
  });

  it('accepts web vote details without a phone but still requires one for USSD', async () => {
    const input = { candidateId: 'cm12345678901234567890123', quantity: 1 };
    expect(createVoteOrderSchema.parse(input)).not.toHaveProperty('phone');
    await expect(createVoteOrder(input, 'USSD')).rejects.toMatchObject({ code: 'PHONE_REQUIRED' });
  });
});
