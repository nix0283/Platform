/**
 * Auto-Trading Manager
 * Главный модуль алгоритмической торговли
 * Объединяет: стратегии, execution, risk management, position sizing, self-learning
 */

import {
  AutoTradingConfig,
  AutoTradingState,
  AutoTradingReport,
  AutoTradingEvent,
  StrategySignal,
  ExecutionOrder,
  Position,
} from '../types';
import { BaseStrategy } from '../strategies/base-strategy';
import { ExecutionEngine } from '../execution/execution-engine';
import { RiskManager } from '../risk-management/risk-manager';
import { PositionSizingManager } from '../position-sizing/position-sizing-manager';
import { SelfLearningManager } from '../../ml/src/self-learning/manager';

export class AutoTradingManager {
  private config: AutoTradingConfig;
  private strategies: Map<string, BaseStrategy> = new Map();
  private execution: ExecutionEngine;
  private riskManager: RiskManager;
  private positionSizing: PositionSizingManager;
  private selfLearning?: SelfLearningManager;
  
  private state: AutoTradingState;
  private positions: Map<string, Position> = new Map();
  private eventListeners: Set<(event: AutoTradingEvent) => void> = new Set();
  
  private monitoringInterval?: NodeJS.Timeout;
  private reportInterval?: NodeJS.Timeout;

  constructor(config: AutoTradingConfig) {
    this.config = config;
    
    this.execution = new ExecutionEngine(config.execution);
    this.riskManager = new RiskManager(config.risk);
    this.positionSizing = new PositionSizingManager(config.positionSizing);
    
    if (config.selfLearningEnabled) {
      this.selfLearning = new SelfLearningManager({
        tripleBarrier: { timeHorizon: 3, profitTarget: 5, stopLoss: 2 },
        metaLabeling: { enabled: true, modelType: 'simple', minConfidence: config.minConfidence },
        featureImportance: { enabled: true, method: 'correlation', minStability: 0.5 },
        patternRecognition: { enabled: true, minOccurrences: 3, minWinRate: 0.5 },
        retraining: { enabled: true, minTrades: 50, frequency: 'weekly' },
      });
    }
    
    this.state = {
      enabled: config.enabled,
      paperTrading: config.paperTrading,
      activePositions: 0,
      pendingOrders: 0,
      todayPnL: 0,
      totalPnL: 0,
      currentDrawdown: 0,
      exposure: 0,
      totalTrades: 0,
      winRate: 0,
      activeStrategies: 0,
      bestStrategy: '',
      worstStrategy: '',
      lastUpdate: Date.now(),
    };
  }

  /**
   * Добавление стратегии
   */
  addStrategy(strategy: BaseStrategy): void {
    this.strategies.set(strategy.config.id, strategy);
    this.state.activeStrategies = this.strategies.size;
  }

  /**
   * Удаление стратегии
   */
  removeStrategy(strategyId: string): void {
    this.strategies.delete(strategyId);
    this.state.activeStrategies = this.strategies.size;
    this.emit({ type: 'strategy_disabled', strategyId, reason: 'Removed by user' });
  }

  /**
   * Запуск авто-трейдинга
   */
  start(): void {
    if (!this.config.enabled) {
      throw new Error('Auto-trading is disabled in config');
    }
    
    this.state.enabled = true;
    
    // Запуск мониторинга
    this.monitoringInterval = setInterval(
      () => this.monitor(),
      this.config.monitoringInterval
    );
    
    // Запуск отчетов
    this.reportInterval = setInterval(
      () => this.generateReport('daily'),
      this.config.reportInterval
    );
    
    this.emit({ type: 'strategy_enabled', strategyId: 'auto-trading' });
  }

  /**
   * Остановка авто-трейдинга
   */
  stop(): void {
    this.state.enabled = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    if (this.reportInterval) {
      clearInterval(this.reportInterval);
    }
  }

