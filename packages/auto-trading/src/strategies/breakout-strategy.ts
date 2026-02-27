/**
 * Breakout Strategy
 * Основано на: awesome-systematic-trading (breakout strategies)
 * 
 * Логика:
 * - Торговля пробоев уровней поддержки/сопротивления
 * - Используем Donchian Channel для определения уровней
 * - Подтверждение объемом
 */

import { BaseStrategy, CandleData } from './base-strategy';
import { StrategySignal } from '../types';

export interface BreakoutConfig {
  lookbackPeriod: number;     // Период для определения уровней (default: 20)
  useVolume: boolean;         // Подтверждение объемом (default: true)
  volumeMultiplier: number;   // Множитель объема (default: 2)
  useATRFilter: boolean;      // Фильтр по волатильности (default: true)
  minATRPercent: number;      // Мин. ATR % (default: 0.01)
  falseBreakoutFilter: boolean; // Фильтр ложных пробоев (default: true)
  confirmationCandles: number; // Свечей для подтверждения (default: 1)
}

export class BreakoutStrategy extends BaseStrategy {
  private breakoutConfig: BreakoutConfig;

  constructor(config: any, breakoutConfig?: Partial<BreakoutConfig>) {
    super({
      ...config,
      type: 'breakout' as const,
      parameters: {
        atrMultiplier: 2.5,  // Больше т.к. пробой может быть волатильным
        ...config.parameters,
      },
    });

    this.breakoutConfig = {
      lookbackPeriod: 20,
      useVolume: true,
      volumeMultiplier: 2,
      useATRFilter: true,
      minATRPercent: 0.01,
      falseBreakoutFilter: true,
      confirmationCandles: 1,
      ...breakoutConfig,
    };
  }

  protected calculateIndicators(symbol: string, candles: CandleData[]): void {
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const closes = candles.map(c => c.close);
    const volumes = candles.map(c => c.volume);
    
    // Donchian Channel (верхняя и нижняя границы)
    const upperChannel = this.calculateDonchianUpper(highs, this.breakoutConfig.lookbackPeriod);
    const lowerChannel = this.calculateDonchianLower(lows, this.breakoutConfig.lookbackPeriod);
    const middleChannel = upperChannel.map((u, i) => (u + lowerChannel[i]) / 2);
    
    // Volume SMA
    const volumeSMA = this.calculateSMA(volumes, 20);
    
    // ATR для фильтрации
    const atr = this.calculateATR(candles, 14);
    
    // ATR % для оценки волатильности
    const atrPercent = atr.map((a, i) => a / closes[i]);
    
    // Highest High и Lowest Low за период
    const highestHigh = this.calculateHighest(highs, this.breakoutConfig.lookbackPeriod);
    const lowestLow = this.calculateLowest(lows, this.breakoutConfig.lookbackPeriod);
    
    const lastCandle = candles[candles.length - 1];
    
    this.indicators.set(symbol, {
      donchianUpper: upperChannel,
      donchianLower: lowerChannel,
      donchianMiddle: middleChannel,
      volumeSMA,
      atr,
      atrPercent,
      highestHigh,
      lowestLow,
      currentVolume: lastCandle.volume,
      avgVolume: volumeSMA[volumeSMA.length - 1],
    });
  }

