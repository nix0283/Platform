// ============================================
// CHART TYPES — Все типы графиков TradingView
// ============================================

import { Candle, OHLCV } from '@trading-platform/core';

// ============================================
// TYPES
// ============================================

export type ChartType = 
  | 'candle'
  | 'bar'
  | 'hollow_candle'
  | 'line'
  | 'area'
  | 'baseline'
  | 'heikin_ashi'
  | 'renko'
  | 'point_figure'
  | 'kagi'
  | 'line_break'
  | 'range';

export interface ChartTypeConfig {
  type: ChartType;
  // Renko specific
  boxSize?: number;
  source?: 'close' | 'high_low';
  // Point & Figure specific
  reversalAmount?: number;
  boxSizeP&F?: number;
  // Kagi specific
  kagiReversal?: number;
  // Line Break specific
  lineBreakPeriod?: number;
}

// ============================================
// CHART TYPE CONVERTERS
// ============================================

/**
 * Преобразование в Heikin Ashi свечи
 */
export function convertToHeikinAshi(candles: Candle[]): Candle[] {
  const haCandles: Candle[] = [];
  
  let prevHAOpen = 0;
  let prevHAClose = 0;
  
  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i];
    
    // HA Close = (Open + High + Low + Close) / 4
    const haClose = (candle.open + candle.high + candle.low + candle.close) / 4;
    
    // HA Open = (Prev HA Open + Prev HA Close) / 2
    const haOpen = i === 0 
      ? (candle.open + candle.close) / 2 
      : (prevHAOpen + prevHAClose) / 2;
    
    // HA High = Max(High, HA Open, HA Close)
    const haHigh = Math.max(candle.high, haOpen, haClose);
    
    // HA Low = Min(Low, HA Open, HA Close)
    const haLow = Math.min(candle.low, haOpen, haClose);
    
    haCandles.push({
      ...candle,
      open: haOpen,
      high: haHigh,
      low: haLow,
      close: haClose,
    });
    
    prevHAOpen = haOpen;
    prevHAClose = haClose;
  }
  
  return haCandles;
}

/**
 * Преобразование в Renko кирпичи
 */
export function convertToRenko(candles: Candle[], boxSize: number, source: 'close' | 'high_low' = 'close'): Candle[] {
  if (candles.length === 0 || boxSize <= 0) return [];
  
  const renkoBricks: Candle[] = [];
  let currentBrickOpen = candles[0].close;
  let currentTrend: 'up' | 'down' | null = null;
  
  for (const candle of candles) {
    const price = source === 'close' ? candle.close : candle.close;
    
    if (currentTrend === null) {
      // Определяем начальный тренд
      const diff = price - currentBrickOpen;
      if (Math.abs(diff) >= boxSize) {
        currentTrend = diff > 0 ? 'up' : 'down';
        currentBrickOpen = currentTrend === 'up' 
          ? Math.floor(price / boxSize) * boxSize 
          : Math.ceil(price / boxSize) * boxSize;
      }
      continue;
    }
    
    if (currentTrend === 'up') {
      // Восходящие кирпичи
      while (price >= currentBrickOpen + boxSize) {
        renkoBricks.push({
          timestamp: candle.timestamp,
          open: currentBrickOpen,
          high: currentBrickOpen + boxSize,
          low: currentBrickOpen,
          close: currentBrickOpen + boxSize,
          volume: candle.volume,
          symbol: candle.symbol,
          interval: candle.interval,
        });
        currentBrickOpen += boxSize;
      }
      
      // Разворот
      while (price <= currentBrickOpen - 2 * boxSize) {
        renkoBricks.push({
          timestamp: candle.timestamp,
          open: currentBrickOpen,
          high: currentBrickOpen,
          low: currentBrickOpen - boxSize,
          close: currentBrickOpen - boxSize,
          volume: candle.volume,
          symbol: candle.symbol,
          interval: candle.interval,
        });
        currentBrickOpen -= boxSize;
        currentTrend = 'down';
      }
    } else {
      // Нисходящие кирпичи
      while (price <= currentBrickOpen - boxSize) {
        renkoBricks.push({
          timestamp: candle.timestamp,
          open: currentBrickOpen,
          high: currentBrickOpen,
          low: currentBrickOpen - boxSize,
          close: currentBrickOpen - boxSize,
          volume: candle.volume,
          symbol: candle.symbol,
          interval: candle.interval,
        });
        currentBrickOpen -= boxSize;
      }
      
      // Разворот
      while (price >= currentBrickOpen + 2 * boxSize) {
        renkoBricks.push({
          timestamp: candle.timestamp,
          open: currentBrickOpen,
          high: currentBrickOpen + boxSize,
          low: currentBrickOpen,
          close: currentBrickOpen + boxSize,
          volume: candle.volume,
          symbol: candle.symbol,
          interval: candle.interval,
        });
        currentBrickOpen += boxSize;
        currentTrend = 'up';
      }
    }
  }
  
  return renkoBricks;
}

