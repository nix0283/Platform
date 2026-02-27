/**
 * Optimization Module
 * Оптимизация параметров стратегий
 * Основано на: Lean, pybroker
 */

import {
  OptimizationConfig,
  OptimizationMethod,
  OptimizationResult,
  OptimizationReport,
  ParameterSpace,
  WalkForwardConfig,
} from '../types';

export interface BacktestFunction {
  (parameters: Record<string, any>): Promise<{
    totalReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
    totalTrades: number;
    winRate: number;
  }>;
}

export class StrategyOptimizer {
  private config: OptimizationConfig;
  private bestResult: OptimizationResult | null = null;
  private results: OptimizationResult[] = [];
  private iteration: number = 0;

  constructor(config: OptimizationConfig) {
    this.config = config;
  }

  /**
   * Запуск оптимизации
   */
  async optimize(backtestFn: BacktestFunction): Promise<OptimizationReport> {
    const startTime = Date.now();
    this.iteration = 0;
    this.results = [];
    this.bestResult = null;

    let iterations = 0;
    let noImprovementCount = 0;

    while (iterations < this.config.maxIterations) {
      // Проверка времени
      if (Date.now() - startTime > this.config.maxTime) {
        break;
      }

      // Получение следующей точки параметров
      const parameters = this.getNextParameters(iterations);
      
      // Бэктест
      const metrics = await backtestFn(parameters);
      
      // Расчет score
      const score = this.calculateScore(metrics);
      
      const result: OptimizationResult = {
        iteration: iterations,
        parameters,
        metrics: {
          totalReturn: metrics.totalReturn,
          sharpeRatio: metrics.sharpeRatio,
          sortinoRatio: metrics.sharpeRatio * 1.2,  // Упрощенно
          calmarRatio: metrics.totalReturn / (metrics.maxDrawdown || 1),
          maxDrawdown: metrics.maxDrawdown,
          winRate: metrics.winRate,
          profitFactor: metrics.winRate / (1 - metrics.winRate),
          totalTrades: metrics.totalTrades,
          avgTrade: metrics.totalReturn / metrics.totalTrades,
        },
        score,
        timestamp: Date.now(),
      };

      this.results.push(result);

      // Проверка на лучший результат
      if (!this.bestResult || score > this.bestResult.score) {
        this.bestResult = result;
        noImprovementCount = 0;
      } else {
        noImprovementCount++;
      }

      // Early stopping
      if (this.config.earlyStopping && noImprovementCount >= this.config.patience) {
        break;
      }

      iterations++;
      this.iteration = iterations;
    }

    return this.generateReport(startTime);
  }

  /**
   * Получение следующей точки параметров
   */
  private getNextParameters(iteration: number): Record<string, any> {
    const parameters: Record<string, any> = {};

    switch (this.config.method) {
      case 'grid_search':
        return this.gridSearchParameters(iteration);
      case 'random_search':
        return this.randomSearchParameters();
      case 'bayesian':
        return this.bayesianParameters(iteration);
      case 'genetic':
        return this.geneticParameters(iteration);
      default:
        return this.randomSearchParameters();
    }
  }

  /**
   * Grid Search
   */
  private gridSearchParameters(iteration: number): Record<string, any> {
    const parameters: Record<string, any> = {};
    const totalCombinations = this.calculateTotalCombinations();
    const index = iteration % totalCombinations;

    let remaining = index;
    for (const param of this.config.parameterSpace) {
      if (param.type === 'continuous' || param.type === 'discrete') {
        const steps = param.step ? Math.floor((param.max! - param.min!) / param.step) + 1 : 10;
        const stepIndex = remaining % steps;
        remaining = Math.floor(remaining / steps);
        
        parameters[param.name] = param.min! + stepIndex * (param.step || ((param.max! - param.min!) / steps));
      } else if (param.type === 'categorical' && param.values) {
        const valueIndex = remaining % param.values.length;
        remaining = Math.floor(remaining / param.values.length);
        parameters[param.name] = param.values[valueIndex];
      }
    }

    return parameters;
  }

