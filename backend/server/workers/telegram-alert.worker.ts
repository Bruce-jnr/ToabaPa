import type { StoredAlertPayload } from "../alerts/alert.types.js";
import { renderTelegramAlert } from "../alerts/alert-redaction.js";
import {
  sendTelegramMessage,
  TelegramDeliveryError,
} from "../alerts/telegram.transport.js";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { prisma } from "../db/prisma.js";

const RUN_INTERVAL_MS = 10_000;
let timer: NodeJS.Timeout | undefined;
let running = false;
let circuitOpenUntil = 0;
let consecutiveFailures = 0;

function retryDelay(attempt: number) {
  const schedule = [30_000, 120_000, 600_000, 1_800_000];
  return schedule[Math.min(attempt - 1, schedule.length - 1)] ?? 1_800_000;
}

async function run() {
  if (running || !env.TELEGRAM_ALERTS_ENABLED || Date.now() < circuitOpenUntil)
    return;
  running = true;
  try {
    await prisma.alertOutbox.updateMany({
      where: {
        status: "PROCESSING",
        updatedAt: { lt: new Date(Date.now() - 5 * 60_000) },
      },
      data: { status: "PENDING", nextAttemptAt: new Date() },
    });
    const startOfUtcDay = new Date();
    startOfUtcDay.setUTCHours(0, 0, 0, 0);
    const deliveredToday = await prisma.alertOutbox.count({
      where: { status: "DELIVERED", deliveredAt: { gte: startOfUtcDay } },
    });
    if (deliveredToday >= env.TELEGRAM_ALERT_DAILY_LIMIT) return;
    const items = await prisma.alertOutbox.findMany({
      where: { status: "PENDING", nextAttemptAt: { lte: new Date() } },
      orderBy: { createdAt: "asc" },
      take: Math.min(20, env.TELEGRAM_ALERT_DAILY_LIMIT - deliveredToday),
    });
    for (const item of items) {
      const claimed = await prisma.alertOutbox.updateMany({
        where: { id: item.id, status: "PENDING", attempts: item.attempts },
        data: { status: "PROCESSING", attempts: { increment: 1 } },
      });
      if (!claimed.count) continue;
      try {
        await sendTelegramMessage(
          item.destination,
          renderTelegramAlert(
            item.safePayload as unknown as StoredAlertPayload,
            item.occurrenceCount,
          ),
        );
        await prisma.alertOutbox.update({
          where: { id: item.id },
          data: {
            status: "DELIVERED",
            deliveredAt: new Date(),
            lastErrorCode: null,
          },
        });
        consecutiveFailures = 0;
      } catch (error) {
        consecutiveFailures += 1;
        const attempt = item.attempts + 1;
        const telegramError =
          error instanceof TelegramDeliveryError ? error : undefined;
        const exhausted = attempt >= env.TELEGRAM_MAX_DELIVERY_ATTEMPTS;
        const retryMs = telegramError?.retryAfterSeconds
          ? telegramError.retryAfterSeconds * 1_000
          : retryDelay(attempt);
        await prisma.alertOutbox.update({
          where: { id: item.id },
          data: {
            status: exhausted ? "FAILED" : "PENDING",
            nextAttemptAt: new Date(Date.now() + retryMs),
            lastErrorCode: telegramError?.code || "DELIVERY_FAILED",
          },
        });
        if (
          ["NOT_CONFIGURED", "HTTP_401", "HTTP_403"].includes(
            telegramError?.code || "",
          ) ||
          consecutiveFailures >= 3
        )
          circuitOpenUntil = Date.now() + 5 * 60_000;
        logger.error(
          { err: error, alertId: item.id, exhausted },
          "Telegram alert delivery failed",
        );
      }
    }
  } catch (error) {
    logger.error({ err: error }, "Telegram alert worker failed");
  } finally {
    running = false;
  }
}

export function startTelegramAlertWorker() {
  if (!env.TELEGRAM_ALERTS_ENABLED) return;
  timer = setInterval(() => void run(), RUN_INTERVAL_MS);
  timer.unref();
  void run();
}

export function stopTelegramAlertWorker() {
  if (timer) clearInterval(timer);
}
