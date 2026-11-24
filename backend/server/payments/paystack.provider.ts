import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { AppError } from "../errors/app-error.js";
import type {
  PaymentInitialization,
  PaymentProvider,
  VerifiedPayment,
} from "./payment-provider.js";

const initializeResponseSchema = z.object({
  status: z.boolean(),
  message: z.string(),
  data: z.object({
    authorization_url: z.string().url(),
    reference: z.string(),
    access_code: z.string(),
  }),
});

const verifyResponseSchema = z.object({
  status: z.boolean(),
  message: z.string(),
  data: z.object({
    id: z.union([z.string(), z.number()]),
    reference: z.string(),
    status: z.string(),
    amount: z.number().int(),
    currency: z.string(),
    channel: z.string().optional(),
    paid_at: z.string().datetime().nullable().optional(),
  }),
});
const mobileMoneyResponseSchema = z.object({
  status: z.boolean(),
  message: z.string(),
  data: z.object({
    reference: z.string(),
    status: z.string(),
    display_text: z.string().optional(),
  }),
});
const recipientResponseSchema = z.object({
  status: z.boolean(),
  data: z.object({ recipient_code: z.string() }),
});
const transferResponseSchema = z.object({
  status: z.boolean(),
  data: z.object({
    transfer_code: z.string(),
    reference: z.string(),
    status: z.string(),
  }),
});
const balanceResponseSchema = z.object({
  status: z.boolean(),
  data: z.array(z.object({ currency: z.string(), balance: z.number().int() })),
});
const bankListResponseSchema = z.object({
  status: z.boolean(),
  data: z.array(
    z.object({
      name: z.string(),
      code: z.string(),
      active: z.boolean().optional(),
    }),
  ),
});
const accountResolutionResponseSchema = z.object({
  status: z.boolean(),
  data: z.object({
    account_number: z.string(),
    account_name: z.string().trim().min(1),
  }),
});

function paymentProviderFailureCategory(payload: unknown): string {
  const message = payload && typeof payload === 'object' && 'message' in payload
    && typeof payload.message === 'string' ? payload.message : '';
  if (/email/i.test(message)) return 'EMAIL';
  if (/amount|minimum|maximum/i.test(message)) return 'AMOUNT';
  if (/currency/i.test(message)) return 'CURRENCY';
  if (/reference/i.test(message)) return 'REFERENCE';
  if (/authorization|authentication|secret key|api key|unauthorized/i.test(message)) return 'AUTHENTICATION';
  return 'OTHER';
}

export function isValidPaystackSignature(
  rawBody: Buffer,
  signature: string | undefined,
  secretKey: string,
): boolean {
  if (!signature || !/^[a-f0-9]{128}$/i.test(signature)) return false;
  const expected = createHmac("sha512", secretKey)
    .update(rawBody)
    .digest("hex");
  return timingSafeEqual(
    Buffer.from(expected, "hex"),
    Buffer.from(signature, "hex"),
  );
}

export class PaystackProvider implements PaymentProvider {
  private readonly baseUrl = "https://api.paystack.co";
  private readonly providerCache = new Map<
    string,
    { expiresAt: number; data: Array<{ name: string; code: string }> }
  >();
  private balanceCache: {
    expiresAt: number;
    cachedAt: Date;
    data: Array<{ currency: string; balance: number }>;
  } | null = null;

  private get secretKey() {
    if (!env.PAYSTACK_SECRET_KEY)
      throw new AppError(
        503,
        "PAYMENT_PROVIDER_NOT_CONFIGURED",
        "Payment service is not configured.",
      );
    if (
      env.NODE_ENV !== "production" &&
      env.PAYSTACK_SECRET_KEY.startsWith("sk_live_")
    ) {
      throw new AppError(
        503,
        "LIVE_PAYMENT_KEY_BLOCKED",
        "Use Paystack test keys during development.",
      );
    }
    return env.PAYSTACK_SECRET_KEY;
  }

