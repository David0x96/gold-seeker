import Head from "next/head";
import { useState, useEffect } from "react";
import {
  sendTelegramMessage,
  notifySignal,
  isTelegramConnected,
} from "@/services/telegramService";

export default function Home() {
  const [testStatus, setTestStatus] = useState<"idle" | "sending" | "ok" | "err">("idle");
  const [testMsg, setTestMsg] = useState("");

  const sendTest = async () => {
    setTestStatus("sending");
    setTestMsg("");
    const result = await sendTelegramMessage(
      "🔔 Test notification từ Gold Trading Bot\n\nNếu bạn nhận được tin này thì Telegram đã kết nối thành công ✅"
    );
    setTestStatus(result.ok ? "ok" : "err");
    setTestMsg(
      result.ok
        ? "Đã gửi! Kiểm tra Telegram."
        : result.error || "Gửi thất bại. Kiểm tra .env."
    );
  };

  const sendTestSignal = async () => {
    setTestStatus("sending");
    setTestMsg("");
    const ok = await notifySignal({
      direction: "BUY",
      symbol: "XAUUSD",
      lot: 0.1,
      entry: 2650.5,
      sl: 2645,
      tp: 2661.5,
      reason: "H1 breakout above previous high (test)",
      dailyPnLPercent: -0.5,
      maxDailyLossPercent: 3,
    });
    setTestStatus(ok ? "ok" : "err");
    setTestMsg(ok ? "Đã gửi signal mẫu vào Telegram!" : "Gửi thất bại.");
  };

  const [connected, setConnected] = useState<boolean | null>(null);
  useEffect(() => {
    fetch("/api/telegram/status")
      .then((r) => r.json())
      .then((d: { connected?: boolean }) => setConnected(Boolean(d?.connected)))
      .catch(() => setConnected(false));
  }, []);
  const connectedKnown = connected ?? isTelegramConnected();

  return (
    <>
      <Head>
        <title>Gold Trading Agent – XAUUSD</title>
        <meta name="description" content="Risk-managed gold trading bot (Exness + Telegram)" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="min-h-screen flex flex-col items-center justify-center p-8">
        <h1 className="text-2xl font-bold text-amber-700 mb-2">
          Gold Trading Agent (Exness)
        </h1>
        <p className="text-gray-600 mb-4">
          XAUUSD only · Risk limits · Telegram notifications
        </p>

        {/* Test Telegram */}
        <section className="mt-6 p-4 rounded-lg border border-amber-200 bg-amber-50/50 max-w-md w-full">
          <h2 className="font-semibold text-amber-800 mb-2">Test Telegram</h2>
          {!connectedKnown && (
            <p className="text-sm text-amber-700 mb-2">
              Chưa cấu hình: trong .env thêm <code className="bg-amber-100 px-1 rounded">TELEGRAM_BOT_TOKEN</code> và{" "}
              <code className="bg-amber-100 px-1 rounded">TELEGRAM_CHAT_ID</code> (hoặc NEXT_PUBLIC_...) rồi restart <code className="bg-amber-100 px-1 rounded">npm run dev</code>.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={sendTest}
              disabled={testStatus === "sending"}
              className="px-4 py-2 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-700 disabled:opacity-50"
            >
              {testStatus === "sending" ? "Đang gửi…" : "Gửi tin nhắn test"}
            </button>
            <button
              type="button"
              onClick={sendTestSignal}
              disabled={testStatus === "sending"}
              className="px-4 py-2 rounded-lg bg-amber-500 text-white font-medium hover:bg-amber-600 disabled:opacity-50"
            >
              Gửi signal mẫu
            </button>
          </div>
          {testMsg && (
            <p className={`mt-2 text-sm ${testStatus === "ok" ? "text-green-700" : "text-red-700"}`}>
              {testMsg}
            </p>
          )}
        </section>

        <p className="mt-6 text-sm text-gray-500">
          Connect Exness → Configure risk → Activate bot. See README.md and spec.md.
        </p>
      </main>
    </>
  );
}
