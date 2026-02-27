/**
 * Meta-Labeling
 * Основано на financial-machine-learning (Marcos López de Prado)
 * 
 * Вторичная модель для улучшения сигналов первичной стратегии:
 * - Первичная стратегия генерирует сигнал (-1, 0, 1)
 * - Meta-модель решает стоит ли торговать этот сигнал (1=торговать, 0=пропустить)
 */

import { MetaLabel, TripleBarrierLabel } from './types';

export interface MetaLabelingConfig {
  modelType: 'random_forest' | 'xgboost' | 'lightgbm' | 'simple';
  minConfidence: number;      // Мин. уверенность для торговли (0-1)
  features: string[];         // Фичи для meta-модели
}

export interface MetaLabelingFeature {
  name: string;
  value: number;
}

export class MetaLabelingModel {
  private config: MetaLabelingConfig;
  private trained: boolean = false;
  
  // Простая эвристика для демонстрации (в продакшене - ML модель)
  private featureWeights: Map<string, number> = new Map();
  private baseThreshold: number = 0.5;

  constructor(config: MetaLabelingConfig) {
    this.config = config;
  }

  /**
   * Обучение meta-модели на исторических сделках
   */
  train(
    labeledTrades: TripleBarrierLabel[],
    features: Map<string, MetaLabelingFeature[]>
  ): {
    accuracy: number;
    improvement: number;
    featureImportance: Map<string, number>;
  } {
    // В реальном implementation здесь было бы обучение ML модели
    // Для демо используем простую эвристику
    
    const trainingData = labeledTrades.map(trade => {
      const tradeFeatures = Array.from(features.entries()).map(([name, featureList]) => {
        const feature = featureList.find(f => true); // Берем первую фичу
        return { name, value: feature?.value || 0 };
      });

      const metaLabel = trade.label !== 0 ? 1 : 0;  // 1 если TP/SL, 0 если time
      const primarySignal = trade.side === 'LONG' ? 1 : -1;

      return {
        tradeId: trade.tradeId,
        primarySignal,
        features: tradeFeatures,
        metaLabel,
        actualReturn: trade.return,
      };
    });

    // Вычисляем важность фич (простая корреляция)
    const featureImportance = this.calculateFeatureImportance(trainingData, features);

    // Устанавливаем веса
    featureImportance.forEach((importance, name) => {
      this.featureWeights.set(name, importance);
    });

    this.trained = true;

    // Вычисляем accuracy на training data
    const predictions = trainingData.map(data => this.predict(data.features));
    const correct = predictions.filter((p, i) => 
      (p.metaLabel === trainingData[i].metaLabel)
    ).length;
    
    const accuracy = correct / trainingData.length;

    // Вычисляем improvement от meta-labeling
    const baseWinRate = labeledTrades.filter(t => t.return > 0).length / labeledTrades.length;
    const filteredTrades = trainingData.filter((_, i) => predictions[i].metaLabel === 1);
    const filteredWinRate = filteredTrades.filter(t => t.actualReturn > 0).length / filteredTrades.length;
    const improvement = ((filteredWinRate - baseWinRate) / baseWinRate) * 100;

    return {
      accuracy,
      improvement,
      featureImportance,
    };
  }

  /**
   * Предсказание meta-метки для нового сигнала
   */
  predict(features: MetaLabelingFeature[]): MetaLabel {
    if (!this.trained) {
      // Если не обучена, возвращаем дефолт
      return {
        primarySignal: 0,
        metaLabel: 1,
        confidence: 0.5,
        features: {},
      };
    }

    // Вычисляем score на основе весов фич
    let score = 0;
    const featureValues: Record<string, number> = {};

    features.forEach(feature => {
      const weight = this.featureWeights.get(feature.name) || 0;
      score += feature.value * weight;
      featureValues[feature.name] = feature.value;
    });

    // Нормализуем score в confidence (0-1)
    const confidence = 1 / (1 + Math.exp(-score));

    // Meta-метка: торговать если confidence > threshold
    const metaLabel: 1 | 0 = confidence >= this.config.minConfidence ? 1 : 0;

    return {
      primarySignal: score > 0.1 ? 1 : score < -0.1 ? -1 : 0,
      metaLabel,
      confidence,
      features: featureValues,
    };
  }

  /**
   * Фильтрация сигналов через meta-модель
   */
  filterSignals(
    signals: Array<{
      signal: number;
      features: MetaLabelingFeature[];
    }>
  ): Array<{
    signal: number;
    metaLabel: MetaLabel;
    shouldTrade: boolean;
  }> {
    return signals.map(signal => {
      const metaLabel = this.predict(signal.features);
      return {
        signal: signal.signal,
        metaLabel,
        shouldTrade: metaLabel.metaLabel === 1 && metaLabel.confidence >= this.config.minConfidence,
      };
    });
  }

