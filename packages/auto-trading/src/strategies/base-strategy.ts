/**
 * Базовый класс для торговых стратегий
 * Основано на: awesome-systematic-trading, jesse
 */

import { StrategySignal, StrategyConfig, StrategyPerformance } from '../types';

export interface CandleData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IndicatorValues {
  [key: string]: number | number[] | undefined;
}

export abstract class BaseStrategy {
  protected config: StrategyConfig;
  protected indicators: Map<string, IndicatorValues> = new Map();
  protected candles: Map<string, CandleData[]> = new Map();
  protected lastSignal: StrategySignal | null = null;
  
  constructor(config: StrategyConfig) {
    this.config = config;
  }

  /**
   * Обновление данных (свечи)
   */
  updateCandles(symbol: string, candles: CandleData[]): void {
    this.candles.set(symbol, candles);
    
    // Пересчитываем индикаторы
    this.calculateIndicators(symbol, candles);
  }

  /**
   * Расчет индикаторов (переопределяется в подклассах)
   */
  protected abstract calculateIndicators(symbol: string, candles: CandleData[]): void;

  /**
   * Генерация сигнала (переопределяется в подклассах)
   */
  abstract generateSignal(symbol: string, timeframe: string): StrategySignal | null;

  /**
   * Проверка условий для входа
   */
  protected checkEntryConditions(symbol: string): boolean {
    // Базовая проверка - должна быть переопределена
    return true;
  }

  /**
   * Проверка условий для выхода
   */
  protected checkExitConditions(symbol: string, side: 'LONG' | 'SHORT'): boolean {
    // Базовая проверка - должна быть переопределена
    return false;
  }

  /**
   * Расчет Stop Loss и Take Profit
   */
  protected calculateRiskLevels(
    symbol: string,
    side: 'LONG' | 'SHORT',
    entryPrice: number
  ): { stopLoss: number; takeProfit: number } {
    const atr = this.getIndicator(symbol, 'ATR') as number || 0;
    const atrMultiplier = (this.config.parameters.atrMultiplier as number) || 2;
    
    if (side === 'LONG') {
      return {
        stopLoss: entryPrice - (atr * atrMultiplier),
        takeProfit: entryPrice + (atr * atrMultiplier * 2),
      };
    } else {
      return {
        stopLoss: entryPrice + (atr * atrMultiplier),
        takeProfit: entryPrice - (atr * atrMultiplier * 2),
      };
    }
  }

  /**
   * Получение значения индикатора
   */
  protected getIndicator(symbol: string, name: string, index: number = -1): number | number[] | undefined {
    const indicatorData = this.indicators.get(symbol);
    if (!indicatorData || !indicatorData[name]) return undefined;
    
    const values = indicatorData[name];
    if (Array.isArray(values)) {
      return index === -1 ? values[values.length - 1] : values[index];
    }
    return values;
  }

  /**
   * Получение последней свечи
   */
  protected getLastCandle(symbol: string): CandleData | null {
    const candles = this.candles.get(symbol);
    if (!candles || candles.length === 0) return null;
    return candles[candles.length - 1];
  }

  /**
   * Получение исторических свечей
   */
  protected getCandles(symbol: string, count: number = 100): CandleData[] {
    const candles = this.candles.get(symbol);
    if (!candles) return [];
    return candles.slice(-count);
  }

  /**
   * Создание объекта сигнала
   */
  protected createSignal(
    symbol: string,
    side: 'LONG' | 'SHORT' | 'FLAT',
    strength: number,
    entryPrice: number,
    metadata: Record<string, any> = {}
  ): StrategySignal {
    const candle = this.getLastCandle(symbol);
    const { stopLoss, takeProfit } = this.calculateRiskLevels(symbol, side, entryPrice);
    
    const signal: StrategySignal = {
      strategyId: this.config.id,
      strategyName: this.config.name,
      strategyType: this.config.type,
      symbol,
      side,
      strength,
      timestamp: Date.now(),
      entryPrice,
      stopLoss,
      takeProfit,
      timeframe: this.config.timeframes[0],
      indicators: this.getIndicatorValues(symbol),
      metadata,
    };
    
    this.lastSignal = signal;
    return signal;
  }

