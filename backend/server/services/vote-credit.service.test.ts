import { PaymentProviderName, Prisma, VoteStatus } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ transaction: vi.fn(), findTransaction: vi.fn() }));
vi.mock('../db/prisma.js', () => ({
  prisma: {
    $transaction: mocks.transaction,
    voteTransaction: { findUnique: mocks.findTransaction },
  },
}));
vi.mock('./wallet.service.js', () => ({ recordVoteEarnings: vi.fn() }));
vi.mock('../alerts/alert-outbox.service.js', () => ({ enqueueAlert: vi.fn() }));

import { creditVerifiedPayment } from './vote-credit.service.js';

const verified = {
  successful: true,
  reference: 'TOMA-2026-RACE',
  amount: 100,
  currency: 'GHS',
  providerTransactionId: 'paystack-race',
  paymentMethod: 'card',
  paidAt: new Date(),
};

describe('vote credit concurrency', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retries a write conflict and reads the vote credited by the competing request', async () => {
    const transaction = { id: 'vote-1', orderId: 'order-1' };
    const tx = {
      voteOrder: { findUnique: vi.fn().mockResolvedValue({ id: 'order-1', voteStatus: VoteStatus.CREDITED }) },
      voteTransaction: { findUniqueOrThrow: vi.fn().mockResolvedValue(transaction) },
    };
    mocks.transaction
      .mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError('Write conflict', { code: 'P2034', clientVersion: '6.19.3' }))
      .mockImplementationOnce((callback) => callback(tx));

    await expect(creditVerifiedPayment(PaymentProviderName.PAYSTACK, verified)).resolves.toEqual(transaction);
    expect(mocks.transaction).toHaveBeenCalledTimes(2);
    expect(tx.voteTransaction.findUniqueOrThrow).toHaveBeenCalledWith({ where: { orderId: 'order-1' } });
  });
});
