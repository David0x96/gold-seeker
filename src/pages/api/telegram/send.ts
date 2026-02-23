/**
 * Proxy gửi tin Telegram từ server → tránh CORS khi gọi từ browser.
 * .env: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID (hoặc NEXT_PUBLIC_...)
 */
import type { NextApiRequest, NextApiResponse } from "next";

const BOT_TOKEN =
  process.env.TELEGRAM_BOT_TOKEN ||
  process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN;
const CHAT_ID =
  process.env.TELEGRAM_CHAT_ID ||
  process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ ok: boolean; error?: string }>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  if (!BOT_TOKEN || !CHAT_ID) {
    return res.status(200).json({
      ok: false,
      error:
        "Thiếu cấu hình. Trong .env thêm TELEGRAM_BOT_TOKEN và TELEGRAM_CHAT_ID (hoặc NEXT_PUBLIC_...) rồi restart dev.",
    });
  }

  const body = req.body as { text?: string };
  const text = typeof body?.text === "string" ? body.text : "";

  if (!text) {
    return res.status(200).json({ ok: false, error: "Thiếu nội dung (text)." });
  }

  try {
    const tgRes = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text,
          parse_mode: "HTML",
        }),
      }
    );

    const data = (await tgRes.json()) as {
      ok?: boolean;
      description?: string;
      error_code?: number;
    };

    if (!tgRes.ok || !data?.ok) {
      const msg =
        data?.description ||
        `Telegram API lỗi ${tgRes.status}`;
      return res.status(200).json({ ok: false, error: msg });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(200).json({
      ok: false,
      error: `Gửi thất bại: ${msg}`,
    });
  }
}
