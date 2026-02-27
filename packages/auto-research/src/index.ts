/**
 * Auto-Research Package
 * 
 * Система авто-исследования и оптимизации стратегий
 * Основано на: neuralforecast, Lean, pybroker, financial-machine-learning
 */

// Types
export * from './types';

// AutoML
export { AutoMLEngine, createAutoMLEngine } from './automl/automl-engine';
export type { TrainingData } from './automl/automl-engine';

// Optimization
export { StrategyOptimizer, createStrategyOptimizer } from './optimization/strategy-optimizer';
export type { BacktestFunction } from './optimization/strategy-optimizer';

// Walk-Forward
export { WalkForwardValidator, createWalkForwardValidator } from './walk-forward/walk-forward-validator';
export type { BacktestResult } from './walk-forward/walk-forward-validator';

// Demo Trading
export { DemoTradingManager, createDemoTradingManager } from './demo-trading/demo-trading-manager';
export type { DemoTrade } from './demo-trading/demo-trading-manager';

// Auto-Research Manager
export { AutoResearchManager, createAutoResearchManager } from './auto-research-manager';

// Default export removed for Next.js compatibility

