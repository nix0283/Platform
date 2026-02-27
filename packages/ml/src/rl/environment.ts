// ============================================
// REINFORCEMENT LEARNING MODULE
// Среда и агенты для трейдинга
// ============================================

import { Candle, Order, OrderSide } from '@trading-platform/core';
import { Trade, BacktestResult } from '@trading-platform/backtester';

// ============================================
// TYPES
// ============================================

export type RLAction = 0 | 1 | 2; // 0=HOLD, 1=BUY, 2=SELL
export type RLPosition = 'FLAT' | 'LONG' | 'SHORT';

export interface RLState {
  // Рыночные данные
  prices: number[];        // Последние N цен
  returns: number[];       // Последние N доходностей
  indicators: Record<string, number>; // Значения индикаторов
  
  // Состояние портфеля
  position: RLPosition;
  positionSize: number;
  entryPrice: number;
  unrealizedPnl: number;
  realizedPnl: number;
  cash: number;
  equity: number;
  
  // Временные признаки
  hour: number;
  dayOfWeek: number;
  
  // Мета-признаки
  volatility: number;
  trend: number;
}

export interface RLEnvironmentConfig {
  initialCapital: number;
  commission: number;      // % per trade
  slippage: number;        // % slippage
  maxPositionSize: number; // Максимальный размер позиции (% от капитала)
  stopLoss?: number;       // % стоп-лосс
  takeProfit?: number;     // % тейк-профит
  lookbackWindow: number;  // Размер окна для состояния
  rewardType: 'pnl' | 'sharpe' | 'sortino' | 'calmar';
}

export interface RLStepResult {
  state: RLState;
  reward: number;
  done: boolean;
  info: {
    action: RLAction;
    pnl: number;
    equity: number;
    trades: number;
  };
}

export interface RLTrainingConfig {
  episodes: number;
  maxStepsPerEpisode: number;
  learningRate: number;
  gamma: number;           // Discount factor
  epsilonStart: number;    // Начальный epsilon для exploration
  epsilonEnd: number;      // Конечный epsilon
  epsilonDecay: number;    // Скорость затухания epsilon
  batchSize: number;
  targetUpdateFreq: number;
}

// ============================================
// TRADING ENVIRONMENT
// ============================================

export class TradingEnvironment {
  private config: RLEnvironmentConfig;
  private candles: Candle[] = [];
  private currentIndex: number = 0;
  
  // Состояние портфеля
  private cash: number = 0;
  private position: RLPosition = 'FLAT';
  private positionSize: number = 0;
  private entryPrice: number = 0;
  private realizedPnl: number = 0;
  private trades: number = 0;
  
  // История для статистики
  private equityHistory: number[] = [];
  private returnsHistory: number[] = [];

  constructor(config: Partial<RLEnvironmentConfig> = {}) {
    this.config = {
      initialCapital: 10000,
      commission: 0.1,
      slippage: 0.05,
      maxPositionSize: 100,
      lookbackWindow: 20,
      rewardType: 'pnl',
      ...config,
    };
  }

  /**
   * Инициализация среды с данными
   */
  reset(candles: Candle[]): RLState {
    this.candles = candles;
    this.currentIndex = this.config.lookbackWindow;
    
    // Сброс портфеля
    this.cash = this.config.initialCapital;
    this.position = 'FLAT';
    this.positionSize = 0;
    this.entryPrice = 0;
    this.realizedPnl = 0;
    this.trades = 0;
    
    // История
    this.equityHistory = [this.config.initialCapital];
    this.returnsHistory = [];
    
    return this.getState();
  }

  /**
   * Шаг среды - выполнение действия
   */
  step(action: RLAction): RLStepResult {
    const currentState = this.getState();
    const candle = this.candles[this.currentIndex];
    
    let reward = 0;
    let infoPnl = 0;
    
    // Выполнение действия
    if (action === 1) { // BUY
      if (this.position === 'FLAT' || this.position === 'SHORT') {
        if (this.position === 'SHORT') {
          // Закрытие шорта
          this.closePosition(candle, 'BUY');
          infoPnl = this.calculatePositionPnl(candle, 'SHORT');
        }
        // Открытие лонга
        this.openPosition(candle, 'BUY');
      }
    } else if (action === 2) { // SELL
      if (this.position === 'FLAT' || this.position === 'LONG') {
        if (this.position === 'LONG') {
          // Закрытие лонга
          this.closePosition(candle, 'SELL');
          infoPnl = this.calculatePositionPnl(candle, 'LONG');
        }
        // Открытие шорта
        this.openPosition(candle, 'SELL');
      }
    }
    // HOLD - ничего не делаем
    
    // Проверка стоп-лосса и тейк-профита
    if (this.position !== 'FLAT') {
      const shouldClose = this.checkStopLossTakeProfit(candle);
      if (shouldClose) {
        infoPnl = this.calculatePositionPnl(candle, this.position);
        this.closePosition(candle, this.position === 'LONG' ? 'SELL' : 'BUY');
      }
    }
    
    // Расчет награды
    reward = this.calculateReward(currentState);
    
    // Обновление истории
    const currentEquity = this.calculateEquity(candle);
    this.equityHistory.push(currentEquity);
    
    if (this.equityHistory.length > 1) {
      const ret = (currentEquity - this.equityHistory[this.equityHistory.length - 2]) / 
                  this.equityHistory[this.equityHistory.length - 2];
      this.returnsHistory.push(ret);
    }
    
    // Переход к следующей свече
    this.currentIndex++;
    
    // Проверка окончания эпизода
    const done = this.currentIndex >= this.candles.length - 1 || 
                 this.cash <= 0 ||
                 currentEquity <= this.config.initialCapital * 0.5; // 50% просадка = конец
    
    return {
      state: this.getState(),
      reward,
      done,
      info: {
        action,
        pnl: infoPnl,
        equity: currentEquity,
        trades: this.trades,
      },
    };
  }

