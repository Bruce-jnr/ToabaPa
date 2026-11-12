import {
  PaymentProviderName,
  PaymentStatus,
  Prisma,
  VoteStatus,
} from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { AppError } from "../errors/app-error.js";
import type { VerifiedPayment } from "../payments/payment-provider.js";
import { recordVoteEarnings } from "./wallet.service.js";
import { enqueueAlert } from "../alerts/alert-outbox.service.js";
import { maskReference } from "../alerts/alert-redaction.js";

export async function creditVerifiedPayment(
  provider: PaymentProviderName,
  verified: VerifiedPayment,
) {
  if (!verified.successful)
    throw new AppError(
      409,
      "PAYMENT_NOT_SUCCESSFUL",
      "Payment was not successful.",
    );

  let integrityAlert:
    | {
        code: string;
        organizationId: string;
        eventId: string;
        orderId: string;
        details: Record<string, string | number>;
      }
    | undefined;
  try {
    return await prisma.$transaction(
      async (tx) => {
        const order = await tx.voteOrder.findUnique({
          where: { paymentReference: verified.reference },
          include: { event: { select: { platformFeeBps: true } } },
        });
        if (!order)
          throw new AppError(
            404,
            "ORDER_NOT_FOUND",
            "Vote order was not found.",
          );

        // The unique order/payment/transaction constraints make provider retries idempotent.
        if (order.voteStatus === VoteStatus.CREDITED) {
          return tx.voteTransaction.findUniqueOrThrow({
            where: { orderId: order.id },
          });
        }
        if (order.paymentProvider !== provider) {
          integrityAlert = {
            code: "PAYMENT_PROVIDER_MISMATCH",
            organizationId: order.organizationId,
            eventId: order.eventId,
            orderId: order.id,
            details: {
              reference: maskReference(verified.reference),
              expectedProvider: order.paymentProvider,
              receivedProvider: provider,
            },
          };
          throw new AppError(
            409,
            "PAYMENT_PROVIDER_MISMATCH",
            "Payment provider does not match the order.",
          );
        }
        if (verified.amount !== order.amount) {
          integrityAlert = {
            code: "PAYMENT_AMOUNT_MISMATCH",
            organizationId: order.organizationId,
            eventId: order.eventId,
            orderId: order.id,
            details: {
              reference: maskReference(verified.reference),
              expectedAmount: order.amount,
              receivedAmount: verified.amount,
              currency: order.currency,
            },
          };
          throw new AppError(
            409,
            "PAYMENT_AMOUNT_MISMATCH",
            "Verified payment amount does not match the order.",
          );
        }
        if (verified.currency.toUpperCase() !== order.currency.toUpperCase()) {
          integrityAlert = {
            code: "PAYMENT_CURRENCY_MISMATCH",
            organizationId: order.organizationId,
            eventId: order.eventId,
            orderId: order.id,
            details: {
              reference: maskReference(verified.reference),
              expectedCurrency: order.currency,
              receivedCurrency: verified.currency.toUpperCase(),
            },
          };
          throw new AppError(
            409,
            "PAYMENT_CURRENCY_MISMATCH",
            "Verified payment currency does not match the order.",
          );
        }

        const payment = await tx.payment.create({
          data: {
            organizationId: order.organizationId,
            orderId: order.id,
            provider,
            providerTransactionId: verified.providerTransactionId,
            reference: verified.reference,
            amount: verified.amount,
            currency: verified.currency.toUpperCase(),
            status: PaymentStatus.PAID,
            paymentMethod: verified.paymentMethod,
            providerPaidAt: verified.paidAt,
          },
        });
        const transaction = await tx.voteTransaction.create({
          data: {
            organizationId: order.organizationId,
            eventId: order.eventId,
            categoryId: order.categoryId,
            candidateId: order.candidateId,
            orderId: order.id,
            paymentId: payment.id,
            quantity: order.quantity,
            unitPrice: order.unitPrice,
            amount: order.amount,
            currency: order.currency,
            channel: order.channel,
            paymentReference: order.paymentReference,
          },
        });
        await recordVoteEarnings(tx, {
          organizationId: order.organizationId,
          eventId: order.eventId,
          paymentId: payment.id,
          paymentReference: order.paymentReference,
          amount: order.amount,
          currency: order.currency,
          platformFeeBps: order.event.platformFeeBps,
        });
        await tx.candidate.update({
          where: { id: order.candidateId },
          data: { cachedVoteCount: { increment: order.quantity } },
        });
        await tx.voteOrder.update({
          where: { id: order.id },
          data: {
            paymentStatus: PaymentStatus.PAID,
            voteStatus: VoteStatus.CREDITED,
            paidAt: verified.paidAt ?? new Date(),
            processedAt: new Date(),
          },
        });
        await tx.auditLog.create({
          data: {
            organizationId: order.organizationId,
            action: "VOTE_CREDITED",
            resourceType: "VoteOrder",
            resourceId: order.id,
            newValue: {
              quantity: order.quantity,
              paymentReference: order.paymentReference,
            },
          },
        });
        return transaction;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const existing = await prisma.voteTransaction.findUnique({
        where: { paymentReference: verified.reference },
      });
      if (existing) return existing;
    }
    if (integrityAlert)
      await enqueueAlert({
        code: integrityAlert.code,
        severity: "P1",
        title: "Payment integrity mismatch",
        operatorAction:
          "Hold vote credit and inspect the payment, order, and provider transaction.",
        organizationId: integrityAlert.organizationId,
        eventId: integrityAlert.eventId,
        resourceType: "VoteOrder",
        resourceId: integrityAlert.orderId,
        details: integrityAlert.details,
        dedupeParts: [integrityAlert.code, verified.reference],
      });
    throw error;
  }
}
