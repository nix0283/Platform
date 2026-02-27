/**
 * Self-Learning Manager
 * Главный модуль системы самообучения на торговле пользователя
 * 
 * Интегрирует:
 * - Triple Barrier Method (разметка сделок)
 * - Meta-Labeling (улучшение сигналов)
 * - Feature Importance (важность индикаторов)
 * - Pattern Recognition (распознавание паттернов)
 */

import {
  SelfLearningConfig,
  SelfLearningStats,
  TradeAnalysisResult,
  TradePattern,
  FeatureImportance,
  TripleBarrierLabel,
  MetaLabel,
  SelfLearningEvent,
} from './types';
import { TripleBarrierMethod } from './triple-barrier';
import { MetaLabelingModel, MetaLabelingFeatureFactory } from './meta-labeling';
import { FeatureImportanceAnalyzer } from './feature-importance';

export interface TradeInput {
  tradeId: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  entryTime: number;
  entryPrice: number;
  exitTime: number;
  exitPrice: number;
  high?: number;
  low?: number;
  indicators?: Record<string, number>;
  pnl: number;
  pnlPercent: number;
}

export interface MarketState {
  symbol: string;
  price: number;
  indicators: Record<string, number>;
  volatility: number;
  volume: number;
  trend?: 'up' | 'down' | 'sideways';
}

export class SelfLearningManager {
  private config: SelfLearningConfig;
  private tripleBarrier: TripleBarrierMethod;
  private metaLabeling: MetaLabelingModel;
  private featureImportance: FeatureImportanceAnalyzer;
  
  private analyzedTrades: TradeAnalysisResult[] = [];
  private labeledTrades: TripleBarrierLabel[] = [];
  private patterns: TradePattern[] = [];
  private eventListeners: Set<(event: SelfLearningEvent) => void> = new Set();
  
  private modelVersion: number = 1;
  private lastRetrainingTime: number = 0;

  constructor(config: SelfLearningConfig) {
    this.config = config;
    
    this.tripleBarrier = new TripleBarrierMethod(config.tripleBarrier);
    this.metaLabeling = new MetaLabelingModel(config.metaLabeling);
    this.featureImportance = new FeatureImportanceAnalyzer(config.featureImportance);
  }

  /**
   * Анализ новой сделки
   */
  async analyzeTrade(trade: TradeInput): Promise<TradeAnalysisResult> {
    // 1. Triple Barrier разметка
    const labeledTrade = this.tripleBarrier.labelTrade({
      tradeId: trade.tradeId,
      entryTime: trade.entryTime,
      entryPrice: trade.entryPrice,
      exitTime: trade.exitTime,
      exitPrice: trade.exitPrice,
      side: trade.side,
      high: trade.high,
      low: trade.low,
    });

    this.labeledTrades.push(labeledTrade);

    // 2. Извлечение фич
    const features = MetaLabelingFeatureFactory.extractFromTrade({
      entryTime: trade.entryTime,
      entryPrice: trade.entryPrice,
      exitTime: trade.exitTime,
      exitPrice: trade.exitPrice,
      side: trade.side,
      indicators: trade.indicators,
    });

    const featuresMap = new Map<string, any[]>();
    features.forEach(f => {
      const existing = featuresMap.get(f.name) || [];
      existing.push(f);
      featuresMap.set(f.name, existing);
    });

    // 3. Feature Importance (если накоплено достаточно данных)
    let featureImportance: FeatureImportance[] = [];
    if (this.labeledTrades.length >= 20 && this.config.featureImportance.enabled) {
      featureImportance = this.featureImportance.analyze(
        this.labeledTrades,
        featuresMap as Map<string, any>
      );
    }

    // 4. Распознавание паттернов
    const detectedPatterns = this.detectPatterns(trade);

    // 5. Генерация рекомендаций
    const recommendations = this.generateRecommendations({
      trade,
      labeledTrade,
      featureImportance,
      detectedPatterns,
    });

    const result: TradeAnalysisResult = {
      tradeId: trade.tradeId,
      symbol: trade.symbol,
      side: trade.side,
      entryPrice: trade.entryPrice,
      exitPrice: trade.exitPrice,
      pnl: trade.pnl,
      pnlPercent: trade.pnlPercent,
      tripleBarrier: labeledTrade,
      featureImportance,
      detectedPatterns,
      recommendations,
    };

    this.analyzedTrades.push(result);

    // Emit событие
    this.emit({ type: 'trade_analyzed', tradeId: trade.tradeId, result });

    // Проверяем нужно ли переобучение
    await this.checkRetraining();

    return result;
  }

