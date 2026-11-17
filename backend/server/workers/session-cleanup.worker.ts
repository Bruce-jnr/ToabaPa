import { prisma } from '../db/prisma.js';
import { logger } from '../config/logger.js';

const INTERVAL_MS = 60 * 60 * 1000;
let timer: NodeJS.Timeout | undefined;
let running = false;

export async function cleanExpiredSessions(now = new Date()) {
  const [auth, ussd] = await Promise.all([
    prisma.authSession.deleteMany({ where: { expiresAt: { lte: now } } }),
    prisma.ussdSession.deleteMany({ where: { expiresAt: { lte: now } } }),
  ]);
  return { auth: auth.count, ussd: ussd.count };
}

async function run() {
  if (running) return;
  running = true;
  try {
    await cleanExpiredSessions();
  } catch (error) {
    logger.error({ err: error }, 'Session cleanup failed');
  } finally {
    running = false;
  }
}

export function startSessionCleanupWorker() {
  timer = setInterval(() => void run(), INTERVAL_MS);
  timer.unref();
  void run();
}

export function stopSessionCleanupWorker() {
  if (timer) clearInterval(timer);
}
