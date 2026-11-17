import { SignJWT, jwtVerify } from 'jose';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import { prisma } from '../db/prisma.js';

export const SESSION_COOKIE = 'toabapa_session';
export const SESSION_MAX_AGE_MS = 5 * 60 * 60 * 1000;
export const SESSION_IDLE_MS = 30 * 60 * 1000;
const secret = new TextEncoder().encode(env.SESSION_SECRET);

export type SessionPayload = {
  userId: string;
  organizationId: string;
  role: 'ORGANIZATION_OWNER' | 'EVENT_ADMIN' | 'FINANCE_ADMIN' | 'RESULTS_VIEWER';
  sessionId: string;
  sessionVersion: number;
  globalRole: 'USER' | 'SUPER_ADMIN';
};

export async function createSession(payload: Omit<SessionPayload, 'sessionId'>) {
  const sessionId = randomUUID();
  const token = await new SignJWT({ ...payload, sessionId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('5h')
    .setSubject(payload.userId)
    .setJti(sessionId)
    .setIssuer('toabapa-api')
    .setAudience('toabapa-organizer')
    .sign(secret);
  await prisma.authSession.create({ data: { id: sessionId, userId: payload.userId, expiresAt: new Date(Date.now() + SESSION_MAX_AGE_MS) } });
  return token;
}

export async function verifySession(token: string): Promise<SessionPayload> {
  const { payload } = await jwtVerify(token, secret, {
    algorithms: ['HS256'],
    issuer: 'toabapa-api',
    audience: 'toabapa-organizer',
  });
  const sessionId = String(payload.sessionId || payload.jti || '');
  const now = new Date();
  if (!payload.iat || now.getTime() - payload.iat * 1000 >= SESSION_MAX_AGE_MS)
    throw new Error('Session has expired.');
  const activeSince = new Date(now.getTime() - SESSION_IDLE_MS);
  const touched = sessionId ? await prisma.authSession.updateMany({
    where: { id: sessionId, userId: String(payload.userId), revokedAt: null, expiresAt: { gt: now }, lastActivityAt: { gt: activeSince } },
    data: { lastActivityAt: now },
  }) : { count: 0 };
  if (touched.count !== 1) {
    throw new Error('Session has been revoked.');
  }
  return {
    userId: String(payload.userId),
    organizationId: String(payload.organizationId),
    role: payload.role as SessionPayload['role'],
    sessionId,
    sessionVersion: Number(payload.sessionVersion),
    globalRole: payload.globalRole as SessionPayload['globalRole'],
  };
}

export async function revokeSession(sessionId: string) {
  await prisma.authSession.updateMany({ where: { id: sessionId, revokedAt: null }, data: { revokedAt: new Date() } });
}
