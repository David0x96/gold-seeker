# SPEC: GOLD TRADING BOT (EXNESS INTEGRATION, FRONTEND-ONLY MVP)

## 1. Topic

**Competition Topic:** Gold Seeker  
**Custom MVP Angle:** Risk‑Managed Gold Trading Agent (gold trading bot connected directly to Exness)

**Why this fits "Agent Wallet":**

- The "wallet" here is the **user's Exness trading account / sub‑account**
- User:
  - Deposits funds into Exness
  - Provides API key / connection info to the Agent
  - Defines clear risk rules (daily loss, max lot, etc.)
- Agent:
  - Automatically opens and closes **XAUUSD** trades on that account
  - Always enforced by **hard risk limits** set by the user

---

## 2. User

**Primary user:**  
Retail traders already trading **gold (XAUUSD)** on Exness (or ready to open an Exness account) who:

- Have basic understanding of:
  - Buy/Sell
  - Lot size
  - Stop Loss / Take Profit
- Don't have time to monitor charts all day
- Are **afraid of blowing up the account with uncontrolled bots**

**Persona example:**

- Age 25–40, full‑time job, trading gold on the side
- Understands basic FX / CFD concepts
- Has used Exness or similar broker
- Wants automation, but:
  - Needs **strong risk control**
  - Wants to **see and understand** what the bot is doing

---

## 3. Problem

1. **No time & discipline to watch gold market:**

   - Gold (XAUUSD) reacts strongly to news (FED, CPI, NFP, etc.)
   - User cannot sit in front of charts all day
   - Often:
     - Miss good entries
     - Exit emotionally instead of following a plan

2. **Existing bots are "black boxes" with poor risk control:**

   - Many bots / EAs:
     - Don't expose clear **risk parameters** (daily loss, max lot, max trades)
     - Can open too many trades or increase lot unpredictably
   - One bad day can destroy 50–100% of the account with **no daily stop**.

3. **Technical integration with broker is hard for non‑devs:**

   - Building an EA or using raw broker API is complex
   - Non‑technical traders only want a:
     - Simple UI
     - "Connect Exness"
     - "Set risk"
     - "Start/Stop bot"

**Problem summary:**  
User wants a gold trading bot that connects to Exness but with **transparent logic and strict risk limits**, not a "black box" that can blow up the account.

---

## 4. Core Flow (Single Main Flow)

**Main flow:**  
User connects Exness account → sets risk rules → Agent auto‑trades XAUUSD within limits → User monitors dashboard & can hit a kill switch.

### Step 1: Connect Exness Account

1. User opens the web app (frontend‑only, runs locally or simple static hosting).
2. User inputs:
   - Exness API key / token (or equivalent connection credentials)
   - Exness account ID (preferably a demo account for MVP)
3. Clicks **"Test Connection"**:
   - Frontend calls an Exness service (real API or mocked service) to:
     - Fetch account info (balance, equity, account currency)
   - If successful:
     - Show message:  
       `Connected to Exness demo account – Balance: XXX USD`

> **MVP fallback:**  
> If direct Exness API is not easily accessible (CORS, auth, etc.), use a **mock broker service** module:
>
> - `brokerService.ts` that simulates:
>   - `getAccountInfo()`
>   - `getPrice()`
>   - `openPosition()`
>   - `getOpenPositions()`
> - Keep architecture and flow exactly as if it were Exness → easy to swap to real API later.

---

### Step 2: Configure Risk & Strategy

User fills a **configuration form**:

- **Read‑only initial capital:** fetched from Exness (account balance)
- Inputs:

  - **Max daily loss (% of balance)**
    - Example: 3–5% per day
  - **Max lot size per trade**
    - Example: 0.1 / 0.5 lot per trade
  - **Max open positions at the same time**
    - Example: 3 positions
  - **Max trades per day**
    - Example: 10 trades per day

- Strategy (for MVP, exactly one simple strategy):

  - Example: **Simple H1 breakout strategy** for XAUUSD

- Button: **"Save & Activate Bot"**

  - Save this config in `localStorage` (or simple JSON state)
  - Set **bot status** to `RUNNING`

---

### Step 3: Agent Reads Gold Price & Generates Signals

1. Frontend periodically calls Exness (or mock) to:

   - Get **current XAUUSD price** or last H1 candle
   - Frequency:
     - MVP option A: user clicks "Run step" manually
     - MVP option B: `setInterval` every X seconds to simulate live ticks

2. In the frontend, maintain an array of recent candles for XAUUSD:

   - Either pulled from real API
   - Or preloaded from a small historical dataset

3. Call `generateSignal(candles, config)` from **strategy module**:

   - Output:
     - `BUY` / `SELL` / `NONE`
     - With proposed SL / TP levels

   Example H1 breakout logic (simplified):

   - If last close > previous high + small buffer:
     - Signal: `BUY`
     - SL = previous low
     - TP = entry + 2×(entry − SL)
   - If last close < previous low − small buffer:
     - Signal: `SELL`
     - SL = previous high
     - TP = entry − 2×(SL − entry)
   - Else: `NONE`