  /**
   * Получение текущего состояния
   */
  getState(): RLState {
    const startIdx = Math.max(0, this.currentIndex - this.config.lookbackWindow);
    const window = this.candles.slice(startIdx, this.currentIndex + 1);
    
    const prices = window.map(c => c.close);
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    
    const currentCandle = this.candles[this.currentIndex];
    const currentEquity = this.calculateEquity(currentCandle);
    const unrealizedPnl = this.position !== 'FLAT' 
      ? this.calculatePositionPnl(currentCandle, this.position)
      : 0;
    
    return {
      prices,
      returns,
      indicators: this.calculateIndicators(window),
      position: this.position,
      positionSize: this.positionSize,
      entryPrice: this.entryPrice,
      unrealizedPnl,
      realizedPnl: this.realizedPnl,
      cash: this.cash,
      equity: currentEquity,
      hour: new Date(currentCandle.timestamp).getHours(),
      dayOfWeek: new Date(currentCandle.timestamp).getDay(),
      volatility: this.calculateVolatility(returns),
      trend: this.calculateTrend(prices),
    };
  }

  /**
   * Получение статистики эпизода
   */
  getEpisodeStats(): {
    totalReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
    totalTrades: number;
    winRate: number;
  } {
    if (this.equityHistory.length < 2) {
      return { totalReturn: 0, sharpeRatio: 0, maxDrawdown: 0, totalTrades: 0, winRate: 0 };
    }
    
    const totalReturn = (this.equityHistory[this.equityHistory.length - 1] - this.config.initialCapital) / 
                        this.config.initialCapital;
    
    // Sharpe Ratio
    const meanReturn = this.returnsHistory.reduce((a, b) => a + b, 0) / this.returnsHistory.length;
    const stdReturn = Math.sqrt(
      this.returnsHistory.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / 
      this.returnsHistory.length
    );
    const sharpeRatio = stdReturn > 0 ? (meanReturn / stdReturn) * Math.sqrt(252) : 0;
    
    // Max Drawdown
    let peak = this.equityHistory[0];
    let maxDD = 0;
    for (const equity of this.equityHistory) {
      if (equity > peak) peak = equity;
      const dd = (peak - equity) / peak;
      if (dd > maxDD) maxDD = dd;
    }
    
    return {
      totalReturn,
      sharpeRatio,
      maxDrawdown: maxDD,
      totalTrades: this.trades,
      winRate: 0, // Нужно отслеживать в реальном времени
    };
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  private openPosition(candle: Candle, side: OrderSide): void {
    const maxPositionValue = this.cash * (this.config.maxPositionSize / 100);
    const price = candle.close * (1 + this.config.slippage / 100);
    const quantity = maxPositionValue / price;
    const commission = maxPositionValue * (this.config.commission / 100);
    
    this.cash -= commission;
    this.position = side === 'BUY' ? 'LONG' : 'SHORT';
    this.positionSize = quantity;
    this.entryPrice = price;
    this.trades++;
  }

  private closePosition(candle: Candle, side: OrderSide): void {
    const price = candle.close * (1 - this.config.slippage / 100);
    const positionValue = this.positionSize * price;
    const commission = positionValue * (this.config.commission / 100);
    
    const pnl = this.calculatePositionPnl(candle, this.position);
    this.realizedPnl += pnl;
    this.cash += positionValue - commission;
    
    this.position = 'FLAT';
    this.positionSize = 0;
    this.entryPrice = 0;
  }

  private calculatePositionPnl(candle: Candle, position: RLPosition): number {
    if (position === 'FLAT') return 0;
    
    const currentPrice = candle.close;
    const pnlPercent = position === 'LONG' 
      ? (currentPrice - this.entryPrice) / this.entryPrice
      : (this.entryPrice - currentPrice) / this.entryPrice;
    
    return this.positionSize * this.entryPrice * pnlPercent;
  }

  private calculateEquity(candle: Candle): number {
    const unrealizedPnl = this.position !== 'FLAT' 
      ? this.calculatePositionPnl(candle, this.position)
      : 0;
    
    return this.cash + this.positionSize * this.entryPrice + unrealizedPnl;
  }

  private checkStopLossTakeProfit(candle: Candle): boolean {
    if (this.position === 'FLAT' || !this.config.stopLoss) return false;
    
    const pnlPercent = this.calculatePositionPnl(candle, this.position) / 
                       (this.positionSize * this.entryPrice);
    
    // Stop Loss
    if (pnlPercent <= -this.config.stopLoss / 100) {
      return true;
    }
    
    // Take Profit
    if (this.config.takeProfit && pnlPercent >= this.config.takeProfit / 100) {
      return true;
    }
    
    return false;
  }

  private calculateReward(previousState: RLState): number {
    const currentEquity = this.calculateEquity(this.candles[this.currentIndex]);
    const previousEquity = previousState.equity;
    
    switch (this.config.rewardType) {
      case 'pnl':
        return (currentEquity - previousEquity) / previousEquity;
        
      case 'sharpe':
        if (this.returnsHistory.length < 2) return 0;
        const mean = this.returnsHistory.reduce((a, b) => a + b, 0) / this.returnsHistory.length;
        const std = Math.sqrt(
          this.returnsHistory.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / 
          this.returnsHistory.length
        );
        return std > 0 ? mean / std : 0;
        
      case 'sortino':
        // Similar to Sharpe but only downside deviation
        const negativeReturns = this.returnsHistory.filter(r => r < 0);
        if (negativeReturns.length === 0) return mean * Math.sqrt(252);
        const downsideDev = Math.sqrt(
          negativeReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / negativeReturns.length
        );
        return downsideDev > 0 ? mean / downsideDev : 0;
        
      case 'calmar':
        const totalReturn = (currentEquity - this.config.initialCapital) / this.config.initialCapital;
        let peak = this.equityHistory[0];
        let maxDD = 0;
        for (const eq of this.equityHistory) {
          if (eq > peak) peak = eq;
          const dd = (peak - eq) / peak;
          if (dd > maxDD) maxDD = dd;
        }
        return maxDD > 0 ? totalReturn / maxDD : 0;
        
      default:
        return (currentEquity - previousEquity) / previousEquity;
    }
  }

  private calculateIndicators(candles: Candle[]): Record<string, number> {
    const closes = candles.map(c => c.close);
    
    // SMA
    const sma20 = closes.length >= 20 
      ? closes.slice(-20).reduce((a, b) => a + b, 0) / 20 
      : closes[closes.length - 1];
    
    // RSI
    const rsi = this.calculateRSI(closes, 14);
    
    // Volatility
    const returns = [];
    for (let i = 1; i < closes.length; i++) {
      returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
    }
    const volatility = returns.length > 0 
      ? Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / returns.length)
      : 0;
    
    return {
      sma20,
      rsi: rsi || 50,
      volatility,
      price: closes[closes.length - 1],
    };
  }

