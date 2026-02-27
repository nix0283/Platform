// ============================================
// BACKTESTER TESTS
// ============================================

import { describe, it, expect, beforeEach } from 'vitest';
import { Backtester, createBacktester, strategies } from './index';
import { Candle } from '@trading-platform/core';

function generateTestCandles(count: number, basePrice: number = 100): Candle[] {
  const candles: Candle[] = [];
  let price = basePrice;
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const change = (Math.random() - 0.5) * 2;
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.random();
    const low = Math.min(open, close) - Math.random();
    const volume = Math.random() * 1000 + 500;

    candles.push({
      timestamp: now - (count - i) * 3600000,
      open, high, low, close, volume,
      symbol: 'BTC/USDT',
      interval: '1h',
    });

    price = close;
  }

  return candles;
}

describe('Backtester', () => {
  let backtester: Backtester;
  let testCandles: Candle[];

  beforeEach(() => {
    backtester = createBacktester({ initialCapital: 10000, commission: 0.1, slippage: 0.05 });
    testCandles = generateTestCandles(500, 100);
  });

  it('should run SMA crossover strategy', async () => {
    const result = await backtester.run(testCandles, strategies.smaCrossover);
    expect(result.totalTrades).toBeGreaterThanOrEqual(0);
    expect(result.winRate).toBeGreaterThanOrEqual(0);
    expect(result.equity.length).toBeGreaterThan(0);
  });

  it('should calculate Sharpe ratio', async () => {
    const result = await backtester.run(testCandles, strategies.smaCrossover);
    expect(typeof result.sharpeRatio).toBe('number');
  });

  it('should calculate max drawdown', async () => {
    const result = await backtester.run(testCandles, strategies.smaCrossover);
    expect(result.maxDrawdown).toBeGreaterThanOrEqual(0);
  });

  it('should process 1000 candles in under 1 second', async () => {
    const bt = createBacktester();
    const candles = generateTestCandles(1000);
    const start = Date.now();
    await bt.run(candles, strategies.smaCrossover);
    expect(Date.now() - start).toBeLessThan(1000);
  });
});
