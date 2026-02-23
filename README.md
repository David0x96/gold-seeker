# Gold Trading Agent (Exness + Telegram)

## Chạy dự án (How to run)

```bash
npm install
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000) để xem app.

**Cấu trúc repo:**

```
gold-trading-agent-exness/
├── README.md
├── spec.md
├── src/
│   ├── pages/           # Next.js pages
│   ├── components/      # UI components
│   ├── services/
│   │   ├── brokerService.ts   # Exness (or mock) integration
│   │   └── telegramService.ts # Outbound Telegram messages
│   └── logic/
│       ├── strategy.ts
│       ├── riskManager.ts
│       └── botEngine.ts
└── data/
    └── xauusd_sample.json     # Sample XAUUSD data for demo/mocking
```

---

# SPEC: GOLD TRADING BOT (EXNESS INTEGRATION + TELEGRAM NOTIFICATIONS)

## 1. Topic

**Competition Topic:** Agent Wallet  
**Custom MVP Angle:** Risk‑Managed Gold Trading Agent  
(Gold trading bot connected to Exness, with Telegram notifications when entry conditions are met)

**Why this fits “Agent Wallet”:**

- The “wallet” here is the **user’s Exness trading account / sub‑account**
- User:
  - Deposits capital into Exness
  - Grants the Agent access (API / connection)
  - Defines clear risk rules (daily loss, max lot, etc.)
- Agent:
  - Automatically decides and (optionally) executes XAUUSD trades on that account
  - Is strictly bounded by **hard risk limits**
  - Has a **Telegram bot sidekick** that:
    - Sends notifications when **entry conditions are satisfied**
    - Sends alerts when the bot is paused due to risk limits

---

## 2. User

**Primary user:**  
Retail trader currently trading **gold (XAUUSD)** on Exness (or ready to open an Exness account), who:

- Understands the basics:
  - Buy / Sell
  - Lot size
  - Stop Loss / Take Profit
- Has **limited time** to monitor charts
- Is **afraid of fully autonomous black‑box bots** that can blow up the account
- Uses **Telegram** daily and is comfortable receiving trading info there

**Persona example:**

- 25–40 years old, full‑time job
- Trades gold on Exness in free time
- Wants:
  - A bot to watch the market + enforce risk management
  - Transparent notifications on Telegram whenever the bot wants to trade

---

## 3. Problem

1. **No time to watch gold charts constantly**

   - Gold is volatile and news‑driven
   - Users cannot keep MT4/MT5 open all day
   - They often:
     - Miss good setups
     - Enter too late or exit emotionally

2. **Fear of fully automatic bots with no risk brakes**

   - Many existing EAs / bots:
     - Are opaque: user doesn’t know why or when it trades
     - Lack clear risk rules:
       - Max loss per day
       - Max lot per trade
       - Max trades per day
   - One bad day can wipe out a big chunk of the account, with **no daily stop**.

3. **No “bot monitors – human supervises” workflow**

   - Users want:
     - Bot to **scan the market** and **check risk** for them
     - Telegram **notification** when a valid, risk‑approved signal appears
     - Even if execution is auto, they can:
       - See every trade decision
       - Build trust over time

**Problem summary:**  
User needs a gold trading agent that:

- Monitors the market and enforces risk limits
- Notifies them on Telegram when a trade is about to happen
- So they can trust automation without giving blind control.

---

## 4. Core Flow (Single Main Flow)

**Main flow:**  
User connects Exness account → configures risk & strategy → links Telegram →  
Bot monitors XAUUSD → when signal + risk OK → **Telegram notification** →  
MVP: bot **auto‑executes** the trade; user monitors and can stop bot from the web UI.

---

### Step 1: Connect Exness Account

1. User opens the web app (Next.js/React, runs locally or simple hosting).
2. Inputs:
   - Exness API key / token (or demo/mocked credentials)
   - Exness account ID (preferably a demo account for MVP)
3. Clicks **“Test Connection”**:
   - Frontend calls `brokerService.testConnection(apiKey, accountId)`:
     - Fetches `balance`, `equity`
   - Shows a message like:  
     `Connected to Exness demo – Balance: XXX USD`

> **MVP fallback:**  
> If Exness real API is too complex or not easily accessible:
>
> - Implement a **mock `brokerService`** that simulates:
>   - `getAccountInfo`, `getPrice`, `openPosition`, `getOpenPositions`
> - Keep the same architecture & UX so swapping in real Exness later is easy.

---

### Step 2: Configure Risk & Strategy

In a configuration form:

- **Balance**: read‑only, from Exness account
- User sets:

  - `maxDailyLossPercent` – max loss per day as % of equity (e.g. 3–5%)
  - `maxLotPerTrade` – max lot size per trade (e.g. 0.10)
  - `maxOpenPositions` – max number of simultaneous open trades (e.g. 3)
  - `maxTradesPerDay` – max number of trades per day (e.g. 10)

- Strategy (MVP: single preset):

  - **H1 breakout strategy on XAUUSD** (simple, explainable rules)

- Button: **“Save & Activate Bot”**  
  → Save config in localStorage / state  
  → Set `botStatus = "RUNNING"`

---

### Step 3: Link Telegram Bot

1. User opens Telegram and starts a chat with the bot:
   - e.g. `@gold_agent_bot`
2. The bot sends a welcome message with:
   - A **verification code** or
   - A **/start** link
3. In the web app, user either:
   - Enters a **Telegram chat ID / verification code**, or
   - Clicks a deep link:  
     `https://t.me/gold_agent_bot?start=<unique_user_token>`
