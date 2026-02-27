/**
 * Типы для системы самообучения на торговле пользователя
 * Основано на financial-machine-learning (Marcos López de Prado)
 */

/**
 * Triple Barrier Method - разметка сделок
 */
export interface TripleBarrierLabel {
  tradeId: string;
  entryTime: number;
  entryPrice: number;
  exitTime: number;
  exitPrice: number;
  side: 'LONG' | 'SHORT';
  
  // Три барьера
  verticalBarrier: number;    // Время выхода (days)
  horizontalUpperBarrier: number;  // Take Profit уровень
  horizontalLowerBarrier: number;  // Stop Loss уровень
  
  // Результат
  label: 1 | 0 | -1;          // 1=TP, 0=Time, -1=SL
  return: number;             // Фактический return
  touchedBarrier: 'upper' | 'lower' | 'vertical';
}

/**
 * Meta-Labeling - вторичная модель для улучшения сигналов
 */
export interface MetaLabel {
  primarySignal: number;      // Первичный сигнал (-1, 0, 1)
  metaLabel: 1 | 0;           // Meta-метка (1=торговать, 0=пропустить)
  confidence: number;         // Уверенность meta-модели (0-1)
  features: Record<string, number>;  // Фичи для meta-модели
}

/**
 * Feature Importance - важность признаков
 */
export interface FeatureImportance {
  name: string;               // Название индикатора/фичи
  importance: number;         // Важность (0-1)
  pValue: number;            // Статистическая значимость
  stability: number;         // Стабильность во времени (0-1)
  direction: 'positive' | 'negative' | 'neutral';
}

/**
 * SHAP Values - интерпретация решений
 */
export interface SHAPValue {
  feature: string;
  shapValue: number;          // Вклад в предсказание
  baseValue: number;          // Базовое значение
  prediction: number;         // Финальное предсказание
}

export interface SHAPAnalysis {
  tradeId: string;
  shapValues: SHAPValue[];
  topFeatures: SHAPValue[];   // Топ-5 влияющих фич
  explanation: string;        // Человеко-читаемое объяснение
}

/**
 * Паттерн торговли
 */
export interface TradePattern {
  id: string;
  name: string;
  type: 'entry' | 'exit' | 'management';
  
  // Условия
  conditions: {
    indicator: string;
    operator: '>' | '<' | '>=' | '<=' | '==' | 'between';
    value: number | [number, number];
    timeframe: string;
  }[];
  
  // Статистика
  statistics: {
    occurrences: number;
    winRate: number;
    avgReturn: number;
    profitFactor: number;
    sharpeRatio: number;
    maxDrawdown: number;
  };
  
  // Контекст
  context: {
    marketCondition: 'trending' | 'ranging' | 'volatile' | 'calm';
    timeOfDay: 'asian' | 'london' | 'new_york' | 'overlap';
    dayOfWeek: number[];  // 0-6
  };
}

/**
 * Результат анализа сделки
 */
export interface TradeAnalysisResult {
  tradeId: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  pnlPercent: number;
  
  // Triple Barrier
  tripleBarrier: TripleBarrierLabel;
  
  // Meta-Labeling
  metaLabel?: MetaLabel;
  
  // Feature Importance
  featureImportance: FeatureImportance[];
  
  // SHAP Analysis
  shapAnalysis?: SHAPAnalysis;
  
  // Паттерны
  detectedPatterns: TradePattern[];
  
  // Рекомендации
  recommendations: {
    type: 'improve_entry' | 'improve_exit' | 'adjust_position' | 'avoid_condition';
    description: string;
    priority: 'high' | 'medium' | 'low';
  }[];
}

/**
 * Агрегированная статистика самообучения
 */
export interface SelfLearningStats {
  totalTrades: number;
  analyzedTrades: number;
  
  // Performance
  overallWinRate: number;
  overallProfitFactor: number;
  overallSharpeRatio: number;
  overallMaxDrawdown: number;
  
  // Feature Importance (топ)
  topFeatures: FeatureImportance[];
  
  // Patterns (топ)
  bestPatterns: TradePattern[];
  worstPatterns: TradePattern[];
  
  // Meta-Labeling stats
  metaLabelAccuracy?: number;
  metaLabelImprovement?: number;  // % улучшение от meta-labeling
  
  // Recommendations
  pendingRecommendations: number;
  implementedRecommendations: number;
  
  // Learning progress
  modelVersion: number;
  lastUpdated: number;
  nextRetraining: number;
}

/**
 * Конфигурация самообучения
 */
export interface SelfLearningConfig {
  // Triple Barrier
  tripleBarrier: {
    timeHorizon: number;      // Дней для vertical barrier
    profitTarget: number;     // % для upper barrier
    stopLoss: number;         // % для lower barrier
  };
  
  // Meta-Labeling
  metaLabeling: {
    enabled: boolean;
    modelType: 'random_forest' | 'xgboost' | 'lightgbm';
    minConfidence: number;    // Мин. уверенность для торговли
  };
  
  // Feature Importance
  featureImportance: {
    enabled: boolean;
    method: 'permutation' | 'shap' | 'gain';
    minStability: number;     // Мин. стабильность фичи
  };
  
  // Pattern Recognition
  patternRecognition: {
    enabled: boolean;
    minOccurrences: number;   // Мин. вхождений для паттерна
    minWinRate: number;       // Мин. win rate для паттерна
  };
  
  // Retraining
  retraining: {
    enabled: boolean;
    minTrades: number;        // Мин. сделок перед Retraining
    frequency: 'daily' | 'weekly' | 'monthly';
  };
}

/**
 * События самообучения
 */
export type SelfLearningEvent =
  | { type: 'trade_analyzed'; tradeId: string; result: TradeAnalysisResult }
  | { type: 'pattern_discovered'; pattern: TradePattern }
  | { type: 'feature_importance_updated'; features: FeatureImportance[] }
  | { type: 'recommendation_generated'; recommendation: TradeAnalysisResult['recommendations'][0] }
  | { type: 'model_retrained'; version: number; metrics: SelfLearningStats }
  | { type: 'meta_label_trained'; accuracy: number; improvement: number };
