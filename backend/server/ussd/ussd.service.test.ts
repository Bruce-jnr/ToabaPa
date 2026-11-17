import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ claimed: false, orders: 0, charges: 0, failOrder: false }));
vi.mock('../db/prisma.js', () => ({ prisma: {
  voteOrder: {
    findUnique: vi.fn(async () => null),
    findUniqueOrThrow: vi.fn(async () => ({ organization: { email: 'test@example.com' } })),
    update: vi.fn(async () => ({})),
  },
  ussdSession: {
    findUnique: vi.fn(async () => ({ expiresAt: new Date(Date.now() + 120_000), payload: {
      step: 'CONFIRM_ORDER', phone: '233551234987', userId: 'NALOTest', network: 'MTN',
      candidateId: 'candidate-1', candidateName: 'Nominee', quantity: 1, amount: 100,
    } })),
    deleteMany: vi.fn(async () => {
      if (state.claimed) return { count: 0 };
      state.claimed = true;
      return { count: 1 };
    }),
  },
} }));
vi.mock('../services/vote-order.service.js', () => ({ createVoteOrder: vi.fn(async () => {
  state.orders += 1;
  if (state.failOrder) throw new Error('Order storage failed');
  return { id: 'order-1', paymentReference: 'TEST-1', amount: 100, currency: 'GHS', quantity: 1 };
}) }));
vi.mock('../payments/paystack.provider.js', () => ({ paystackProvider: {
  initializeMobileMoney: vi.fn(async () => { state.charges += 1; return { status: 'pay_offline', displayText: 'Approve payment' }; }),
} }));
vi.mock('../services/vote-credit.service.js', () => ({ creditVerifiedPayment: vi.fn() }));

import { handleUssd } from './ussd.service.js';

const confirmation = { SESSIONID: 'session-1', USERID: 'NALOTest', MSISDN: '233551234987', USERDATA: '1', MSGTYPE: false, NETWORK: 'MTN' };

describe('USSD confirmation replay', () => {
  beforeEach(() => { state.claimed = false; state.orders = 0; state.charges = 0; state.failOrder = false; });

  it('allows one order and charge when two confirmations arrive together', async () => {
    const replies = await Promise.all([handleUssd(confirmation), handleUssd(confirmation)]);
    expect(state.orders).toBe(1);
    expect(state.charges).toBe(1);
    expect(replies.filter((reply) => reply.message.includes('Approve payment'))).toHaveLength(1);
    expect(replies.every((reply) => !reply.continueSession)).toBe(true);
  });

  it('does not charge or create another order when creation fails after claim', async () => {
    state.failOrder = true;
    await expect(handleUssd(confirmation)).rejects.toThrow('Order storage failed');
    expect((await handleUssd(confirmation)).message).toContain('already submitted or session expired');
    expect(state.orders).toBe(1);
    expect(state.charges).toBe(0);
  });
});
