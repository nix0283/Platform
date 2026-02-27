/**
 * Mean Reversion Strategy
 * Основано на: awesome-systematic-trading (mean-reversion strategies)
 * 
 * Логика:
 * - Цена стремится вернуться к среднему значению
 * - Покупаем когда цена значительно ниже среднего
 * - Продаем когда цена значительно выше среднего
 * - Используем Bollinger Bands и RSI для сигналов
 */

import { BaseStrategy, CandleData } from './base-strategy';
import { StrategySignal } from '../types';

export interface MeanReversionConfig {
  bbPeriod: number;           // Период Bollinger Bands (default: 20)
  bbStdDev: number;           // Стандартное отклонение BB (default: 2)
  rsiPeriod: number;          // Период RSI (default: 14)
  oversoldThreshold: number;  // RSI уровень перепроданности (default: 30)
  overboughtThreshold: number; // RSI уровень перекупленности (default: 70)
  useBB: boolean;             // Использовать Bollinger Bands (default: true)
  useRSI: boolean;            // Использовать RSI (default: true)
  meanReversionThreshold: number; // % отклонения от среднего (default: 0.02)
}

export class MeanReversionStrategy extends BaseStrategy {
  private mrConfig: MeanReversionConfig;

  constructor(config: any, mrConfig?: Partial<MeanReversionConfig>) {
    super({
      ...config,
      type: 'mean_reversion' as const,
      parameters: {
        atrMultiplier: 1.5,  // Меньше чем у momentum т.к. ожидаем разворот
        ...config.parameters,
      },
    });

    this.mrConfig = {
      bbPeriod: 20,
      bbStdDev: 2,
      rsiPeriod: 14,
      oversoldThreshold: 30,
      overboughtThreshold: 70,
      useBB: true,
      useRSI: true,
      meanReversionThreshold: 0.02,
      ...mrConfig,
    };
  }

  protected calculateIndicators(symbol: string, candles: CandleData[]): void {
    const closes = candles.map(c => c.close);
    
    // Bollinger Bands
    const bb = this.calculateBollingerBands(
      closes,
      this.mrConfig.bbPeriod,
      this.mrConfig.bbStdDev
    );
    
    // RSI
    const rsi = this.calculateRSI(closes, this.mrConfig.rsiPeriod);
    
    // SMA (среднее для mean reversion)
    const sma = this.calculateSMA(closes, this.mrConfig.bbPeriod);
    
    // Keltner Channel (альтернатива BB)
    const kc = this.calculateKeltnerChannel(candles, 20, 1.5);
    
    const lastCandle = candles[candles.length - 1];
    const lastClose = lastCandle.close;
    
    this.indicators.set(symbol, {
      bbUpper: bb.upper,
      bbMiddle: bb.middle,
      bbLower: bb.lower,
      rsi,
      sma,
      kcUpper: kc.upper,
      kcLower: kc.lower,
      percentB: this.calculatePercentB(lastClose, bb),
      bandwidth: this.calculateBandwidth(bb),
    });
  }

  generateSignal(symbol: string, timeframe: string): StrategySignal | null {
    const indicatorData = this.indicators.get(symbol);
    if (!indicatorData) return null;
    
    const rsi = indicatorData.rsi as number[];
    const bbUpper = indicatorData.bbUpper as number[];
    const bbMiddle = indicatorData.bbMiddle as number[];
    const bbLower = indicatorData.bbLower as number[];
    const percentB = indicatorData.percentB as number[];
    
    const lastRSI = rsi[rsi.length - 1];
    const lastBBUpper = bbUpper[bbUpper.length - 1];
    const lastBBLower = bbLower[bbLower.length - 1];
    const lastBBMiddle = bbMiddle[bbMiddle.length - 1];
    const lastPercentB = percentB[percentB.length - 1];
    
    const candle = this.getLastCandle(symbol);
    if (!candle) return null;
    
    const lastClose = candle.close;
    
    // LONG сигнал: цена ниже нижней полосы И RSI перепродан
    let longSignal = false;
    let longStrength = 0;
    
    if (this.mrConfig.useBB && lastClose < lastBBLower) {
      longSignal = true;
      longStrength += 0.4;
    }
    
    if (this.mrConfig.useRSI && lastRSI < this.mrConfig.oversoldThreshold) {
      longSignal = true;
      longStrength += 0.4;
    }
    
    if (lastPercentB < 0) {
      longStrength += 0.2;  // Цена ниже нижней полосы
    }
    
    if (longSignal && longStrength >= 0.6) {
      return this.createSignal(
        symbol,
        'LONG',
        Math.min(1, longStrength),
        lastClose,
        {
          rsi: lastRSI,
          percentB: lastPercentB,
          distanceFromMean: (lastClose - lastBBMiddle) / lastBBMiddle,
          reason: `Price below BB lower band (${lastPercentB < 0 ? 'confirmed' : 'pending'}) with RSI ${lastRSI.toFixed(1)}`,
        }
      );
    }
    
    // SHORT сигнал: цена выше верхней полосы И RSI перекуплен
    let shortSignal = false;
    let shortStrength = 0;
    
    if (this.mrConfig.useBB && lastClose > lastBBUpper) {
      shortSignal = true;
      shortStrength += 0.4;
    }
    
    if (this.mrConfig.useRSI && lastRSI > this.mrConfig.overboughtThreshold) {
      shortSignal = true;
      shortStrength += 0.4;
    }
    
    if (lastPercentB > 1) {
      shortStrength += 0.2;  // Цена выше верхней полосы
    }
    
    if (shortSignal && shortStrength >= 0.6) {
      return this.createSignal(
        symbol,
        'SHORT',
        Math.min(1, shortStrength),
        lastClose,
        {
          rsi: lastRSI,
          percentB: lastPercentB,
          distanceFromMean: (lastClose - lastBBMiddle) / lastBBMiddle,
          reason: `Price above BB upper band (${lastPercentB > 1 ? 'confirmed' : 'pending'}) with RSI ${lastRSI.toFixed(1)}`,
        }
      );
    }
    
    // Выход: цена вернулась к среднему
    if (Math.abs(lastClose - lastBBMiddle) / lastBBMiddle < this.mrConfig.meanReversionThreshold) {
      return this.createSignal(
        symbol,
        'FLAT',
        0.5,
        lastClose,
        {
          rsi: lastRSI,
          percentB: lastPercentB,
          reason: 'Price reverted to mean',
        }
      );
    }
    
    return null;
  }

