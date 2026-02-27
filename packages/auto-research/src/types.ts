/**
 * Типы для системы авто-исследования и оптимизации
 * Основано на: neuralforecast, Lean, pybroker, financial-machine-learning
 */

// ============================================
// RESEARCH TARGET TYPES
// ============================================

export type TargetPeriod = 'week' | 'month' | 'quarter' | 'year';

export interface ResearchTarget {
  targetReturn: number;         // Целевой return (%)
  targetPeriod: TargetPeriod;   // Период цели
  maxDrawdown: number;          // Макс. просадка (%)
  minSharpeRatio: number;       // Мин. Sharpe ratio
  minWinRate: number;           // Мин. win rate
  maxVolatility: number;        // Макс. волатильность (%)
  
  // Ограничения
  minTrades: number;            // Мин. количество сделок
  maxPositions: number;         // Макс. одновременных позиций
  allowedSymbols: string[];     // Разрешенные символы
  allowedTimeframes: string[];  // Разрешенные таймфреймы
  
  // Приоритеты
  priority: 'return' | 'sharpe' | 'drawdown' | 'win_rate';
}

// ============================================
// AUTOML TYPES
// ============================================

export type ModelType =
  | 'linear_regression'
  | 'random_forest'
  | 'xgboost'
  | 'lightgbm'
  | 'lstm'
  | 'gru'
  | 'transformer'
  | 'prophet'
  | 'neural_forecast'
  | 'chronos';

export interface ModelConfig {
  type: ModelType;
  parameters: Record<string, number | boolean | string>;
  horizons: number[];           // Горизонты прогнозирования
  features: string[];           // Используемые фичи
}

export interface ModelPrediction {
  symbol: string;
  timestamp: number;
  horizon: number;
  prediction: number;
  confidence: number;
  upperBound: number;
  lowerBound: number;
  modelType: ModelType;
  modelId: string;
}

export interface ModelPerformance {
  modelId: string;
  modelType: ModelType;
  mae: number;                  // Mean Absolute Error
  mse: number;                  // Mean Squared Error
  rmse: number;                 // Root MSE
  mape: number;                 // Mean Absolute Percentage Error
  directionalAccuracy: number;  // % правильных направлений
  sharpeRatio: number;
  informationCoefficient: number;
}

export interface AutoMLConfig {
  models: ModelConfig[];
  maxModels: number;
  validationMethod: 'kfold' | 'walk_forward' | 'expanding';
  cvFolds: number;
  featureSelection: boolean;
  hyperparameterTuning: boolean;
  ensembleMethod: 'average' | 'weighted' | 'stacking' | 'best';
}

// ============================================
// OPTIMIZATION TYPES
// ============================================

export type OptimizationMethod =
  | 'grid_search'
  | 'random_search'
  | 'bayesian'
  | 'genetic'
  | 'particle_swarm'
  | 'simulated_annealing';

export interface ParameterSpace {
  name: string;
  type: 'continuous' | 'discrete' | 'categorical';
  min?: number;
  max?: number;
  values?: any[];
  step?: number;
  logScale?: boolean;
}

export interface OptimizationConfig {
  method: OptimizationMethod;
  parameterSpace: ParameterSpace[];
  maxIterations: number;
  maxTime: number;              // Макс. время оптимизации (мс)
  objective: 'sharpe' | 'sortino' | 'calmar' | 'total_return' | 'profit_factor';
  constraints: OptimizationConstraint[];
  earlyStopping: boolean;
  patience: number;
}

export interface OptimizationConstraint {
  type: 'max_drawdown' | 'min_trades' | 'max_volatility' | 'sharpe_ratio';
  operator: '<' | '>' | '<=' | '>=' | '==';
  value: number;
}

export interface OptimizationResult {
  iteration: number;
  parameters: Record<string, any>;
  metrics: {
    totalReturn: number;
    sharpeRatio: number;
    sortinoRatio: number;
    calmarRatio: number;
    maxDrawdown: number;
    winRate: number;
    profitFactor: number;
    totalTrades: number;
    avgTrade: number;
  };
  score: number;
  timestamp: number;
}

