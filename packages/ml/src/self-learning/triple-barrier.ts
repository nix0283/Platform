/**
 * Triple Barrier Method
 * Основано на financial-machine-learning (Marcos López de Prado)
 * 
 * Размечает сделки по трем барьерам:
 * 1. Vertical Barrier (время)
 * 2. Horizontal Upper Barrier (Take Profit)
 * 3. Horizontal Lower Barrier (Stop Loss)
 */

import { TripleBarrierLabel } from './types';

export interface TripleBarrierConfig {
  timeHorizon: number;        // Дней для vertical barrier
  profitTarget: number;       // % для upper barrier
  stopLoss: number;           // % для lower barrier
}

export class TripleBarrierMethod {
  private config: TripleBarrierConfig;

  constructor(config: TripleBarrierConfig) {
    this.config = config;
  }

  /**
   * Разметка сделки по Triple Barrier Method
   */
  labelTrade(trade: {
    tradeId: string;
    entryTime: number;
    entryPrice: number;
    exitTime: number;
    exitPrice: number;
    side: 'LONG' | 'SHORT';
    high?: number;  // Максимум во время сделки
    low?: number;   // Минимум во время сделки
  }): TripleBarrierLabel {
    const {
      tradeId,
      entryTime,
      entryPrice,
      exitTime,
      exitPrice,
      side,
      high,
      low,
    } = trade;

    // Вычисляем барьеры
    const verticalBarrier = entryTime + this.config.timeHorizon * 24 * 60 * 60 * 1000;
    const horizontalUpperBarrier = side === 'LONG'
      ? entryPrice * (1 + this.config.profitTarget / 100)
      : entryPrice * (1 - this.config.profitTarget / 100);
    const horizontalLowerBarrier = side === 'LONG'
      ? entryPrice * (1 - this.config.stopLoss / 100)
      : entryPrice * (1 + this.config.stopLoss / 100);

    // Определяем какой барьер был задет первым
    const touchedBarrier = this.determineTouchedBarrier({
      side,
      entryPrice,
      exitPrice,
      exitTime,
      high,
      low,
      verticalBarrier,
      horizontalUpperBarrier,
      horizontalLowerBarrier,
    });

    // Вычисляем label
    let label: 1 | 0 | -1;
    if (touchedBarrier === 'upper') {
      label = 1;  // Take Profit
    } else if (touchedBarrier === 'lower') {
      label = -1;  // Stop Loss
    } else {
      label = 0;  // Time exit
    }

    // Вычисляем return
    const returnPct = side === 'LONG'
      ? (exitPrice - entryPrice) / entryPrice
      : (entryPrice - exitPrice) / entryPrice;

    return {
      tradeId,
      entryTime,
      entryPrice,
      exitTime,
      exitPrice,
      side,
      verticalBarrier,
      horizontalUpperBarrier,
      horizontalLowerBarrier,
      label,
      return: returnPct,
      touchedBarrier,
    };
  }

  /**
   * Определяет какой барьер был задет первым
   */
  private determineTouchedBarrier(params: {
    side: 'LONG' | 'SHORT';
    entryPrice: number;
    exitPrice: number;
    exitTime: number;
    high?: number;
    low?: number;
    verticalBarrier: number;
    horizontalUpperBarrier: number;
    horizontalLowerBarrier: number;
  }): 'upper' | 'lower' | 'vertical' {
    const {
      side,
      exitPrice,
      exitTime,
      high,
      low,
      verticalBarrier,
      horizontalUpperBarrier,
      horizontalLowerBarrier,
    } = params;

    // Проверяем time barrier
    if (exitTime >= verticalBarrier) {
      return 'vertical';
    }

    // Проверяем price barriers с учетом high/low если доступны
    if (high !== undefined && low !== undefined) {
      if (side === 'LONG') {
        if (high >= horizontalUpperBarrier) return 'upper';
        if (low <= horizontalLowerBarrier) return 'lower';
      } else {
        if (low <= horizontalUpperBarrier) return 'upper';
        if (high >= horizontalLowerBarrier) return 'lower';
      }
    }

    // Проверяем по exit price
    if (side === 'LONG') {
      if (exitPrice >= horizontalUpperBarrier) return 'upper';
      if (exitPrice <= horizontalLowerBarrier) return 'lower';
    } else {
      if (exitPrice <= horizontalUpperBarrier) return 'upper';
      if (exitPrice >= horizontalLowerBarrier) return 'lower';
    }

    // По умолчанию time exit
    return 'vertical';
  }

