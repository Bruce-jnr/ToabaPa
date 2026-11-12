import { createHash } from "node:crypto";
import type { SafeAlertValue, StoredAlertPayload } from "./alert.types.js";

function cleanString(value: string, maxLength = 180) {
  return value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function maskReference(value: string | null | undefined) {
  if (!value) return "unavailable";
  const clean = cleanString(value, 100);
  return `…${clean.slice(-6)}`;
}

export function errorFingerprint(error: unknown) {
  const source =
    error instanceof Error
      ? `${error.name}:${error.message}:${error.stack?.split("\n")[1] || ""}`
      : String(error);
  return createHash("sha256").update(source).digest("hex").slice(0, 16);
}

export function sanitizeDetails(
  details: Record<string, SafeAlertValue> | undefined,
) {
  const safe: Record<string, SafeAlertValue> = {};
  for (const [rawKey, rawValue] of Object.entries(details || {})) {
    const key = rawKey.replace(/[^a-zA-Z0-9_.-]/g, "").slice(0, 50);
    if (
      !key ||
      /(password|passphrase|secret|token|otp|cookie|authorization|accountnumber|phone|email|signature|payload|stack)/i.test(
        key,
      )
    )
      continue;
    safe[key] = typeof rawValue === "string" ? cleanString(rawValue) : rawValue;
  }
  return safe;
}

export function renderTelegramAlert(
  payload: StoredAlertPayload,
  occurrenceCount: number,
) {
  const icon = payload.severity === "P1" ? "🔴" : "🟠";
  const lines = [
    `${icon} ${payload.severity} · ${cleanString(payload.title, 100).toUpperCase()}`,
    "",
    `Environment: ${cleanString(payload.environment, 30)}`,
    `Time: ${payload.occurredAt}`,
    `Code: ${cleanString(payload.code, 80)}`,
  ];
  if (payload.organizationId)
    lines.push(`Organization: ${cleanString(payload.organizationId, 80)}`);
  if (payload.eventId) lines.push(`Event: ${cleanString(payload.eventId, 80)}`);
  if (payload.resourceType || payload.resourceId)
    lines.push(
      `Resource: ${cleanString(payload.resourceType || "Resource", 40)} ${cleanString(payload.resourceId || "", 80)}`.trim(),
    );
  for (const [key, value] of Object.entries(payload.details || {}))
    lines.push(`${key}: ${value === null ? "null" : String(value)}`);
  lines.push(
    `Occurrences: ${occurrenceCount}`,
    "",
    `Action: ${cleanString(payload.operatorAction, 240)}`,
  );
  if (payload.correlationId)
    lines.push(`Correlation: ${cleanString(payload.correlationId, 100)}`);
  return lines.join("\n").slice(0, 3500);
}
