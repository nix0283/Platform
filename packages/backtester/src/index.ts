// ============================================
// BACKTESTER PACKAGE — Главный экспорт
// ============================================

export { Backtester, createBacktester } from './backtester';
export type {
  BacktestConfig,
  BacktestResult,
  Trade,
  StrategySignal,
  StrategyFunction,
  StrategyContext,
} from './backtester';

// ============================================
// ПРИМЕРЫ СТРАТЕГИЙ ДЛЯ БЭКТЕСТИНГА
// ============================================

import { StrategyFunction } from './backtester';

/**
 * SMA Crossover Strategy
 */
export const smaCrossoverStrategy: StrategyFunction = (ctx) => {
  const fastSMA = ctx.sma(9);
  const slowSMA = ctx.sma(21);
  const prevFastSMA = ctx.indicators['sma_9']?.[ctx.currentIndex - 1];
  const prevSlowSMA = ctx.indicators['sma_21']?.[ctx.currentIndex - 1];

  if (!fastSMA || !slowSMA || !prevFastSMA || !prevSlowSMA) return null;

  // Golden Cross
  if (prevFastSMA <= prevSlowSMA && fastSMA > slowSMA) {
    return {
      action: 'BUY',
      stopLoss: ctx.currentCandle.close * 0.98,
      takeProfit: ctx.currentCandle.close * 1.04,
      tags: ['golden_cross'],
    };
  }

  // Death Cross
  if (prevFastSMA >= prevSlowSMA && fastSMA < slowSMA) {
    return {
      action: 'CLOSE_LONG',
      tags: ['death_cross'],
    };
  }

  return null;
};

/**
 * RSI Oversold/Overbought Strategy
 */
export const rsiStrategy: StrategyFunction = (ctx) => {
  const rsi = ctx.rsi(14);
  if (!rsi) return null;

  // Oversold - Buy
  if (rsi < 30) {
    return {
      action: 'BUY',
      stopLoss: ctx.currentCandle.low * 0.97,
      takeProfit: ctx.currentCandle.close * 1.05,
      tags: ['rsi_oversold'],
    };
  }

  // Overbought - Sell
  if (rsi > 70) {
    return {
      action: 'SELL',
      stopLoss: ctx.currentCandle.high * 1.03,
      takeProfit: ctx.currentCandle.close * 0.95,
      tags: ['rsi_overbought'],
    };
  }

  return null;
};

/**
 * MACD Crossover Strategy
 */
export const macdStrategy: StrategyFunction = (ctx) => {
  const macdData = ctx.macd(12, 26, 9);
  if (!macdData) return null;

  const prevMacdData = {
    macd: ctx.indicators['macd']?.[ctx.currentIndex - 1] || 0,
    signal: ctx.indicators['macd_signal']?.[ctx.currentIndex - 1] || 0,
  };

  // Bullish crossover
  if (prevMacdData.macd <= prevMacdData.signal && macdData.macd > macdData.signal) {
    return {
      action: 'BUY',
      stopLoss: ctx.currentCandle.low * 0.98,
      tags: ['macd_bullish'],
    };
  }

  // Bearish crossover
  if (prevMacdData.macd >= prevMacdData.signal && macdData.macd < macdData.signal) {
    return {
      action: 'CLOSE_LONG',
      tags: ['macd_bearish'],
    };
  }

  return null;
};

/**
 * Breakout Strategy
 */
export const breakoutStrategy: StrategyFunction = (ctx) => {
  const highest20 = ctx.highest(20);
  const lowest20 = ctx.lowest(20);
  if (!highest20 || !lowest20) return null;

  const prevHighest = ctx.indicators['highest_20']?.[ctx.currentIndex - 1] || 0;
  const prevLowest = ctx.indicators['lowest_20']?.[ctx.currentIndex - 1] || 0;

  // Bullish breakout
  if (ctx.currentCandle.close > highest20 && ctx.currentCandle.close <= prevHighest) {
    return {
      action: 'BUY',
      stopLoss: lowest20 * 0.98,
      tags: ['breakout_high'],
    };
  }

  // Bearish breakdown
  if (ctx.currentCandle.close < lowest20 && ctx.currentCandle.close >= prevLowest) {
    return {
      action: 'SELL',
      stopLoss: highest20 * 1.02,
      tags: ['breakdown_low'],
    };
  }

  return null;
};

/**
 * Mean Reversion Strategy (Bollinger Bands)
 */
export const meanReversionStrategy: StrategyFunction = (ctx) => {
  const sma20 = ctx.sma(20);
  if (!sma20) return null;

  const closes = ctx.candles.map(c => c.close);
  const std = Math.sqrt(
    closes.slice(-20).reduce((sum, c) => sum + Math.pow(c - sma20, 2), 0) / 20
  );
  
  const upperBand = sma20 + 2 * std;
  const lowerBand = sma20 - 2 * std;

  // Price below lower band - buy
  if (ctx.currentCandle.close < lowerBand) {
    return {
      action: 'BUY',
      stopLoss: lowerBand * 0.98,
      takeProfit: sma20,
      tags: ['bb_lower'],
    };
  }

  // Price above upper band - sell
  if (ctx.currentCandle.close > upperBand) {
    return {
      action: 'SELL',
      stopLoss: upperBand * 1.02,
      takeProfit: sma20,
      tags: ['bb_upper'],
    };
  }

  return null;
};

/**
 * Combined Strategy (Multi-signal)
 */
export const combinedStrategy: StrategyFunction = (ctx) => {
  const rsi = ctx.rsi(14);
  const fastSMA = ctx.sma(9);
  const slowSMA = ctx.sma(21);
  const macdData = ctx.macd(12, 26, 9);

  if (!rsi || !fastSMA || !slowSMA || !macdData) return null;

  let score = 0;

  // RSI component
  if (rsi < 30) score += 1;
  if (rsi > 70) score -= 1;

  // SMA component
  if (fastSMA > slowSMA) score += 1;
  if (fastSMA < slowSMA) score -= 1;

  // MACD component
  if (macdData.histogram > 0) score += 1;
  if (macdData.histogram < 0) score -= 1;

  // Strong buy signal
  if (score >= 2) {
    return {
      action: 'BUY',
      stopLoss: ctx.currentCandle.low * 0.97,
      takeProfit: ctx.currentCandle.close * 1.05,
      tags: ['combined_buy'],
    };
  }

  // Strong sell signal
  if (score <= -2) {
    return {
      action: 'CLOSE_LONG',
      tags: ['combined_sell'],
    };
  }

  return null;
};

// ============================================
// EXPORT ALL STRATEGIES
// ============================================

export const strategies = {
  smaCrossover: smaCrossoverStrategy,
  rsi: rsiStrategy,
  macd: macdStrategy,
  breakout: breakoutStrategy,
  meanReversion: meanReversionStrategy,
  combined: combinedStrategy,
};
