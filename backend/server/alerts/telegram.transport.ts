import { env } from "../config/env.js";

type FetchLike = typeof fetch;

export class TelegramDeliveryError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "TelegramDeliveryError";
  }
}

export async function sendTelegramMessage(
  chatId: string,
  text: string,
  fetchImpl: FetchLike = fetch,
) {
  if (!env.TELEGRAM_TOKEN)
    throw new TelegramDeliveryError(
      "NOT_CONFIGURED",
      "Telegram token is not configured.",
    );
  const response = await fetchImpl(
    `https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(env.TELEGRAM_REQUEST_TIMEOUT_MS),
    },
  );
  const payload = (await response.json().catch(() => null)) as {
    ok?: boolean;
    description?: string;
    parameters?: { retry_after?: number };
  } | null;
  if (!response.ok || !payload?.ok)
    throw new TelegramDeliveryError(
      response.status === 429 ? "RATE_LIMITED" : `HTTP_${response.status}`,
      (payload?.description || "Telegram rejected the alert.").slice(0, 200),
      payload?.parameters?.retry_after,
    );
}