export interface OptimizationReport {
  totalIterations: number;
  bestResult: OptimizationResult;
  topResults: OptimizationResult[];
  parameterImportance: Record<string, number>;
  convergenceHistory: number[];
  optimizationTime: number;
  method: OptimizationMethod;
}

// ============================================
// WALK-FORWARD TYPES
// ============================================

export interface WalkForwardConfig {
  trainingPeriod: number;       // Дней для обучения
  validationPeriod: number;     // Дней для валидации
  testPeriod: number;           // Дней для теста
  stepSize: number;             // Шаг сдвига (дней)
  minTrainingSamples: number;
  expandTraining: boolean;      // Расширять training set
}

export interface WalkForwardFold {
  foldIndex: number;
  trainingStart: number;
  trainingEnd: number;
  validationStart: number;
  validationEnd: number;
  testStart: number;
  testEnd: number;
  metrics: WalkForwardMetrics;
}

export interface WalkForwardMetrics {
  trainingReturn: number;
  validationReturn: number;
  testReturn: number;
  trainingSharpe: number;
  validationSharpe: number;
  testSharpe: number;
  trainingDrawdown: number;
  validationDrawdown: number;
  testDrawdown: number;
  stability: number;            // Стабильность между folds
  overfittingScore: number;     // Score переобучения
}

export interface WalkForwardReport {
  totalFolds: number;
  completedFolds: number;
  avgTestReturn: number;
  avgTestSharpe: number;
  avgTestDrawdown: number;
  stabilityScore: number;
  overfittingDetected: boolean;
  folds: WalkForwardFold[];
  recommendations: string[];
}

// ============================================
// DEMO TRADING TYPES
// ============================================

export interface DemoTradingConfig {
  duration: number;             // Длительность (дней)
  targetPeriod: TargetPeriod;
  paperTrading: boolean;
  realTimeData: boolean;
  autoReporting: boolean;
  reportInterval: number;       // мс
  
  // Критерии успеха
  successCriteria: {
    minReturn: number;
    maxDrawdown: number;
    minSharpeRatio: number;
    minTrades: number;
  };
  
  // Auto-deployment
  autoDeploy: boolean;
  deploymentThreshold: number;  // Уверенность для deployment
}

export interface DemoTradingState {
  enabled: boolean;
  startDate: number;
  endDate: number;
  daysRemaining: number;
  
  // Performance
  totalReturn: number;
  totalTrades: number;
  winRate: number;
  sharpeRatio: number;
  maxDrawdown: number;
  
  // Progress
  progress: number;             // 0-100%
  status: 'running' | 'completed' | 'failed' | 'paused';
  
  // Success criteria
  criteriaMet: {
    return: boolean;
    drawdown: boolean;
    sharpe: boolean;
    trades: boolean;
  };
  
  // Deployment readiness
  deploymentReady: boolean;
  deploymentConfidence: number;
}

export interface DemoTradingReport {
  period: 'daily' | 'weekly' | 'total';
  startDate: number;
  endDate: number;
  
  // Performance
  totalReturn: number;
  dailyReturns: number[];
  cumulativeReturns: number[];
  
  // Risk
  volatility: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  var95: number;
  cvar95: number;
  
  // Trades
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  avgWin: number;
  avgLoss: number;
  largestWin: number;
  largestLoss: number;
  
  // Criteria
  criteriaMet: DemoTradingState['criteriaMet'];
  deploymentReady: boolean;
  
  // Recommendations
  recommendations: string[];
}

// ============================================
// AUTO-DEPLOYMENT TYPES
// ============================================

export type DeploymentStage = 'research' | 'demo' | 'staging' | 'production';

export interface DeploymentConfig {
  autoDeploy: boolean;
  stages: DeploymentStage[];
  
  // Requirements для каждого stage
  requirements: {
    demo: {
      minReturn: number;
      maxDrawdown: number;
      minSharpeRatio: number;
      minDays: number;
    };
    staging: {
      minReturn: number;
      maxDrawdown: number;
      minSharpeRatio: number;
      minDays: number;
    };
    production: {
      minReturn: number;
      maxDrawdown: number;
      minSharpeRatio: number;
      minDays: number;
    };
  };
  
