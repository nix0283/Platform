/**
 * Auto-Trading Package
 * 
 * Система алгоритмической торговли
 * Основано на: awesome-systematic-trading, jesse, barter-rs
 */

// Types
export * from './types';

// Strategies
export { BaseStrategy } from './strategies/base-strategy';
export type { CandleData, IndicatorValues } from './strategies/base-strategy';

export { MomentumStrategy, createMomentumStrategy } from './strategies/momentum-strategy';
export type { MomentumConfig } from './strategies/momentum-strategy';

export { MeanReversionStrategy, createMeanReversionStrategy } from './strategies/mean-reversion-strategy';
export type { MeanReversionConfig } from './strategies/mean-reversion-strategy';

export { BreakoutStrategy, createBreakoutStrategy } from './strategies/breakout-strategy';
export type { BreakoutConfig } from './strategies/breakout-strategy';

// Execution
export { ExecutionEngine, createExecutionEngine } from './execution/execution-engine';

// Risk Management
export { RiskManager, createRiskManager } from './risk-management/risk-manager';
export type { Position } from './risk-management/risk-manager';

// Position Sizing
export { PositionSizingManager, createPositionSizingManager } from './position-sizing/position-sizing-manager';

// Auto-Trading Manager
export { AutoTradingManager, createAutoTradingManager } from './auto-trading-manager';

// Default export removed for Next.js compatibility

