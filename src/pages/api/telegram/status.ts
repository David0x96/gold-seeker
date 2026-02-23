/**
 * Kiểm tra đã cấu hình Telegram chưa (đọc env trên server).
 */
import type { NextApiRequest, NextApiResponse } from "next";

const BOT_TOKEN =
  process.env.TELEGRAM_BOT_TOKEN ||
  process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN;
const CHAT_ID =
  process.env.TELEGRAM_CHAT_ID ||
  process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID;

export default function handler(
  _req: NextApiRequest,
  res: NextApiResponse<{ connected: boolean }>
) {
  res.status(200).json({
    connected: Boolean(BOT_TOKEN && CHAT_ID),
  });
}
