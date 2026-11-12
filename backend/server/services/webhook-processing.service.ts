import {
  LedgerEntryType,
  PaymentProviderName,
  WithdrawalStatus,
} from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { paystackProvider } from "../payments/paystack.provider.js";
import { creditVerifiedPayment } from "./vote-credit.service.js";
import { enqueueAlert } from "../alerts/alert-outbox.service.js";
import { errorFingerprint, maskReference } from "../alerts/alert-redaction.js";

export async function processPaystackWebhookLog(id: string) {
  const log = await prisma.webhookLog.findUniqueOrThrow({ where: { id } });
  if (log.processed) return;
  if (
    !log.signatureValid ||
    log.eventType !== "charge.success" ||
    !log.reference
  )
    return;
  const verified = await paystackProvider.verifyPayment(log.reference);
  await creditVerifiedPayment(PaymentProviderName.PAYSTACK, verified);
  await prisma.webhookLog.update({
    where: { id },
    data: {
      processed: true,
      processingResult: "VOTE_CREDITED",
      processedAt: new Date(),
      nextAttemptAt: null,
      lastError: null,
    },
  });
}

export async function processPaystackTransferWebhook(
  logId: string,
  eventType: string,
  reference: string,
) {
  await prisma.$transaction(async (tx) => {
    const log = await tx.webhookLog.findUniqueOrThrow({ where: { id: logId } });
    if (log.processed) return;
    const withdrawal = await tx.withdrawal.findUnique({ where: { reference } });
    if (!withdrawal) {
      await tx.webhookLog.update({
        where: { id: logId },
        data: {
          processed: true,
          processingResult: "WITHDRAWAL_NOT_FOUND",
          processedAt: new Date(),
        },
      });
      return;
    }
    const status =
      eventType === "transfer.success"
        ? WithdrawalStatus.SUCCESS
        : eventType === "transfer.reversed"
          ? WithdrawalStatus.REVERSED
          : WithdrawalStatus.FAILED;
    if (
      withdrawal.status === WithdrawalStatus.SUCCESS ||
      withdrawal.status === WithdrawalStatus.FAILED ||
      withdrawal.status === WithdrawalStatus.REVERSED
    ) {
      await tx.webhookLog.update({
        where: { id: logId },
        data: {
          processed: true,
          processingResult: "ALREADY_FINALIZED",
          processedAt: new Date(),
        },
      });
      return;
    }
    await tx.withdrawal.update({
      where: { id: withdrawal.id },
      data: {
        status,
        failureReason:
          status === WithdrawalStatus.FAILED
            ? "Paystack reported transfer failure."
            : null,
      },
    });
    if (status !== WithdrawalStatus.SUCCESS)
      await tx.ledgerEntry.create({
        data: {
          walletId: withdrawal.walletId,
          eventId: withdrawal.eventId,
          type: LedgerEntryType.WITHDRAWAL_REVERSAL,
          amount: withdrawal.amount,
          reference: `${status}-${withdrawal.reference}`,
          description:
            status === WithdrawalStatus.REVERSED
              ? "Paystack transfer reversed"
              : "Failed Paystack transfer released",
        },
      });
    await tx.webhookLog.update({
      where: { id: logId },
      data: {
        processed: true,
        processingResult: `TRANSFER_${status}`,
        processedAt: new Date(),
      },
    });
    if (
      status === WithdrawalStatus.FAILED ||
      status === WithdrawalStatus.REVERSED
    )
      await enqueueAlert(
        {
          code: `WITHDRAWAL_${status}`,
          severity: "P1",
          title: `Withdrawal ${status.toLowerCase()}`,
          operatorAction:
            "Inspect the provider transfer and confirm that reserved funds were released.",
          eventId: withdrawal.eventId,
          resourceType: "Withdrawal",
          resourceId: withdrawal.id,
          details: {
            reference: maskReference(withdrawal.reference),
            amount: withdrawal.amount,
            currency: withdrawal.currency,
          },
          dedupeParts: [withdrawal.id, status],
        },
        tx,
      );
  });
}

export function retryDelay(attempt: number) {
  return Math.min(30 * 60_000, 30_000 * 2 ** Math.max(0, attempt - 1));
}

export async function scheduleWebhookRetry(
  id: string,
  attempt: number,
  error: unknown,
) {
  const message =
    error instanceof Error ? error.message : "Unknown processing error";
  await prisma.webhookLog.update({
    where: { id },
    data: {
      attempts: attempt,
      processingResult: attempt >= 8 ? "RETRY_EXHAUSTED" : "RETRY_SCHEDULED",
      nextAttemptAt:
        attempt >= 8 ? null : new Date(Date.now() + retryDelay(attempt)),
      lastError: message.slice(0, 300),
    },
  });
  if (attempt >= 8) {
    const log = await prisma.webhookLog.findUnique({ where: { id } });
    await enqueueAlert({
      code: "WEBHOOK_RETRY_EXHAUSTED",
      severity: "P1",
      title: "Valid webhook permanently failed",
      operatorAction:
        "Inspect the webhook log and reconcile the related payment or transfer.",
      resourceType: "WebhookLog",
      resourceId: id,
      details: {
        provider: log?.provider || "unknown",
        eventType: log?.eventType || "unknown",
        reference: maskReference(log?.reference),
        errorFingerprint: errorFingerprint(error),
      },
      dedupeParts: [id],
    });
  }
}
