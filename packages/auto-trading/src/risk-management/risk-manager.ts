/**
 * Risk Manager
 * Управление рисками: лимиты, мониторинг, алерты
 */

import {
  RiskConfig,
  RiskLimits,
  RiskMetrics,
  RiskLimitBreached,
  ExecutionOrder,
} from '../types';

export interface Position {
  symbol: string;
  side: 'LONG' | 'SHORT';
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  strategyId: string;
  openedAt: number;
}

export class RiskManager {
  private config: RiskConfig;
  private positions: Map<string, Position> = new Map();
  private dailyPnL: number = 0;
  private weeklyPnL: number = 0;
  private monthlyPnL: number = 0;
  private peakCapital: number = 100000;  // Начальный капитал
  private currentCapital: number = 100000;
  private lastDailyReset: string = new Date().toDateString();
  private lastWeeklyReset: number = Date.now();
  private lastMonthlyReset: number = Date.now();
  private breachHistory: RiskLimitBreached[] = [];

  constructor(config: RiskConfig) {
    this.config = config;
  }

  /**
   * Проверка можно ли открыть новую позицию
   */
  canOpenPosition(
    symbol: string,
    side: 'LONG' | 'SHORT',
    value: number,
    strategyId: string
  ): { allowed: boolean; reason?: string } {
    const metrics = this.calculateMetrics();
    
    // Проверка лимита на позицию
    const positionLimit = this.config.limits.maxPositionSize / 100 * this.currentCapital;
    if (value > positionLimit) {
      return {
        allowed: false,
        reason: `Position size ${value} exceeds limit ${positionLimit}`,
      };
    }
    
    // Проверка лимита на стратегию
    const strategyExposure = this.getStrategyExposure(strategyId);
    const strategyLimit = this.config.limits.maxStrategyExposure / 100 * this.currentCapital;
    if (strategyExposure + value > strategyLimit) {
      return {
        allowed: false,
        reason: `Strategy exposure exceeds limit`,
      };
    }
    
    // Проверка лимита на символ
    const symbolExposure = this.getSymbolExposure(symbol);
    const symbolLimit = this.config.limits.maxSymbolExposure / 100 * this.currentCapital;
    if (symbolExposure + value > symbolLimit) {
      return {
        allowed: false,
        reason: `Symbol exposure exceeds limit`,
      };
    }
    
    // Проверка дневного лимита убытков
    if (this.dailyPnL < -this.config.limits.maxDailyLoss / 100 * this.currentCapital) {
      return {
        allowed: false,
        reason: `Daily loss limit reached`,
      };
    }
    
    // Проверка просадки
    if (metrics.currentDrawdown > this.config.limits.maxDrawdown / 100) {
      return {
        allowed: false,
        reason: `Max drawdown reached`,
      };
    }
    
    return { allowed: true };
  }

  /**
   * Добавление позиции
   */
  addPosition(position: Position): void {
    const key = this.getPositionKey(position.symbol, position.side);
    this.positions.set(key, position);
  }

  /**
   * Обновление позиции
   */
  updatePosition(symbol: string, side: 'LONG' | 'SHORT', currentPrice: number): void {
    const key = this.getPositionKey(symbol, side);
    const position = this.positions.get(key);
    if (position) {
      position.currentPrice = currentPrice;
      this.positions.set(key, position);
    }
  }

  /**
   * Удаление позиции (закрытие)
   */
  removePosition(symbol: string, side: 'LONG' | 'SHORT'): Position | undefined {
    const key = this.getPositionKey(symbol, side);
    const position = this.positions.get(key);
    if (position) {
      this.positions.delete(key);
      
      // Обновляем P&L
      const pnl = this.calculatePositionPnL(position);
      this.updatePnL(pnl);
    }
    return position;
  }

  /**
   * Расчет метрик риска
   */
  calculateMetrics(): RiskMetrics {
    const positions = Array.from(this.positions.values());
    
    // Экспозиция
    const longExposure = positions
      .filter(p => p.side === 'LONG')
      .reduce((sum, p) => sum + p.quantity * p.currentPrice, 0);
    
    const shortExposure = positions
      .filter(p => p.side === 'SHORT')
      .reduce((sum, p) => sum + p.quantity * p.currentPrice, 0);
    
    const totalExposure = longExposure + shortExposure;
    const netExposure = longExposure - shortExposure;
    
    // P&L
    const unrealizedPnL = positions.reduce((sum, p) => sum + this.calculatePositionPnL(p), 0);
    const realizedPnL = this.dailyPnL;
    const totalPnL = unrealizedPnL + realizedPnL;
    
    // Drawdown
    this.currentCapital = 100000 + totalPnL;  // Упрощенно
    if (this.currentCapital > this.peakCapital) {
      this.peakCapital = this.currentCapital;
    }
    const currentDrawdown = (this.peakCapital - this.currentCapital) / this.peakCapital;
    
    // Проверка лимитов
    const limitsBreached: RiskLimitBreached[] = [];
    
    // Daily loss limit
    if (this.dailyPnL < -this.config.limits.maxDailyLoss / 100 * this.currentCapital) {
      limitsBreached.push({
        limit: 'maxDailyLoss',
        currentValue: this.dailyPnL,
        limitValue: -this.config.limits.maxDailyLoss / 100 * this.currentCapital,
        severity: 'critical',
        timestamp: Date.now(),
      });
    }
    
    // Max drawdown
    if (currentDrawdown > this.config.limits.maxDrawdown / 100) {
      limitsBreached.push({
        limit: 'maxDrawdown',
        currentValue: currentDrawdown,
        limitValue: this.config.limits.maxDrawdown / 100,
        severity: 'critical',
        timestamp: Date.now(),
      });
    }
    
    // Total exposure
    const exposureLimit = this.config.limits.maxPositionSize / 100 * this.currentCapital * 5;  // Упрощенно
    if (totalExposure > exposureLimit) {
      limitsBreached.push({
        limit: 'maxExposure',
        currentValue: totalExposure,
        limitValue: exposureLimit,
        severity: 'warning',
        timestamp: Date.now(),
      });
    }
    
    // Сохраняем breach history
    limitsBreached.forEach(breach => {
      this.breachHistory.push(breach);
    });
    
    return {
      totalExposure,
      longExposure,
      shortExposure,
      netExposure,
      strategyExposure: {},
      symbolExposure: {},
      unrealizedPnL,
      realizedPnL,
      totalPnL,
      currentDrawdown,
      maxDrawdown: currentDrawdown,
      drawdownDuration: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      calmarRatio: 0,
      var95: 0,
      cvar95: 0,
      limitsBreached,
    };
  }

