// ============================================
// TRADE ACTION TRACKER
// Отслеживание всех действий трейдера на графике
// ============================================

export interface ChartState {
  timestamp: number;
  symbol: string;
  exchange: string;
  timeframe: string;
  chartType: string;
  scale: 'linear' | 'logarithmic';
  indicators: IndicatorState[];
  drawings: DrawingState[];
  visibleRange: {
    from: number;
    to: number;
  };
}

export interface IndicatorState {
  name: string;
  params: Record<string, number | string | boolean>;
  values: Record<string, number>;
}

export interface DrawingState {
  type: string;
  points: Array<{ time: number; price: number }>;
}

export interface TradeAction {
  id: string;
  type: 'entry' | 'exit' | 'modify' | 'cancel';
  timestamp: number;
  symbol: string;
  exchange: string;
  direction: 'LONG' | 'SHORT';
  price: number;
  quantity: number;
  stopLoss?: number;
  takeProfits?: Array<{ price: number; percentage: number }>;
  
  // Context at time of action
  chartState: ChartState;
  candlePattern?: string;
  supportLevels?: number[];
  resistanceLevels?: number[];
  peaks?: Array<{ time: number; price: number }>;
  valleys?: Array<{ time: number; price: number }>;
  
  // Outcome (filled later)
  outcome?: {
    exitPrice?: number;
    exitTime?: number;
    pnl: number;
    pnlPercent: number;
    duration: number;
    maxProfit: number;
    maxLoss: number;
  };
  
  // ML analysis
  mlAnalysis?: {
    confidence: number;
    similarTrades: number;
    successRate: number;
    suggestions: string[];
  };
}

export interface PatternRecognition {
  candlePattern?: string;
  trendDirection: 'up' | 'down' | 'sideways';
  supportLevels: number[];
  resistanceLevels: number[];
  peaks: Array<{ time: number; price: number }>;
  valleys: Array<{ time: number; price: number }>;
  volumeProfile?: {
    high: number;
    low: number;
    average: number;
  };
}

// ============================================
// ACTION TRACKER CLASS
// ============================================

export class TradeActionTracker {
  private actions: Map<string, TradeAction> = new Map();
  private chartStates: Map<string, ChartState> = new Map();
  private listeners: Set<(action: TradeAction) => void> = new Set();
  private autoSaveInterval?: NodeJS.Timeout;

  constructor(private autoSave: boolean = true) {
    if (autoSave) {
      this.startAutoSave();
    }
  }

  // ============================================
  // CAPTURE ACTIONS
  // ============================================

  captureEntry(action: Omit<TradeAction, 'id' | 'timestamp'>): TradeAction {
    const entry: TradeAction = {
      ...action,
      id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };

    // Capture chart state
    entry.chartState = this.getCurrentChartState();

    // Detect patterns
    const patterns = this.detectPatterns();
    entry.candlePattern = patterns.candlePattern;
    entry.supportLevels = patterns.supportLevels;
    entry.resistanceLevels = patterns.resistanceLevels;
    entry.peaks = patterns.peaks;
    entry.valleys = patterns.valleys;

    this.actions.set(entry.id, entry);
    this.notifyListeners(entry);
    this.saveToStorage();

    console.log('📊 Trade entry captured:', {
      symbol: entry.symbol,
      direction: entry.direction,
      price: entry.price,
      pattern: entry.candlePattern,
      indicators: entry.chartState.indicators.length,
    });

    return entry;
  }

  captureExit(
    actionId: string,
    exitPrice: number,
    exitTime?: number
  ): TradeAction | null {
    const action = this.actions.get(actionId);
    if (!action) return null;

    const duration = (exitTime || Date.now()) - action.timestamp;
    const pnl =
      action.direction === 'LONG'
        ? (exitPrice - action.price) * action.quantity
        : (action.price - exitPrice) * action.quantity;

    const pnlPercent =
      ((exitPrice - action.price) / action.price) * 100 *
      (action.direction === 'LONG' ? 1 : -1);

    action.outcome = {
      exitPrice,
      exitTime: exitTime || Date.now(),
      pnl,
      pnlPercent,
      duration,
      maxProfit: 0, // Would track during trade lifetime
      maxLoss: 0,
    };

    this.actions.set(actionId, action);
    this.notifyListeners(action);
    this.saveToStorage();

    console.log('📊 Trade exit captured:', {
      symbol: action.symbol,
      pnl,
      pnlPercent: pnlPercent.toFixed(2) + '%',
      duration: (duration / 60000).toFixed(1) + 'min',
    });

    return action;
  }

