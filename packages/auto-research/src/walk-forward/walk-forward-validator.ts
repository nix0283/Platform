/**
 * Walk-Forward Validation Module
 * Валидация стратегий на скользящих окнах
 * Основано на: financial-machine-learning, Lean
 */

import {
  WalkForwardConfig,
  WalkForwardFold,
  WalkForwardMetrics,
  WalkForwardReport,
} from '../types';

export interface BacktestResult {
  totalReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  totalTrades: number;
  winRate: number;
  profitFactor: number;
}

export interface BacktestFunction {
  (startDate: number, endDate: number, parameters: Record<string, any>): Promise<BacktestResult>;
}

export class WalkForwardValidator {
  private config: WalkForwardConfig;
  private folds: WalkForwardFold[] = [];
  private isComplete: boolean = false;

  constructor(config: WalkForwardConfig) {
    this.config = config;
  }

  /**
   * Запуск walk-forward валидации
   */
  async validate(
    startDate: number,
    endDate: number,
    parameters: Record<string, any>,
    backtestFn: BacktestFunction
  ): Promise<WalkForwardReport> {
    this.folds = [];
    this.isComplete = false;

    const totalDays = (endDate - startDate) / (1000 * 60 * 60 * 24);
    let currentStart = startDate;
    let foldIndex = 0;

    while (currentStart < endDate) {
      // Расчет периодов
      const trainingEnd = currentStart + this.config.trainingPeriod * 24 * 60 * 60 * 1000;
      const validationEnd = trainingEnd + this.config.validationPeriod * 24 * 60 * 60 * 1000;
      const testEnd = validationEnd + this.config.testPeriod * 24 * 60 * 60 * 1000;

      if (testEnd > endDate) {
        break;  // Недостаточно данных для полного fold
      }

      // Проверка минимального количества training samples
      const trainingDays = (trainingEnd - currentStart) / (1000 * 60 * 60 * 24);
      if (trainingDays < this.config.minTrainingSamples) {
        currentStart += this.config.stepSize * 24 * 60 * 60 * 1000;
        continue;
      }

      // Бэктест на training периоде
      const trainingResult = await backtestFn(currentStart, trainingEnd, parameters);
      
      // Бэктест на validation периоде
      const validationResult = await backtestFn(trainingEnd, validationEnd, parameters);
      
      // Бэктест на test периоде
      const testResult = await backtestFn(validationEnd, testEnd, parameters);

      // Расчет метрик fold
      const metrics: WalkForwardMetrics = {
        trainingReturn: trainingResult.totalReturn,
        validationReturn: validationResult.totalReturn,
        testReturn: testResult.totalReturn,
        trainingSharpe: trainingResult.sharpeRatio,
        validationSharpe: validationResult.sharpeRatio,
        testSharpe: testResult.sharpeRatio,
        trainingDrawdown: trainingResult.maxDrawdown,
        validationDrawdown: validationResult.maxDrawdown,
        testDrawdown: testResult.maxDrawdown,
        stability: this.calculateStability([
          trainingResult.sharpeRatio,
          validationResult.sharpeRatio,
          testResult.sharpeRatio,
        ]),
        overfittingScore: this.calculateOverfittingScore(trainingResult, validationResult, testResult),
      };

      const fold: WalkForwardFold = {
        foldIndex,
        trainingStart: currentStart,
        trainingEnd,
        validationStart: trainingEnd,
        validationEnd,
        testStart: validationEnd,
        testEnd,
        metrics,
      };

      this.folds.push(fold);
      foldIndex++;

      // Сдвиг окна
      if (this.config.expandTraining) {
        currentStart = startDate;  // Расширяем training set
      } else {
        currentStart += this.config.stepSize * 24 * 60 * 60 * 1000;
      }
    }

    this.isComplete = true;
    return this.generateReport();
  }

  /**
   * Расчет стабильности между периодами
   */
  private calculateStability(values: number[]): number {
    if (values.length < 2) return 1;

    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const std = Math.sqrt(values.map(v => Math.pow(v - mean, 2)).reduce((sum, v) => sum + v, 0) / values.length);
    
    // Коэффициент вариации (чем меньше, тем стабильнее)
    const cv = mean !== 0 ? std / Math.abs(mean) : 1;
    
    // Конвертируем в stability score (0-1, где 1 = идеально стабильно)
    return Math.max(0, 1 - cv);
  }