  /**
   * Random Search
   */
  private randomSearchParameters(): Record<string, any> {
    const parameters: Record<string, any> = {};

    for (const param of this.config.parameterSpace) {
      if (param.type === 'continuous') {
        if (param.logScale) {
          const logMin = Math.log(param.min!);
          const logMax = Math.log(param.max!);
          parameters[param.name] = Math.exp(logMin + Math.random() * (logMax - logMin));
        } else {
          parameters[param.name] = param.min! + Math.random() * (param.max! - param.min!);
        }
      } else if (param.type === 'discrete') {
        const steps = param.step ? Math.floor((param.max! - param.min!) / param.step) + 1 : 10;
        const stepIndex = Math.floor(Math.random() * steps);
        parameters[param.name] = param.min! + stepIndex * (param.step || ((param.max! - param.min!) / steps));
      } else if (param.type === 'categorical' && param.values) {
        parameters[param.name] = param.values[Math.floor(Math.random() * param.values.length)];
      }
    }

    return parameters;
  }

  /**
   * Bayesian Optimization (упрощенная)
   */
  private bayesianParameters(iteration: number): Record<string, any> {
    // Первые итерации - random search для exploration
    if (iteration < 10 || this.results.length < 10) {
      return this.randomSearchParameters();
    }

    // Затем - exploitation вокруг лучших точек
    const topResults = this.results
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    const parameters: Record<string, any> = {};

    for (const param of this.config.parameterSpace) {
      const topValues = topResults.map(r => r.parameters[param.name]).filter(v => v !== undefined);
      
      if (topValues.length === 0) {
        // Fallback на random
        if (param.type === 'continuous' && param.min !== undefined && param.max !== undefined) {
          parameters[param.name] = param.min + Math.random() * (param.max - param.min);
        } else if (param.values) {
          parameters[param.name] = param.values[Math.floor(Math.random() * param.values.length)];
        }
        continue;
      }

      // Sample вокруг лучших значений
      const mean = topValues.reduce((sum, v) => sum + v, 0) / topValues.length;
      const std = Math.sqrt(topValues.map(v => Math.pow(v - mean, 2)).reduce((sum, v) => sum + v, 0) / topValues.length);
      
      if (param.type === 'continuous') {
        const sample = this.gaussianRandom(mean, std || (param.max! - param.min!) / 10);
        parameters[param.name] = Math.max(param.min!, Math.min(param.max!, sample));
      } else {
        parameters[param.name] = mean;
      }
    }

    return parameters;
  }

  /**
   * Genetic Algorithm (упрощенный)
   */
  private geneticParameters(iteration: number): Record<string, any> {
    // Первые итерации - random population
    if (iteration < 20) {
      return this.randomSearchParameters();
    }

    // Selection - берем топ 20%
    const populationSize = 20;
    const topResults = this.results
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.ceil(populationSize * 0.2));

    // Crossover - смешиваем параметры лучших
    const parent1 = topResults[Math.floor(Math.random() * topResults.length)];
    const parent2 = topResults[Math.floor(Math.random() * topResults.length)];

    const parameters: Record<string, any> = {};

    for (const param of this.config.parameterSpace) {
      const value1 = parent1.parameters[param.name];
      const value2 = parent2.parameters[param.name];

      if (value1 === undefined || value2 === undefined) {
        continue;
      }

      // Crossover
      if (Math.random() > 0.5) {
        parameters[param.name] = value1;
      } else {
        parameters[param.name] = value2;
      }

      // Mutation
      if (Math.random() < 0.1 && param.type === 'continuous') {
        const mutation = (Math.random() - 0.5) * (param.max! - param.min!) * 0.1;
        parameters[param.name] += mutation;
        parameters[param.name] = Math.max(param.min!, Math.min(param.max!, parameters[param.name]));
      }
    }

