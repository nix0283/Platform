// ============================================
// BACKTESTING ENGINE
// Движок для тестирования торговых стратегий
// ============================================

import { Candle, Order, OrderSide, Position } from '@trading-platform/core';

// ============================================
// TYPES
// ============================================

export interface BacktestConfig {
  initialCapital: number;
  commission: number;        // % per trade
  slippage: number;          // % slippage
  leverage: number;
  marginMode: 'ISOLATED' | 'CROSSED';
  riskPerTrade?: number;     // % of capital
  maxPositions?: number;
  startDate?: number;
  endDate?: number;
}

export interface Trade {
  id: string;
  entryTime: number;
  exitTime?: number;
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  side: OrderSide;
  pnl: number;
  pnlPercent: number;
  commission: number;
  slippage: number;
  maxDrawdown: number;
  maxProfit: number;
  duration: number;          // bars
  tags: string[];
}

export interface BacktestResult {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalPnl: number;
  totalPnlPercent: number;
  totalCommission: number;
  totalSlippage: number;
  profitFactor: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  avgTradePnl: number;
  avgWinningTrade: number;
  avgLosingTrade: number;
  largestWin: number;
  largestLoss: number;
  avgTradeDuration: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  equity: number[];
  drawdowns: number[];
  trades: Trade[];
  dailyReturns: number[];
  monthlyReturns: number[];
}

export interface StrategySignal {
  action: 'BUY' | 'SELL' | 'CLOSE_LONG' | 'CLOSE_SHORT' | 'CLOSE_ALL';
  quantity?: number;
  price?: number;
  stopLoss?: number;
  takeProfit?: number;
  tags?: string[];
}

export type StrategyFunction = (data: StrategyContext) => StrategySignal | null;

export interface StrategyContext {
  candles: Candle[];
  currentIndex: number;
  currentCandle: Candle;
  positions: Position[];
  trades: Trade[];
  equity: number;
  capital: number;
  indicators: Record<string, number[]>;
  
  // Helper functions
  sma: (period: number) => number | null;
  ema: (period: number) => number | null;
  rsi: (period: number) => number | null;
  macd: (fast: number, slow: number, signal: number) => { macd: number; signal: number; histogram: number } | null;
  atr: (period: number) => number | null;
  highest: (period: number) => number | null;
  lowest: (period: number) => number | null;
  crossover: (a: number[], b: number[]) => boolean;
  crossunder: (a: number[], b: number[]) => boolean;
}

// ============================================
// BACKTESTER CLASS
// ============================================

export class Backtester {
  private config: BacktestConfig;
  private candles: Candle[] = [];
  private trades: Trade[] = [];
  private positions: Map<string, Position> = new Map();
  private equity: number[] = [];
  private capital: number;
  private indicators: Record<string, number[]> = {};

  constructor(config: Partial<BacktestConfig> = {}) {
    this.config = {
      initialCapital: 10000,
      commission: 0.1,
      slippage: 0.05,
      leverage: 1,
      marginMode: 'CROSSED',
      riskPerTrade: 1,
      maxPositions: 5,
      ...config,
    };
    this.capital = this.config.initialCapital;
  }

  // ============================================
  // RUN BACKTEST
  // ============================================

  async run(
    candles: Candle[],
    strategy: StrategyFunction
  ): Promise<BacktestResult> {
    this.candles = candles;
    this.trades = [];
    this.positions.clear();
    this.equity = [this.capital];
    this.indicators = {};

    // Pre-calculate indicators
    this.calculateIndicators();

    // Filter by date range
    const filteredCandles = this.filterByDateRange(candles);

    // Run strategy on each candle
    for (let i = 100; i < filteredCandles.length; i++) {
      const context = this.createContext(filteredCandles, i);
      const signal = strategy(context);

      if (signal) {
        this.processSignal(signal, filteredCandles[i], i);
      }

      // Update equity
      this.updateEquity(filteredCandles[i]);
    }

    // Close any open positions at the end
    this.closeAllPositions(filteredCandles[filteredCandles.length - 1]);

    return this.calculateResults();
  }

