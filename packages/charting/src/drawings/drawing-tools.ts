// ============================================
// DRAWING TOOLS — Все инструменты рисования TradingView
// ============================================

// ============================================
// TYPES
// ============================================

export type DrawingToolType =
  // Lines
  | 'trend_line'
  | 'horizontal_line'
  | 'vertical_line'
  | 'ray'
  | 'extended_line'
  | 'parallel_channel'
  | 'regression_channel'
  
  // Fibonacci
  | 'fib_retracement'
  | 'fib_extension'
  | 'fib_fan'
  | 'fib_arc'
  | 'fib_time_zones'
  | 'fib_wedge'
  | 'fib_circle'
  
  // Gann
  | 'gann_fan'
  | 'gann_grid'
  | 'gann_box'
  
  // Andrews
  | 'andrews_pitchfork'
  | 'schiff_pitchfork'
  | 'modified_schiff_pitchfork'
  
  // Shapes
  | 'rectangle'
  | 'ellipse'
  | 'triangle'
  | 'polygon'
  
  // Text
  | 'text'
  | 'text_label'
  | 'balloon'
  | 'note'
  
  // Arrows
  | 'arrow_up'
  | 'arrow_down'
  | 'arrow_left'
  | 'arrow_right'
  | 'arrow_marker'
  
  // Icons
  | 'icon'
  | 'emoji'
  
  // Brush
  | 'brush'
  | 'freehand'
  
  // Measurement
  | 'price_range'
  | 'distance'
  | 'time_cycle'
  | 'countdown'
  
  // Patterns
  | 'head_and_shoulders'
  | 'double_top'
  | 'double_bottom'
  | 'triangle_pattern'
  | 'flag'
  | 'pennant'
  | 'wedge'
  | 'channel';

export interface DrawingPoint {
  x: number;
  y: number;
  time?: number;
  price?: number;
}

export interface DrawingStyle {
  color: string;
  lineWidth: number;
  lineStyle: 'solid' | 'dashed' | 'dotted';
  fillColor?: string;
  fillOpacity?: number;
  fontSize?: number;
  fontFamily?: string;
  text?: string;
  extendLeft?: boolean;
  extendRight?: boolean;
  showLabels?: boolean;
  showPrices?: boolean;
  showTime?: boolean;
}

export interface Drawing {
  id: string;
  tool: DrawingToolType;
  points: DrawingPoint[];
  style: DrawingStyle;
  symbol: string;
  timeframe: string;
  createdAt: number;
  updatedAt: number;
  locked?: boolean;
  visible?: boolean;
  zOrder?: number;
}

// ============================================
// FIBONACCI LEVELS
// ============================================

export const FIBONACCI_LEVELS = {
  retracement: [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1],
  extension: [0, 0.618, 1, 1.618, 2.618, 4.236],
  fan: [0.382, 0.5, 0.618],
  timeZones: [1, 2, 3, 5, 8, 13, 21, 34, 55],
};

// ============================================
// DRAWING CALCULATORS
// ============================================

/**
 * Расчет точек для трендовой линии
 */
export function calculateTrendLine(start: DrawingPoint, end: DrawingPoint): DrawingPoint[] {
  return [start, end];
}

/**
 * Расчет линий Фибоначчи (ретрейсмент)
 */
export function calculateFibRetracement(start: DrawingPoint, end: DrawingPoint): DrawingPoint[] {
  const points: DrawingPoint[] = [];
  const priceDiff = (end.price || 0) - (start.price || 0);
  
  FIBONACCI_LEVELS.retracement.forEach(level => {
    points.push({
      x: start.x,
      y: start.y,
      time: start.time,
      price: (start.price || 0) + priceDiff * level,
      label: level === 0 ? '0%' : level === 1 ? '100%' : `${(level * 100).toFixed(1)}%`,
    });
  });
  
  return points;
}

/**
 * Расчет веера Фибоначчи
 */
export function calculateFibFan(start: DrawingPoint, end: DrawingPoint): DrawingPoint[] {
  const points: DrawingPoint[] = [];
  const priceDiff = (end.price || 0) - (start.price || 0);
  const timeDiff = (end.time || 0) - (start.time || 0);
  
  FIBONACCI_LEVELS.fan.forEach(level => {
    points.push({
      x: start.x,
      y: start.y,
      time: start.time,
      price: (start.price || 0) + priceDiff * level,
      endPrice: (start.price || 0) + priceDiff * level,
      endTime: end.time,
    });
  });
  
  return points;
}

/**
 * Расчет вилки Эндрюса
 */
export function calculateAndrewsPitchfork(
  p1: DrawingPoint,
  p2: DrawingPoint,
  p3: DrawingPoint
): DrawingPoint[] {
  // Median line (средняя линия)
  const midP2P3 = {
    x: (p2.x + p3.x) / 2,
    y: (p2.y + p3.y) / 2,
    time: ((p2.time || 0) + (p3.time || 0)) / 2,
    price: ((p2.price || 0) + (p3.price || 0)) / 2,
  };
  
  // Upper parallel line
  const upperEnd = {
    x: p3.x + (p3.x - p2.x),
    y: p3.y + (p3.y - p2.y),
    time: (p3.time || 0) + ((p3.time || 0) - (p2.time || 0)),
    price: (p3.price || 0) + ((p3.price || 0) - (p2.price || 0)),
  };
  
  // Lower parallel line
  const lowerEnd = {
    x: p2.x - (p3.x - p2.x),
    y: p2.y - (p3.y - p2.y),
    time: (p2.time || 0) - ((p3.time || 0) - (p2.time || 0)),
    price: (p2.price || 0) - ((p3.price || 0) - (p2.price || 0)),
  };
  
  return [p1, midP2P3, p2, p3, upperEnd, lowerEnd];
}