  /**
   * Проверка всех лимитов
   */
  checkAllLimits(): { passed: boolean; breaches: RiskLimitBreached[] } {
    const metrics = this.calculateMetrics();
    
    // Сброс дневных/недельных/месячных лимитов если нужно
    this.resetPeriods();
    
    return {
      passed: metrics.limitsBreached.length === 0,
      breaches: metrics.limitsBreached,
    };
  }

  /**
   * Принудительное уменьшение позиций при breach
   */
  autoReducePositions(breach: RiskLimitBreached): Position[] {
    const positions = Array.from(this.positions.values());
    const reducedPositions: Position[] = [];
    
    // Сортируем по P&L (худшие первые)
    positions.sort((a, b) => {
      const pnlA = this.calculatePositionPnL(a);
      const pnlB = this.calculatePositionPnL(b);
      return pnlA - pnlB;
    });
    
    // Закрываем худшие позиции пока не восстановим лимит
    for (const position of positions) {
      if (breach.limit === 'maxDailyLoss' && this.dailyPnL >= -this.config.limits.maxDailyLoss / 100 * this.currentCapital) {
        break;
      }
      
      this.removePosition(position.symbol, position.side);
      reducedPositions.push(position);
    }
    
    return reducedPositions;
  }

  /**
   * Получение экспозиции по стратегии
   */
  getStrategyExposure(strategyId: string): number {
    const positions = Array.from(this.positions.values());
    return positions
      .filter(p => p.strategyId === strategyId)
      .reduce((sum, p) => sum + p.quantity * p.currentPrice, 0);
  }

  /**
   * Получение экспозиции по символу
   */
  getSymbolExposure(symbol: string): number {
    const positions = Array.from(this.positions.values());
    return positions
      .filter(p => p.symbol === symbol)
      .reduce((sum, p) => sum + p.quantity * p.currentPrice, 0);
  }

  /**
   * Расчет P&L позиции
   */
  private calculatePositionPnL(position: Position): number {
    if (position.side === 'LONG') {
      return (position.currentPrice - position.entryPrice) * position.quantity;
    } else {
      return (position.entryPrice - position.currentPrice) * position.quantity;
    }
  }

  /**
   * Обновление P&L
   */
  private updatePnL(pnl: number): void {
    this.dailyPnL += pnl;
    this.weeklyPnL += pnl;
    this.monthlyPnL += pnl;
  }

  /**
   * Сброс периодов
   */
  private resetPeriods(): void {
    const today = new Date().toDateString();
    const now = Date.now();
    
    // Daily reset
    if (today !== this.lastDailyReset) {
      this.dailyPnL = 0;
      this.lastDailyReset = today;
    }
    
    // Weekly reset (7 дней)
    if (now - this.lastWeeklyReset > 7 * 24 * 60 * 60 * 1000) {
      this.weeklyPnL = 0;
      this.lastWeeklyReset = now;
    }
    
    // Monthly reset (30 дней)
    if (now - this.lastMonthlyReset > 30 * 24 * 60 * 60 * 1000) {
      this.monthlyPnL = 0;
      this.lastMonthlyReset = now;
    }
  }

  /**
   * Ключ для позиции
   */
  private getPositionKey(symbol: string, side: 'LONG' | 'SHORT'): string {
    return `${symbol}_${side}`;
  }

  /**
   * История breach'ей
   */
  getBreachHistory(): RiskLimitBreached[] {
    return this.breachHistory;
  }

  /**
   * Сброс состояния
   */
  reset(): void {
    this.positions.clear();
    this.dailyPnL = 0;
    this.weeklyPnL = 0;
    this.monthlyPnL = 0;
    this.breachHistory = [];
  }
}

/**
 * Factory для создания Risk Manager
 */
export function createRiskManager(overrides?: Partial<RiskConfig>): RiskManager {
  return new RiskManager({
    limits: {
      maxPositionSize: 10,      // 10% на позицию
      maxPositionValue: 100000, // $100k максимум
      maxStrategyExposure: 30,  // 30% на стратегию
      maxStrategies: 10,
      maxSymbolExposure: 20,    // 20% на символ
      maxCorrelatedExposure: 40,
      maxDailyLoss: 5,          // 5% за день
      maxWeeklyLoss: 10,        // 10% за неделю
      maxMonthlyLoss: 20,       // 20% за месяц
      maxDrawdown: 20,          // 20% макс. просадка
      maxVolatility: 0.05,
      minVolume: 1000,
    },
    checkFrequency: 'every_trade',
    autoReduce: true,
    alertThreshold: 0.8,  // Алерт при 80% от лимита
    ...overrides,
  });
}
