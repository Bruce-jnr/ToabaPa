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
};

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(10).default(0),
  DATABASE_URL: z.string().url(),
  APP_URL: z.string().url().default("http://localhost:5173"),
  API_URL: z.string().url().default("http://localhost:4000"),
  SESSION_SECRET: z.string().min(32),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("error"),
  PAYSTACK_PUBLIC_KEY: z.string().min(1).optional(),
  PAYSTACK_SECRET_KEY: z.string().min(1).optional(),
  PAYSTACK_WEBHOOK_SECRET: z.string().min(1).optional(),
  ARKESEL_API_KEY: z.string().min(1).optional(),
  ARKESEL_SENDER_ID: z.string().min(1).optional(),
  NALO_USSD_SECRET: z.string().min(24).optional(),
  WEBHOOK_RETRY_INTERVAL_MS: z.coerce.number().int().min(5_000).default(30_000),
  TELEGRAM_ALERTS_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  TELEGRAM_TOKEN: z.string().min(20).optional(),
  TELEGRAM_CHAT_ID: z.string().min(1).max(100).optional(),
  TELEGRAM_HIGH_VALUE_WITHDRAWAL_GHS: z.coerce
    .number()
    .positive()
    .default(5_000),
  TELEGRAM_ALERT_COOLDOWN_SECONDS: z.coerce
    .number()
    .int()
    .min(60)
    .max(3_600)
    .default(300),
  TELEGRAM_ALERT_DAILY_LIMIT: z.coerce
    .number()
    .int()
    .min(10)
    .max(1_000)
    .default(100),
  TELEGRAM_REQUEST_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(1_000)
    .max(5_000)
    .default(2_500),
  TELEGRAM_MAX_DELIVERY_ATTEMPTS: z.coerce
    .number()
    .int()
    .min(1)
    .max(10)
    .default(5),
});

const parsed = envSchema.safeParse(normalizedEnv);

if (!parsed.success) {
  const details = parsed.error.issues.map(
    (issue) => `${issue.path.join(".")}: ${issue.message}`,
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
    !env.API_URL.startsWith("https://")
  )
    throw new Error("APP_URL and API_URL must use HTTPS in production.");
  if (!env.PAYSTACK_SECRET_KEY?.startsWith("sk_live_"))
    throw new Error("A Paystack live secret key is required in production.");
}
