/**
 * Feature Importance
 * Основано на financial-machine-learning (Marcos López de Prado)
 * 
 * Определяет какие индикаторы/фичи наиболее важны для прибыльных сделок
 */

import { FeatureImportance, TripleBarrierLabel, MetaLabelingFeature } from './types';

export interface FeatureImportanceConfig {
  method: 'permutation' | 'shap' | 'gain' | 'correlation';
  minStability: number;     // Мин. стабильность фичи (0-1)
  topN: number;            // Топ N фич для возврата
}

export class FeatureImportanceAnalyzer {
  private config: FeatureImportanceConfig;
  private historicalImportance: Map<string, number[]> = new Map();

  constructor(config: FeatureImportanceConfig) {
    this.config = config;
  }

  /**
   * Вычисление важности фич на основе исторических сделок
   */
  analyze(
    labeledTrades: TripleBarrierLabel[],
    features: Map<string, MetaLabelingFeature[]>
  ): FeatureImportance[] {
    const importanceScores: FeatureImportance[] = [];

    features.forEach((featureList, featureName) => {
      // Вычисляем важность выбранным методом
      let importance: number;
      
      switch (this.config.method) {
        case 'correlation':
          importance = this.correlationImportance(featureList, labeledTrades);
          break;
        case 'permutation':
          importance = this.permutationImportance(featureList, labeledTrades);
          break;
        case 'gain':
          importance = this.gainImportance(featureList, labeledTrades);
          break;
        default:
          importance = this.correlationImportance(featureList, labeledTrades);
      }

      // Вычисляем стабильность (если есть исторические данные)
      const historicalValues = this.historicalImportance.get(featureName) || [];
      historicalValues.push(importance);
      if (historicalValues.length > 10) {
        historicalValues.shift();  // Держим последние 10
      }
      this.historicalImportance.set(featureName, historicalValues);

      const stability = this.calculateStability(historicalValues);

      // Определяем направление влияния
      const direction = this.determineDirection(featureList, labeledTrades);

      // Вычисляем p-value (простая аппроксимация)
      const pValue = this.estimatePValue(importance, featureList.length);

      importanceScores.push({
        name: featureName,
        importance: Math.abs(importance),
        pValue,
        stability,
        direction,
      });
    });

    // Сортируем по важности и фильтруем по стабильности
    const filtered = importanceScores
      .filter(f => f.stability >= this.config.minStability)
      .sort((a, b) => b.importance - a.importance)
      .slice(0, this.config.topN);

    return filtered;
  }

  /**
   * Correlation-based importance
   */
  private correlationImportance(
    features: MetaLabelingFeature[],
    trades: TripleBarrierLabel[]
  ): number {
    if (features.length !== trades.length) return 0;

    const featureValues = features.map(f => f.value);
    const labels = trades.map(t => t.label);

    return this.correlation(featureValues, labels);
  }

  /**
   * Permutation importance (упрощенная версия)
   */
  private permutationImportance(
    features: MetaLabelingFeature[],
    trades: TripleBarrierLabel[]
  ): number {
    // Базовая метрика (accuracy predicting label sign)
    const baseAccuracy = this.calculatePredictiveAccuracy(features, trades);

    // Перемешиваем фичи
    const shuffled = [...features].sort(() => Math.random() - 0.5);
    const shuffledAccuracy = this.calculatePredictiveAccuracy(shuffled, trades);

    // Важность = разница в accuracy
    return baseAccuracy - shuffledAccuracy;
  }

  /**
   * Gain-based importance (информационный gain)
   */
  private gainImportance(
    features: MetaLabelingFeature[],
    trades: TripleBarrierLabel[]
  ): number {
    // Разбиваем на квантили
    const quantiles = this.getQuantiles(features.map(f => f.value), 5);
    
    let gain = 0;
    const totalEntropy = this.entropy(trades.map(t => t.label));

    for (let i = 0; i < quantiles.length - 1; i++) {
      const subset = trades.filter((_, idx) => 
        features[idx].value >= quantiles[i] && features[idx].value < quantiles[i + 1]
      );
      
      if (subset.length > 0) {
        const subsetEntropy = this.entropy(subset.map(t => t.label));
        const weight = subset.length / trades.length;
        gain += weight * (totalEntropy - subsetEntropy);
      }
    }

    return gain;
  }

