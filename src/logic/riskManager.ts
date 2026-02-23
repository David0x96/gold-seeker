/**
 * Risk checks before opening a trade:
 * - Max daily loss %
 * - Max trades per day
 * - Max open positions
 * - Max lot per trade
 */

import type {
  AccountInfo,
  Position,
  BotConfig,
  RiskCheckResult,
  DailyStats,
} from "@/types";

export function checkRisk(
  accountInfo: AccountInfo,
  openPositions: Position[],
  dailyStats: DailyStats,
  config: BotConfig,
  proposedLot: number
): RiskCheckResult {
  const xauPositions = openPositions.filter((p) => p.symbol === "XAUUSD");

  if (dailyStats.startEquity <= 0) {
    return { allowed: false, reason: "Invalid start equity" };
  }

  const dailyLossPercent =
    (dailyStats.dailyPnL / dailyStats.startEquity) * 100;
  if (dailyLossPercent <= -config.maxDailyLossPercent) {
    return {
      allowed: false,
      reason: `Daily loss limit reached (${dailyLossPercent.toFixed(2)}% <= -${config.maxDailyLossPercent}%)`,
    };
  }

  if (xauPositions.length >= config.maxOpenPositions) {
    return {
      allowed: false,
      reason: `Max open positions reached (${xauPositions.length}/${config.maxOpenPositions})`,
    };
  }

  if (dailyStats.tradesToday >= config.maxTradesPerDay) {
    return {
      allowed: false,
      reason: `Max trades per day reached (${dailyStats.tradesToday}/${config.maxTradesPerDay})`,
    };
  }

  const lot = Math.min(proposedLot, config.maxLotPerTrade);
  if (lot <= 0) {
    return { allowed: false, reason: "Invalid lot size" };
  }

  return { allowed: true };
}

/**
 * Cap lot to config max (for use when risk check passes but lot might exceed).
 */
export function capLot(lot: number, config: BotConfig): number {
  return Math.min(lot, config.maxLotPerTrade);
}
