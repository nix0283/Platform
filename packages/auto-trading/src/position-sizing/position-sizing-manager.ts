/**
 * Position Sizing Manager
 * Расчет оптимального размера позиции на основе различных методов
 */

import {
  PositionSizingConfig,
  PositionSizingMethod,
  PositionSizingResult,
} from '../types';

export interface PositionSizingInput {
  symbol: string;
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  stopLoss?: number;
  riskPerTrade?: number;  // % риска на сделку
  accountBalance: number;
  volatility?: number;    // ATR или std dev
  correlation?: number;   // Корреляция с портфелем
}

export class PositionSizingManager {
  private config: PositionSizingConfig;

  constructor(config: PositionSizingConfig) {
    this.config = config;
  }

  /**
   * Расчет размера позиции
   */
  calculateSize(input: PositionSizingInput): PositionSizingResult {
    let quantity: number;
    let value: number;
    let riskUsed: number;

    switch (this.config.method) {
      case 'fixed_fractional':
        {
          const result = this.fixedFractional(input);
          quantity = result.quantity;
          value = result.value;
          riskUsed = result.risk;
        }
        break;

      case 'fixed_ratio':
        {
          const result = this.fixedRatio(input);
          quantity = result.quantity;
          value = result.value;
          riskUsed = result.risk;
        }
        break;

      case 'kelly':
        {
          const result = this.kellyCriterion(input);
          quantity = result.quantity;
          value = result.value;
          riskUsed = result.risk;
        }
        break;

      case 'volatility_adjusted':
        {
          const result = this.volatilityAdjusted(input);
          quantity = result.quantity;
          value = result.value;
          riskUsed = result.risk;
        }
        break;

      case 'equal_weight':
      default:
        {
          const result = this.equalWeight(input);
          quantity = result.quantity;
          value = result.value;
          riskUsed = result.risk;
        }
        break;
    }

    // Применение ограничений
    const constrained = this.applyConstraints(
      input.symbol,
      input.side,
      quantity,
      value,
      input.entryPrice
    );

    return {
      symbol: input.symbol,
      side: input.side,
      quantity: constrained.quantity,
      value: constrained.value,
      percentOfCapital: (constrained.value / input.accountBalance) * 100,
      method: this.config.method,
      riskUsed: constrained.risk,
      constraints: {
        minSizeRespected: constrained.quantity >= this.config.minPositionSize,
        maxSizeRespected: constrained.quantity <= this.config.maxPositionSize,
        correlationRespected: !this.config.considerCorrelation || (input.correlation || 0) < this.config.maxCorrelatedExposure,
      },
    };
  }

  /**
   * Fixed Fractional Position Sizing
   * Риск фиксированный % от капитала на сделку
   */
  private fixedFractional(input: PositionSizingInput): { quantity: number; value: number; risk: number } {
    const riskPerTrade = input.riskPerTrade || this.config.riskPerTrade || 1;  // 1% по умолчанию
    const riskAmount = (riskPerTrade / 100) * input.accountBalance;

    let quantity: number;
    if (input.stopLoss && input.stopLoss !== input.entryPrice) {
      // Риск на единицу
      const riskPerUnit = Math.abs(input.entryPrice - input.stopLoss);
      quantity = riskAmount / riskPerUnit;
    } else {
      // Без stop loss - используем % от капитала
      quantity = (input.accountBalance * (riskPerTrade / 100)) / input.entryPrice;
    }

    const value = quantity * input.entryPrice;

    return {
      quantity,
      value,
      risk: riskPerTrade,
    };
  }

  /**
   * Fixed Ratio Position Sizing
   * Размер позиции увеличивается с ростом капитала
   */
  private fixedRatio(input: PositionSizingInput): { quantity: number; value: number; risk: number } {
    const delta = 5000;  // Увеличение позиции на каждые $5000 прибыли
    const initialContracts = 1;

    // Упрощенная версия
    const contracts = initialContracts + Math.floor(input.accountBalance / 100000) * delta;
    const quantity = contracts;
    const value = quantity * input.entryPrice;

    return {
      quantity,
      value,
      risk: 1,
    };
  }

  /**
   * Kelly Criterion
   * Оптимальный размер позиции на основе win rate и payoff ratio
   */
  private kellyCriterion(input: PositionSizingInput): { quantity: number; value: number; risk: number } {
    // Упрощенный Kelly (нужна история для точного расчета)
    const winRate = 0.55;  // Заглушка - в реальности из истории
    const avgWin = 0.03;   // 3%
    const avgLoss = 0.015; // 1.5%

    const winLossRatio = avgWin / avgLoss;
    const kellyPercent = winRate - (1 - winRate) / winLossRatio;

    // Применяем множитель (обычно 0.25-0.5 для уменьшения волатильности)
    const kellyMultiplier = this.config.kellyMultiplier || 0.25;
    const positionPercent = kellyPercent * kellyMultiplier;

    const value = Math.max(0, positionPercent * input.accountBalance);
    const quantity = value / input.entryPrice;

    return {
      quantity,
      value,
      risk: positionPercent * 100,
    };
  }