  private calculateRSI(closes: number[], period: number): number | null {
    if (closes.length < period + 1) return null;
    
    let gains = 0;
    let losses = 0;
    
    for (let i = closes.length - period; i < closes.length; i++) {
      const change = closes[i] - closes[i - 1];
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }
    
    const rs = losses === 0 ? 100 : gains / losses;
    return 100 - (100 / (1 + rs));
  }

  private calculateVolatility(returns: number[]): number {
    if (returns.length === 0) return 0;
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    return Math.sqrt(variance);
  }

  private calculateTrend(prices: number[]): number {
    if (prices.length < 2) return 0;
    return (prices[prices.length - 1] - prices[0]) / prices[0];
  }
}

// ============================================
// DQN AGENT (Deep Q-Network)
// ============================================

export class DQNAgent {
  private config: RLTrainingConfig;
  private qNetwork: number[] = []; // Упрощенная версия - в продакшене использовать нейросеть
  private targetNetwork: number[] = [];
  private replayBuffer: Array<{
    state: RLState;
    action: RLAction;
    reward: number;
    nextState: RLState;
    done: boolean;
  }> = [];
  private epsilon: number;
  private steps: number = 0;

  constructor(config: Partial<RLTrainingConfig> = {}) {
    this.config = {
      episodes: 100,
      maxStepsPerEpisode: 1000,
      learningRate: 0.001,
      gamma: 0.99,
      epsilonStart: 1.0,
      epsilonEnd: 0.01,
      epsilonDecay: 0.995,
      batchSize: 32,
      targetUpdateFreq: 100,
      ...config,
    };
    
    this.epsilon = this.config.epsilonStart;
  }

