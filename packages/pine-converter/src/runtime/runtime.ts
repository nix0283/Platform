// ============================================
// PINE SCRIPT RUNTIME
// Среда выполнения для индикаторов
// ============================================

import { Candle } from '@trading-platform/core';

export class PineRuntime {
  private data: Map<string, any[]> = new Map();
  private currentIndex: number = -1;
  private candles: Candle[] = [];
  
  // Series management
  createSeries<T>(initialValue: T): T[] {
    const series = [initialValue];
    return series;
  }
  
  get(series: any[], index: number = 0): any {
    const i = this.currentIndex - index;
    return i >= 0 && i < series.length ? series[i] : null;
  }
  
  set(series: any[], value: any): void {
    if (this.currentIndex >= series.length) {
      series.push(value);
    } else {
      series[this.currentIndex] = value;
    }
  }
  
  // Data helpers
  na(value: any): boolean {
    return value === null || value === undefined || Number.isNaN(value);
  }
  
  nz(value: any, replacement: number = 0): number {
    return this.na(value) ? replacement : Number(value);
  }
  
  // Technical Analysis functions
  sma(series: number[], period: number): number | null {
    if (series.length < period) return null;
    const slice = series.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / period;
  }
  
  ema(series: number[], period: number): number | null {
    const k = 2 / (period + 1);
    if (series.length === 0) return null;
    
    let emaValue = series[0];
    for (let i = 1; i < series.length; i++) {
      emaValue = series[i] * k + emaValue * (1 - k);
    }
    return emaValue;
  }
  
  wma(series: number[], period: number): number | null {
    if (series.length < period) return null;
    const slice = series.slice(-period);
    const weights = Array.from({ length: period }, (_, i) => i + 1);
    const weightedSum = slice.reduce((sum, val, i) => sum + val * weights[i], 0);
    const weightSum = weights.reduce((a, b) => a + b, 0);
    return weightedSum / weightSum;
  }
  
  rsi(series: number[], period: number = 14): number | null {
    if (series.length < period + 1) return null;
    
    let gains = 0, losses = 0;
    for (let i = series.length - period; i < series.length; i++) {
      const change = series[i] - series[i - 1];
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }
    
    if (losses === 0) return 100;
    const rs = gains / losses;
    return 100 - (100 / (1 + rs));
  }
  
  macd(
    series: number[],
    fastPeriod: number = 12,
    slowPeriod: number = 26,
    signalPeriod: number = 9
  ): { macd: number | null; signal: number | null; histogram: number | null } {
    const fastEma = this.ema(series, fastPeriod);
    const slowEma = this.ema(series, slowPeriod);
    
    if (fastEma === null || slowEma === null) {
      return { macd: null, signal: null, histogram: null };
    }
    
    const macdValue = fastEma - slowEma;
    // Signal line calculation would need historical MACD values
    return { macd: macdValue, signal: null, histogram: null };
  }
  
  crossover(a: number, b: number, aPrev: number, bPrev: number): boolean {
    return aPrev <= bPrev && a > b;
  }
  
  crossunder(a: number, b: number, aPrev: number, bPrev: number): boolean {
    return aPrev >= bPrev && a < b;
  }
  
  highest(series: number[], period: number): number | null {
    if (series.length < period) return null;
    return Math.max(...series.slice(-period));
  }
  
  lowest(series: number[], period: number): number | null {
    if (series.length < period) return null;
    return Math.min(...series.slice(-period));
  }
  
  highestbars(series: number[], period: number): number | null {
    if (series.length < period) return null;
    const slice = series.slice(-period);
    const max = Math.max(...slice);
    return slice.lastIndexOf(max);
  }
  
  lowestbars(series: number[], period: number): number | null {
    if (series.length < period) return null;
    const slice = series.slice(-period);
    const min = Math.min(...slice);
    return slice.lastIndexOf(min);
  }
  
  sum(series: number[], period: number): number | null {
    if (series.length < period) return null;
    return series.slice(-period).reduce((a, b) => a + b, 0);
  }
  
  avg(...values: number[]): number {
    const validValues = values.filter(v => !this.na(v));
    if (validValues.length === 0) return 0;
    return validValues.reduce((a, b) => a + b, 0) / validValues.length;
  }
  
