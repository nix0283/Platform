/**
 * Auto-Research Manager
 * Главный модуль авто-исследования и оптимизации
 * Объединяет: AutoML, Optimization, Walk-Forward, Demo Trading, Auto-Deployment
 */

import {
  AutoResearchConfig,
  AutoResearchState,
  AutoResearchReport,
  AutoResearchEvent,
  ResearchTarget,
  DeploymentStatus,
} from '../types';
import { AutoMLEngine } from '../automl/automl-engine';
import { StrategyOptimizer } from '../optimization/strategy-optimizer';
import { WalkForwardValidator } from '../walk-forward/walk-forward-validator';
import { DemoTradingManager } from '../demo-trading/demo-trading-manager';

export class AutoResearchManager {
  private config: AutoResearchConfig;
  private state: AutoResearchState;
  
  private automl?: AutoMLEngine;
  private optimizer?: StrategyOptimizer;
  private walkForward?: WalkForwardValidator;
  private demoTrading?: DemoTradingManager;
  
  private eventListeners: Set<(event: AutoResearchEvent) => void> = new Set();
  private researchInterval?: NodeJS.Timeout;

  constructor(config: AutoResearchConfig) {
    this.config = config;
    
    this.state = {
      enabled: config.enabled,
      currentPhase: 'research',
      progress: 0,
      activeStrategies: 0,
      completedStrategies: 0,
      bestStrategy: null,
      demoState: null,
      deploymentStatus: null,
      lastUpdate: Date.now(),
    };
  }

  /**
   * Запуск авто-исследования
   */
  async start(target: ResearchTarget): Promise<void> {
    if (!this.config.enabled) {
      throw new Error('Auto-research is disabled');
    }

    this.state.enabled = true;
    this.state.currentPhase = 'research';
    this.state.progress = 0;

    // Инициализация компонентов
    this.automl = new AutoMLEngine(this.config.automl);
    this.optimizer = new StrategyOptimizer(this.config.optimization);
    this.walkForward = new WalkForwardValidator(this.config.walkForward);
    this.demoTrading = createDemoTradingManager(
      this.config.demoTrading.duration,
      this.config.demoTrading
    );

    this.emit({ type: 'research_started', target });

    // Запуск исследования
    await this.runResearchCycle(target);
  }

  /**
   * Остановка авто-исследования
   */
  stop(): void {
    this.state.enabled = false;
    
    if (this.researchInterval) {
      clearInterval(this.researchInterval);
    }
    
    if (this.demoTrading) {
      this.demoTrading.stop('Stopped by user');
    }
  }

  /**
   * Запуск цикла исследования
   */
  private async runResearchCycle(target: ResearchTarget): Promise<void> {
    try {
      // Фаза 1: AutoML исследование
      await this.runAutoMLPhase();
      
      // Фаза 2: Оптимизация параметров
      await this.runOptimizationPhase();
      
      // Фаза 3: Walk-Forward валидация
      await this.runWalkForwardPhase();
      
      // Фаза 4: Демо-трейдинг
      await this.runDemoTradingPhase();
      
      // Фаза 5: Auto-deployment (если готово)
      if (this.state.demoState?.deploymentReady) {
        await this.runDeploymentPhase();
      }
      
    } catch (error) {
      console.error('Error in research cycle:', error);
      this.state.currentPhase = 'research';
    }
  }

  /**
   * Фаза 1: AutoML
   */
  private async runAutoMLPhase(): Promise<void> {
    this.state.currentPhase = 'research';
    this.state.progress = 10;

    if (!this.automl) return;

    // Генерация training данных (в реальном implementation - из рынка)
    const trainingData = this.generateTrainingData();
    
    // Обучение моделей
    const performances = await this.automl.train(trainingData);
    
    // Получение лучшей модели
    const bestModel = this.automl.getBestModel('sharpe');
    
    if (bestModel) {
      this.state.bestStrategy = {
        id: bestModel.id,
        expectedReturn: bestModel.performance.sharpeRatio * 10,  // Упрощенно
        sharpeRatio: bestModel.performance.sharpeRatio,
        confidence: bestModel.performance.directionalAccuracy,
      };
    }

    this.emit({
      type: 'model_trained',
      modelId: bestModel?.id || '',
      performance: bestModel?.performance || {
        modelId: '',
        modelType: 'linear_regression',
        mae: 0,
        mse: 0,
        rmse: 0,
        mape: 0,
        directionalAccuracy: 0,
        sharpeRatio: 0,
        informationCoefficient: 0,
      },
    });

    this.state.progress = 30;
  }