  // ============================================
  // INDICATOR CALCULATIONS
  // ============================================

  private calculateIndicators(): void {
    const closes = this.candles.map(c => c.close);
    const highs = this.candles.map(c => c.high);
    const lows = this.candles.map(c => c.low);

    // SMA
    for (const period of [9, 20, 50, 200]) {
      this.indicators[`sma_${period}`] = this.calculateSMA(closes, period);
    }

    // EMA
    for (const period of [9, 20, 50]) {
      this.indicators[`ema_${period}`] = this.calculateEMA(closes, period);
    }

    // RSI
    this.indicators['rsi_14'] = this.calculateRSI(closes, 14);

    // MACD
    const macdData = this.calculateMACD(closes, 12, 26, 9);
    this.indicators['macd'] = macdData.macd;
    this.indicators['macd_signal'] = macdData.signal;
    this.indicators['macd_histogram'] = macdData.histogram;

    // ATR
    this.indicators['atr_14'] = this.calculateATR(highs, lows, closes, 14);

    // Highest/Lowest
    for (const period of [20, 50, 100]) {
      this.indicators[`highest_${period}`] = this.calculateHighest(highs, period);
      this.indicators[`lowest_${period}`] = this.calculateLowest(lows, period);
    }
  }

  private calculateSMA(data: number[], period: number): number[] {
    const result: number[] = [];
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push(NaN);
      } else {
        const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
        result.push(sum / period);
      }
    }
    return result;
  }

  private calculateEMA(data: number[], period: number): number[] {
    const result: number[] = [];
    const k = 2 / (period + 1);
    let ema = data[0];

    for (let i = 0; i < data.length; i++) {
      ema = data[i] * k + ema * (1 - k);
      result.push(ema);
    }
    return result;
  }

  private calculateRSI(data: number[], period: number): number[] {
    const result: number[] = [];
    const gains: number[] = [];
    const losses: number[] = [];

    for (let i = 1; i < data.length; i++) {
      const change = data[i] - data[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }

    for (let i = 0; i < data.length; i++) {
      if (i < period) {
        result.push(NaN);
      } else {
        const avgGain = gains.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
        const avgLoss = losses.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        result.push(100 - (100 / (1 + rs)));
      }
    }
    return result;
  }

  private calculateMACD(data: number[], fast: number, slow: number, signalPeriod: number) {
    const fastEMA = this.calculateEMA(data, fast);
    const slowEMA = this.calculateEMA(data, slow);
    const macd: number[] = [];

    for (let i = 0; i < data.length; i++) {
      macd.push(fastEMA[i] - slowEMA[i]);
    }

    const signal = this.calculateEMA(macd, signalPeriod);
    const histogram = macd.map((m, i) => m - signal[i]);

    return { macd, signal, histogram };
  }

  private calculateATR(highs: number[], lows: number[], closes: number[], period: number): number[] {
    const result: number[] = [];
    const tr: number[] = [];

    for (let i = 1; i < highs.length; i++) {
      const hl = highs[i] - lows[i];
      const hc = Math.abs(highs[i] - closes[i - 1]);
      const lc = Math.abs(lows[i] - closes[i - 1]);
      tr.push(Math.max(hl, hc, lc));
    }

    return this.calculateEMA(tr, period);
  }

  private calculateHighest(data: number[], period: number): number[] {
    const result: number[] = [];
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push(NaN);
      } else {
        result.push(Math.max(...data.slice(i - period + 1, i + 1)));
      }
    }
    return result;
  }

  private calculateLowest(data: number[], period: number): number[] {
    const result: number[] = [];
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push(NaN);
      } else {
        result.push(Math.min(...data.slice(i - period + 1, i + 1)));
      }
    }
    return result;
  }

  // ============================================
  // SIGNAL PROCESSING
  // ============================================

  private processSignal(signal: StrategySignal, candle: Candle, index: number): void {
    const symbol = candle.symbol;

    switch (signal.action) {
      case 'BUY':
        this.openPosition('BUY', candle, signal);
        break;
      case 'SELL':
        this.openPosition('SELL', candle, signal);
        break;
      case 'CLOSE_LONG':
        this.closePosition(symbol, 'BUY', candle);
        break;
      case 'CLOSE_SHORT':
        this.closePosition(symbol, 'SELL', candle);
        break;
      case 'CLOSE_ALL':
        this.closeAllPositions(candle);
        break;
    }
  }

  private openPosition(side: OrderSide, candle: Candle, signal: StrategySignal): void {
    if (this.positions.size >= (this.config.maxPositions || 5)) return;
    if (this.positions.has(candle.symbol)) return;

    const quantity = this.calculatePositionSize(candle.close, signal);
    const entryPrice = candle.close * (1 + this.config.slippage / 100);
    const commission = (quantity * entryPrice) * (this.config.commission / 100);

    if (this.capital < (entryPrice * quantity) / this.config.leverage + commission) return;

    const position: Position = {
      symbol: candle.symbol,
      exchange: candle.symbol.includes('BINANCE') ? 'binance' : 'binance',
      side,
      quantity,
      entryPrice,
      markPrice: entryPrice,
      unrealizedPnl: 0,
      realizedPnl: 0,
      leverage: this.config.leverage,
      marginMode: this.config.marginMode,
      liquidationPrice: this.calculateLiquidationPrice(entryPrice, side, this.config.leverage),
    };

    this.positions.set(candle.symbol, position);
    this.capital -= commission;
  }

  private closePosition(symbol: string, openSide: OrderSide, candle: Candle): void {
    const position = this.positions.get(symbol);
    if (!position) return;

    const exitPrice = candle.close * (1 - this.config.slippage / 100);
    const commission = (position.quantity * exitPrice) * (this.config.commission / 100);

    const pnl = openSide === 'BUY'
      ? (exitPrice - position.entryPrice) * position.quantity
      : (position.entryPrice - exitPrice) * position.quantity;

    const trade: Trade = {
      id: `trade_${this.trades.length}`,
      entryTime: position.entryPrice,
      exitTime: candle.timestamp,
      entryPrice: position.entryPrice,
      exitPrice,
      quantity: position.quantity,
      side: position.side,
      pnl: pnl - commission,
      pnlPercent: (pnl / (position.entryPrice * position.quantity)) * 100,
      commission,
      slippage: Math.abs(exitPrice - candle.close) * position.quantity,
      maxDrawdown: 0,
      maxProfit: pnl > 0 ? pnl : 0,
      duration: this.trades.length,
      tags: [],
    };

    this.trades.push(trade);
    this.capital += pnl - commission;
    this.positions.delete(symbol);
  }

  private closeAllPositions(candle: Candle): void {
    for (const [symbol, position] of this.positions.entries()) {
      this.closePosition(symbol, position.side === 'BUY' ? 'SELL' : 'BUY', candle);
    }
  }

  // ============================================
  // HELPERS
  // ============================================

  private calculatePositionSize(price: number, signal: StrategySignal): number {
    const riskAmount = this.capital * ((this.config.riskPerTrade || 1) / 100);
    
    if (signal.stopLoss) {
      const riskPerUnit = Math.abs(price - signal.stopLoss);
      return riskAmount / riskPerUnit;
    }

    // Default: use fixed percentage of capital
    return (this.capital * 0.1) / price;
  }

  private calculateLiquidationPrice(entryPrice: number, side: OrderSide, leverage: number): number {
    if (leverage === 1) return 0;
    
    const maintenanceMargin = 0.005; // 0.5%
    if (side === 'BUY') {
      return entryPrice * (1 - (1 / leverage) + maintenanceMargin);
    } else {
      return entryPrice * (1 + (1 / leverage) - maintenanceMargin);
    }
  }

  private updateEquity(candle: Candle): void {
    let unrealizedPnl = 0;
    
    for (const position of this.positions.values()) {
      const priceChange = candle.close - position.entryPrice;
      unrealizedPnl += position.side === 'BUY' ? priceChange * position.quantity : -priceChange * position.quantity;
    }

    this.equity.push(this.capital + unrealizedPnl);
  }

  private filterByDateRange(candles: Candle[]): Candle[] {
    let filtered = candles;
    
    if (this.config.startDate) {
      filtered = filtered.filter(c => c.timestamp >= this.config.startDate!);
    }
    if (this.config.endDate) {
      filtered = filtered.filter(c => c.timestamp <= this.config.endDate!);
    }
    
    return filtered;
  }

  private createContext(candles: Candle[], index: number): StrategyContext {
    const closes = candles.slice(0, index + 1).map(c => c.close);
    
    return {
      candles: candles.slice(0, index + 1),
      currentIndex: index,
      currentCandle: candles[index],
      positions: Array.from(this.positions.values()),
      trades: this.trades,
      equity: this.equity[this.equity.length - 1],
      capital: this.capital,
      indicators: this.indicators,
      
      sma: (period: number) => {
        const values = this.indicators[`sma_${period}`];
        return values && index < values.length ? values[index] : null;
      },
      ema: (period: number) => {
        const values = this.indicators[`ema_${period}`];
        return values && index < values.length ? values[index] : null;
      },
      rsi: (period: number) => {
        const values = this.indicators[`rsi_${period}`];
        return values && index < values.length ? values[index] : null;
      },
      macd: (fast: number, slow: number, signal: number) => {
        const macd = this.indicators['macd'];
        const signalLine = this.indicators['macd_signal'];
        const histogram = this.indicators['macd_histogram'];
        if (!macd || index >= macd.length) return null;
        return {
          macd: macd[index],
          signal: signalLine?.[index] || 0,
          histogram: histogram?.[index] || 0,
        };
      },
      atr: (period: number) => {
        const values = this.indicators[`atr_${period}`];
        return values && index < values.length ? values[index] : null;
      },
      highest: (period: number) => {
        const values = this.indicators[`highest_${period}`];
        return values && index < values.length ? values[index] : null;
      },
      lowest: (period: number) => {
        const values = this.indicators[`lowest_${period}`];
        return values && index < values.length ? values[index] : null;
      },
      crossover: (a: number[], b: number[]) => {
        if (index < 1) return false;
        return a[index - 1] <= b[index - 1] && a[index] > b[index];
      },
      crossunder: (a: number[], b: number[]) => {
        if (index < 1) return false;
        return a[index - 1] >= b[index - 1] && a[index] < b[index];
      },
    };
  }

  // ============================================
  // RESULTS CALCULATION
  // ============================================

  private calculateResults(): BacktestResult {
    const winningTrades = this.trades.filter(t => t.pnl > 0);
    const losingTrades = this.trades.filter(t => t.pnl <= 0);

    const totalPnl = this.trades.reduce((sum, t) => sum + t.pnl, 0);
    const grossProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
    const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));

    const dailyReturns = this.calculateDailyReturns();
    const sharpeRatio = this.calculateSharpeRatio(dailyReturns);
    const sortinoRatio = this.calculateSortinoRatio(dailyReturns);

    const { maxDrawdown, maxDrawdownPercent } = this.calculateMaxDrawdown();

    return {
      totalTrades: this.trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: this.trades.length > 0 ? winningTrades.length / this.trades.length : 0,
      totalPnl,
      totalPnlPercent: ((this.equity[this.equity.length - 1] - this.config.initialCapital) / this.config.initialCapital) * 100,
      totalCommission: this.trades.reduce((sum, t) => sum + t.commission, 0),
      totalSlippage: this.trades.reduce((sum, t) => sum + t.slippage, 0),
      profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit,
      sharpeRatio,
      sortinoRatio,
      maxDrawdown,
      maxDrawdownPercent,
      avgTradePnl: this.trades.length > 0 ? totalPnl / this.trades.length : 0,
      avgWinningTrade: winningTrades.length > 0 ? grossProfit / winningTrades.length : 0,
      avgLosingTrade: losingTrades.length > 0 ? grossLoss / losingTrades.length : 0,
      largestWin: winningTrades.length > 0 ? Math.max(...winningTrades.map(t => t.pnl)) : 0,
      largestLoss: losingTrades.length > 0 ? Math.min(...losingTrades.map(t => t.pnl)) : 0,
      avgTradeDuration: this.trades.length > 0 ? this.trades.reduce((sum, t) => sum + t.duration, 0) / this.trades.length : 0,
      consecutiveWins: this.calculateConsecutive(winningTrades.map(t => t.pnl)),
      consecutiveLosses: this.calculateConsecutive(losingTrades.map(t => t.pnl)),
      equity: this.equity,
      drawdowns: this.calculateDrawdowns(),
      trades: this.trades,
      dailyReturns,
      monthlyReturns: this.calculateMonthlyReturns(dailyReturns),
    };
  }

  private calculateDailyReturns(): number[] {
    const returns: number[] = [];
    for (let i = 1; i < this.equity.length; i++) {
      returns.push((this.equity[i] - this.equity[i - 1]) / this.equity[i - 1]);
    }
    return returns;
  }

  private calculateSharpeRatio(returns: number[]): number {
    if (returns.length < 2) return 0;
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const stdDev = Math.sqrt(returns.map(r => Math.pow(r - avgReturn, 2)).reduce((a, b) => a + b, 0) / returns.length);
    return stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;
  }

  private calculateSortinoRatio(returns: number[]): number {
    if (returns.length < 2) return 0;
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const downsideReturns = returns.filter(r => r < 0);
    if (downsideReturns.length === 0) return avgReturn * Math.sqrt(252);
    const downsideDev = Math.sqrt(downsideReturns.map(r => Math.pow(r, 2)).reduce((a, b) => a + b, 0) / downsideReturns.length);
    return downsideDev > 0 ? (avgReturn / downsideDev) * Math.sqrt(252) : 0;
  }

  private calculateMaxDrawdown(): { maxDrawdown: number; maxDrawdownPercent: number } {
    let peak = this.equity[0];
    let maxDrawdown = 0;
    let maxDrawdownPercent = 0;

    for (const equity of this.equity) {
      if (equity > peak) peak = equity;
      const drawdown = peak - equity;
      const drawdownPercent = (drawdown / peak) * 100;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
        maxDrawdownPercent = drawdownPercent;
      }
    }

    return { maxDrawdown, maxDrawdownPercent };
  }

  private calculateDrawdowns(): number[] {
    const drawdowns: number[] = [];
    let peak = this.equity[0];

    for (const equity of this.equity) {
      if (equity > peak) peak = equity;
      drawdowns.push((peak - equity) / peak * 100);
    }

    return drawdowns;
  }

  private calculateMonthlyReturns(dailyReturns: number[]): number[] {
    // Simplified: group by 21 trading days
    const monthly: number[] = [];
    for (let i = 0; i < dailyReturns.length; i += 21) {
      const monthReturns = dailyReturns.slice(i, i + 21);
      const compounded = monthReturns.reduce((acc, r) => acc * (1 + r), 1) - 1;
      monthly.push(compounded);
    }
    return monthly;
  }

  private calculateConsecutive(pnls: number[]): number {
    let maxConsecutive = 0;
    let currentConsecutive = 0;

    for (const pnl of pnls) {
      if (pnl > 0) {
        currentConsecutive++;
        maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
      } else {
        currentConsecutive = 0;
      }
    }

    return maxConsecutive;
  }
}

// ============================================
// EXPORTS
// ============================================

export function createBacktester(config?: Partial<BacktestConfig>): Backtester {
  return new Backtester(config);
}

export default Backtester;