  /**
   * Расчет %B (позиция цены внутри Bollinger Bands)
   */
  private calculatePercentB(price: number, bb: { upper: number[]; lower: number[] }): number[] {
    const result: number[] = [];
    
    for (let i = 0; i < bb.upper.length; i++) {
      if (isNaN(bb.upper[i]) || isNaN(bb.lower[i])) {
        result.push(NaN);
        continue;
      }
      
      const percentB = (price - bb.lower[i]) / (bb.upper[i] - bb.lower[i]);
      result.push(percentB);
    }
    
    return result;
  }

  /**
   * Расчет ширины полосы (Bandwidth)
   */
  private calculateBandwidth(bb: { upper: number[]; middle: number[]; lower: number[] }): number[] {
    const result: number[] = [];
    
    for (let i = 0; i < bb.middle.length; i++) {
      if (isNaN(bb.upper[i]) || isNaN(bb.middle[i]) || isNaN(bb.lower[i])) {
        result.push(NaN);
        continue;
      }
      
      const bandwidth = (bb.upper[i] - bb.lower[i]) / bb.middle[i];
      result.push(bandwidth);
    }
    
    return result;
  }

  /**
   * Keltner Channel
   */
  private calculateKeltnerChannel(
    candles: CandleData[],
    emaPeriod: number,
    atrMultiplier: number
  ): { upper: number[]; lower: number[] } {
    const closes = candles.map(c => c.close);
    const ema = this.calculateEMA(closes, emaPeriod);
    const atr = this.calculateATR(candles, 14);
    
    const upper: number[] = [];
    const lower: number[] = [];
    
    for (let i = 0; i < candles.length; i++) {
      if (isNaN(ema[i]) || isNaN(atr[i])) {
        upper.push(NaN);
        lower.push(NaN);
        continue;
      }
      
      upper.push(ema[i] + atr[i] * atrMultiplier);
      lower.push(ema[i] - atr[i] * atrMultiplier);
    }
    
    return { upper, lower };
  }

  /**
   * Переопределение проверки условий входа
   */
  protected checkEntryConditions(symbol: string): boolean {
    const indicatorData = this.indicators.get(symbol);
    if (!indicatorData) return false;
    
    const percentB = indicatorData.percentB as number[];
    const lastPercentB = percentB[percentB.length - 1];
    
    // Входим только при экстремальных значениях %B
    return lastPercentB < 0 || lastPercentB > 1;
  }
}

/**
 * Factory для создания Mean Reversion стратегии
 */
export function createMeanReversionStrategy(
  symbol: string,
  timeframe: string,
  overrides?: Partial<MeanReversionConfig>
): MeanReversionStrategy {
  return new MeanReversionStrategy(
    {
      id: `mean_rev_${symbol}_${timeframe}`,
      name: `Mean Reversion ${symbol}`,
      enabled: true,
      timeframes: [timeframe],
      symbols: [symbol],
      maxPositions: 1,
      maxPositionSize: 0.1,
      stopLossPercent: 3,  // Больше чем у momentum
      takeProfitPercent: 2,  // Меньше т.к. ожидаем разворот к среднему
      parameters: {
        atrMultiplier: 1.5,
      },
    },
    overrides
  );
}