  /**
   * Мониторинг и генерация сигналов
   */
  private async monitor(): Promise<void> {
    if (!this.state.enabled) return;
    
    // Проверка risk лимитов
    const riskCheck = this.riskManager.checkAllLimits();
    if (!riskCheck.passed) {
      riskCheck.breaches.forEach(breach => {
        this.emit({ type: 'risk_limit_breached', breach });
        
        if (this.config.risk.autoReduce) {
          this.riskManager.autoReducePositions(breach);
        }
      });
      
      return;  // Не торгуем при breached лимитах
    }
    
    // Генерация сигналов от стратегий
    for (const strategy of this.strategies.values()) {
      if (!strategy.config.enabled) continue;
      
      for (const symbol of strategy.config.symbols) {
        const signal = strategy.generateSignal(symbol, strategy.config.timeframes[0]);
        
        if (signal) {
          this.emit({ type: 'signal_generated', signal });
          
          // Проверка self-learning (если включено)
          if (this.selfLearning && signal.side !== 'FLAT') {
            const marketState = {
              symbol,
              price: signal.entryPrice || 0,
              indicators: signal.indicators,
              volatility: 0.02,
              volume: 1000,
            };
            
            const prediction = this.selfLearning.predictSignal(marketState);
            
            if (!prediction.shouldTrade) {
              continue;  // Self-learning не рекомендует торговать
            }
          }
          
          // Обработка сигнала
          await this.handleSignal(signal);
        }
      }
    }
    
    // Обновление состояния
    this.updateState();
  }

  /**
   * Обработка сигнала
   */
  private async handleSignal(signal: StrategySignal): Promise<void> {
    if (signal.side === 'FLAT') {
      // Закрытие позиции
      await this.closePosition(signal.symbol, signal);
      return;
    }
    
    // Проверка можно ли открыть позицию
    const canOpen = this.riskManager.canOpenPosition(
      signal.symbol,
      signal.side,
      signal.entryPrice || 0,
      signal.strategyId
    );
    
    if (!canOpen.allowed) {
      return;  // Риск не позволяет
    }
    
    // Расчет размера позиции
    const sizingInput = {
      symbol: signal.symbol,
      side: signal.side,
      entryPrice: signal.entryPrice || 0,
      stopLoss: signal.stopLoss,
      accountBalance: 100000,  // Заглушка
    };
    
    const sizingResult = this.positionSizing.calculateSize(sizingInput);
    
    // Создание ордера
    const order = this.execution.createOrder({
      strategyId: signal.strategyId,
      symbol: signal.symbol,
      side: signal.side === 'LONG' ? 'BUY' : 'SELL',
      type: 'MARKET',
      quantity: sizingResult.quantity,
      stopLoss: signal.stopLoss,
      takeProfit: signal.takeProfit,
    });
    
    this.emit({ type: 'order_created', order });
  }

  /**
   * Закрытие позиции
   */
  private async closePosition(symbol: string, signal: StrategySignal): Promise<void> {
    const position = this.positions.get(symbol);
    if (!position) return;
    
    // Создание ордера на закрытие
    const order = this.execution.createOrder({
      strategyId: signal.strategyId,
      symbol,
      side: position.side === 'LONG' ? 'SELL' : 'BUY',
      type: 'MARKET',
      quantity: position.quantity,
    });
    
    this.emit({ type: 'order_created', order });
  }

  /**
   * Обновление состояния
   */
  private updateState(): void {
    const metrics = this.riskManager.calculateMetrics();
    
    this.state.activePositions = this.positions.size;
    this.state.pendingOrders = this.execution.getOrders({ status: 'PENDING' }).length;
    this.state.todayPnL = metrics.realizedPnL;
    this.state.totalPnL = metrics.totalPnL;
    this.state.currentDrawdown = metrics.currentDrawdown;
    this.state.exposure = metrics.totalExposure;
    this.state.lastUpdate = Date.now();
  }