  private async request(path: string, init?: RequestInit) {
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          "Content-Type": "application/json",
          ...init?.headers,
        },
        signal: AbortSignal.timeout(15_000),
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        logger.error({ endpoint: path, upstreamStatus: response.status, category: paymentProviderFailureCategory(payload) }, 'Payment provider request rejected');
        throw new AppError(
          502,
          "PAYMENT_PROVIDER_ERROR",
          "The payment service could not process this request.",
        );
      }
      return payload;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error({ endpoint: path, errorType: error instanceof Error ? error.name : 'UNKNOWN' }, 'Payment provider request failed before a response');
      throw new AppError(
        502,
        "PAYMENT_PROVIDER_UNREACHABLE",
        "Payment provider is temporarily unreachable.",
      );
    }
  }

  async initializePayment(input: {
    reference: string;
    amount: number;
    currency: string;
    email?: string;
    phone: string;
    callbackUrl: string;
  }): Promise<PaymentInitialization> {
    if (!input.email)
      throw new AppError(
        400,
        "EMAIL_REQUIRED",
        "Email is required for web payment.",
      );
    const raw = await this.request("/transaction/initialize", {
      method: "POST",
      body: JSON.stringify({
        reference: input.reference,
        amount: String(input.amount),
        currency: input.currency,
        email: input.email,
        callback_url: input.callbackUrl,
        metadata: JSON.stringify({
          phone: input.phone,
          source: "Toabapa web voting",
        }),
      }),
    });
    const parsed = initializeResponseSchema.safeParse(raw);
    if (!parsed.success) {
      logger.error({ endpoint: '/transaction/initialize' }, 'Payment provider returned an unexpected initialization response');
    } else if (!parsed.data.status || parsed.data.data.reference !== input.reference) {
      logger.error({ endpoint: '/transaction/initialize', accepted: parsed.data.status, referenceMatches: parsed.data.data.reference === input.reference }, 'Payment provider initialization response was rejected');
    }
    if (!parsed.success || !parsed.data.status || parsed.data.data.reference !== input.reference)
      throw new AppError(
        502,
        "PAYMENT_INITIALIZATION_FAILED",
        "Payment could not be initialized.",
      );
    return {
      reference: parsed.data.data.reference,
      authorizationUrl: parsed.data.data.authorization_url,
    };
  }

  async initializeMobileMoney(input: {
    reference: string;
    amount: number;
    currency: string;
    email: string;
    phone: string;
    provider: "mtn" | "atl" | "vod";
  }) {
    if (
      this.secretKey.startsWith("sk_test_") &&
      input.provider === "mtn" &&
      input.phone !== "233551234987"
    ) {
      throw new AppError(
        400,
        "PAYSTACK_TEST_PHONE_REQUIRED",
        "Paystack test mode requires the MTN test number 233551234987.",
      );
    }
    const raw = await this.request("/charge", {
      method: "POST",
      body: JSON.stringify({
        reference: input.reference,
        amount: String(input.amount),
        currency: input.currency,
        email: input.email,
        mobile_money: { phone: input.phone, provider: input.provider },
        metadata: JSON.stringify({
          phone: input.phone,
          source: "Toabapa USSD voting",
        }),
      }),
    });
    const response = mobileMoneyResponseSchema.parse(raw);
    if (
      !response.status ||
      response.data.reference !== input.reference ||
      !["pay_offline", "success"].includes(response.data.status)
    ) {
      throw new AppError(
        502,
        "MOBILE_MONEY_INITIALIZATION_FAILED",
        "Mobile money authorization could not be started.",
      );
    }
    return {
      reference: response.data.reference,
      status: response.data.status as "pay_offline" | "success",
      displayText:
        response.data.display_text ||
        "Approve the payment request on your phone.",
    };
  }

  async verifyPayment(reference: string): Promise<VerifiedPayment> {
    const raw = await this.request(
      `/transaction/verify/${encodeURIComponent(reference)}`,
    );
    const response = verifyResponseSchema.parse(raw);
    return {
      reference: response.data.reference,
      providerTransactionId: String(response.data.id),
      amount: response.data.amount,
      currency: response.data.currency,
      successful: response.status && response.data.status === "success",
      paymentMethod: response.data.channel,
      paidAt: response.data.paid_at
        ? new Date(response.data.paid_at)
        : undefined,
    };
  }

  verifyWebhook(rawBody: Buffer, signature: string | undefined): boolean {
    return isValidPaystackSignature(rawBody, signature, this.secretKey);
  }

  async getTransaction(reference: string) {
    return this.verifyPayment(reference);
  }

  async createTransferRecipient(input: {
    type: string;
    name: string;
    accountNumber: string;
    bankCode: string;
    currency: string;
  }) {
    const raw = await this.request("/transferrecipient", {
      method: "POST",
      body: JSON.stringify({
        type: input.type,
        name: input.name,
        account_number: input.accountNumber,
        bank_code: input.bankCode,
        currency: input.currency,
      }),
    });
    const response = recipientResponseSchema.parse(raw);
    return response.data.recipient_code;
  }

  async initiateTransfer(input: {
    amount: number;
    recipientCode: string;
    reference: string;
    reason: string;
    currency: string;
  }) {
    const raw = await this.request("/transfer", {
      method: "POST",
      body: JSON.stringify({
        source: "balance",
        amount: input.amount,
        recipient: input.recipientCode,
        reference: input.reference,
        reason: input.reason,
        currency: input.currency,
      }),
    });
    const response = transferResponseSchema.parse(raw);
    if (response.data.reference !== input.reference)
      throw new AppError(
        502,
        "TRANSFER_REFERENCE_MISMATCH",
        "Payment provider returned an unexpected transfer reference.",
      );
    return {
      transferCode: response.data.transfer_code,
      status: response.data.status,
    };
  }

  async finalizeTransfer(transferCode: string, otp: string) {
    const raw = await this.request("/transfer/finalize_transfer", {
      method: "POST",
      body: JSON.stringify({ transfer_code: transferCode, otp }),
    });
    const response = transferResponseSchema.parse(raw);
    return {
      transferCode: response.data.transfer_code,
      status: response.data.status,
    };
  }

  async getBalance() {
    const response = balanceResponseSchema.parse(
      await this.request("/balance"),
    );
    return response.data;
  }

  async getCachedBalance() {
    if (this.balanceCache && this.balanceCache.expiresAt > Date.now())
      return this.balanceCache;
    const data = await this.getBalance();
    this.balanceCache = {
      data,
      cachedAt: new Date(),
      expiresAt: Date.now() + 2 * 60_000,
    };
    return this.balanceCache;
  }

  async listTransferProviders(
    type: "mobile_money" | "ghipss",
    currency = "GHS",
  ) {
    const cacheKey = `${currency}:${type}`;
    const cached = this.providerCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.data;
    const query = new URLSearchParams({ currency, type });
    const response = bankListResponseSchema.parse(
      await this.request(`/bank?${query.toString()}`),
    );
    const data = response.data
      .filter((item) => item.active !== false)
      .map(({ name, code }) => ({ name, code }));
    this.providerCache.set(cacheKey, {
      data,
      expiresAt: Date.now() + 5 * 60_000,
    });
    return data;
  }

  async resolveTransferAccount(accountNumber: string, bankCode: string) {
    const query = new URLSearchParams({
      account_number: accountNumber,
      bank_code: bankCode,
    });
    const response = accountResolutionResponseSchema.safeParse(
      await this.request(`/bank/resolve?${query.toString()}`),
    );
    if (!response.success || !response.data.status) {
      throw new AppError(
        422,
        "ACCOUNT_RESOLUTION_FAILED",
        "Paystack did not return a registered name for this account or mobile-money number.",
      );
    }
    return {
      accountNumber: response.data.data.account_number,
      accountName: response.data.data.account_name,
    };
  }
}

export const paystackProvider = new PaystackProvider();
