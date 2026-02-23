/**
 * Bot engine state and step runner (frontend state).
 * - runStep: fetch price → update candles → generate signal → risk check → open position (or notify)
 * - updatePositions: fetch open positions, detect closed trades, update PnL
 */

import type { BotStatus, BotConfig, TradeRecord, DailyStats, Candle } from "@/types";
import * as broker from "@/services/brokerService";
import * as telegram from "@/services/telegramService";
import { generateSignal } from "./strategy";
import { checkRisk, capLot } from "./riskManager";

export interface BotEngineState {
  botStatus: BotStatus;
  config: BotConfig | null;
  trades: TradeRecord[];
  dailyStats: DailyStats;
  candles: Candle[];
  lastError: string | null;
}

const defaultDailyStats: DailyStats = {
  startEquity: 0,
  dailyPnL: 0,
  tradesToday: 0,
};

export function createInitialState(): BotEngineState {
  return {
    botStatus: "STOPPED",
    config: null,
    trades: [],
    dailyStats: { ...defaultDailyStats },
    candles: [],
    lastError: null,
  };
}

/**
 * Run one step: get price, update candles, maybe generate signal and open trade.
 * Requires: apiKey, accountId, state, setState (or return new state).
 */
export async function runStep(
  apiKey: string,
  accountId: string,
  state: BotEngineState,
  setState: (s: BotEngineState) => void
): Promise<BotEngineState> {
  if (state.botStatus !== "RUNNING" || !state.config) {
    return state;
  }

  let next: BotEngineState = { ...state, lastError: null };

  try {
    const [accountInfo, price, openPositions] = await Promise.all([
      broker.getAccountInfo(apiKey, accountId),
      broker.getPrice(state.config.strategy.symbol),
      broker.getOpenPositions(apiKey, accountId),
    ]);

    // Update candles with new close (simplified: append one candle from current price)
    const newCandle: Candle = {
      time: price.time,
      open: price.bid,
      high: price.bid,
      low: price.bid,
      close: price.bid,
    };
    const candles = [...state.candles, newCandle].slice(-100);
    next = { ...next, candles };

    // Reset daily stats at start of day (simple: check date; here we keep as-is for MVP)
    if (next.dailyStats.startEquity === 0) {
      next.dailyStats = {
        startEquity: accountInfo.equity,
        dailyPnL: 0,
        tradesToday: 0,
      };
    }

    const signal = generateSignal(candles, state.config.strategy);
    if (signal.signalType === "NONE") {
      setState(next);
      return next;
    }

    const proposedLot = signal.suggestedLot ?? state.config.maxLotPerTrade;
    const riskResult = checkRisk(
      accountInfo,
      openPositions,
      next.dailyStats,
      state.config,
      proposedLot
    );

    if (!riskResult.allowed) {
      const errMsg = riskResult.reason ?? "Risk check failed";
      next = { ...next, lastError: errMsg };
      await telegram.notifyTradeBlocked(errMsg);
      if (riskResult.reason?.includes("Daily loss limit")) {
        next = { ...next, botStatus: "PAUSED_DUE_TO_RISK" as const };
        await telegram.notifyRiskPaused(errMsg);
      }
      setState(next);
      return next;
    }

    const lot = capLot(proposedLot, state.config);

    // Telegram: conditions met
    const dailyPnLPercent =
      next.dailyStats.startEquity > 0
        ? (next.dailyStats.dailyPnL / next.dailyStats.startEquity) * 100
        : 0;
    await telegram.notifySignal({
      direction: signal.signalType,
      symbol: state.config.strategy.symbol,
      lot,
      entry: signal.entryPrice,
      sl: signal.slPrice,
      tp: signal.tpPrice,
      reason: signal.reason,
      dailyPnLPercent,
      maxDailyLossPercent: state.config.maxDailyLossPercent,
    });

    const position = await broker.openPosition({
      symbol: state.config.strategy.symbol,
      type: signal.signalType,
      volume: lot,
      sl: signal.slPrice,
      tp: signal.tpPrice,
    });

    const record: TradeRecord = {
      positionId: position.positionId,
      type: position.type,
      volume: position.volume,
      entryPrice: position.openPrice,
      sl: position.sl,
      tp: position.tp,
      timestamp: position.timestamp,
      reason: signal.reason,
    };

    next.trades = [...next.trades, record];
    next.dailyStats = {
      ...next.dailyStats,
      tradesToday: next.dailyStats.tradesToday + 1,
    };
    setState(next);
    return next;
  } catch (e) {
    const msg: string = e instanceof Error ? e.message : String(e);
    setState({ ...state, lastError: msg });
    return { ...state, lastError: msg };
  }
}

/**
 * Fetch open positions and update state (detect closed trades, update PnL).
 */
export async function updatePositions(
  apiKey: string,
  accountId: string,
  state: BotEngineState,
  setState: (s: BotEngineState) => void
): Promise<BotEngineState> {
  try {
    const [accountInfo, openPositions] = await Promise.all([
      broker.getAccountInfo(apiKey, accountId),
      broker.getOpenPositions(apiKey, accountId),
    ]);
    const openIds = new Set(openPositions.map((p) => p.positionId));
    const trades = state.trades.map((t) => {
      if (t.closedAt != null) return t;
      if (!openIds.has(t.positionId)) {
        return { ...t, closedAt: Date.now(), closePrice: accountInfo.equity };
      }
      return t;
    });
    const dailyPnL = accountInfo.equity - state.dailyStats.startEquity;
    const next: BotEngineState = {
      ...state,
      trades,
      dailyStats: {
        ...state.dailyStats,
        dailyPnL,
      },
    };
    if (
      state.config &&
      state.dailyStats.startEquity > 0 &&
      (dailyPnL / state.dailyStats.startEquity) * 100 <= -state.config.maxDailyLossPercent
    ) {
      next.botStatus = "PAUSED_DUE_TO_RISK";
      await telegram.notifyRiskPaused("Daily loss limit reached");
    }
    setState(next);
    return next;
  } catch (e) {
    const msg: string = e instanceof Error ? e.message : String(e);
    setState({ ...state, lastError: msg });
    return { ...state, lastError: msg };
  }
}