    return parameters;
  }

  /**
   * Расчет score для оптимизации
   */
  private calculateScore(metrics: OptimizationResult['metrics']): number {
    switch (this.config.objective) {
      case 'sharpe':
        return metrics.sharpeRatio;
      case 'sortino':
        return metrics.sortinoRatio;
      case 'calmar':
        return metrics.calmarRatio;
      case 'total_return':
        return metrics.totalReturn;
      case 'profit_factor':
        return metrics.profitFactor;
      default:
        return metrics.sharpeRatio;
    }
  }

  /**
   * Проверка ограничений
   */
  private checkConstraints(metrics: OptimizationResult['metrics']): boolean {
    for (const constraint of this.config.constraints) {
      let value: number;
      
      switch (constraint.type) {
        case 'max_drawdown':
          value = metrics.maxDrawdown;
          break;
        case 'min_trades':
          value = metrics.totalTrades;
          break;
        case 'max_volatility':
          value = 1 / metrics.sharpeRatio;  // Упрощенно
          break;
        case 'sharpe_ratio':
          value = metrics.sharpeRatio;
          break;
        default:
          continue;
      }

      let satisfied = false;
      switch (constraint.operator) {
        case '<':
          satisfied = value < constraint.value;
          break;
        case '>':
          satisfied = value > constraint.value;
          break;
        case '<=':
          satisfied = value <= constraint.value;
          break;
        case '>=':
          satisfied = value >= constraint.value;
          break;
        case '==':
          satisfied = Math.abs(value - constraint.value) < 0.01;
          break;
      }

      if (!satisfied) return false;
    }

    return true;
  }

  /**
   * Генерация отчета
   */
  private generateReport(startTime: number): OptimizationReport {
    const topResults = this.results
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    // Parameter importance (упрощенно - variance analysis)
    const parameterImportance: Record<string, number> = {};
    for (const param of this.config.parameterSpace) {
      const values = this.results.map(r => r.parameters[param.name]).filter(v => v !== undefined);
      if (values.length > 0) {
        const variance = values.map(v => Math.pow(v - values.reduce((a, b) => a + b, 0) / values.length, 2)).reduce((a, b) => a + b, 0) / values.length;
        parameterImportance[param.name] = variance;
      }
    }

    return {
      totalIterations: this.iteration,
      bestResult: this.bestResult!,
      topResults,
      parameterImportance,
      convergenceHistory: this.results.map(r => r.score),
      optimizationTime: Date.now() - startTime,
      method: this.config.method,
    };
  }

  /**
   * Расчет общего количества комбинаций для grid search
   */
  private calculateTotalCombinations(): number {
    let total = 1;
    for (const param of this.config.parameterSpace) {
      if (param.type === 'continuous' || param.type === 'discrete') {
        const steps = param.step ? Math.floor((param.max! - param.min!) / param.step) + 1 : 10;
        total *= steps;
      } else if (param.type === 'categorical' && param.values) {
        total *= param.values.length;
      }
    }
    return total;
  }

  /**
   * Gaussian random number generator
   */
  private gaussianRandom(mean: number, std: number): number {
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z * std;
  }

  /**
   * Получение текущего лучшего результата
   */
  getBestResult(): OptimizationResult | null {
    return this.bestResult;
  }

  /**
   * Получение всех результатов
   */
  getAllResults(): OptimizationResult[] {
    return [...this.results];
  }

  /**
   * Сброс состояния
   */
  reset(): void {
    this.iteration = 0;
    this.results = [];
    this.bestResult = null;
  }
}

/**
 * Factory для создания Strategy Optimizer
 */
export function createStrategyOptimizer(
  method: OptimizationMethod = 'bayesian',
  parameterSpace: ParameterSpace[] = [],
  overrides?: Partial<OptimizationConfig>
): StrategyOptimizer {
  return new StrategyOptimizer({
    method,
    parameterSpace,
    maxIterations: 100,
    maxTime: 3600000,  // 1 час
    objective: 'sharpe',
    constraints: [],
    earlyStopping: true,
    patience: 20,
    ...overrides,
  });
}
