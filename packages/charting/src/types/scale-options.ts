// ============================================
// SCALE OPTIONS — Шкалы графика TradingView
// ============================================

export type ScaleType = 'linear' | 'logarithmic' | 'percentage' | 'inverted';

export interface ScaleConfig {
  type: ScaleType;
  inverted: boolean;
  lockRatio?: boolean;
  autoScale?: boolean;
  top?: number;
  bottom?: number;
}

/**
 * Преобразование цены в координату Y для разных шкал
 */
export function priceToY(
  price: number,
  scale: ScaleConfig,
  minPrice: number,
  maxPrice: number,
  height: number
): number {
  let normalized: number;
  
  switch (scale.type) {
    case 'logarithmic':
      normalized = logScale(price, minPrice, maxPrice);
      break;
    case 'percentage':
      normalized = percentageScale(price, minPrice, maxPrice);
      break;
    default:
      normalized = linearScale(price, minPrice, maxPrice);
  }
  
  // Инверсия (если нужно)
  if (scale.inverted) {
    normalized = 1 - normalized;
  }
  
  return normalized * height;
}

/**
 * Преобразование координаты Y в цену
 */
export function yToPrice(
  y: number,
  scale: ScaleConfig,
  minPrice: number,
  maxPrice: number,
  height: number
): number {
  let normalized = y / height;
  
  // Инверсия
  if (scale.inverted) {
    normalized = 1 - normalized;
  }
  
  switch (scale.type) {
    case 'logarithmic':
      return logScaleInverse(normalized, minPrice, maxPrice);
    case 'percentage':
      return percentageScaleInverse(normalized, minPrice, maxPrice);
    default:
      return linearScaleInverse(normalized, minPrice, maxPrice);
  }
}

/**
 * Линейная шкала
 */
function linearScale(price: number, min: number, max: number): number {
  return (price - min) / (max - min);
}

function linearScaleInverse(normalized: number, min: number, max: number): number {
  return min + normalized * (max - min);
}

/**
 * Логарифмическая шкала
 */
function logScale(price: number, min: number, max: number): number {
  const minLog = Math.log(Math.max(min, 0.0001));
  const maxLog = Math.log(Math.max(max, 0.0001));
  const priceLog = Math.log(Math.max(price, 0.0001));
  
  return (priceLog - minLog) / (maxLog - minLog);
}

function logScaleInverse(normalized: number, min: number, max: number): number {
  const minLog = Math.log(Math.max(min, 0.0001));
  const maxLog = Math.log(Math.max(max, 0.0001));
  const priceLog = minLog + normalized * (maxLog - minLog);
  
  return Math.exp(priceLog);
}

/**
 * Процентная шкала (от базовой цены)
 */
function percentageScale(price: number, min: number, max: number): number {
  const base = (min + max) / 2;
  const range = max - min;
  
  return ((price - base) / range) + 0.5;
}

function percentageScaleInverse(normalized: number, min: number, max: number): number {
  const base = (min + max) / 2;
  const range = max - min;
  
  return base + (normalized - 0.5) * range;
}

/**
 * Расчет видимого диапазона цен
 */
export function calculatePriceRange(
  candles: any[],
  scale: ScaleConfig,
  padding: number = 0.1
): { min: number; max: number } {
  if (candles.length === 0) {
    return { min: 0, max: 100 };
  }
  
  let min = Infinity;
  let max = -Infinity;
  
  for (const candle of candles) {
    min = Math.min(min, candle.low);
    max = Math.max(max, candle.high);
  }
  
  const range = max - min;
  const paddingValue = range * padding;
  
  return {
    min: min - paddingValue,
    max: max + paddingValue,
  };
}

/**
 * Фиксация соотношения (lock ratio)
 */
export function calculateLockedRange(
  priceRange: { min: number; max: number },
  timeRange: number,
  ratio: number
): { min: number; max: number } {
  const priceRangeSize = priceRange.max - priceRange.min;
  const targetRange = timeRange * ratio;
  
  const center = (priceRange.max + priceRange.min) / 2;
  
  return {
    min: center - targetRange / 2,
    max: center + targetRange / 2,
  };
}

/**
 * Авто-масштабирование
 */
export function autoScale(
  candles: any[],
  visibleRange: { from: number; to: number }
): { min: number; max: number } {
  const visibleCandles = candles.filter(
    c => c.timestamp >= visibleRange.from && c.timestamp <= visibleRange.to
  );
  
  return calculatePriceRange(visibleCandles);
}

// ============================================
// SCALE MANAGER
// ============================================

export class ScaleManager {
  private config: ScaleConfig = {
    type: 'linear',
    inverted: false,
    autoScale: true,
  };
  
  private listeners: Set<(config: ScaleConfig) => void> = new Set();

  setScaleType(type: ScaleType): void {
    this.config.type = type;
    this.notifyListeners();
  }

  toggleInverted(): void {
    this.config.inverted = !this.config.inverted;
    this.notifyListeners();
  }

  toggleLockRatio(): void {
    this.config.lockRatio = !this.config.lockRatio;
    this.notifyListeners();
  }

  toggleAutoScale(): void {
    this.config.autoScale = !this.config.autoScale;
    this.notifyListeners();
  }

  setRange(top: number, bottom: number): void {
    this.config.top = top;
    this.config.bottom = bottom;
    this.config.autoScale = false;
    this.notifyListeners();
  }

  getConfig(): ScaleConfig {
    return { ...this.config };
  }

  subscribe(listener: (config: ScaleConfig) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.config));
  }
}

export default ScaleManager;