  atr(highs: number[], lows: number[], closes: number[], period: number = 14): number | null {
    if (highs.length < period + 1) return null;
    
    const tr: number[] = [];
    for (let i = 1; i < highs.length; i++) {
      const hl = highs[i] - lows[i];
      const hc = Math.abs(highs[i] - closes[i - 1]);
      const lc = Math.abs(lows[i] - closes[i - 1]);
      tr.push(Math.max(hl, hc, lc));
    }
    
    return this.ema(tr, period);
  }
  
  bb(
    series: number[],
    period: number = 20,
    mult: number = 2
  ): { upper: number | null; middle: number | null; lower: number | null } {
    const middle = this.sma(series, period);
    if (middle === null) return { upper: null, middle: null, lower: null };
    
    const slice = series.slice(-period);
    const variance = slice.reduce((sum, val) => sum + Math.pow(val - middle, 2), 0) / period;
    const stdDev = Math.sqrt(variance);
    
    return {
      upper: middle + mult * stdDev,
      middle,
      lower: middle - mult * stdDev,
    };
  }
  
  vwap(highs: number[], lows: number[], closes: number[], volumes: number[]): number | null {
    if (highs.length === 0) return null;
    
    const i = highs.length - 1;
    const typicalPrice = (highs[i] + lows[i] + closes[i]) / 3;
    return typicalPrice * volumes[i];
  }
  
  // Math functions
  abs(value: number): number {
    return Math.abs(value);
  }
  
  min(...values: number[]): number {
    return Math.min(...values.filter(v => !this.na(v)));
  }
  
  max(...values: number[]): number {
    return Math.max(...values.filter(v => !this.na(v)));
  }
  
  pow(base: number, exponent: number): number {
    return Math.pow(base, exponent);
  }
  
  sqrt(value: number): number {
    return Math.sqrt(value);
  }
  
  log(value: number): number {
    return Math.log(value);
  }
  
  log10(value: number): number {
    return Math.log10(value);
  }
  
  sin(value: number): number {
    return Math.sin(value);
  }
  
  cos(value: number): number {
    return Math.cos(value);
  }
  
  tan(value: number): number {
    return Math.tan(value);
  }
  
  // Bar data access
  open(): number | null {
    return this.currentIndex >= 0 && this.currentIndex < this.candles.length
      ? this.candles[this.currentIndex].open
      : null;
  }
  
  high(): number | null {
    return this.currentIndex >= 0 && this.currentIndex < this.candles.length
      ? this.candles[this.currentIndex].high
      : null;
  }
  
  low(): number | null {
    return this.currentIndex >= 0 && this.currentIndex < this.candles.length
      ? this.candles[this.currentIndex].low
      : null;
  }
  
  close(): number | null {
    return this.currentIndex >= 0 && this.currentIndex < this.candles.length
      ? this.candles[this.currentIndex].close
      : null;
  }
  
  volume(): number | null {
    return this.currentIndex >= 0 && this.currentIndex < this.candles.length
      ? this.candles[this.currentIndex].volume
      : null;
  }
  
  // Update with new bar
  updateBar(candle: Candle): void {
    this.candles.push(candle);
    this.currentIndex = this.candles.length - 1;
  }
  
  // Reset for new calculation
  reset(): void {
    this.currentIndex = -1;
    this.candles = [];
    this.data.clear();
  }
  
  // Get current bar index
  bar_index(): number {
    return this.currentIndex;
  }
  
  // Time functions
  time(): number | null {
    return this.currentIndex >= 0 && this.currentIndex < this.candles.length
      ? this.candles[this.currentIndex].timestamp
      : null;
  }
}

// Singleton instance
export const runtime = new PineRuntime();

// Export common functions for direct import
export const {
  sma,
  ema,
  wma,
  rsi,
  macd,
  crossover,
  crossunder,
  highest,
  lowest,
  highestbars,
  lowestbars,
  sum,
  avg,
  atr,
  bb,
  vwap,
  abs,
  min,
  max,
  pow,
  sqrt,
  log,
  log10,
  na,
  nz,
} = runtime;