  /**
   * Пакетная разметка сделок
   */
  labelTrades(trades: Array<{
    tradeId: string;
    entryTime: number;
    entryPrice: number;
    exitTime: number;
    exitPrice: number;
    side: 'LONG' | 'SHORT';
    high?: number;
    low?: number;
  }>): TripleBarrierLabel[] {
    return trades.map(trade => this.labelTrade(trade));
  }

  /**
   * Статистика по размеченным сделкам
   */
  getStatistics(labels: TripleBarrierLabel[]): {
    total: number;
    tpHits: number;
    slHits: number;
    timeExits: number;
    tpRate: number;
    slRate: number;
    timeRate: number;
    avgReturn: number;
    winRate: number;
  } {
    const total = labels.length;
    const tpHits = labels.filter(l => l.touchedBarrier === 'upper').length;
    const slHits = labels.filter(l => l.touchedBarrier === 'lower').length;
    const timeExits = labels.filter(l => l.touchedBarrier === 'vertical').length;
    
    const avgReturn = labels.reduce((sum, l) => sum + l.return, 0) / total;
    const winRate = labels.filter(l => l.return > 0).length / total;

    return {
      total,
      tpHits,
      slHits,
      timeExits,
      tpRate: tpHits / total,
      slRate: slHits / total,
      timeRate: timeExits / total,
      avgReturn,
      winRate,
    };
  }

  /**
   * Оптимизация параметров барьеров
   */
  optimizeParameters(
    trades: Array<{
      tradeId: string;
      entryTime: number;
      entryPrice: number;
      exitTime: number;
      exitPrice: number;
      side: 'LONG' | 'SHORT';
      high?: number;
      low?: number;
    }>,
    parameterGrid: {
      timeHorizons: number[];
      profitTargets: number[];
      stopLosses: number[];
    }
  ): {
    bestConfig: TripleBarrierConfig;
    bestMetrics: {
      sharpeRatio: number;
      profitFactor: number;
      winRate: number;
    };
  } {
    let bestConfig = this.config;
    let bestScore = -Infinity;
    let bestMetrics = { sharpeRatio: 0, profitFactor: 0, winRate: 0 };

    for (const timeHorizon of parameterGrid.timeHorizons) {
      for (const profitTarget of parameterGrid.profitTargets) {
        for (const stopLoss of parameterGrid.stopLosses) {
          const config: TripleBarrierConfig = {
            timeHorizon,
            profitTarget,
            stopLoss,
          };

          const method = new TripleBarrierMethod(config);
          const labels = method.labelTrades(trades);
          const stats = method.getStatistics(labels);

          // Вычисляем score (Sharpe-like)
          const score = stats.winRate * stats.avgReturn * 100;

          if (score > bestScore && stats.winRate > 0.4) {
            bestScore = score;
            bestConfig = config;
            bestMetrics = {
              sharpeRatio: stats.avgReturn / (this.stdDev(labels.map(l => l.return)) || 1),
              profitFactor: this.calculateProfitFactor(labels),
              winRate: stats.winRate,
            };
          }
        }
      }
    }

    return { bestConfig, bestMetrics };
  }

  private stdDev(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const squareDiffs = values.map(v => Math.pow(v - mean, 2));
    return Math.sqrt(squareDiffs.reduce((sum, v) => sum + v, 0) / values.length);
  }

  private calculateProfitFactor(labels: TripleBarrierLabel[]): number {
    const grossProfit = labels.filter(l => l.return > 0).reduce((sum, l) => sum + l.return, 0);
    const grossLoss = Math.abs(labels.filter(l => l.return < 0).reduce((sum, l) => sum + l.return, 0));
    return grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
  }
}
