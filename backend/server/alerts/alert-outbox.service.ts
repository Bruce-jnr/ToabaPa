import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { prisma } from "../db/prisma.js";
import { sanitizeDetails } from "./alert-redaction.js";
import type { SecurityAlert, StoredAlertPayload } from "./alert.types.js";

type AlertDatabase = {
  alertOutbox: typeof prisma.alertOutbox;
};

function makeDedupeKey(alert: SecurityAlert, now: Date) {
  const bucket = Math.floor(
    now.getTime() / (env.TELEGRAM_ALERT_COOLDOWN_SECONDS * 1000),
  );
  return createHash("sha256")
    .update(
      [
        alert.code,
        env.NODE_ENV,
        alert.organizationId,
        alert.eventId,
        alert.resourceId,
        ...(alert.dedupeParts || []),
        bucket,
      ]
        .map((value) => String(value ?? ""))
        .join("|"),
    )
    .digest("hex");
}

export async function enqueueAlert(
  alert: SecurityAlert,
  database: AlertDatabase = prisma,
) {
  if (!env.TELEGRAM_ALERTS_ENABLED || !env.TELEGRAM_CHAT_ID) return null;
  try {
    const now = new Date();
    const threshold = Math.max(1, alert.threshold || 1);
    const dedupeKey = makeDedupeKey(alert, now);
    const payload: StoredAlertPayload = {
      code: alert.code.slice(0, 80),
      severity: alert.severity,
      title: alert.title.slice(0, 100),
      operatorAction: alert.operatorAction.slice(0, 240),
      details: sanitizeDetails(alert.details),
      organizationId: alert.organizationId?.slice(0, 100),
      eventId: alert.eventId?.slice(0, 100),
      resourceType: alert.resourceType?.slice(0, 80),
      resourceId: alert.resourceId?.slice(0, 100),
      correlationId: alert.correlationId?.slice(0, 100),
      occurredAt: now.toISOString(),
      environment: env.NODE_ENV,
    };
    const item = await database.alertOutbox.upsert({
      where: { dedupeKey },
      create: {
        eventCode: payload.code,
        severity: payload.severity,
        dedupeKey,
        destination: env.TELEGRAM_CHAT_ID,
        safePayload: payload as unknown as Prisma.InputJsonValue,
        status: threshold > 1 ? "SUPPRESSED" : "PENDING",
      },
      update: {
        occurrenceCount: { increment: 1 },
        safePayload: payload as unknown as Prisma.InputJsonValue,
      },
    });
    if (item.status === "SUPPRESSED" && item.occurrenceCount >= threshold)
      return database.alertOutbox.update({
        where: { id: item.id },
        data: { status: "PENDING", nextAttemptAt: now },
      });
    return item;
  } catch (error) {
    logger.error(
      { err: error, alertCode: alert.code },
      "Unable to enqueue Telegram alert",
    );
    return null;
  }
}
