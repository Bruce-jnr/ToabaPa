import pino from "pino";
import { env } from "./env.js";

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "*.password",
      "*.passwordHash",
      "*.secret",
      "*.token",
      "*.botToken",
      "TELEGRAM_TOKEN",
    ],
    censor: "[REDACTED]",
  },
});