  generateSignal(symbol: string, timeframe: string): StrategySignal | null {
    const indicatorData = this.indicators.get(symbol);
    if (!indicatorData) return null;
    
    const donchianUpper = indicatorData.donchianUpper as number[];
    const donchianLower = indicatorData.donchianLower as number[];
    const volumeSMA = indicatorData.volumeSMA as number[];
    const atrPercent = indicatorData.atrPercent as number[];
    const currentVolume = indicatorData.currentVolume as number;
    const avgVolume = indicatorData.avgVolume as number;
    
    const candles = this.getCandles(symbol, this.breakoutConfig.confirmationCandles + 2);
    if (candles.length < this.breakoutConfig.confirmationCandles + 1) return null;
    
    const lastCandle = candles[candles.length - 1];
    const prevCandle = candles[candles.length - 2];
    
    const lastUpper = donchianUpper[donchianUpper.length - 1];
    const lastLower = donchianLower[donchianLower.length - 1];
    const lastATRPercent = atrPercent[atrPercent.length - 1];
    
    // Проверка волатильности
    let volatilityConfirmed = true;
    if (this.breakoutConfig.useATRFilter) {
      volatilityConfirmed = lastATRPercent >= this.breakoutConfig.minATRPercent;
    }
    
    // Проверка объема
    let volumeConfirmed = true;
    if (this.breakoutConfig.useVolume) {
      volumeConfirmed = currentVolume >= avgVolume * this.breakoutConfig.volumeMultiplier;
    }
    
    // Проверка на ложный пробой
    let falseBreakoutConfirmed = true;
    if (this.breakoutConfig.falseBreakoutFilter) {
      // Цена должна закрыться за уровнем
      falseBreakoutConfirmed = lastCandle.close > lastUpper || lastCandle.close < lastLower;
    }
    
    // LONG сигнал: пробой верхней границы
    if (
      lastCandle.close > lastUpper &&
      prevCandle.close <= lastUpper &&  // Предыдущая свеча не была за уровнем
      volatilityConfirmed &&
      volumeConfirmed &&
      falseBreakoutConfirmed
    ) {
      return this.createSignal(
        symbol,
        'LONG',
        Math.min(1, (currentVolume / avgVolume) / 3),  // Strength на основе объема
        lastCandle.close,
        {
          breakoutLevel: lastUpper,
          breakoutPercent: (lastCandle.close - lastUpper) / lastUpper,
          volumeRatio: currentVolume / avgVolume,
          atrPercent: lastATRPercent,
          reason: `Breakout above Donchian upper band at ${lastUpper.toFixed(2)} with volume ${volumeConfirmed ? 'confirmation' : 'weak'}`,
        }
      );
    }
    
    // SHORT сигнал: пробой нижней границы
    if (
      lastCandle.close < lastLower &&
      prevCandle.close >= lastLower &&  // Предыдущая свеча не была за уровнем
      volatilityConfirmed &&
      volumeConfirmed &&
      falseBreakoutConfirmed
    ) {
      return this.createSignal(
        symbol,
        'SHORT',
        Math.min(1, (currentVolume / avgVolume) / 3),
        lastCandle.close,
        {
          breakoutLevel: lastLower,
          breakoutPercent: (lastLower - lastCandle.close) / lastLower,
          volumeRatio: currentVolume / avgVolume,
          atrPercent: lastATRPercent,
          reason: `Breakout below Donchian lower band at ${lastLower.toFixed(2)} with volume ${volumeConfirmed ? 'confirmation' : 'weak'}`,
        }
      );
    }
    
    // Выход: цена вернулась в канал
    if (lastCandle.close >= lastLower && lastCandle.close <= lastUpper) {
      const prevClose = prevCandle.close;
      const wasOutside = prevClose > lastUpper || prevClose < lastLower;
      
      if (wasOutside) {
        return this.createSignal(
          symbol,
          'FLAT',
          0.5,
          lastCandle.close,
          {
            reason: 'Price returned inside Donchian channel',
          }
        );
      }
    }
    
    return null;
  }

  /**
   * Donchian Channel Upper (Highest High за период)
   */
  private calculateDonchianUpper(highs: number[], period: number): number[] {
    return this.calculateHighest(highs, period);
  }

  /**
   * Donchian Channel Lower (Lowest Low за период)
   */
  private calculateDonchianLower(lows: number[], period: number): number[] {
    return this.calculateLowest(lows, period);
  }

  /**
   * Highest за период
   */
  private calculateHighest(values: number[], period: number): number[] {
    const result: number[] = [];
    
    for (let i = 0; i < values.length; i++) {
      if (i < period - 1) {
        result.push(NaN);
        continue;
      }
      
      const slice = values.slice(i - period + 1, i + 1);
      result.push(Math.max(...slice));
    }
    
    return result;
  }

  /**
   * Lowest за период
   */
  private calculateLowest(values: number[], period: number): number[] {
    const result: number[] = [];
    
    for (let i = 0; i < values.length; i++) {
      if (i < period - 1) {
        result.push(NaN);
        continue;
      }
      
      const slice = values.slice(i - period + 1, i + 1);
      result.push(Math.min(...slice));
    }
    
    return result;
  }

  /**
   * Переопределение проверки условий входа
   */
  protected checkEntryConditions(symbol: string): boolean {
    const indicatorData = this.indicators.get(symbol);
    if (!indicatorData) return false;
    
    const atrPercent = indicatorData.atrPercent as number[];
    const lastATRPercent = atrPercent[atrPercent.length - 1];
    
    // Входим только при достаточной волатильности
    return lastATRPercent >= this.breakoutConfig.minATRPercent;
  }
}

/**
 * Factory для создания Breakout стратегии
 */
export function createBreakoutStrategy(
  symbol: string,
  timeframe: string,
  overrides?: Partial<BreakoutConfig>
): BreakoutStrategy {
  return new BreakoutStrategy(
    {
      id: `breakout_${symbol}_${timeframe}`,
      name: `Breakout ${symbol}`,
      enabled: true,
      timeframes: [timeframe],
      symbols: [symbol],
      maxPositions: 1,
      maxPositionSize: 0.1,
      stopLossPercent: 2.5,
      takeProfitPercent: 5,  // Больше т.к. пробой может дать сильный тренд
      parameters: {
        atrMultiplier: 2.5,
      },
    },
    overrides
  );
}
