/**
 * Exness (or mock) integration
 * MVP: mock implementation; swap for real Exness API when ready.
 */

import type {
  AccountInfo,
  Price,
  Position,
  OpenPositionParams,
} from "@/types";

const MOCK_ACCOUNT: AccountInfo = {
  balance: 10000,
  equity: 10000,
  currency: "USD",
  accountId: "mock-account-1",
};

const MOCK_PRICE: Price = {
  symbol: "XAUUSD",
  bid: 2650.5,
  ask: 2650.8,
  time: Date.now(),
};

const openPositionsStore: Position[] = [];
let mockBalance = MOCK_ACCOUNT.balance;
let mockEquity = MOCK_ACCOUNT.equity;

export async function testConnection(
  _apiKey: string,
  accountId: string
): Promise<AccountInfo> {
  await delay(300);
  return {
    ...MOCK_ACCOUNT,
    accountId: accountId || MOCK_ACCOUNT.accountId,
  };
}

export async function getAccountInfo(
  _apiKey: string,
  accountId: string
): Promise<AccountInfo> {
  await delay(100);
  const positions = openPositionsStore.filter((p) => p.symbol === "XAUUSD");
  const openPnL = positions.reduce((acc, p) => {
    const current = p.type === "BUY" ? MOCK_PRICE.bid : MOCK_PRICE.ask;
    const diff = p.type === "BUY" ? current - p.openPrice : p.openPrice - current;
    return acc + diff * p.volume * 100; // rough XAUUSD pip value per 0.1 lot
  }, 0);
  return {
    balance: mockBalance,
    equity: mockEquity + openPnL,
    currency: "USD",
    accountId,
  };
}

export async function getPrice(symbol: string): Promise<Price> {
  await delay(80);
  if (symbol !== "XAUUSD") {
    throw new Error(`Unsupported symbol: ${symbol}`);
  }
  return { ...MOCK_PRICE, time: Date.now() };
}

export async function openPosition(params: OpenPositionParams): Promise<Position> {
  await delay(150);
  if (params.symbol !== "XAUUSD") {
    throw new Error(`Unsupported symbol: ${params.symbol}`);
  }
  const price = params.type === "BUY" ? MOCK_PRICE.ask : MOCK_PRICE.bid;
  const position: Position = {
    positionId: `pos-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    symbol: params.symbol,
    type: params.type,
    volume: params.volume,
    openPrice: price,
    sl: params.sl,
    tp: params.tp,
    timestamp: Date.now(),
  };
  openPositionsStore.push(position);
  return position;
}

export async function getOpenPositions(
  _apiKey: string,
  _accountId: string
): Promise<Position[]> {
  await delay(100);
  return [...openPositionsStore];
}

export async function closePosition(positionId: string): Promise<void> {
  await delay(100);
  const idx = openPositionsStore.findIndex((p) => p.positionId === positionId);
  if (idx >= 0) openPositionsStore.splice(idx, 1);
}

export async function closeAllPositionsForSymbol(symbol: string): Promise<void> {
  await delay(150);
  for (let i = openPositionsStore.length - 1; i >= 0; i--) {
    if (openPositionsStore[i].symbol === symbol) {
      openPositionsStore.splice(i, 1);
    }
  }
}

/** For mock: update price used in getPrice / getAccountInfo (e.g. from sample data) */
export function setMockPrice(bid: number, ask?: number): void {
  MOCK_PRICE.bid = bid;
  MOCK_PRICE.ask = ask ?? bid + 0.3;
  MOCK_PRICE.time = Date.now();
}

/** For mock: set equity at start of day */
export function setMockEquity(equity: number): void {
  mockEquity = equity;
  mockBalance = equity;
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
