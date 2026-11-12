import { PaymentStatus, Prisma } from "@prisma/client";
import { logger } from "../config/logger.js";
import { prisma } from "../db/prisma.js";
import { recordVoteEarnings } from "../services/wallet.service.js";
import { enqueueAlert } from "../alerts/alert-outbox.service.js";
import { errorFingerprint } from "../alerts/alert-redaction.js";

let timer: NodeJS.Timeout | undefined;
let running = false;

export async function reconcileMissingPaymentLedger() {
  const payments = await prisma.payment.findMany({
    where: {
      status: PaymentStatus.PAID,
      ledgerEntries: { none: { type: "VOTE_EARNING" } },
    },
    include: {
      order: { include: { event: { select: { platformFeeBps: true } } } },
    },
    take: 100,
  });
  let reconciled = 0;
  for (const payment of payments) {
    try {
      await prisma.$transaction(
        async (tx) =>
          recordVoteEarnings(tx, {
            organizationId: payment.organizationId,
            eventId: payment.order.eventId,
            paymentId: payment.id,
            paymentReference: payment.reference,
            amount: payment.amount,
            currency: payment.currency,
            platformFeeBps: payment.order.event.platformFeeBps,
          }),
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      reconciled += 1;
    } catch (error) {
      if (!(
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ))
        throw error;
    }
  }
  return reconciled;
}

async function run() {
  if (running) return;
  running = true;
  try {
    const reconciled = await reconcileMissingPaymentLedger();
    if (reconciled)
      logger.info({ reconciled }, "Financial ledger reconciliation completed");
    if (reconciled)
      await enqueueAlert({
        code: "LEDGER_RECONCILIATION_REPAIRED",
        severity: "P2",
        title: "Missing ledger entries repaired",
        operatorAction:
          "Review the repaired payments and investigate why ledger creation was delayed.",
        details: { reconciled },
        dedupeParts: ["repaired"],
      });
  } catch (error) {
    logger.error({ err: error }, "Financial ledger reconciliation failed");
    await enqueueAlert({
      code: "FINANCIAL_RECONCILIATION_FAILED",
      severity: "P1",
      title: "Financial reconciliation failed",
      operatorAction:
        "Check database health and rerun reconciliation after recovery.",
      details: { errorFingerprint: errorFingerprint(error) },
      dedupeParts: [errorFingerprint(error)],
    });
  } finally {
    running = false;
  }
}

export function startFinancialReconciliationWorker() {
  timer = setInterval(() => void run(), 60 * 60 * 1000);
  timer.unref();
  void run();
}
export function stopFinancialReconciliationWorker() {
  if (timer) clearInterval(timer);
}