---

### Step 4: Risk Check Before Sending Order to Exness

Before opening a position, the bot must pass **risk checks**:

1. Fetch latest account info via Exness service:

   - Balance
   - Equity
   - Open positions

2. Compute:

   - **Daily realized PnL**:
     - Compare current equity vs equity at start of the day (stored in local state)
   - **Number of trades today**
   - **Number of open positions on XAUUSD**

3. Apply risk rules:

   - If **daily loss** (percentage drop from start‑of‑day equity) > **max daily loss**:
     - **Do NOT open new trades**
     - Set bot status = `PAUSED_DUE_TO_RISK`
   - If **open positions count** ≥ `maxOpenPositions`:
     - Do NOT open new trades
   - If **trades today** ≥ `maxTradesPerDay`:
     - Do NOT open new trades
   - If proposed **lot size** > `maxLotPerTrade`:
     - Cap it to the max lot
     - Or reject trade (MVP: simpler to cap)

4. If all checks pass:

   - (Optional) Show preview in UI:
     - `Bot will open BUY 0.1 lot XAUUSD, SL: 30 pips below, TP: 60 pips above`
   - Automatically proceed (since the idea is autonomous agent):
     - Call **Exness open position** API via frontend service.

---

### Step 5: Open Position via Exness & Update Dashboard

1. Frontend calls `brokerService.openPosition()`:

   - Params:

     - `symbol: "XAUUSD"`
     - `type: "BUY" | "SELL"`
     - `volume: number` (lot size)
     - `SL`, `TP`

   - Response:
     - `positionId`
     - `openPrice`
     - `timestamp`, etc. (real or mocked)

2. Store trade in local state:

   - positionId
   - type (BUY/SELL)
   - lot size
   - entry price
   - SL / TP
   - timestamp
   - reason (e.g. "H1 breakout above previous high")

3. Dashboard updates:

   - Show **open positions** table
   - Show latest account summary:
     - Balance
     - Equity
     - Open PnL

---

### Step 6: Track & Close Positions

- Frontend periodically calls `brokerService.getOpenPositions()`:

  - For each open gold trade:
    - Check if Exness reports it as closed:
      - If closed:
        - Fetch close price, realized PnL
        - Update **daily PnL** and **total PnL**
        - Log close reason (SL hit, TP hit, manual/other)

- Based on updated PnL:

  - If **daily loss** just exceeded `maxDailyLoss` after closing a losing trade:
    - Set status: `PAUSED_DUE_TO_RISK`
    - Do not open any new trades for the rest of the day

Dashboard should clearly show:

- Today's PnL
- Total PnL
- Bot status:
  - `RUNNING`
  - `PAUSED_DUE_TO_RISK`
  - `STOPPED` (by user)

---

### Step 7: Kill Switch (Emergency Stop)

- UI button: **"Kill switch – Stop bot now"**

  - Sets `botStatus = STOPPED`
  - The engine will:
    - Stop generating or sending new orders
    - (Optional) call `closeAllPositionsForSymbol("XAUUSD")` on Exness service
  - UI indicates clearly:
    - `Bot stopped by user – no new trades will be opened`

---

## 5. Scope Cuts to Fit 3 Days

Intentionally **de‑scope** to ensure a realistic 3‑day MVP:

1. **No full backend app:**

   - Logic lives in frontend (React/Next.js)
   - Broker integration is done via:
     - Direct browser calls **if** Exness API allows CORS
     - Or via a **minimal proxy** if absolutely necessary
     - For MVP demo: completely acceptable to use a **mock Exness service**

2. **Single symbol only:**

   - Only support **XAUUSD** (gold)
   - UI is explicitly "Gold Bot – XAUUSD only"

3. **Single simple strategy:**

   - Only one strategy: **H1 breakout** (or similar)
   - No optimization / multiple presets / AI prediction

4. **Minimal authentication:**

   - No full login system
   - User just inputs:
     - "API key"
     - "Account ID"
   - Save them in memory or `localStorage` (with clear "demo only" warning)

5. **Paper‑trading allowed if live trading is not feasible:**

   - If Exness live trading is too complex:
     - Use mock `openPosition`, `getOpenPositions` that:
       - Simulate SL/TP being hit based on price feed
   - The **core value** to show judges:
     - Correct **risk logic**
     - Clear UX
     - Transparent trade list

---

## 6. Tech Stack (Frontend‑Focused)

### Frontend

- **Framework:** Next.js + TypeScript + TailwindCSS  
  (or React + Vite + TypeScript if you prefer)

**Key modules:**