  /**
   * Предсказание для нового сигнала (с meta-labeling)
   */
  predictSignal(marketState: MarketState): {
    shouldTrade: boolean;
    confidence: number;
    metaLabel: MetaLabel;
    topFeatures: FeatureImportance[];
  } {
    // Извлекаем фичи из текущего состояния рынка
    const features = MetaLabelingFeatureFactory.extractFromMarketState(marketState);

    // Meta-labeling предсказание
    const metaLabel = this.metaLabeling.predict(features);

    // Получаем топ фичи
    const topFeatures = this.getTopFeatures(5);

    return {
      shouldTrade: metaLabel.metaLabel === 1 && metaLabel.confidence >= this.config.metaLabeling.minConfidence,
      confidence: metaLabel.confidence,
      metaLabel,
      topFeatures,
    };
  }

  /**
   * Обучение meta-модели
   */
  async trainMetaModel(): Promise<{
    accuracy: number;
    improvement: number;
    featureImportance: Map<string, number>;
  }> {
    if (this.labeledTrades.length < 50) {
      throw new Error('Недостаточно данных для обучения (минимум 50 сделок)');
    }

    // Извлекаем фичи для всех сделок
    const featuresMap = new Map<string, any[]>();
    
    this.labeledTrades.forEach(trade => {
      // В реальном implementation здесь были бы фичи на момент входа
      // Для демо используем заглушки
      const dummyFeatures = [
        { name: 'hold_time', value: Math.random() * 24 },
        { name: 'volatility', value: Math.random() * 5 },
        { name: 'volume', value: Math.random() * 100 },
      ];

      dummyFeatures.forEach(f => {
        const existing = featuresMap.get(f.name) || [];
        existing.push({ value: f.value });
        featuresMap.set(f.name, existing);
      });
    });

    // Обучаем meta-модель
    const result = this.metaLabeling.train(
      this.labeledTrades,
      featuresMap as Map<string, any>
    );

    // Emit событие
    this.emit({
      type: 'meta_label_trained',
      accuracy: result.accuracy,
      improvement: result.improvement,
    });

    return result;
  }

