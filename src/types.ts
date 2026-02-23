/** Shared types for Gold Trading Bot */

export type BotStatus = "RUNNING" | "PAUSED_DUE_TO_RISK" | "STOPPED";

export interface AccountInfo {
  balance: number;
  equity: number;
  currency: string;
  accountId: string;
}

export interface Price {
  symbol: string;
  bid: number;
  ask: number;
  time: number;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface OpenPositionParams {
  symbol: string;
  type: "BUY" | "SELL";
  volume: number;
  sl?: number;
  tp?: number;
}

export interface Position {
  positionId: string;
  symbol: string;
  type: "BUY" | "SELL";
  volume: number;
  openPrice: number;
  sl?: number;
  tp?: number;
  timestamp: number;
}

export interface TradeSignal {
  signalType: "BUY" | "SELL" | "NONE";
  entryPrice: number;
  slPrice?: number;
  tpPrice?: number;
  reason: string;
  suggestedLot?: number;
}

export interface StrategyConfig {
  symbol: string;
  maxLotPerTrade: number;
  /** Buffer in price units for breakout (e.g. 0.5 for XAUUSD) */
  breakoutBuffer?: number;
  /** Risk-reward ratio (TP distance / SL distance) */
  riskRewardRatio?: number;
}

export interface BotConfig {
  maxDailyLossPercent: number;
  maxLotPerTrade: number;
  maxOpenPositions: number;
  maxTradesPerDay: number;
  strategy: StrategyConfig;
}

export interface RiskCheckResult {
  allowed: boolean;
  reason?: string;
}

export interface DailyStats {
  startEquity: number;
  dailyPnL: number;
  tradesToday: number;
}

export interface TradeRecord {
  positionId: string;
  type: "BUY" | "SELL";
  volume: number;
  entryPrice: number;
  sl?: number;
  tp?: number;
  timestamp: number;
  reason: string;
  closedAt?: number;
  closePrice?: number;
  realizedPnL?: number;
}