/**
 * Преобразование в Point & Figure (Крестики-нолики)
 */
export function convertToPointAndFigure(candles: Candle[], boxSize: number, reversalAmount: number = 3): Candle[] {
  if (candles.length === 0 || boxSize <= 0) return [];
  
  const pnfBoxes: Candle[] = [];
  let currentColumn: 'X' | 'O' | null = null;
  let currentHigh = 0;
  let currentLow = Infinity;
  let lastSignificantHigh = 0;
  
  for (const candle of candles) {
    const high = candle.high;
    const low = candle.low;
    
    if (currentColumn === null) {
      // Инициализация
      currentHigh = high;
      currentLow = low;
      continue;
    }
    
    if (currentColumn === 'X') {
      // Колонка X (рост)
      if (high > currentHigh) {
        currentHigh = high;
      }
      
      // Проверка на разворот
      if (currentHigh - low >= reversalAmount * boxSize) {
        // Завершаем колонку X
        const numBoxes = Math.floor((currentHigh - currentLow) / boxSize);
        for (let i = 0; i < numBoxes; i++) {
          pnfBoxes.push({
            timestamp: candle.timestamp,
            open: currentLow + i * boxSize,
            high: currentLow + (i + 1) * boxSize,
            low: currentLow + i * boxSize,
            close: currentLow + (i + 1) * boxSize,
            volume: candle.volume,
            symbol: candle.symbol,
            interval: 'pnf',
          });
        }
        
        // Начинаем колонку O
        currentColumn = 'O';
        lastSignificantHigh = currentHigh;
        currentLow = low;
      }
    } else {
      // Колонка O (падение)
      if (low < currentLow) {
        currentLow = low;
      }
      
      // Проверка на разворот
      if (high - currentLow >= reversalAmount * boxSize) {
        // Завершаем колонку O
        const numBoxes = Math.floor((currentHigh - currentLow) / boxSize);
        for (let i = 0; i < numBoxes; i++) {
          pnfBoxes.push({
            timestamp: candle.timestamp,
            open: currentHigh - i * boxSize,
            high: currentHigh - i * boxSize,
            low: currentHigh - (i + 1) * boxSize,
            close: currentHigh - (i + 1) * boxSize,
            volume: candle.volume,
            symbol: candle.symbol,
            interval: 'pnf',
          });
        }
        
        // Начинаем колонку X
        currentColumn = 'X';
        currentHigh = high;
      }
    }
  }
  
  return pnfBoxes;
}

/**
 * Преобразование в Kagi
 */
export function convertToKagi(candles: Candle[], reversalPercent: number = 0.05): Candle[] {
  if (candles.length === 0) return [];
  
  const kagiLines: Candle[] = [];
  let currentDirection: 'up' | 'down' = 'up';
  let currentPrice = candles[0].close;
  let reversalThreshold = currentPrice * reversalPercent;
  
  for (const candle of candles) {
    const price = candle.close;
    const change = Math.abs(price - currentPrice);
    
    if (change >= reversalThreshold) {
      // Разворот
      const newDirection = price > currentPrice ? 'up' : 'down';
      
      if (newDirection !== currentDirection) {
        kagiLines.push({
          timestamp: candle.timestamp,
          open: currentPrice,
          high: newDirection === 'up' ? price : currentPrice,
          low: newDirection === 'down' ? price : currentPrice,
          close: price,
          volume: candle.volume,
          symbol: candle.symbol,
          interval: 'kagi',
        });
        
        currentDirection = newDirection;
      } else {
        // Продолжение тренда
        kagiLines[kagiLines.length - 1].close = price;
        if (newDirection === 'up') {
          kagiLines[kagiLines.length - 1].high = Math.max(kagiLines[kagiLines.length - 1].high, price);
        } else {
          kagiLines[kagiLines.length - 1].low = Math.min(kagiLines[kagiLines.length - 1].low, price);
        }
      }
      
      currentPrice = price;
      reversalThreshold = currentPrice * reversalPercent;
    }
  }
  
  return kagiLines;
}

/**
 * Преобразование в Three Line Break
 */