  /**
   * Простая accuracy предсказания знака label
   */
  private calculatePredictiveAccuracy(
    features: MetaLabelingFeature[],
    trades: TripleBarrierLabel[]
  ): number {
    if (features.length === 0) return 0;

    // Простое правило: если фича > медианы, предсказываем 1, иначе -1
    const values = features.map(f => f.value);
    const median = this.median(values);

    let correct = 0;
    features.forEach((feature, idx) => {
      const prediction = feature.value > median ? 1 : -1;
      const actual = trades[idx].label;
      if ((prediction > 0 && actual > 0) || (prediction < 0 && actual < 0)) {
        correct++;
      }
    });

    return correct / features.length;
  }

  /**
   * Определяет направление влияния фичи
   */
  private determineDirection(
    features: MetaLabelingFeature[],
    trades: TripleBarrierLabel[]
  ): 'positive' | 'negative' | 'neutral' {
    const correlation = this.correlationImportance(features, trades);
    
    if (correlation > 0.1) return 'positive';
    if (correlation < -0.1) return 'negative';
    return 'neutral';
  }

  /**
   * Вычисляет стабильность важности фичи во времени
   */
  private calculateStability(historicalValues: number[]): number {
    if (historicalValues.length < 2) return 1;

    const mean = historicalValues.reduce((sum, v) => sum + v, 0) / historicalValues.length;
    const stdDev = Math.sqrt(
      historicalValues.map(v => Math.pow(v - mean, 2)).reduce((sum, v) => sum + v, 0) / historicalValues.length
    );

    // Стабильность = 1 - (коэффициент вариации)
    const cv = mean !== 0 ? stdDev / Math.abs(mean) : 1;
    return Math.max(0, 1 - cv);
  }

  /**
   * Оценка p-value (очень упрощенная)
   */
  private estimatePValue(importance: number, sampleSize: number): number {
    // t-statistic аппроксимация
    const tStat = importance * Math.sqrt(sampleSize);
    
    // Очень грубая аппроксимация p-value из t-statistic
    if (Math.abs(tStat) > 3.5) return 0.001;
    if (Math.abs(tStat) > 2.5) return 0.01;
    if (Math.abs(tStat) > 1.96) return 0.05;
    if (Math.abs(tStat) > 1.5) return 0.1;
    return 0.2;
  }

  // === Вспомогательные функции ===

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

  private entropy(labels: number[]): number {
    const counts = new Map<number, number>();
    labels.forEach(l => counts.set(l, (counts.get(l) || 0) + 1));

    let entropy = 0;
    const n = labels.length;
    counts.forEach(count => {
      const p = count / n;
      entropy -= p * Math.log2(p);
    });

    return entropy;
  }

  private median(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  private getQuantiles(values: number[], n: number): number[] {
    const sorted = [...values].sort((a, b) => a - b);
    const quantiles: number[] = [];
    
    for (let i = 0; i <= n; i++) {
      const idx = Math.floor((i / n) * (sorted.length - 1));
      quantiles.push(sorted[idx]);
    }
    
    return quantiles;
  }

  /**
   * Получить историческую важность фичи
   */
  getHistoricalImportance(featureName: string): number[] {
    return this.historicalImportance.get(featureName) || [];
  }

  /**
   * Статистика анализатора
   */
  getStats(): {
    trackedFeatures: number;
    avgStability: number;
    method: string;
  } {
    const stabilities = Array.from(this.historicalImportance.values()).map(
      values => values.length > 0 ? this.calculateStability(values) : 0
    );
    
    return {
      trackedFeatures: this.historicalImportance.size,
      avgStability: stabilities.length > 0 
        ? stabilities.reduce((sum, v) => sum + v, 0) / stabilities.length 
        : 0,
      method: this.config.method,
    };
  }
}