  /**
   * Вычисление важности фич (простая корреляция)
   */
  private calculateFeatureImportance(
    trainingData: Array<{
      features: MetaLabelingFeature[];
      metaLabel: number;
      actualReturn: number;
    }>,
    allFeatures: Map<string, MetaLabelingFeature[]>
  ): Map<string, number> {
    const importance = new Map<string, number>();

    allFeatures.forEach((featureList, name) => {
      // Простая корреляция между фичей и meta-меткой
      const values = trainingData.map((_, i) => featureList[i]?.value || 0);
      const labels = trainingData.map(d => d.metaLabel);

      const correlation = this.correlation(values, labels);
      importance.set(name, Math.abs(correlation));
    });

    // Нормализуем важность (0-1)
    const maxImportance = Math.max(...Array.from(importance.values()), 1);
    importance.forEach((value, key) => {
      importance.set(key, value / maxImportance);
    });

    return importance;
  }

  private correlation(x: number[], y: number[]): number {
    const n = x.length;
    if (n === 0) return 0;

    const meanX = x.reduce((sum, v) => sum + v, 0) / n;
    const meanY = y.reduce((sum, v) => sum + v, 0) / n;

    let numerator = 0;
    let sumX2 = 0;
    let sumY2 = 0;

    for (let i = 0; i < n; i++) {
      const dx = x[i] - meanX;
      const dy = y[i] - meanY;
      numerator += dx * dy;
      sumX2 += dx * dx;
      sumY2 += dy * dy;
    }

    const denominator = Math.sqrt(sumX2 * sumY2);
    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Статистика meta-модели
   */
  getStats(): {
    trained: boolean;
    featureCount: number;
    avgConfidence: number;
  } {
    return {
      trained: this.trained,
      featureCount: this.featureWeights.size,
      avgConfidence: this.baseThreshold,
    };
  }
}

/**
 * Фабрика фич для meta-labeling
 */
export class MetaLabelingFeatureFactory {
  /**
   * Извлекает фичи из сделки
   */
  static extractFromTrade(trade: {
    entryTime: number;
    entryPrice: number;
    exitTime: number;
    exitPrice: number;
    side: 'LONG' | 'SHORT';
    indicators?: Record<string, number>;
  }): MetaLabelingFeature[] {
    const features: MetaLabelingFeature[] = [];

    // Временные фичи
    const holdTime = (trade.exitTime - trade.entryTime) / (1000 * 60 * 60);  // Часы
    features.push({ name: 'hold_time_hours', value: holdTime });

    const hourOfDay = new Date(trade.entryTime).getHours();
    features.push({ name: 'hour_of_day', value: hourOfDay });

    const dayOfWeek = new Date(trade.entryTime).getDay();
    features.push({ name: 'day_of_week', value: dayOfWeek });

    // Ценовые фичи
    const returnPct = trade.side === 'LONG'
      ? (trade.exitPrice - trade.entryPrice) / trade.entryPrice
      : (trade.entryPrice - trade.exitPrice) / trade.entryPrice;
    features.push({ name: 'return_pct', value: returnPct * 100 });

    const volatility = Math.abs(trade.exitPrice - trade.entryPrice) / trade.entryPrice;
    features.push({ name: 'volatility', value: volatility * 100 });

    // Индикаторы если доступны
    if (trade.indicators) {
      Object.entries(trade.indicators).forEach(([name, value]) => {
        features.push({ name: `indicator_${name}`, value });
      });
    }

    return features;
  }

  /**
   * Извлекает фичи из текущего состояния рынка
   */
  static extractFromMarketState(state: {
    symbol: string;
    price: number;
    indicators: Record<string, number>;
    volatility: number;
    volume: number;
    trend?: 'up' | 'down' | 'sideways';
  }): MetaLabelingFeature[] {
    const features: MetaLabelingFeature[] = [];

    // Индикаторы
    Object.entries(state.indicators).forEach(([name, value]) => {
      features.push({ name: `indicator_${name}`, value });
    });

    // Волатильность
    features.push({ name: 'market_volatility', value: state.volatility * 100 });

    // Объем
    features.push({ name: 'market_volume', value: state.volume });

    // Тренд
    const trendValue = state.trend === 'up' ? 1 : state.trend === 'down' ? -1 : 0;
    features.push({ name: 'trend_direction', value: trendValue });

    return features;
  }
}
