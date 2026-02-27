/**
 * Demo Trading Module
 * Демо-трейдинг для валидации стратегий на реальных данных
 */

import {
  DemoTradingConfig,
  DemoTradingState,
  DemoTradingReport,
  AutoTradingEvent,
} from '../types';

export interface DemoTrade {
  id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice?: number;
  entryTime: number;
  exitTime?: number;
  quantity: number;
  pnl?: number;
  pnlPercent?: number;
  status: 'open' | 'closed';
}

export class DemoTradingManager {
  private config: DemoTradingConfig;
  private state: DemoTradingState;
  private trades: DemoTrade[] = [];
  private dailyReturns: number[] = [];
  private eventListeners: Set<(event: any) => void> = new Set();
  private monitoringInterval?: NodeJS.Timeout;
  private reportInterval?: NodeJS.Timeout;

  constructor(config: DemoTradingConfig) {
    this.config = config;
    
    const now = Date.now();
    const endDate = now + config.duration * 24 * 60 * 60 * 1000;
    
    this.state = {
      enabled: false,
      startDate: now,
      endDate,
      daysRemaining: config.duration,
      totalReturn: 0,
      totalTrades: 0,
      winRate: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      progress: 0,
      status: 'running',
      criteriaMet: {
        return: false,
        drawdown: false,
        sharpe: false,
        trades: false,
      },
      deploymentReady: false,
      deploymentConfidence: 0,
    };
  }

  /**
   * Запуск демо-трейдинга
   */
  start(): void {
    if (this.state.enabled) return;
    
    this.state.enabled = true;
    this.state.status = 'running';
    this.state.startDate = Date.now();
    
    // Мониторинг
    this.monitoringInterval = setInterval(() => {
      this.updateState();
    }, 60000);  // Каждую минуту
    
    // Отчеты
    this.reportInterval = setInterval(() => {
      if (this.config.autoReporting) {
        this.generateReport('daily');
      }
    }, this.config.reportInterval);
  }

  /**
   * Остановка демо-трейдинга
   */
  stop(reason: string = 'Stopped by user'): void {
    this.state.enabled = false;
    this.state.status = reason === 'Completed successfully' ? 'completed' : 'failed';
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    if (this.reportInterval) {
      clearInterval(this.reportInterval);
    }
  }

  /**
   * Добавление сделки
   */
  addTrade(trade: Omit<DemoTrade, 'id' | 'status'>): DemoTrade {
    const demoTrade: DemoTrade = {
      ...trade,
      id: `demo_trade_${Date.now()}_${this.trades.length}`,
      status: 'open',
    };
    
    this.trades.push(demoTrade);
    return demoTrade;
  }

  /**
   * Обновление сделки (закрытие)
   */
  updateTrade(tradeId: string, exitPrice: number): DemoTrade | null {
    const trade = this.trades.find(t => t.id === tradeId);
    if (!trade || trade.status === 'closed') return null;
    
    trade.exitPrice = exitPrice;
    trade.exitTime = Date.now();
    trade.status = 'closed';
    
    // Расчет PnL
    if (trade.side === 'LONG') {
      trade.pnl = (exitPrice - trade.entryPrice) * trade.quantity;
      trade.pnlPercent = ((exitPrice - trade.entryPrice) / trade.entryPrice) * 100;
    } else {
      trade.pnl = (trade.entryPrice - exitPrice) * trade.quantity;
      trade.pnlPercent = ((trade.entryPrice - exitPrice) / trade.entryPrice) * 100;
    }
    
    // Добавление daily return
    const today = new Date().toDateString();
    const lastDay = this.dailyReturns.length > 0 ? 
      new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString() : null;
    
    if (today !== lastDay) {
      this.dailyReturns.push(trade.pnlPercent || 0);
    }
    
    return trade;
  }