/**
 * Расчет графических паттернов
 */
export function calculatePattern(
  type: 'head_and_shoulders' | 'double_top' | 'double_bottom' | 'triangle',
  points: DrawingPoint[]
): DrawingPoint[] {
  switch (type) {
    case 'head_and_shoulders':
      return calculateHeadAndShoulders(points);
    case 'double_top':
      return calculateDoubleTop(points);
    case 'double_bottom':
      return calculateDoubleBottom(points);
    case 'triangle':
      return calculateTriangle(points);
    default:
      return points;
  }
}

function calculateHeadAndShoulders(points: DrawingPoint[]): DrawingPoint[] {
  // 5 точек: левое плечо, голова, правое плечо, 2 точки neckline
  if (points.length < 5) return points;
  
  const [leftShoulder, head, rightShoulder, neckline1, neckline2] = points;
  
  // Расчет линии шеи
  const necklineSlope = (neckline2.price || 0 - (neckline1.price || 0)) / 
                        ((neckline2.time || 0) - (neckline1.time || 0));
  
  return [leftShoulder, head, rightShoulder, neckline1, neckline2];
}

function calculateDoubleTop(points: DrawingPoint[]): DrawingPoint[] {
  // 3 точки: 2 вершины, 1 точка подтверждения (минимум между ними)
  if (points.length < 3) return points;
  
  const [top1, bottom, top2] = points;
  
  // Линия подтверждения (neckline)
  const neckline = {
    x: bottom.x,
    y: bottom.y,
    time: bottom.time,
    price: bottom.price,
  };
  
  return [top1, bottom, top2, neckline];
}

function calculateDoubleBottom(points: DrawingPoint[]): DrawingPoint[] {
  // 3 точки: 2 минимума, 1 точка подтверждения (максимум между ними)
  if (points.length < 3) return points;
  
  const [bottom1, peak, bottom2] = points;
  
  return [bottom1, peak, bottom2];
}

function calculateTriangle(points: DrawingPoint[]): DrawingPoint[] {
  // Восходящий/нисходящий/симметричный треугольник
  if (points.length < 4) return points;
  
  return points;
}

// ============================================
// MEASUREMENT TOOLS
// ============================================

export interface MeasurementResult {
  priceChange: number;
  priceChangePercent: number;
  timeChange: number;
  bars: number;
  riskReward?: {
    risk: number;
    reward: number;
    ratio: number;
  };
}

export function calculateMeasurement(
  start: DrawingPoint,
  end: DrawingPoint
): MeasurementResult {
  const priceChange = (end.price || 0) - (start.price || 0);
  const priceChangePercent = start.price ? (priceChange / start.price) * 100 : 0;
  const timeChange = (end.time || 0) - (start.time || 0);
  const bars = Math.abs(timeChange / 3600000); // hours
  
  return {
    priceChange,
    priceChangePercent,
    timeChange,
    bars,
  };
}

export function calculateRiskReward(
  entry: DrawingPoint,
  stopLoss: DrawingPoint,
  takeProfit: DrawingPoint
): MeasurementResult['riskReward'] {
  const entryPrice = entry.price || 0;
  const stopPrice = stopLoss.price || 0;
  const targetPrice = takeProfit.price || 0;
  
  const risk = Math.abs(entryPrice - stopPrice);
  const reward = Math.abs(targetPrice - entryPrice);
  const ratio = risk > 0 ? reward / risk : 0;
  
  return { risk, reward, ratio };
}

// ============================================
// DRAWING MANAGER
// ============================================

export class DrawingManager {
  private drawings: Map<string, Drawing> = new Map();
  private listeners: Set<() => void> = new Set();

  addDrawing(drawing: Drawing): void {
    this.drawings.set(drawing.id, drawing);
    this.notifyListeners();
  }

  updateDrawing(id: string, updates: Partial<Drawing>): void {
    const drawing = this.drawings.get(id);
    if (drawing) {
      this.drawings.set(id, { ...drawing, ...updates, updatedAt: Date.now() });
      this.notifyListeners();
    }
  }

  removeDrawing(id: string): void {
    this.drawings.delete(id);
    this.notifyListeners();
  }

  getDrawings(symbol?: string, timeframe?: string): Drawing[] {
    let drawings = Array.from(this.drawings.values());
    
    if (symbol) {
      drawings = drawings.filter(d => d.symbol === symbol);
    }
    
    if (timeframe) {
      drawings = drawings.filter(d => d.timeframe === timeframe);
    }
    
    return drawings.filter(d => d.visible !== false);
  }

  clearDrawings(symbol?: string): void {
    if (symbol) {
      for (const [id, drawing] of this.drawings.entries()) {
        if (drawing.symbol === symbol) {
          this.drawings.delete(id);
        }
      }
    } else {
      this.drawings.clear();
    }
    this.notifyListeners();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  // Import/Export
  exportDrawings(): string {
    return JSON.stringify(Array.from(this.drawings.values()));
  }

  importDrawings(json: string): void {
    const drawings = JSON.parse(json) as Drawing[];
    drawings.forEach(d => this.drawings.set(d.id, d));
    this.notifyListeners();
  }
}

// ============================================
// EXPORTS
// ============================================

export default {
  DrawingManager,
  calculateTrendLine,
  calculateFibRetracement,
  calculateFibFan,
  calculateAndrewsPitchfork,
  calculatePattern,
  calculateMeasurement,
  calculateRiskReward,
  FIBONACCI_LEVELS,
};