4. After linking:

   - Store mapping: `userId ↔ telegramChatId`
   - In the UI show: `Telegram: Connected ✅`

> For MVP, to keep it simple:
>
> - You can hard‑code **one** `telegramChatId` (your own)
> - Still design code as if it supports multi‑user later.

---

### Step 4: Bot Monitors Gold Price & Generates Signals

1. Frontend (or a simple runner) periodically:

   - Calls `brokerService.getPrice("XAUUSD")` or fetches latest H1 candle
   - Frequency:
     - MVP option A: user clicks a “Run step” button
     - MVP option B: use `setInterval` to simulate live ticks

2. Maintain a buffer of recent XAUUSD candles in memory (e.g. last 100 H1 candles).

3. Call `generateSignal(candles, config)` in `strategy.ts`:
   - Returns:
     - `signalType: "BUY" | "SELL" | "NONE"`
     - `entryPrice`
     - `slPrice`
     - `tpPrice`
     - `reason` (e.g. `"H1 breakout above previous high"`)

If `signalType = "NONE"` → do nothing.  
If `signalType = "BUY"` or `"SELL"` → proceed to **Step 5**.

---

### Step 5: Risk Check Before Entering a Trade

Before opening any position, perform risk checks:

1. Fetch current account info and open positions:
   - `getAccountInfo(apiKey, accountId)`
   - `getOpenPositions(apiKey, accountId)`
2. Compute:

   - `dailyPnL` = current equity – equity at start of day
   - `dailyLossPercent` = `dailyPnL / equityStartOfDay`
   - `openPositionsCount` (for XAUUSD)
   - `tradesToday` (count for the current day)

3. Apply rules:

   - If `dailyLossPercent > maxDailyLossPercent`:
     - Block the trade
     - Set `botStatus = "PAUSED_DUE_TO_RISK"`
   - If `openPositionsCount >= maxOpenPositions`:
     - Block the trade
   - If `tradesToday >= maxTradesPerDay`:
     - Block the trade
   - If proposed lot > `maxLotPerTrade`:
     - Cap lot to `maxLotPerTrade` or block (MVP: capping is simpler)

If **any check fails**:

- Log a message like: “Signal blocked due to risk: <reason>”
- Optionally send a Telegram warning:  
  `⚠ Trade blocked – risk limit hit: <reason>`

If **all checks pass** → go to **Step 6 (Telegram notification)**.

---

### Step 6: Telegram Notification When Conditions Are Met

This is the new idea: **notify on Telegram when entry conditions are valid and risk‑approved.**

When there is a `BUY`/`SELL` signal that passed risk checks:

1. Build a message like:

   ```text
   📈 GOLD SIGNAL – CONDITIONS MET

   Symbol: XAUUSD
   Direction: BUY
   Lot: 0.10
   Entry: 2350.50
   SL: 2340.50 (-100 pips)
   TP: 2370.50 (+200 pips)
   Reason: H1 breakout above previous high
   Daily PnL now: -1.2% (Limit: -3%)
   ```