  /**
   * Распознавание паттернов в сделке
   */
  private detectPatterns(trade: TradeInput): TradePattern[] {
    const patterns: TradePattern[] = [];

    // Простая эвристика для демо
    // В реальном implementation здесь был бы ML pattern recognition

    // Паттерн: Быстрый выход с прибылью
    const holdTimeHours = (trade.exitTime - trade.entryTime) / (1000 * 60 * 60);
    if (holdTimeHours < 4 && trade.pnlPercent > 2) {
      patterns.push({
        id: `pattern_${Date.now()}_1`,
        name: 'Quick Profit Scalp',
        type: 'exit',
        conditions: [
          { indicator: 'hold_time', operator: '<', value: 4, timeframe: 'hours' },
          { indicator: 'pnl_percent', operator: '>', value: 2, timeframe: 'trade' },
        ],
        statistics: {
          occurrences: 1,
          winRate: 1,
          avgReturn: trade.pnlPercent,
          profitFactor: trade.pnlPercent > 0 ? trade.pnlPercent : 0,
          sharpeRatio: 1,
          maxDrawdown: 0,
        },
        context: {
          marketCondition: 'volatile',
          timeOfDay: 'any',
          dayOfWeek: [0, 1, 2, 3, 4, 5, 6],
        },
      });
    }

    // Паттерн: Долгосрочная сделка
    if (holdTimeHours > 24 && trade.pnlPercent > 5) {
      patterns.push({
        id: `pattern_${Date.now()}_2`,
        name: 'Trend Following Swing',
        type: 'entry',
        conditions: [
          { indicator: 'hold_time', operator: '>', value: 24, timeframe: 'hours' },
          { indicator: 'pnl_percent', operator: '>', value: 5, timeframe: 'trade' },
        ],
        statistics: {
          occurrences: 1,
          winRate: 1,
          avgReturn: trade.pnlPercent,
          profitFactor: trade.pnlPercent > 0 ? trade.pnlPercent : 0,
          sharpeRatio: 1.5,
          maxDrawdown: 0,
        },
        context: {
          marketCondition: 'trending',
          timeOfDay: 'any',
          dayOfWeek: [0, 1, 2, 3, 4, 5, 6],
        },
      });
    }

    return patterns;
  }

  /**
   * Генерация рекомендаций
   */
  private generateRecommendations(params: {
    trade: TradeInput;
    labeledTrade: TripleBarrierLabel;
    featureImportance: FeatureImportance[];
    detectedPatterns: TradePattern[];
  }): TradeAnalysisResult['recommendations'] {
    const recommendations: TradeAnalysisResult['recommendations'] = [];

    const { labeledTrade, detectedPatterns } = params;

    // Рекомендация по выходу через SL
    if (labeledTrade.touchedBarrier === 'lower') {
      recommendations.push({
        type: 'improve_exit',
        description: 'Сделка закрыта по Stop Loss. Рассмотрите увеличение SL или улучшение точки входа.',
        priority: 'high',
      });
    }

    // Рекомендация по паттернам
    if (detectedPatterns.length > 0) {
      const bestPattern = detectedPatterns.sort((a, b) => b.statistics.winRate - a.statistics.winRate)[0];
      if (bestPattern.statistics.winRate > 0.7) {
        recommendations.push({
          type: 'improve_entry',
          description: `Обнаружен успешный паттерн "${bestPattern.name}" с win rate ${Math.round(bestPattern.statistics.winRate * 100)}%. Рекомендуется использовать чаще.`,
          priority: 'medium',
        });
      }
    }

    // Рекомендация по time exit
    if (labeledTrade.touchedBarrier === 'vertical') {
      recommendations.push({
        type: 'adjust_position',
        description: 'Сделка закрыта по времени. Рассмотрите увеличение time horizon или установку TP/SL.',
        priority: 'low',
      });
    }

    return recommendations;
  }

  /**
   * Проверка необходимости переобучения
   */
  private async checkRetraining(): Promise<void> {
    if (!this.config.retraining.enabled) return;

    const now = Date.now();
    const tradesSinceRetraining = this.labeledTrades.filter(
      t => t.exitTime > this.lastRetrainingTime
    ).length;

    if (tradesSinceRetraining >= this.config.retraining.minTrades) {
      await this.retrain();
    }
  }

  /**
   * Переобучение моделей
   */
  private async retrain(): Promise<void> {
    console.log('Начало переобучения моделей...');

    try {
      // Переобучаем meta-модель
      await this.trainMetaModel();

      // Обновляем версию
      this.modelVersion++;
      this.lastRetrainingTime = Date.now();

      // Emit событие
      const stats = this.getStats();
      this.emit({
        type: 'model_retrained',
        version: this.modelVersion,
        metrics: stats,
      });

      console.log(`Переобучение завершено. Версия модели: ${this.modelVersion}`);
    } catch (error) {
      console.error('Ошибка переобучения:', error);
    }
  }