  // ============================================
  // CHART STATE CAPTURE
  // ============================================

  captureChartState(): ChartState {
    const state = this.getCurrentChartState();
    const key = `${state.symbol}_${state.timeframe}`;
    this.chartStates.set(key, state);
    return state;
  }

  private getCurrentChartState(): ChartState {
    // In production, this would read from the actual chart component
    // For now, return a placeholder that would be populated by the chart
    return {
      timestamp: Date.now(),
      symbol: 'BTC/USDT',
      exchange: 'binance',
      timeframe: '1h',
      chartType: 'candle',
      scale: 'linear',
      indicators: [],
      drawings: [],
      visibleRange: {
        from: Date.now() - 3600000,
        to: Date.now(),
      },
    };
  }

  // ============================================
  // PATTERN DETECTION
  // ============================================

  detectPatterns(): PatternRecognition {
    // This would analyze actual candle data
    // For now, return placeholder
    return {
      trendDirection: 'sideways',
      supportLevels: [],
      resistanceLevels: [],
      peaks: [],
      valleys: [],
    };
  }

  detectCandlePattern(candles: any[]): string | undefined {
    if (candles.length < 3) return undefined;

    const last = candles[candles.length - 1];
    const prev = candles[candles.length - 2];
    const prev2 = candles[candles.length - 3];

    // Doji
    if (Math.abs(last.close - last.open) < (last.high - last.low) * 0.1) {
      return 'Doji';
    }

    // Hammer
    const lowerWick = Math.min(last.close, last.open) - last.low;
    const upperWick = last.high - Math.max(last.close, last.open);
    const body = Math.abs(last.close - last.open);

    if (lowerWick >= body * 2 && upperWick <= body) {
      return 'Hammer';
    }

    // Engulfing
    if (
      last.close > last.open &&
      prev.close < prev.open &&
      last.open < prev.close &&
      last.close > prev.open
    ) {
      return 'Bullish Engulfing';
    }

    if (
      last.close < last.open &&
      prev.close > prev.open &&
      last.open > prev.close &&
      last.close < prev.open
    ) {
      return 'Bearish Engulfing';
    }

    return undefined;
  }

  detectSupportResistance(candles: any[], lookback: number = 50): {
    support: number[];
    resistance: number[];
  } {
    const highs: number[] = [];
    const lows: number[] = [];

    for (let i = 0; i < Math.min(lookback, candles.length); i++) {
      const candle = candles[candles.length - 1 - i];

      // Check for local highs
      if (
        i > 0 &&
        i < candles.length - 1 &&
        candle.high > candles[candles.length - i].high &&
        candle.high > candles[candles.length - 2 - i].high
      ) {
        highs.push(candle.high);
      }

      // Check for local lows
      if (
        i > 0 &&
        i < candles.length - 1 &&
        candle.low < candles[candles.length - i].low &&
        candle.low < candles[candles.length - 2 - i].low
      ) {
        lows.push(candle.low);
      }
    }

    // Cluster similar levels
    const support = this.clusterLevels(lows, 0.005);
    const resistance = this.clusterLevels(highs, 0.005);

    return { support, resistance };
  }

  detectPeaksValleys(candles: any[], lookback: number = 50): {
    peaks: Array<{ time: number; price: number }>;
    valleys: Array<{ time: number; price: number }>;
  } {
    const peaks: Array<{ time: number; price: number }> = [];
    const valleys: Array<{ time: number; price: number }> = [];

    for (let i = 1; i < Math.min(lookback, candles.length - 1); i++) {
      const candle = candles[candles.length - 1 - i];
      const prev = candles[candles.length - i];
      const next = candles[candles.length - 2 - i];

      // Peak
      if (candle.high > prev.high && candle.high > next.high) {
        peaks.push({ time: candle.timestamp, price: candle.high });
      }

      // Valley
      if (candle.low < prev.low && candle.low < next.low) {
        valleys.push({ time: candle.timestamp, price: candle.low });
      }
    }

    return { peaks, valleys };
  }

  private clusterLevels(levels: number[], tolerance: number): number[] {
    if (levels.length === 0) return [];

    const sorted = [...levels].sort((a, b) => a - b);
    const clusters: number[][] = [[sorted[0]]];

    for (let i = 1; i < sorted.length; i++) {
      const lastCluster = clusters[clusters.length - 1];
      const avg = lastCluster.reduce((a, b) => a + b, 0) / lastCluster.length;

      if (Math.abs(sorted[i] - avg) / avg <= tolerance) {
        lastCluster.push(sorted[i]);
      } else {
        clusters.push([sorted[i]]);
      }
    }

    return clusters.map(cluster =>
      cluster.reduce((a, b) => a + b, 0) / cluster.length
    );
  }