  /**
   * Получение всех значений индикаторов
   */
  private getIndicatorValues(symbol: string): Record<string, number> {
    const indicatorData = this.indicators.get(symbol);
    if (!indicatorData) return {};
    
    const values: Record<string, number> = {};
    Object.entries(indicatorData).forEach(([name, value]) => {
      if (typeof value === 'number') {
        values[name] = value;
      } else if (Array.isArray(value) && value.length > 0) {
        values[name] = value[value.length - 1];
      }
    });
    
    return values;
  }

  /**
   * Вспомогательные функции для индикаторов
   */
  
  // Simple Moving Average
  protected calculateSMA(values: number[], period: number): number[] {
    const result: number[] = [];
    for (let i = 0; i < values.length; i++) {
      if (i < period - 1) {
        result.push(NaN);
        continue;
      }
      const sum = values.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / period);
    }
    return result;
  }

  // Exponential Moving Average
  protected calculateEMA(values: number[], period: number): number[] {
    const result: number[] = [];
    const k = 2 / (period + 1);
    
    // Первая EMA = SMA
    let ema = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
    
    for (let i = 0; i < values.length; i++) {
      if (i < period - 1) {
        result.push(NaN);
        continue;
      }
      ema = values[i] * k + ema * (1 - k);
      result.push(ema);
    }
    
    return result;
  }

  // Relative Strength Index
  protected calculateRSI(closes: number[], period: number = 14): number[] {
    const result: number[] = [];
    const gains: number[] = [];
    const losses: number[] = [];
    
    for (let i = 1; i < closes.length; i++) {
      const change = closes[i] - closes[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }
    
    for (let i = 0; i < closes.length; i++) {
      if (i < period) {
        result.push(50);
        continue;
      }
      
      const avgGain = gains.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
      const avgLoss = losses.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
      
      if (avgLoss === 0) {
        result.push(100);
      } else {
        const rs = avgGain / avgLoss;
        result.push(100 - (100 / (1 + rs)));
      }
    }
    
    return result;
  }

  // Average True Range
  protected calculateATR(candles: CandleData[], period: number = 14): number[] {
    const result: number[] = [];
    const trueRanges: number[] = [];
    
    for (let i = 0; i < candles.length; i++) {
      const candle = candles[i];
      if (i === 0) {
        trueRanges.push(candle.high - candle.low);
      } else {
        const prevClose = candles[i - 1].close;
        const tr = Math.max(
          candle.high - candle.low,
          Math.abs(candle.high - prevClose),
          Math.abs(candle.low - prevClose)
        );
        trueRanges.push(tr);
      }
    }
    
    for (let i = 0; i < candles.length; i++) {
      if (i < period) {
        const sum = trueRanges.slice(0, i + 1).reduce((a, b) => a + b, 0);
        result.push(sum / (i + 1));
      } else {
        const atr = (result[i - 1] * (period - 1) + trueRanges[i]) / period;
        result.push(atr);
      }
    }
    
    return result;
  }

  // Bollinger Bands
  protected calculateBollingerBands(
    closes: number[],
    period: number = 20,
    stdDev: number = 2
  ): { upper: number[]; middle: number[]; lower: number[] } {
    const middle = this.calculateSMA(closes, period);
    const upper: number[] = [];
    const lower: number[] = [];
    
    for (let i = 0; i < closes.length; i++) {
      if (i < period - 1) {
        upper.push(NaN);
        lower.push(NaN);
        continue;
      }
      
      const slice = closes.slice(i - period + 1, i + 1);
      const mean = middle[i];
      const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
      const std = Math.sqrt(variance);
      
      upper.push(mean + stdDev * std);
      lower.push(mean - stdDev * std);
    }
    
    return { upper, middle, lower };
  }

  /**
   * Статистика стратегии (переопределяется)
   */
  getPerformance(): StrategyPerformance {
    // Базовая реализация - должна быть переопределена
    return {
      strategyId: this.config.id,
      totalTrades: 0,
      winRate: 0,
      profitFactor: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      maxDrawdown: 0,
      totalReturn: 0,
      avgReturn: 0,
      avgWin: 0,
      avgLoss: 0,
      consecutiveWins: 0,
      consecutiveLosses: 0,
      profitableDays: 0,
      losingDays: 0,
    };
  }

  /**
   * Сброс состояния стратегии
   */
  reset(): void {
    this.indicators.clear();
    this.candles.clear();
    this.lastSignal = null;
  }
}
