# Specification: Gold Trading Bot (Exness + Telegram)

Full specification and product spec: see **README.md**.

This repo implements:

- **Broker:** Exness (or mock) via `src/services/brokerService.ts`
- **Notifications:** Telegram via `src/services/telegramService.ts`
- **Logic:** Strategy, risk manager, bot engine in `src/logic/`
- **Data:** Sample XAUUSD candles in `data/xauusd_sample.json` for demo/mocking