  /**
   * Генерация отчета
   */
  private generateReport(period: 'daily' | 'weekly' | 'monthly'): AutoTradingReport {
    const now = Date.now();
    const startDate = period === 'daily' 
      ? now - 24 * 60 * 60 * 1000
      : period === 'weekly'
      ? now - 7 * 24 * 60 * 60 * 1000
      : now - 30 * 24 * 60 * 60 * 1000;
    
    const executionReport = this.execution.getExecutionReport();
    const riskMetrics = this.riskManager.calculateMetrics();
    
    const report: AutoTradingReport = {
      period,
      startDate,
      endDate: now,
      totalReturn: riskMetrics.totalPnL,
      totalTrades: executionReport.filledOrders / 2,  // Примерно
      winRate: this.state.winRate,
      profitFactor: 0,  // Нужно рассчитать
      sharpeRatio: riskMetrics.sharpeRatio,
      maxDrawdown: riskMetrics.maxDrawdown,
      strategyPerformance: [],  // Нужно рассчитать по стратегиям
      avgExposure: riskMetrics.totalExposure,
      maxExposure: riskMetrics.totalExposure,
      var95: riskMetrics.var95,
      limitBreaches: this.riskManager.getBreachHistory().length,
      fillRate: executionReport.fillRate,
      avgSlippage: executionReport.totalSlippage / executionReport.filledOrders,
      totalCommission: executionReport.totalCommission,
      recommendations: [],
    };
    
    this.emit({ type: 'daily_report', report });
    
    return report;
  }

  /**
   * Получение состояния
   */
  getState(): AutoTradingState {
    return { ...this.state };
  }

  /**
   * Получение отчета
   */
  getReport(period: 'daily' | 'weekly' | 'monthly'): AutoTradingReport {
    return this.generateReport(period);
  }

  /**
   * Подписка на события
   */
  onEvent(listener: (event: AutoTradingEvent) => void): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  /**
   * Emit события
   */
  private emit(event: AutoTradingEvent): void {
    this.eventListeners.forEach(listener => listener(event));
  }

  /**
   * Экспорт данных
   */
  exportData(): {
    state: AutoTradingState;
    positions: Position[];
    orders: ExecutionOrder[];
    strategies: string[];
  } {
    return {
      state: this.getState(),
      positions: Array.from(this.positions.values()),
      orders: this.execution.getOrders(),
      strategies: Array.from(this.strategies.keys()),
    };
  }

  /**
   * Сброс состояния
   */
  reset(): void {
    this.stop();
    this.execution.reset();
    this.riskManager.reset();
    this.positions.clear();
    this.state = {
      enabled: false,
      paperTrading: this.config.paperTrading,
      activePositions: 0,
      pendingOrders: 0,
      todayPnL: 0,
      totalPnL: 0,
      currentDrawdown: 0,
      exposure: 0,
      totalTrades: 0,
      winRate: 0,
      activeStrategies: 0,
      bestStrategy: '',
      worstStrategy: '',
      lastUpdate: Date.now(),
    };
  }
}

/**
 * Factory для создания Auto-Trading Manager
 */
export function createAutoTradingManager(
  paperTrading: boolean = true,
  overrides?: Partial<AutoTradingConfig>
): AutoTradingManager {
  return new AutoTradingManager({
    enabled: true,
    paperTrading,
    strategies: [],
    execution: {
      paperTrading,
      slippageModel: 'percentage',
      slippagePercent: 0.05,
      commissionModel: 'percentage',
      commissionPercent: 0.1,
      latencyMs: 100,
      maxOrderSize: 1000,
      minOrderSize: 0.001,
      maxDailyOrders: 1000,
    },
    risk: {
      limits: {
        maxPositionSize: 10,
        maxPositionValue: 100000,
        maxStrategyExposure: 30,
        maxStrategies: 10,
        maxSymbolExposure: 20,
        maxCorrelatedExposure: 40,
        maxDailyLoss: 5,
        maxWeeklyLoss: 10,
        maxMonthlyLoss: 20,
        maxDrawdown: 20,
        maxVolatility: 0.05,
        minVolume: 1000,
      },
      checkFrequency: 'every_trade',
      autoReduce: true,
      alertThreshold: 0.8,
    },
    positionSizing: {
      method: 'fixed_fractional',
      riskPerTrade: 1,
      kellyMultiplier: 0.25,
      volatilityTarget: 0.02,
      minPositionSize: 0.001,
      maxPositionSize: 100,
      considerCorrelation: false,
      maxCorrelatedExposure: 0.5,
    },
    selfLearningEnabled: true,
    minConfidence: 0.6,
    monitoringInterval: 60000,  // 1 минута
    reportInterval: 3600000,    // 1 час
    ...overrides,
  });
}
