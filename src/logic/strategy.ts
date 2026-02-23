/**
 * H1 breakout strategy for XAUUSD
 * Signal: BUY when close > previous high + buffer, SELL when close < previous low - buffer
 */

import type { Candle, TradeSignal, StrategyConfig } from "@/types";

const DEFAULT_BUFFER = 0.5;
const DEFAULT_RR = 2;

export function generateSignal(
  candles: Candle[],
  config: StrategyConfig
): TradeSignal {
  const buffer = config.breakoutBuffer ?? DEFAULT_BUFFER;
  const rr = config.riskRewardRatio ?? DEFAULT_RR;

  if (!candles || candles.length < 3) {
    return {
      signalType: "NONE",
      entryPrice: 0,
      reason: "Not enough candles",
    };
  }

  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  const prevHigh = prev.high;
  const prevLow = prev.low;
  const close = last.close;

  // Breakout above previous high
  if (close > prevHigh + buffer) {
    const slPrice = prevLow;
    const risk = close - slPrice;
    const tpPrice = close + risk * rr;
    return {
      signalType: "BUY",
      entryPrice: close,
      slPrice,
      tpPrice,
      reason: "H1 breakout above previous high",
      suggestedLot: config.maxLotPerTrade,
    };
  }

  // Breakout below previous low
  if (close < prevLow - buffer) {
    const slPrice = prevHigh;
    const risk = slPrice - close;
    const tpPrice = close - risk * rr;
    return {
      signalType: "SELL",
      entryPrice: close,
      slPrice,
      tpPrice,
      reason: "H1 breakout below previous low",
      suggestedLot: config.maxLotPerTrade,
    };
  }

  return {
    signalType: "NONE",
    entryPrice: close,
    reason: "No breakout",
  };
}