export function convertToLineBreak(candles: Candle[], period: number = 3): Candle[] {
  if (candles.length < period) return [];
  
  const lineBreaks: Candle[] = [];
  const highs: number[] = [];
  const lows: number[] = [];
  let currentTrend: 'up' | 'down' | null = null;
  
  for (const candle of candles) {
    highs.push(candle.high);
    lows.push(candle.low);
    
    if (highs.length > period) highs.shift();
    if (lows.length > period) lows.shift();
    
    if (highs.length === period) {
      const periodHigh = Math.max(...highs);
      const periodLow = Math.min(...lows);
      
      if (currentTrend === null) {
        currentTrend = candle.close > candle.open ? 'up' : 'down';
        lineBreaks.push({
          ...candle,
          interval: 'line_break',
        });
      } else if (currentTrend === 'up') {
        if (candle.close > periodHigh) {
          // Новая белая линия
          lineBreaks.push({
            ...candle,
            interval: 'line_break',
          });
        } else if (candle.close < periodLow) {
          // Разворот - 3 черных линии
          for (let i = 0; i < 3; i++) {
            lineBreaks.push({
              timestamp: candle.timestamp,
              open: lineBreaks[lineBreaks.length - 1]?.close || candle.open,
              high: lineBreaks[lineBreaks.length - 1]?.close || candle.open,
              low: candle.low - (i * (candle.high - candle.low) / 3),
              close: candle.low - ((i + 1) * (candle.high - candle.low) / 3),
              volume: candle.volume,
              symbol: candle.symbol,
              interval: 'line_break',
            });
          }
          currentTrend = 'down';
        }
      } else {
        if (candle.close < periodLow) {
          // Новая черная линия
          lineBreaks.push({
            ...candle,
            interval: 'line_break',
          });
        } else if (candle.close > periodHigh) {
          // Разворот - 3 белых линии
          for (let i = 0; i < 3; i++) {
            lineBreaks.push({
              timestamp: candle.timestamp,
              open: lineBreaks[lineBreaks.length - 1]?.close || candle.open,
              high: candle.high - ((2 - i) * (candle.high - candle.low) / 3),
              low: candle.high - ((3 - i) * (candle.high - candle.low) / 3),
              close: candle.high - ((2 - i) * (candle.high - candle.low) / 3),
              volume: candle.volume,
              symbol: candle.symbol,
              interval: 'line_break',
            });
          }
          currentTrend = 'up';
        }
      }
    }
  }
  
  return lineBreaks;
}

/**
 * Преобразование в Range Bar
 */
export function convertToRange(candles: Candle[], rangeSize: number): Candle[] {
  if (candles.length === 0 || rangeSize <= 0) return [];
  
  const rangeBars: Candle[] = [];
  let currentBar: Candle | null = null;
  
  for (const candle of candles) {
    if (currentBar === null) {
      currentBar = {
        ...candle,
        open: candle.close,
        high: candle.close,
        low: candle.close,
        close: candle.close,
      };
      continue;
    }
    
    // Обновляем High/Low
    currentBar.high = Math.max(currentBar.high, candle.high);
    currentBar.low = Math.min(currentBar.low, candle.low);
    
    // Проверка на завершение бара
    const range = currentBar.high - currentBar.low;
    
    if (range >= rangeSize) {
      // Завершаем текущий бар
      if (candle.close > currentBar.open) {
        currentBar.close = currentBar.high;
      } else {
        currentBar.close = currentBar.low;
      }
      
      rangeBars.push({ ...currentBar });
      
      // Начинаем новый бар
      currentBar = {
        ...candle,
        open: candle.close,
        high: candle.close,
        low: candle.close,
        close: candle.close,
      };
    } else {
      currentBar.close = candle.close;
    }
  }
  
  // Добавляем последний бар
  if (currentBar) {
    rangeBars.push(currentBar);
  }
  
  return rangeBars;
}

/**
 * Преобразование в Hollow Candle (полые свечи)
 */
export function convertToHollowCandle(candles: Candle[]): Candle[] {
  return candles.map(candle => ({
    ...candle,
    // Для полых свечей цвет определяется close vs open
    // Но данные остаются теми же
  }));
}

/**
 * Конвертер для всех типов графиков
 */
export class ChartTypeConverter {
  static convert(candles: Candle[], config: ChartTypeConfig): Candle[] {
    switch (config.type) {
      case 'heikin_ashi':
        return convertToHeikinAshi(candles);
      
      case 'renko':
        return convertToRenko(candles, config.boxSize || 10, config.source);
      
      case 'point_figure':
        return convertToPointAndFigure(candles, config.boxSizeP&F || 10, config.reversalAmount || 3);
      
      case 'kagi':
        return convertToKagi(candles, config.kagiReversal || 0.05);
      
      case 'line_break':
        return convertToLineBreak(candles, config.lineBreakPeriod || 3);
      
      case 'range':
        return convertToRange(candles, config.boxSize || 10);
      
      case 'hollow_candle':
        return convertToHollowCandle(candles);
      
      default:
        return candles;
    }
  }
}

export default ChartTypeConverter;