  /**
   * Volatility Adjusted Position Sizing
   * Размер позиции обратно пропорционален волатильности
   */
  private volatilityAdjusted(input: PositionSizingInput): { quantity: number; value: number; risk: number } {
    const targetVolatility = this.config.volatilityTarget || 0.02;  // 2% целевая волатильность
    const currentVolatility = input.volatility || 0.02;

    // Корректировка размера позиции
    const volatilityAdjustment = targetVolatility / currentVolatility;
    const basePercent = this.config.riskPerTrade || 1;
    const adjustedPercent = basePercent * volatilityAdjustment;

    const value = (adjustedPercent / 100) * input.accountBalance;
    const quantity = value / input.entryPrice;

    return {
      quantity,
      value,
      risk: adjustedPercent,
    };
  }

  /**
   * Equal Weight
   * Равный вес для всех позиций
   */
  private equalWeight(input: PositionSizingInput): { quantity: number; value: number; risk: number } {
    const maxPositions = 10;  // Заглушка
    const percentPerPosition = 100 / maxPositions;

    const value = (percentPerPosition / 100) * input.accountBalance;
    const quantity = value / input.entryPrice;

    return {
      quantity,
      value,
      risk: percentPerPosition,
    };
  }

  /**
   * Применение ограничений
   */
  private applyConstraints(
    symbol: string,
    side: 'LONG' | 'SHORT',
    quantity: number,
    value: number,
    price: number
  ): { quantity: number; value: number; risk: number } {
    let constrainedQuantity = quantity;
    let constrainedValue = value;

    // Минимальный размер
    if (this.config.minPositionSize) {
      const minValue = this.config.minPositionSize;
      if (constrainedValue < minValue) {
        constrainedQuantity = minValue / price;
        constrainedValue = minValue;
      }
    }

    // Максимальный размер
    if (this.config.maxPositionSize) {
      const maxValue = this.config.maxPositionSize;
      if (constrainedValue > maxValue) {
        constrainedQuantity = maxValue / price;
        constrainedValue = maxValue;
      }
    }

    // Ограничение по % от капитала
    if (this.config.maxPositionSize) {
      const maxPercent = this.config.maxPositionSize / 100;
      // Проверяем в calling code
    }

    return {
      quantity: constrainedQuantity,
      value: constrainedValue,
      risk: (constrainedValue / 100000) * 100,  // Упрощенно
    };
  }

  /**
   * Расчет размера для портфеля с учетом корреляций
   */
  calculatePortfolioSize(
    inputs: PositionSizingInput[],
    correlationMatrix: Map<string, Map<string, number>>
  ): PositionSizingResult[] {
    const results: PositionSizingResult[] = [];

    for (const input of inputs) {
      // Проверка корреляции
      let maxCorrelation = 0;
      if (this.config.considerCorrelation) {
        const correlations = correlationMatrix.get(input.symbol);
        if (correlations) {
          correlations.forEach((corr, symbol) => {
            if (symbol !== input.symbol && Math.abs(corr) > maxCorrelation) {
              maxCorrelation = Math.abs(corr);
            }
          });
        }
      }

      input.correlation = maxCorrelation;
      const result = this.calculateSize(input);
      results.push(result);
    }

    return results;
  }

  /**
   * Оптимизация размера позиции на основе истории
   */
  optimizeFromHistory(
    history: Array<{
      win: boolean;
      return: number;
      drawdown: number;
    }>
  ): {
    optimalRisk: number;
    expectedReturn: number;
    expectedDrawdown: number;
  } {
    // Упрощенная оптимизация
    const winRate = history.filter(h => h.win).length / history.length;
    const avgWin = history.filter(h => h.win).reduce((sum, h) => sum + h.return, 0) / history.filter(h => h.win).length;
    const avgLoss = Math.abs(history.filter(h => !h.win).reduce((sum, h) => sum + h.return, 0) / history.filter(h => !h.win).length);

    const payoffRatio = avgWin / avgLoss;
    const kellyPercent = winRate - (1 - winRate) / payoffRatio;

    const optimalRisk = Math.max(0, kellyPercent * (this.config.kellyMultiplier || 0.25)) * 100;
    const expectedReturn = winRate * avgWin - (1 - winRate) * avgLoss;
    const expectedDrawdown = Math.max(...history.map(h => h.drawdown));

    return {
      optimalRisk,
      expectedReturn,
      expectedDrawdown,
    };
  }
}

/**
 * Factory для создания Position Sizing Manager
 */
export function createPositionSizingManager(
  method: PositionSizingMethod = 'fixed_fractional',
  overrides?: Partial<PositionSizingConfig>
): PositionSizingManager {
  return new PositionSizingManager({
    method,
    riskPerTrade: 1,          // 1% риска на сделку
    kellyMultiplier: 0.25,    // Quarter Kelly
    volatilityTarget: 0.02,   // 2% волатильность
    maxPositionSize: 10,      // 10% макс. на позицию
    minPositionSize: 0.001,
    maxPositionSize: 100,
    considerCorrelation: false,
    maxCorrelatedExposure: 0.5,
    ...overrides,
  });
}