1. `services/brokerService.ts`

   - `testConnection(apiKey, accountId): Promise<AccountInfo>`
   - `getAccountInfo(apiKey, accountId): Promise<AccountInfo>`
   - `getPrice(symbol: string): Promise<Price>`
   - `openPosition(params: OpenPositionParams): Promise<Position>`
   - `getOpenPositions(apiKey, accountId): Promise<Position[]>`
   - `closePosition(positionId: string): Promise<void>`
   - `closeAllPositionsForSymbol(symbol: string): Promise<void>`

   > For MVP you can fully mock these methods.

2. `logic/strategy.ts`

   - `generateSignal(candles: Candle[], config: StrategyConfig): TradeSignal`
   - Implements H1 breakout logic

3. `logic/riskManager.ts`

   - `checkRisk(accountInfo, openPositions, tradesToday, config): RiskCheckResult`
   - Enforces:
     - Max daily loss
     - Max trades per day
     - Max open positions
     - Max lot per trade

4. `logic/botEngine.ts` (runs in frontend state)

   - State:
     - `botStatus: "RUNNING" | "PAUSED_DUE_TO_RISK" | "STOPPED"`
     - `config: BotConfig`
     - `trades: TradeRecord[]`
     - `dailyStats: { startEquity, dailyPnL, tradesToday }`
   - Functions:
     - `runStep()`
       - Fetch latest price / candle
       - Update candles
       - Generate signal
       - Check risk
       - Call `openPosition()` if allowed
     - `updatePositions()`
       - Fetch open positions
       - Detect closed trades
       - Update PnL & daily stats

5. UI Components

   - `ConnectionForm` (API key, account ID, test connection)
   - `ConfigForm` (risk and strategy settings)
   - `BotStatusCard` (status + kill switch)
   - `AccountInfoCard` (balance, equity, daily PnL, total PnL)
   - `TradesTable` (open and closed trades with explanations)

---

## 7. Business Model (for Presentation)

**Current MVP stage:**

- Proof‑of‑concept showing:
  - Exness (or broker) integration
  - Transparent trading logic
  - Strong risk management

**Future monetization:**

1. **Subscription SaaS for Exness traders:**

   - **Free tier:**
     - Paper‑trading with demo accounts
   - **Pro tier (monthly):**
     - Connect real Exness accounts
     - Multiple predefined strategies
     - Telegram/Email alerts when:
       - Risk limit reached
       - Bot paused
       - Big profit/loss events

2. **Revenue share with broker (IB / affiliate):**

   - Partner with Exness / other brokers:
     - Earn commission on trading volume generated by the bot
   - Value to broker:
     - Higher volume
     - Better retention due to lower blow‑up risk

3. **White‑label for IBs / signal providers:**

   - Allow them to:
     - Plug in their own strategies
     - Resell "their own branded gold bot" to followers
   - Revenue:
     - Setup fee
     - Recurring SaaS fee per active user / account

---

## 8. Acceptance Criteria (Happy Path)

To consider MVP "done" for Demo Day, the following must work on local:

1. **Connect to account (real or mock):**

   - User enters `API key` + `Account ID`
   - Clicks "Test Connection"
   - App displays:
     - `Connected. Balance: XXXX USD` (from real Exness or mock)

2. **Configure bot and start:**

   - User sets:
     - Max daily loss (%)
     - Max lot per trade
     - Max trades per day
     - Max open positions
   - Click "Save & Activate Bot"
   - Bot status becomes `RUNNING`

3. **Bot opens some XAUUSD trades:**

   - During simulation:
     - Bot opens a few BUY/SELL XAUUSD trades (via real or mock service)
   - Dashboard shows:
     - Each trade with timestamp, direction, lot size, entry, SL/TP

4. **Risk controls actually work:**

   - When number of trades reaches `maxTradesPerDay`:
     - No further trades are opened
     - UI clearly shows reason (e.g. "Max trades per day reached")
   - When daily loss (on demo data) exceeds `maxDailyLoss`:
     - Bot status changes to `PAUSED_DUE_TO_RISK`
     - No new trades are opened

5. **Kill switch works:**

   - User clicks "Kill switch – Stop bot now"
   - Bot status changes to `STOPPED`
   - No new trades are opened
   - (Optional) Existing trades are closed or left but clearly shown

6. **Local run is simple:**

   - Steps in `README.md`:
     - `npm install`
     - `npm run dev`
   - Open `http://localhost:3000` and demo the full flow.

---

## 9. Suggested Repo Structure

```text
gold-trading-agent-exness/
├── README.md          # How to run, overview
├── spec.md            # This specification
├── src/
│   ├── pages/         # Next.js pages
│   ├── components/    # UI components
│   ├── services/
│   │   └── brokerService.ts   # Exness/mock integration
│   └── logic/
│       ├── strategy.ts
│       ├── riskManager.ts
│       └── botEngine.ts
└── data/
    └── xauusd_sample.json     # Optional sample candles for demo/mock
```