  // ============================================
  // QUERY & ANALYSIS
  // ============================================

  getActions(filters?: {
    symbol?: string;
    exchange?: string;
    type?: string;
    dateFrom?: number;
    dateTo?: number;
  }): TradeAction[] {
    let actions = Array.from(this.actions.values());

    if (filters) {
      if (filters.symbol) {
        actions = actions.filter(a => a.symbol === filters.symbol);
      }
      if (filters.exchange) {
        actions = actions.filter(a => a.exchange === filters.exchange);
      }
      if (filters.type) {
        actions = actions.filter(a => a.type === filters.type);
      }
      if (filters.dateFrom) {
        actions = actions.filter(a => a.timestamp >= filters.dateFrom!);
      }
      if (filters.dateTo) {
        actions = actions.filter(a => a.timestamp <= filters.dateTo!);
      }
    }

    return actions.sort((a, b) => b.timestamp - a.timestamp);
  }

  getActionsByPattern(pattern: string): TradeAction[] {
    return this.getActions().filter(a => a.candlePattern === pattern);
  }

  getSuccessRateByPattern(pattern: string): number {
    const actions = this.getActionsByPattern(pattern).filter(a => a.outcome);
    if (actions.length === 0) return 0;

    const winning = actions.filter(a => (a.outcome?.pnl || 0) > 0).length;
    return (winning / actions.length) * 100;
  }

  getMostUsedIndicators(): Array<{ name: string; count: number }> {
    const indicatorCount: Record<string, number> = {};

    for (const action of this.actions.values()) {
      for (const indicator of action.chartState.indicators) {
        indicatorCount[indicator.name] = (indicatorCount[indicator.name] || 0) + 1;
      }
    }

    return Object.entries(indicatorCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }

  getMostUsedTimeframes(): Array<{ timeframe: string; count: number }> {
    const tfCount: Record<string, number> = {};

    for (const action of this.actions.values()) {
      tfCount[action.chartState.timeframe] = (tfCount[action.chartState.timeframe] || 0) + 1;
    }

    return Object.entries(tfCount)
      .map(([timeframe, count]) => ({ timeframe, count }))
      .sort((a, b) => b.count - a.count);
  }

  // ============================================
  // STORAGE
  // ============================================

  private saveToStorage() {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(
        'trade_actions',
        JSON.stringify(Array.from(this.actions.values()))
      );
    } catch (error) {
      console.error('Failed to save trade actions:', error);
    }
  }

  loadFromStorage() {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem('trade_actions');
      if (stored) {
        const actions = JSON.parse(stored);
        for (const action of actions) {
          this.actions.set(action.id, action);
        }
        console.log(`Loaded ${actions.length} trade actions from storage`);
      }
    } catch (error) {
      console.error('Failed to load trade actions:', error);
    }
  }

  private startAutoSave() {
    this.autoSaveInterval = setInterval(() => {
      this.saveToStorage();
    }, 30000); // Save every 30 seconds
  }

  stopAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = undefined;
    }
  }

  // ============================================
  // EVENT LISTENERS
  // ============================================

  subscribe(listener: (action: TradeAction) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(action: TradeAction) {
    this.listeners.forEach(listener => listener(action));
  }

  // ============================================
  // EXPORT
  // ============================================

  exportToJSON(): string {
    return JSON.stringify(Array.from(this.actions.values()), null, 2);
  }

  exportToCSV(): string {
    const actions = this.getActions();
    const headers = [
      'ID',
      'Timestamp',
      'Symbol',
      'Exchange',
      'Type',
      'Direction',
      'Price',
      'Quantity',
      'Timeframe',
      'Pattern',
      'PnL',
      'PnL %',
    ];

    const rows = actions.map(a => [
      a.id,
      new Date(a.timestamp).toISOString(),
      a.symbol,
      a.exchange,
      a.type,
      a.direction,
      a.price,
      a.quantity,
      a.chartState.timeframe,
      a.candlePattern || '-',
      a.outcome?.pnl?.toFixed(2) || '-',
      a.outcome?.pnlPercent?.toFixed(2) || '-',
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  clear() {
    this.actions.clear();
    this.chartStates.clear();
    this.saveToStorage();
  }
}

export default TradeActionTracker;