  /**
   * Фаза 2: Оптимизация
   */
  private async runOptimizationPhase(): Promise<void> {
    this.state.currentPhase = 'optimization';
    this.state.progress = 40;

    if (!this.optimizer) return;

    // Бэктест функция (в реальном implementation - реальный бэктест)
    const backtestFn = async (parameters: Record<string, any>) => {
      // Симуляция бэктеста
      return {
        totalReturn: Math.random() * 50 - 10,
        sharpeRatio: Math.random() * 3,
        maxDrawdown: Math.random() * 20,
        totalTrades: Math.floor(Math.random() * 100) + 10,
        winRate: 0.4 + Math.random() * 0.3,
      };
    };

    this.emit({ type: 'optimization_started', strategyId: this.state.bestStrategy?.id || '' });

    // Запуск оптимизации
    const report = await this.optimizer.optimize(backtestFn);

    this.emit({ type: 'optimization_completed', result: report });

    this.state.progress = 60;
  }

  /**
   * Фаза 3: Walk-Forward валидация
   */
  private async runWalkForwardPhase(): Promise<void> {
    this.state.currentPhase = 'validation';
    this.state.progress = 70;

    if (!this.walkForward) return;

    this.emit({ type: 'walk_forward_started', strategyId: this.state.bestStrategy?.id || '' });

    // Бэктест функция для walk-forward
    const backtestFn = async (startDate: number, endDate: number, parameters: Record<string, any>) => {
      return {
        totalReturn: Math.random() * 20 - 5,
        sharpeRatio: Math.random() * 2,
        maxDrawdown: Math.random() * 15,
        totalTrades: Math.floor(Math.random() * 50) + 5,
        winRate: 0.45 + Math.random() * 0.25,
        profitFactor: 1 + Math.random() * 2,
      };
    };

    const now = Date.now();
    const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000;

    const report = await this.walkForward.validate(
      oneYearAgo,
      now,
      {},
      backtestFn
    );

    this.emit({ type: 'walk_forward_completed', report });

    this.state.progress = 80;
  }

  /**
   * Фаза 4: Демо-трейдинг
   */
  private async runDemoTradingPhase(): Promise<void> {
    this.state.currentPhase = 'demo';
    this.state.progress = 90;

    if (!this.demoTrading) return;

    this.emit({ type: 'demo_trading_started', strategyId: this.state.bestStrategy?.id || '' });

    // Запуск демо-трейдинга
    this.demoTrading.start();

    // Мониторинг демо-трейдинга
    const checkInterval = setInterval(() => {
      const state = this.demoTrading!.getState();
      this.state.demoState = state;

      if (state.status === 'completed' || state.status === 'failed') {
        clearInterval(checkInterval);
        
        const report = this.demoTrading!.generateReport('total');
        this.emit({ type: 'demo_trading_completed', report });

        if (state.deploymentReady) {
          this.state.progress = 95;
        }
      }
    }, 60000);  // Проверка каждую минуту
  }