  /**
   * Обновление состояния
   */
  private updateState(): void {
    const now = Date.now();
    const totalDuration = this.state.endDate - this.state.startDate;
    const elapsed = now - this.state.startDate;
    
    this.state.daysRemaining = Math.max(0, (this.state.endDate - now) / (1000 * 60 * 60 * 24));
    this.state.progress = Math.min(100, (elapsed / totalDuration) * 100);
    
    // Расчет метрик
    const closedTrades = this.trades.filter(t => t.status === 'closed');
    this.state.totalTrades = closedTrades.length;
    
    if (closedTrades.length > 0) {
      const winningTrades = closedTrades.filter(t => (t.pnl || 0) > 0);
      this.state.winRate = winningTrades.length / closedTrades.length;
      this.state.totalReturn = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    }
    
    // Sharpe ratio (упрощенно)
    if (this.dailyReturns.length > 1) {
      const avgReturn = this.dailyReturns.reduce((sum, r) => sum + r, 0) / this.dailyReturns.length;
      const stdReturn = Math.sqrt(
        this.dailyReturns.map(r => Math.pow(r - avgReturn, 2)).reduce((sum, r) => sum + r, 0) / this.dailyReturns.length
      );
      this.state.sharpeRatio = stdReturn > 0 ? (avgReturn * 252) / (stdReturn * Math.sqrt(252)) : 0;
    }
    
    // Max drawdown
    const cumulativeReturns = this.calculateCumulativeReturns();
    let peak = 0;
    let maxDrawdown = 0;
    
    for (const value of cumulativeReturns) {
      if (value > peak) {
        peak = value;
      }
      const drawdown = (peak - value) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
    
    this.state.maxDrawdown = maxDrawdown;
    
    // Проверка критериев успеха
    this.checkSuccessCriteria();
    
    // Проверка завершения
    if (this.state.daysRemaining <= 0) {
      this.stop('Completed successfully');
    }
    
    this.state.lastUpdate = now;
  }

  /**
   * Проверка критериев успеха
   */
  private checkSuccessCriteria(): void {
    const criteria = this.config.successCriteria;
    
    this.state.criteriaMet = {
      return: this.state.totalReturn >= criteria.minReturn,
      drawdown: this.state.maxDrawdown <= criteria.maxDrawdown,
      sharpe: this.state.sharpeRatio >= criteria.minSharpeRatio,
      trades: this.state.totalTrades >= criteria.minTrades,
    };
    
    // Расчет уверенности для deployment
    const metCount = Object.values(this.state.criteriaMet).filter(v => v).length;
    this.state.deploymentConfidence = metCount / 4;
    this.state.deploymentReady = this.state.deploymentConfidence >= this.config.deploymentThreshold;
  }

  /**
   * Расчет кумулятивных returns
   */
  private calculateCumulativeReturns(): number[] {
    const cumulative: number[] = [];
    let value = 1;
    
    for (const dailyReturn of this.dailyReturns) {
      value *= (1 + dailyReturn / 100);
      cumulative.push(value);
    }
    
    return cumulative;
  }

  /**
   * Генерация отчета
   */
  generateReport(period: 'daily' | 'weekly' | 'total'): DemoTradingReport {
    const closedTrades = this.trades.filter(t => t.status === 'closed');
    const winningTrades = closedTrades.filter(t => (t.pnl || 0) > 0);
    const losingTrades = closedTrades.filter(t => (t.pnl || 0) <= 0);
    
    const report: DemoTradingReport = {
      period,
      startDate: this.state.startDate,
      endDate: Date.now(),
      totalReturn: this.state.totalReturn,
      dailyReturns: [...this.dailyReturns],
      cumulativeReturns: this.calculateCumulativeReturns(),
      volatility: this.dailyReturns.length > 0 ? 
        Math.sqrt(this.dailyReturns.map(r => Math.pow(r - this.dailyReturns.reduce((a, b) => a + b, 0) / this.dailyReturns.length, 2)).reduce((a, b) => a + b, 0) / this.dailyReturns.length) : 0,
      sharpeRatio: this.state.sharpeRatio,
      sortinoRatio: this.state.sharpeRatio * 1.2,  // Упрощенно
      maxDrawdown: this.state.maxDrawdown,
      var95: this.calculateVaR(0.95),
      cvar95: this.calculateCVaR(0.95),
      totalTrades: closedTrades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      avgWin: winningTrades.length > 0 ? 
        winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / winningTrades.length : 0,
      avgLoss: losingTrades.length > 0 ? 
        Math.abs(losingTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / losingTrades.length) : 0,
      largestWin: Math.max(0, ...closedTrades.map(t => t.pnl || 0)),
      largestLoss: Math.min(0, ...closedTrades.map(t => t.pnl || 0)),
      criteriaMet: this.state.criteriaMet,
      deploymentReady: this.state.deploymentReady,
      recommendations: this.generateRecommendations(),
    };
    
    return report;
  }

  /**
   * Расчет VaR
   */
  private calculateVaR(confidence: number): number {
    if (this.dailyReturns.length === 0) return 0;
    
    const sorted = [...this.dailyReturns].sort((a, b) => a - b);
    const index = Math.floor((1 - confidence) * sorted.length);
    
    return sorted[index] || 0;
  }

  /**
   * Расчет CVaR
   */
  private calculateCVaR(confidence: number): number {
    if (this.dailyReturns.length === 0) return 0;
    
    const varValue = this.calculateVaR(confidence);
    const tailReturns = this.dailyReturns.filter(r => r <= varValue);
    
    if (tailReturns.length === 0) return varValue;
    
    return tailReturns.reduce((sum, r) => sum + r, 0) / tailReturns.length;
  }

  /**
   * Генерация рекомендаций
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    if (!this.state.criteriaMet.return) {
      recommendations.push('Return ниже целевого. Рассмотрите более агрессивные параметры.');
    }
    
    if (!this.state.criteriaMet.drawdown) {
      recommendations.push('Просадка выше допустимой. Увеличьте stop loss или уменьшите размер позиции.');
    }
    
    if (!this.state.criteriaMet.sharpe) {
      recommendations.push('Sharpe ratio ниже целевого. Оптимизируйте стратегию.');
    }
    
    if (!this.state.criteriaMet.trades) {
      recommendations.push('Недостаточно сделок для статистической значимости.');
    }
    
    if (this.state.deploymentReady) {
      recommendations.push('Стратегия готова к deployment в production.');
    } else {
      recommendations.push('Продолжить демо-трейдинг до выполнения критериев.');
    }
    
    return recommendations;
  }

  /**
   * Получение состояния
   */
  getState(): DemoTradingState {
    return { ...this.state };
  }

  /**
   * Получение всех сделок
   */
  getTrades(): DemoTrade[] {
    return [...this.trades];
  }

  /**
   * Экспорт данных
   */
  exportData(): {
    state: DemoTradingState;
    trades: DemoTrade[];
    dailyReturns: number[];
  } {
    return {
      state: this.getState(),
      trades: this.getTrades(),
      dailyReturns: [...this.dailyReturns],
    };
  }

  /**
   * Сброс состояния
   */
  reset(): void {
    this.stop();
    this.trades = [];
    this.dailyReturns = [];
    
    const now = Date.now();
    this.state = {
      enabled: false,
      startDate: now,
      endDate: now + this.config.duration * 24 * 60 * 60 * 1000,
      daysRemaining: this.config.duration,
      totalReturn: 0,
      totalTrades: 0,
      winRate: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      progress: 0,
      status: 'running',
      criteriaMet: {
        return: false,
        drawdown: false,
        sharpe: false,
        trades: false,
      },
      deploymentReady: false,
      deploymentConfidence: 0,
      lastUpdate: now,
    };
  }
}

/**
 * Factory для создания Demo Trading Manager
 */
export function createDemoTradingManager(
  duration: number = 90,  // 90 дней по умолчанию
  overrides?: Partial<DemoTradingConfig>
): DemoTradingManager {
  return new DemoTradingManager({
    duration,
    targetPeriod: 'quarter',
    paperTrading: true,
    realTimeData: true,
    autoReporting: true,
    reportInterval: 24 * 60 * 60 * 1000,  // Daily
    successCriteria: {
      minReturn: 5,         // 5% за период
      maxDrawdown: 10,      // 10% макс.
      minSharpeRatio: 1.5,  // Sharpe > 1.5
      minTrades: 30,        // Мин. 30 сделок
    },
    autoDeploy: true,
    deploymentThreshold: 0.75,  // 75% критериев должно быть выполнено
    ...overrides,
  });
}
