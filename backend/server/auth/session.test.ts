import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const records = vi.hoisted(() => new Map<string, { userId: string; expiresAt: Date; lastActivityAt: Date; revokedAt: Date | null }>());
vi.mock('../db/prisma.js', () => ({
  prisma: { authSession: {
    create: vi.fn(async ({ data }) => {
      records.set(data.id, { ...data, lastActivityAt: new Date(), revokedAt: null });
    }),
    updateMany: vi.fn(async ({ where, data }) => {
      const row = records.get(where.id);
      if (!row || row.userId !== where.userId || row.revokedAt || row.expiresAt <= where.expiresAt.gt || row.lastActivityAt <= where.lastActivityAt.gt)
        return { count: 0 };
      row.lastActivityAt = data.lastActivityAt;
      return { count: 1 };
    }),
  } },
}));

import { createSession, SESSION_IDLE_MS, SESSION_MAX_AGE_MS, verifySession } from './session.js';

const user = { userId: 'user-1', organizationId: 'org-1', role: 'ORGANIZATION_OWNER' as const, sessionVersion: 0, globalRole: 'USER' as const };

describe('login session lifetime', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-17T12:00:00Z')); records.clear(); });
  afterEach(() => vi.useRealTimers());

  it('renews activity before 30 minutes and rejects at the idle boundary', async () => {
    const token = await createSession(user);
    vi.setSystemTime(Date.now() + SESSION_IDLE_MS - 1_000);
    await expect(verifySession(token)).resolves.toMatchObject({ userId: user.userId });
    vi.setSystemTime(Date.now() + SESSION_IDLE_MS - 1_000);
    await expect(verifySession(token)).resolves.toMatchObject({ userId: user.userId });
    vi.setSystemTime(Date.now() + SESSION_IDLE_MS);
    await expect(verifySession(token)).rejects.toThrow();
  });

  it('enforces five hours even when database activity is fresh', async () => {
    const token = await createSession(user);
    vi.setSystemTime(Date.now() + SESSION_MAX_AGE_MS);
    await expect(verifySession(token)).rejects.toThrow();
  });
});
