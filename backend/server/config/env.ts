import "dotenv/config";
import { readFileSync } from "node:fs";
import { z } from "zod";

function secret(name: string): string | undefined {
  const direct = process.env[name];
  const file = process.env[`${name}_FILE`];
  if (direct && file)
    throw new Error(`Configure only one of ${name} or ${name}_FILE.`);
  if (!file) return direct;
  try {
    return readFileSync(file, "utf8").trim();
  } catch {
    throw new Error(`Unable to read secret file for ${name}.`);
  }
}

const normalizedEnv = {
  ...process.env,
  DATABASE_URL: secret("DATABASE_URL"),
  SESSION_SECRET: secret("SESSION_SECRET"),
  PAYSTACK_PUBLIC_KEY: secret("PAYSTACK_PUBLIC_KEY"),
  PAYSTACK_SECRET_KEY: secret("PAYSTACK_SECRET_KEY"),
  ARKESEL_API_KEY: secret("ARKESEL_API_KEY"),
  ARKESEL_SENDER_ID: secret("ARKESEL_SENDER_ID"),
  NALO_USSD_SECRET: secret("NALO_USSD_SECRET"),
  TELEGRAM_TOKEN: secret("TELEGRAM_TOKEN"),
  AWS_ACCESS_KEY_ID: secret("AWS_ACCESS_KEY_ID"),
  AWS_SECRET_ACCESS_KEY: secret("AWS_SECRET_ACCESS_KEY"),
};

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
  API_PORT: z.coerce.number().int().min(1).max(65535),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(10),
  DATABASE_URL: z.string().url(),
  APP_URL: z.string().url(),
  MARKETING_URL: z.string().url(),
  API_URL: z.string().url(),
  SESSION_SECRET: z.string().min(32),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]),
  AWS_REGION: z.string().trim().min(1),
  AWS_S3_BUCKET: z.string().trim().min(3),
  AWS_ACCESS_KEY_ID: z.string().trim().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().trim().min(1),
  PAYSTACK_PUBLIC_KEY: z.string().min(1).optional(),
  PAYSTACK_SECRET_KEY: z.string().min(1).optional(),
  PAYSTACK_WEBHOOK_SECRET: z.string().min(1).optional(),
  ARKESEL_API_KEY: z.string().min(1).optional(),
  ARKESEL_SENDER_ID: z.string().min(1).optional(),
  NALO_USSD_SECRET: z.string().min(24).optional(),
  WEBHOOK_RETRY_INTERVAL_MS: z.coerce.number().int().min(5_000),
  TELEGRAM_ALERTS_ENABLED: z.enum(["true", "false"]).transform((value) => value === "true"),
  TELEGRAM_TOKEN: z.string().min(20).optional(),
  TELEGRAM_CHAT_ID: z.string().min(1).max(100).optional(),
  TELEGRAM_HIGH_VALUE_WITHDRAWAL_GHS: z.coerce.number().positive(),
  TELEGRAM_ALERT_COOLDOWN_SECONDS: z.coerce
    .number()
    .int()
    .min(60)
    .max(3_600),
  TELEGRAM_ALERT_DAILY_LIMIT: z.coerce
    .number()
    .int()
    .min(10)
    .max(1_000),
  TELEGRAM_REQUEST_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(1_000)
    .max(5_000),
  TELEGRAM_MAX_DELIVERY_ATTEMPTS: z.coerce
    .number()
    .int()
    .min(1)
    .max(10),
});

const parsed = envSchema.safeParse(normalizedEnv);

if (!parsed.success) {
  const details = parsed.error.issues.map(
    (issue) => `${issue.path.join(".")}: ${issue.message}. Set ${issue.path.join(".")} in the environment or .env file`,
  );
  throw new Error(`Invalid environment configuration:\n${details.join("\n")}`);
}

export const env = parsed.data;

if (
  env.TELEGRAM_ALERTS_ENABLED &&
  (!env.TELEGRAM_TOKEN || !env.TELEGRAM_CHAT_ID)
)
  throw new Error(
    "TELEGRAM_TOKEN and TELEGRAM_CHAT_ID are required when Telegram alerts are enabled.",
  );

if (env.NODE_ENV === "production") {
  const missing = [
    !env.PAYSTACK_SECRET_KEY && "PAYSTACK_SECRET_KEY",
    !env.NALO_USSD_SECRET && "NALO_USSD_SECRET",
    !env.ARKESEL_API_KEY && "ARKESEL_API_KEY",
    !env.ARKESEL_SENDER_ID && "ARKESEL_SENDER_ID",
  ].filter(Boolean);
  if (missing.length)
    throw new Error(
      `Missing production security configuration: ${missing.join(", ")}`,
    );
  if (env.SESSION_SECRET.toLowerCase().includes("replace"))
    throw new Error("SESSION_SECRET must not be a placeholder in production.");
  if (
    !env.APP_URL.startsWith("https://") ||
    !env.MARKETING_URL.startsWith("https://") ||
    !env.API_URL.startsWith("https://")
  )
    throw new Error("APP_URL, MARKETING_URL, and API_URL must use HTTPS in production.");
  if (!env.PAYSTACK_SECRET_KEY?.startsWith("sk_live_"))
    throw new Error("A Paystack live secret key is required in production.");
}
