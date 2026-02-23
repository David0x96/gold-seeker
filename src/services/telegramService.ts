/**
 * Outbound Telegram messages
 * MVP: optional; can log to console or call Telegram Bot API when token/chatId are set.
 */

export interface TelegramConfig {
  botToken?: string;
  chatId?: string;
}

let config: TelegramConfig = {
  botToken: process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN,
  chatId: process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID,
};

export function setTelegramConfig(c: TelegramConfig): void {
  config = { ...config, ...c };
}

export function getTelegramConfig(): TelegramConfig {
  return { ...config };
}

export function isTelegramConnected(): boolean {
  return Boolean(config.botToken && config.chatId);
}

export type SendResult = { ok: boolean; error?: string };

/**
 * Send a plain text message to the configured Telegram chat.
 * Trên browser gọi API route (tránh CORS); trên server gọi thẳng Telegram.
 */
export async function sendTelegramMessage(text: string): Promise<SendResult> {
  const isBrowser = typeof window !== "undefined";

  if (isBrowser) {
    try {
      const res = await fetch("/api/telegram/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      return {
        ok: Boolean(data?.ok),
        error: data?.error,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { ok: false, error: msg };
    }
  }

  if (!config.botToken || !config.chatId) {
    console.log("[Telegram mock]", text);
    return { ok: true };
  }
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${config.botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: config.chatId,
          text,
          parse_mode: "HTML",
        }),
      }
    );
    const data = (await res.json()) as { ok?: boolean; description?: string };
    return {
      ok: res.ok && Boolean(data?.ok),
      error: data?.description,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

/**
 * Notify when a gold signal is risk-approved (conditions met).
 */
export async function notifySignal(params: {
  direction: "BUY" | "SELL";
  symbol: string;
  lot: number;
  entry: number;
  sl?: number;
  tp?: number;
  reason: string;
  dailyPnLPercent: number;
  maxDailyLossPercent: number;
}): Promise<boolean> {
  const slTp =
    params.sl != null && params.tp != null
      ? `\nSL: ${params.sl}\nTP: ${params.tp}`
      : "";
  const text = [
    "📈 GOLD SIGNAL – CONDITIONS MET",
    "",
    `Symbol: ${params.symbol}`,
    `Direction: ${params.direction}`,
    `Lot: ${params.lot.toFixed(2)}`,
    `Entry: ${params.entry}`,
    slTp,
    `Reason: ${params.reason}`,
    `Daily PnL now: ${params.dailyPnLPercent.toFixed(2)}% (Limit: -${
      params.maxDailyLossPercent
    }%)`,
  ]
    .filter(Boolean)
    .join("\n");
  const r = await sendTelegramMessage(text);
  return r.ok;
}

/**
 * Notify when bot is paused due to risk (e.g. daily loss limit).
 */
export async function notifyRiskPaused(reason: string): Promise<boolean> {
  const text = `⚠️ Bot paused – risk limit: ${reason}`;
  const r = await sendTelegramMessage(text);
  return r.ok;
}

/**
 * Notify when trade was blocked by risk check.
 */
export async function notifyTradeBlocked(reason: string): Promise<boolean> {
  const text = `⚠ Trade blocked – risk limit hit: ${reason}`;
  const r = await sendTelegramMessage(text);
  return r.ok;
}
