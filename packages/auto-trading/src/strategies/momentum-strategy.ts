/**
 * Momentum Strategy
 * Основано на: awesome-systematic-trading (momentum-factor-effect-in-stocks.py)
 * 
 * Логика:
 * - Покупаем активы с сильным положительным моментумом
 * - Продаем активы с сильным отрицательным моментумом
 * - Моментум измеряется как доходность за N периодов
 */

import { BaseStrategy, CandleData } from './base-strategy';
import { StrategySignal } from '../types';

export interface MomentumConfig {
  lookbackPeriod: number;     // Период для расчета моментума (default: 21)
  entryThreshold: number;     // Порог для входа (default: 0.02 = 2%)
  exitThreshold: number;      // Порог для выхода (default: 0.01 = 1%)
  useVolume: boolean;         // Учитывать объем (default: true)
  volumeMultiplier: number;   // Множитель объема (default: 1.5)
}

export class MomentumStrategy extends BaseStrategy {
  private momentumConfig: MomentumConfig;

  constructor(config: any, momentumConfig?: Partial<MomentumConfig>) {
    super({
      ...config,
      type: 'momentum' as const,
      parameters: {
        atrMultiplier: 2,
        ...config.parameters,
      },
    });

    this.momentumConfig = {
      lookbackPeriod: 21,
      entryThreshold: 0.02,
      exitThreshold: 0.01,
      useVolume: true,
      volumeMultiplier: 1.5,
      ...momentumConfig,
    };
  }

  protected calculateIndicators(symbol: string, candles: CandleData[]): void {
    const closes = candles.map(c => c.close);
    const volumes = candles.map(c => c.volume);
    
    // Momentum (ROC - Rate of Change)
    const momentum = this.calculateMomentum(closes, this.momentumConfig.lookbackPeriod);
    
    // Volume SMA для сравнения
    const volumeSMA = this.calculateSMA(volumes, 20);
    
    // RSI для фильтрации перекупленности/перепроданности
    const rsi = this.calculateRSI(closes, 14);
    
    // ATR для волатильности
    const atr = this.calculateATR(candles, 14);
    
    const lastCandle = candles[candles.length - 1];
    
    this.indicators.set(symbol, {
      momentum,
      volumeSMA,
      rsi,
      atr,
      currentVolume: lastCandle.volume,
      avgVolume: volumeSMA[volumeSMA.length - 1],
    });
  }

  generateSignal(symbol: string, timeframe: string): StrategySignal | null {
    const indicatorData = this.indicators.get(symbol);
    if (!indicatorData) return null;
    
    const momentum = indicatorData.momentum as number[];
    const rsi = indicatorData.rsi as number[];
    const volumeSMA = indicatorData.volumeSMA as number[];
    const currentVolume = indicatorData.currentVolume as number;
    const avgVolume = indicatorData.avgVolume as number;
    
    const lastMomentum = momentum[momentum.length - 1];
    const lastRSI = rsi[rsi.length - 1];
    const prevMomentum = momentum[momentum.length - 2];
    
    const candle = this.getLastCandle(symbol);
    if (!candle) return null;
    
    // Проверка объема (если включено)
    let volumeConfirmed = true;
    if (this.momentumConfig.useVolume) {
      volumeConfirmed = currentVolume >= avgVolume * this.momentumConfig.volumeMultiplier;
    }
    
    // LONG сигнал: сильный положительный моментум + рост
    if (
      lastMomentum > this.momentumConfig.entryThreshold &&
      lastMomentum > prevMomentum &&
      lastRSI < 70 &&  // Не перекупленность
      volumeConfirmed
    ) {
      return this.createSignal(
        symbol,
        'LONG',
        Math.min(1, lastMomentum / 0.1),  // Strength на основе моментума
        candle.close,
        {
          momentum: lastMomentum,
          rsi: lastRSI,
          volumeRatio: currentVolume / avgVolume,
          reason: 'Strong positive momentum with volume confirmation',
        }
      );
    }
    
    // SHORT сигнал: сильный отрицательный моментум + падение
    if (
      lastMomentum < -this.momentumConfig.entryThreshold &&
      lastMomentum < prevMomentum &&
      lastRSI > 30 &&  // Не перепроданность
      volumeConfirmed
    ) {
      return this.createSignal(
        symbol,
        'SHORT',
        Math.min(1, Math.abs(lastMomentum) / 0.1),
        candle.close,
        {
          momentum: lastMomentum,
          rsi: lastRSI,
          volumeRatio: currentVolume / avgVolume,
          reason: 'Strong negative momentum with volume confirmation',
        }
      );
    }
    
    // Выход из позиции: моментум ослабевает
    if (Math.abs(lastMomentum) < this.momentumConfig.exitThreshold) {
      return this.createSignal(
        symbol,
        'FLAT',
        0.5,
        candle.close,
        {
          momentum: lastMomentum,
          reason: 'Momentum weakened below exit threshold',
        }
      );
    }
    
    return null;
  }

  /**
   * Расчет моментума (Rate of Change)
   */
  private calculateMomentum(closes: number[], period: number): number[] {
    const result: number[] = [];
    
    for (let i = 0; i < closes.length; i++) {
      if (i < period) {
        result.push(0);
        continue;
      }
      
      const roc = (closes[i] - closes[i - period]) / closes[i - period];
      result.push(roc);
    }
    
    return result;
  }

  /**
   * Переопределение проверки условий входа
   */
  protected checkEntryConditions(symbol: string): boolean {
    const indicatorData = this.indicators.get(symbol);
    if (!indicatorData) return false;
    
    const momentum = indicatorData.momentum as number[];
    const rsi = indicatorData.rsi as number[];
    
    const lastMomentum = momentum[momentum.length - 1];
    const lastRSI = rsi[rsi.length - 1];
    
    // Дополнительные проверки
    return Math.abs(lastMomentum) > this.momentumConfig.entryThreshold &&
           lastRSI >= 20 && lastRSI <= 80;  // Избегаем экстремумов
  }

  getPerformance(): any {
    // В реальной реализации здесь была бы статистика
    return {
      ...super.getPerformance(),
      strategyId: this.config.id,
      strategyName: 'Momentum',
    };
  }
}

/**
 * Factory для создания Momentum стратегии
 */
export function createMomentumStrategy(
  symbol: string,
  timeframe: string,
  overrides?: Partial<MomentumConfig>
): MomentumStrategy {
  return new MomentumStrategy(
    {
      id: `momentum_${symbol}_${timeframe}`,
      name: `Momentum ${symbol}`,
      enabled: true,
      timeframes: [timeframe],
      symbols: [symbol],
      maxPositions: 1,
      maxPositionSize: 0.1,
      stopLossPercent: 2,
      takeProfitPercent: 4,
      parameters: {
        atrMultiplier: 2,
      },
    },
    overrides
  );
}