  /**
   * Фаза 5: Auto-deployment
   */
  private async runDeploymentPhase(): Promise<void> {
    this.state.currentPhase = 'deployment';
    this.state.progress = 100;

    const deploymentStatus: DeploymentStatus = {
      currentStage: 'production',
      deployedAt: Date.now(),
      strategy: {
        id: this.state.bestStrategy?.id || '',
        name: 'Auto-Researched Strategy',
        parameters: {},
      },
      performance: {
        totalReturn: this.state.demoState?.totalReturn || 0,
        sharpeRatio: this.state.demoState?.sharpeRatio || 0,
        maxDrawdown: this.state.demoState?.maxDrawdown || 0,
        totalTrades: this.state.demoState?.totalTrades || 0,
      },
      riskStatus: 'normal',
      capitalAllocated: 10000,
      capitalAtRisk: 1000,
      alerts: [],
      autoStopTriggered: false,
    };

    this.state.deploymentStatus = deploymentStatus;

    this.emit({ type: 'strategy_deployed', deploymentStatus });
  }

  /**
   * Генерация training данных (заглушка)
   */
  private generateTrainingData(): any {
    // В реальном implementation здесь были бы реальные рыночные данные
    const timestamps = Array.from({ length: 1000 }, (_, i) => 
      Date.now() - (1000 - i) * 24 * 60 * 60 * 1000
    );
    
    const values = timestamps.map((_, i) => 50000 + Math.random() * 10000 - 5000);
    
    return {
      symbol: 'BTC/USDT',
      timestamps,
      values,
      features: {
        returns: values.map((v, i) => i > 0 ? (v - values[i - 1]) / values[i - 1] : 0),
        volatility: values.map(() => Math.random() * 0.05),
        volume: values.map(() => Math.random() * 1000),
      },
    };
  }

  /**
   * Получение состояния
   */
  getState(): AutoResearchState {
    return { ...this.state };
  }

  /**
   * Генерация отчета
   */
  generateReport(period: 'weekly' | 'monthly' | 'quarterly'): AutoResearchReport {
    const now = Date.now();
    const startDate = period === 'weekly' 
      ? now - 7 * 24 * 60 * 60 * 1000
      : period === 'monthly'
      ? now - 30 * 24 * 60 * 60 * 1000
      : now - 90 * 24 * 60 * 60 * 1000;

    const demoReport = this.demoTrading?.generateReport('total') || null;

    return {
      period,
      startDate,
      endDate: now,
      strategiesResearched: this.state.completedStrategies,
      strategiesOptimized: this.state.completedStrategies,
      strategiesValidated: this.state.completedStrategies,
      strategiesDeployed: this.state.deploymentStatus ? 1 : 0,
      bestStrategy: this.state.bestStrategy ? {
        id: this.state.bestStrategy.id,
        return: this.state.bestStrategy.expectedReturn,
        sharpeRatio: this.state.bestStrategy.sharpeRatio,
        maxDrawdown: this.state.demoState?.maxDrawdown || 0,
      } : {
        id: '',
        return: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
      },
      demoPerformance: demoReport,
      deploymentPerformance: this.state.deploymentStatus ? {
        return: this.state.deploymentStatus.performance.totalReturn,
        sharpeRatio: this.state.deploymentStatus.performance.sharpeRatio,
        maxDrawdown: this.state.deploymentStatus.performance.maxDrawdown,
      } : null,
      recommendations: this.generateRecommendations(),
      nextSteps: this.generateNextSteps(),
    };
  }

  /**
   * Генерация рекомендаций
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    if (!this.state.bestStrategy) {
      recommendations.push('Не найдено подходящих стратегий. Увеличьте параметры исследования.');
    }

    if (this.state.demoState && !this.state.demoState.deploymentReady) {
      recommendations.push('Демо-трейдинг не завершен. Продолжайте мониторинг.');
    }

    if (this.state.deploymentStatus) {
      recommendations.push('Стратегия deployed. Мониторьте performance.');
    }

    return recommendations;
  }

  /**
   * Генерация следующих шагов
   */
  private generateNextSteps(): string[] {
    const nextSteps: string[] = [];

    switch (this.state.currentPhase) {
      case 'research':
        nextSteps.push('Завершить AutoML исследование');
        break;
      case 'optimization':
        nextSteps.push('Завершить оптимизацию параметров');
        break;
      case 'validation':
        nextSteps.push('Завершить walk-forward валидацию');
        break;
      case 'demo':
        nextSteps.push('Завершить демо-трейдинг');
        break;
      case 'deployment':
        nextSteps.push('Мониторить production performance');
        break;
    }

    return nextSteps;
  }