  // Risk limits
  productionLimits: {
    maxCapital: number;
    maxPositionSize: number;
    maxDailyLoss: number;
    maxDrawdown: number;
  };
  
  // Monitoring
  monitoring: {
    enabled: boolean;
    alertThreshold: number;
    autoStop: boolean;
    autoStopThreshold: number;
  };
}

export interface DeploymentStatus {
  currentStage: DeploymentStage;
  deployedAt: number;
  strategy: {
    id: string;
    name: string;
    parameters: Record<string, any>;
  };
  
  // Performance
  performance: {
    totalReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
    totalTrades: number;
  };
  
  // Risk
  riskStatus: 'normal' | 'warning' | 'critical';
  capitalAllocated: number;
  capitalAtRisk: number;
  
  // Monitoring
  alerts: DeploymentAlert[];
  autoStopTriggered: boolean;
}

export interface DeploymentAlert {
  type: 'drawdown' | 'loss' | 'volatility' | 'performance';
  severity: 'warning' | 'critical';
  message: string;
  timestamp: number;
  action: 'notify' | 'reduce' | 'stop';
}

// ============================================
// AUTO-RESEARCH MANAGER TYPES
// ============================================

export interface AutoResearchConfig {
  // Research target
  target: ResearchTarget;
  
  // AutoML
  automl: AutoMLConfig;
  
  // Optimization
  optimization: OptimizationConfig;
  
  // Walk-forward
  walkForward: WalkForwardConfig;
  
  // Demo trading
  demoTrading: DemoTradingConfig;
  
  // Deployment
  deployment: DeploymentConfig;
  
  // General
  enabled: boolean;
  parallelResearch: boolean;
  maxConcurrentStrategies: number;
}

export interface AutoResearchState {
  enabled: boolean;
  
  // Progress
  currentPhase: 'research' | 'optimization' | 'validation' | 'demo' | 'deployment';
  progress: number;
  
  // Active research
  activeStrategies: number;
  completedStrategies: number;
  
  // Best strategy
  bestStrategy: {
    id: string;
    expectedReturn: number;
    sharpeRatio: number;
    confidence: number;
  } | null;
  
  // Demo trading
  demoState: DemoTradingState | null;
  
  // Deployment
  deploymentStatus: DeploymentStatus | null;
  
  // Last update
  lastUpdate: number;
}

export interface AutoResearchReport {
  period: 'weekly' | 'monthly' | 'quarterly';
  startDate: number;
  endDate: number;
  
  // Research summary
  strategiesResearched: number;
  strategiesOptimized: number;
  strategiesValidated: number;
  strategiesDeployed: number;
  
  // Performance
  bestStrategy: {
    id: string;
    return: number;
    sharpeRatio: number;
    maxDrawdown: number;
  };
  
  // Demo trading
  demoPerformance: DemoTradingReport | null;
  
  // Deployment
  deploymentPerformance: {
    return: number;
    sharpeRatio: number;
    maxDrawdown: number;
  } | null;
  
  // Recommendations
  recommendations: string[];
  nextSteps: string[];
}

// ============================================
// EVENTS
// ============================================

export type AutoResearchEvent =
  | { type: 'research_started'; target: ResearchTarget }
  | { type: 'model_trained'; modelId: string; performance: ModelPerformance }
  | { type: 'optimization_started'; strategyId: string }
  | { type: 'optimization_completed'; result: OptimizationReport }
  | { type: 'walk_forward_started'; strategyId: string }
  | { type: 'walk_forward_completed'; report: WalkForwardReport }
  | { type: 'demo_trading_started'; strategyId: string }
  | { type: 'demo_trading_completed'; report: DemoTradingReport }
  | { type: 'deployment_ready'; strategyId: string; confidence: number }
  | { type: 'strategy_deployed'; deploymentStatus: DeploymentStatus }
  | { type: 'deployment_alert'; alert: DeploymentAlert }
  | { type: 'strategy_stopped'; strategyId: string; reason: string }
  | { type: 'phase_changed'; from: string; to: string }
  | { type: 'research_report'; report: AutoResearchReport };
