/**
 * ML Package — CPU-Optimized Export
 */
export { CpuOptimizedMetaLabeling, createCpuMetaLabeling, type MetaLabelingFeatures, type MetaLabelPrediction } from './cpu-optimized/meta-labeling-lite';
export { CpuFeatureImportance, type FeatureImportanceResult } from './cpu-optimized/feature-importance-lite';
export { SelfLearningManager, createSelfLearningManager, type TradeInput, type MarketState } from './self-learning/manager';
export { TripleBarrierMethod } from './self-learning/triple-barrier';
export { MetaLabelingModel } from './self-learning/meta-labeling';
export { FeatureImportanceAnalyzer } from './self-learning/feature-importance';
export type { SelfLearningConfig, SelfLearningStats, TradeAnalysisResult, TradePattern, FeatureImportance, TripleBarrierLabel, MetaLabel, SelfLearningEvent } from './self-learning/types';
export { TradeActionTracker, type ChartState, type TradeAction } from './tracker/action-tracker';
export { SelfLearningEngine, type LearningModel, type TradingSuggestion } from './learning/self-learning';
export { JournalMLIntegration, type IntegrationConfig } from './integration/journal-ml-integration';
export { CpuMLManager, createCpuMLManager } from './cpu-optimized/meta-labeling-lite';
export interface CpuMLConfig { tripleBarrier: { timeHorizon: number; profitTarget: number; stopLoss: number; }; minConfidence: number; minTradesForTraining: number; }