  /**
   * Подписка на события
   */
  onEvent(listener: (event: AutoResearchEvent) => void): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  /**
   * Emit события
   */
  private emit(event: AutoResearchEvent): void {
    this.eventListeners.forEach(listener => listener(event));
  }

  /**
   * Экспорт данных
   */
  exportData(): {
    state: AutoResearchState;
    config: AutoResearchConfig;
    demoData?: any;
  } {
    return {
      state: this.getState(),
      config: { ...this.config },
      demoData: this.demoTrading?.exportData(),
    };
  }

  /**
   * Сброс состояния
   */
  reset(): void {
    this.stop();
    
    this.state = {
      enabled: false,
      currentPhase: 'research',
      progress: 0,
      activeStrategies: 0,
      completedStrategies: 0,
      bestStrategy: null,
      demoState: null,
      deploymentStatus: null,
      lastUpdate: Date.now(),
    };

    this.automl?.reset();
    this.optimizer?.reset();
    this.walkForward?.reset();
    this.demoTrading?.reset();
  }
}

/**
 * Factory для создания Auto-Research Manager
 */
export function createAutoResearchManager(overrides?: Partial<AutoResearchConfig>): AutoResearchManager {
  return new AutoResearchManager({
    target: {
      targetReturn: 10,
      targetPeriod: 'month',
      maxDrawdown: 15,
      minSharpeRatio: 1.5,
      minWinRate: 0.5,
      maxVolatility: 0.1,
      minTrades: 30,
      maxPositions: 5,
      allowedSymbols: ['BTC/USDT', 'ETH/USDT'],
      allowedTimeframes: ['1h', '4h'],
      priority: 'sharpe',
    },
    automl: {
      models: [],
      maxModels: 10,
      validationMethod: 'walk_forward',
      cvFolds: 5,
      featureSelection: true,
      hyperparameterTuning: true,
      ensembleMethod: 'weighted',
    },
    optimization: {
      method: 'bayesian',
      parameterSpace: [],
      maxIterations: 100,
      maxTime: 3600000,
      objective: 'sharpe',
      constraints: [],
      earlyStopping: true,
      patience: 20,
    },
    walkForward: {
      trainingPeriod: 180,
      validationPeriod: 30,
      testPeriod: 30,
      stepSize: 30,
      minTrainingSamples: 90,
      expandTraining: false,
    },
    demoTrading: {
      duration: 90,
      targetPeriod: 'quarter',
      paperTrading: true,
      realTimeData: true,
      autoReporting: true,
      reportInterval: 86400000,
      successCriteria: {
        minReturn: 5,
        maxDrawdown: 10,
        minSharpeRatio: 1.5,
        minTrades: 30,
      },
      autoDeploy: true,
      deploymentThreshold: 0.75,
    },
    deployment: {
      autoDeploy: true,
      stages: ['research', 'demo', 'staging', 'production'],
      requirements: {
        demo: { minReturn: 5, maxDrawdown: 10, minSharpeRatio: 1.5, minDays: 30 },
        staging: { minReturn: 5, maxDrawdown: 10, minSharpeRatio: 1.5, minDays: 14 },
        production: { minReturn: 5, maxDrawdown: 10, minSharpeRatio: 1.5, minDays: 7 },
      },
      productionLimits: {
        maxCapital: 100000,
        maxPositionSize: 10,
        maxDailyLoss: 2,
        maxDrawdown: 10,
      },
      monitoring: {
        enabled: true,
        alertThreshold: 0.8,
        autoStop: true,
        autoStopThreshold: 0.5,
      },
    },
    enabled: true,
    parallelResearch: true,
    maxConcurrentStrategies: 5,
    ...overrides,
  });
}