  /**
   * Расчет score переобучения
   */
  private calculateOverfittingScore(
    training: BacktestResult,
    validation: BacktestResult,
    test: BacktestResult
  ): number {
    // Разница между training и test performance
    const returnDiff = Math.abs(training.totalReturn - test.totalReturn);
    const sharpeDiff = Math.abs(training.sharpeRatio - test.sharpeRatio);
    const drawdownDiff = Math.abs(training.maxDrawdown - test.maxDrawdown);

    // Нормализованный score (0 = нет переобучения, 1 = сильное переобучение)
    const score = (returnDiff + sharpeDiff * 10 + drawdownDiff * 10) / 3;
    
    return Math.min(1, score);
  }

  /**
   * Генерация отчета
   */
  private generateReport(): WalkForwardReport {
    if (!this.isComplete || this.folds.length === 0) {
      return {
        totalFolds: 0,
        completedFolds: 0,
        avgTestReturn: 0,
        avgTestSharpe: 0,
        avgTestDrawdown: 0,
        stabilityScore: 0,
        overfittingDetected: false,
        folds: [],
        recommendations: ['Недостаточно данных для валидации'],
      };
    }

    // Агрегация метрик
    const testReturns = this.folds.map(f => f.metrics.testReturn);
    const testSharpes = this.folds.map(f => f.metrics.testSharpe);
    const testDrawdowns = this.folds.map(f => f.metrics.testDrawdown);
    const stabilities = this.folds.map(f => f.metrics.stability);
    const overfittingScores = this.folds.map(f => f.metrics.overfittingScore);

    const avgTestReturn = testReturns.reduce((sum, v) => sum + v, 0) / testReturns.length;
    const avgTestSharpe = testSharpes.reduce((sum, v) => sum + v, 0) / testSharpes.length;
    const avgTestDrawdown = testDrawdowns.reduce((sum, v) => sum + v, 0) / testDrawdowns.length;
    const avgStability = stabilities.reduce((sum, v) => sum + v, 0) / stabilities.length;
    const avgOverfitting = overfittingScores.reduce((sum, v) => sum + v, 0) / overfittingScores.length;

    // Обнаружение переобучения
    const overfittingDetected = avgOverfitting > 0.3 || avgStability < 0.5;

    // Рекомендации
    const recommendations: string[] = [];
    
    if (avgTestSharpe < 1) {
      recommendations.push('Низкий Sharpe ratio. Рассмотрите другие параметры или стратегию.');
    }
    
    if (avgTestDrawdown > 0.2) {
      recommendations.push('Высокая просадка. Увеличьте stop loss или уменьшите размер позиции.');
    }
    
    if (avgStability < 0.5) {
      recommendations.push('Низкая стабильность между периодами. Стратегия может быть переобучена.');
    }
    
    if (avgOverfitting > 0.3) {
      recommendations.push('Признаки переобучения. Упростите стратегию или увеличьте данные для обучения.');
    }
    
    if (testReturns.filter(r => r > 0).length / testReturns.length < 0.6) {
      recommendations.push('Менее 60% прибыльных периодов. Рассмотрите другую стратегию.');
    }

    if (recommendations.length === 0) {
      recommendations.push('Стратегия показывает хорошие результаты. Рекомендуется демо-трейдинг.');
    }

    return {
      totalFolds: this.folds.length,
      completedFolds: this.folds.length,
      avgTestReturn,
      avgTestSharpe,
      avgTestDrawdown,
      stabilityScore: avgStability,
      overfittingDetected,
      folds: this.folds,
      recommendations,
    };
  }

  /**
   * Получение промежуточных результатов
   */
  getPartialReport(): WalkForwardReport | null {
    if (this.folds.length === 0) return null;
    return this.generateReport();
  }

  /**
   * Статус валидации
   */
  getStatus(): {
    isComplete: boolean;
    completedFolds: number;
    currentFold: number;
  } {
    return {
      isComplete: this.isComplete,
      completedFolds: this.folds.length,
      currentFold: this.folds.length,
    };
  }

  /**
   * Сброс состояния
   */
  reset(): void {
    this.folds = [];
    this.isComplete = false;
  }
}

/**
 * Factory для создания Walk-Forward Validator
 */
export function createWalkForwardValidator(overrides?: Partial<WalkForwardConfig>): WalkForwardValidator {
  return new WalkForwardValidator({
    trainingPeriod: 180,      // 6 месяцев обучения
    validationPeriod: 30,     // 1 месяц валидации
    testPeriod: 30,           // 1 месяц теста
    stepSize: 30,             // Шаг 30 дней
    minTrainingSamples: 90,   // Мин. 3 месяца данных
    expandTraining: false,    // Не расширять training set
    ...overrides,
  });
}
