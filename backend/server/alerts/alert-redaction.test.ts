import { describe, expect, it } from "vitest";
import {
  errorFingerprint,
  maskReference,
  renderTelegramAlert,
  sanitizeDetails,
} from "./alert-redaction.js";

describe("Telegram alert redaction", () => {
  it("rejects sensitive detail names and keeps explicitly safe primitives", () => {
    expect(
      sanitizeDetails({
        password: "never-send",
        otp: "123456",
        authorization: "Bearer secret",
        fullPhone: "233200000000",
        providerSignature: "signature",
        reference: "…ABC123",
        amount: 5000,
      }),
    ).toEqual({ reference: "…ABC123", amount: 5000 });
  });

  it("masks references to the last six characters", () => {
    expect(maskReference("WDR-1234567890")).toBe("…567890");
    expect(maskReference(undefined)).toBe("unavailable");
  });

  it("generates stable error fingerprints without returning the message", () => {
    const error = new Error("database password must not be returned");
    const first = errorFingerprint(error);
    expect(first).toBe(errorFingerprint(error));
    expect(first).toMatch(/^[a-f0-9]{16}$/);
    expect(first).not.toContain("password");
  });

  it("renders bounded operational messages", () => {
    const message = renderTelegramAlert(
      {
        code: "PAYMENT_AMOUNT_MISMATCH",
        severity: "P1",
        title: "Payment integrity mismatch",
        operatorAction: "Inspect the payment and order.",
        details: { reference: "…ABC123", amount: 5000 },
        occurredAt: "2026-11-12T12:00:00.000Z",
        environment: "test",
      },
      3,
    );
    expect(message).toContain("P1 · PAYMENT INTEGRITY MISMATCH");
    expect(message).toContain("Occurrences: 3");
    expect(message.length).toBeLessThanOrEqual(3500);
  });
});