  /**
   * Получить топ фичи
   */
  getTopFeatures(n: number = 10): FeatureImportance[] {
    // В реальном implementation здесь был бы анализ текущих фич
    // Для демо возвращаем заглушки
    return Array.from({ length: n }, (_, i) => ({
      name: `feature_${i}`,
      importance: 1 - i * 0.1,
      pValue: 0.01 + i * 0.01,
      stability: 0.9 - i * 0.05,
      direction: i % 2 === 0 ? 'positive' : 'negative' as const,
    }));
  }

  /**
   * Получить статистику самообучения
   */
  getStats(): SelfLearningStats {
    const totalTrades = this.labeledTrades.length;
    const analyzedTrades = this.analyzedTrades.length;

    // Вычисляем aggregate metrics
    const winRate = totalTrades > 0
      ? this.labeledTrades.filter(t => t.return > 0).length / totalTrades
      : 0;

    const avgReturn = totalTrades > 0
      ? this.labeledTrades.reduce((sum, t) => sum + t.return, 0) / totalTrades
      : 0;

    const profitFactor = totalTrades > 0
      ? Math.abs(
          this.labeledTrades.filter(t => t.return > 0).reduce((sum, t) => sum + t.return, 0) /
          this.labeledTrades.filter(t => t.return < 0).reduce((sum, t) => sum + t.return, 0)
        )
      : 0;

    return {
      totalTrades,
      analyzedTrades,
      overallWinRate: winRate,
      overallProfitFactor: profitFactor,
      overallSharpeRatio: avgReturn / 0.1,  // Упрощенно
      overallMaxDrawdown: 0.1,  // Заглушка
      topFeatures: this.getTopFeatures(5),
      bestPatterns: this.patterns.slice(0, 5),
      worstPatterns: [],
      metaLabelAccuracy: 0.7,  // Заглушка
      metaLabelImprovement: 10,  // Заглушка
      pendingRecommendations: this.analyzedTrades.reduce(
        (sum, t) => sum + t.recommendations.length, 0
      ),
      implementedRecommendations: 0,
      modelVersion: this.modelVersion,
      lastUpdated: Date.now(),
      nextRetraining: Date.now() + 7 * 24 * 60 * 60 * 1000,  // Через неделю
    };
  }

  /**
   * Подписка на события
   */
  onEvent(listener: (event: SelfLearningEvent) => void): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  /**
   * Emit события
   */
  private emit(event: SelfLearningEvent): void {
    this.eventListeners.forEach(listener => listener(event));
  }

  /**
   * Экспорт данных для анализа
   */
  exportData(): {
    trades: TradeAnalysisResult[];
    labeledTrades: TripleBarrierLabel[];
    patterns: TradePattern[];
    stats: SelfLearningStats;
  } {
    return {
      trades: this.analyzedTrades,
      labeledTrades: this.labeledTrades,
      patterns: this.patterns,
      stats: this.getStats(),
    };
  }
}

/**
 * Factory для создания SelfLearningManager с дефолтной конфигурацией
 */
export function createSelfLearningManager(
  overrides?: Partial<SelfLearningConfig>
): SelfLearningManager {
  const defaultConfig: SelfLearningConfig = {
    tripleBarrier: {
      timeHorizon: 3,  // 3 дня
      profitTarget: 5,  // 5%
      stopLoss: 2,  // 2%
    },
    metaLabeling: {
      enabled: true,
      modelType: 'simple',
      minConfidence: 0.6,
    },
    featureImportance: {
      enabled: true,
      method: 'correlation',
      minStability: 0.5,
    },
    patternRecognition: {
      enabled: true,
      minOccurrences: 3,
      minWinRate: 0.5,
    },
    retraining: {
      enabled: true,
      minTrades: 50,
      frequency: 'weekly',
    },
  };

  const config = { ...defaultConfig, ...overrides };
  return new SelfLearningManager(config);
}