  /**
   * Выбор действия (epsilon-greedy)
   */
  selectAction(state: RLState): RLAction {
    // Exploration
    if (Math.random() < this.epsilon) {
      return Math.floor(Math.random() * 3) as RLAction;
    }
    
    // Exploitation
    const qValues = this.predictQValues(state);
    return qValues.indexOf(Math.max(...qValues)) as RLAction;
  }

  /**
   * Сохранение опыта в replay buffer
   */
  remember(
    state: RLState,
    action: RLAction,
    reward: number,
    nextState: RLState,
    done: boolean
  ): void {
    this.replayBuffer.push({ state, action, reward, nextState, done });
    
    // Ограничение размера буфера
    if (this.replayBuffer.length > 10000) {
      this.replayBuffer.shift();
    }
  }

  /**
   * Обучение на батче из replay buffer
   */
  train(): number {
    if (this.replayBuffer.length < this.config.batchSize) {
      return 0;
    }
    
    // Выборка случайного батча
    const batch = [];
    for (let i = 0; i < this.config.batchSize; i++) {
      const idx = Math.floor(Math.random() * this.replayBuffer.length);
      batch.push(this.replayBuffer[idx]);
    }
    
    let totalLoss = 0;
    
    for (const experience of batch) {
      const { state, action, reward, nextState, done } = experience;
      
      // Q-learning update
      const currentQ = this.predictQValues(state)[action];
      const nextQMax = done ? 0 : Math.max(...this.predictQValues(nextState));
      const targetQ = reward + this.config.gamma * nextQMax;
      
      const loss = Math.pow(targetQ - currentQ, 2);
      totalLoss += loss;
      
      // Упрощенное обновление весов
      this.updateWeights(state, action, targetQ - currentQ);
    }
    
    this.steps++;
    
    // Затухание epsilon
    this.epsilon = Math.max(
      this.config.epsilonEnd,
      this.epsilon * this.config.epsilonDecay
    );
    
    // Обновление target сети
    if (this.steps % this.config.targetUpdateFreq === 0) {
      this.targetNetwork = [...this.qNetwork];
    }
    
    return totalLoss / this.config.batchSize;
  }

  /**
   * Предсказание Q-значений для всех действий
   */
  predictQValues(state: RLState): number[] {
    // Упрощенная линейная модель
    // В продакшене использовать настоящую нейросеть
    
    const features = this.stateToFeatures(state);
    const qValues = [0, 0, 0]; // HOLD, BUY, SELL
    
    for (let action = 0; action < 3; action++) {
      let q = 0;
      for (let i = 0; i < features.length; i++) {
        const weightIdx = action * features.length + i;
        q += features[i] * (this.qNetwork[weightIdx] || 0);
      }
      qValues[action] = q;
    }
    
    return qValues;
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  private stateToFeatures(state: RLState): number[] {
    const features: number[] = [];
    
    // Цены (нормализованные)
    const lastPrice = state.prices[state.prices.length - 1] || 1;
    features.push(...state.prices.map(p => p / lastPrice));
    
    // Доходности
    features.push(...state.returns);
    
    // Индикаторы
    features.push(state.indicators.rsi / 100);
    features.push(state.indicators.volatility);
    features.push(state.trend);
    
    // Состояние портфеля
    features.push(state.position === 'LONG' ? 1 : state.position === 'SHORT' ? -1 : 0);
    features.push(state.unrealizedPnl / state.equity);
    features.push(state.cash / state.equity);
    
    // Временные признаки
    features.push(state.hour / 24);
    features.push(state.dayOfWeek / 7);
    
    return features;
  }

  private updateWeights(state: RLState, action: RLAction, error: number): void {
    const features = this.stateToFeatures(state);
    const baseIdx = action * features.length;
    
    for (let i = 0; i < features.length; i++) {
      const weightIdx = baseIdx + i;
      this.qNetwork[weightIdx] = (this.qNetwork[weightIdx] || 0) + 
                                  this.config.learningRate * error * features[i];
    }
  }

  /**
   * Сохранение модели
   */
  save(): object {
    return {
      qNetwork: this.qNetwork,
      targetNetwork: this.targetNetwork,
      epsilon: this.epsilon,
      steps: this.steps,
    };
  }

  /**
   * Загрузка модели
   */
  load(model: object): void {
    const saved = model as any;
    this.qNetwork = saved.qNetwork || [];
    this.targetNetwork = saved.targetNetwork || [];
    this.epsilon = saved.epsilon || this.config.epsilonStart;
    this.steps = saved.steps || 0;
  }
}

// ============================================
// EXPORTS
// ============================================

export default {
  TradingEnvironment,
  DQNAgent,
};
