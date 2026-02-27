// ============================================
// XAI MODULE — Интерпретируемость ML моделей
// Объяснение решений торговых стратегий
// ============================================

import { Trade, BacktestResult } from '@trading-platform/backtester';
import { Candle } from '@trading-platform/core';

// ============================================
// TYPES
// ============================================

export interface FeatureImportance {
  feature: string;
  importance: number;      // 0 to 1
  direction: 'positive' | 'negative' | 'neutral';
  confidence: number;      // 0 to 1
}

export interface TradeExplanation {
  tradeId: string;
  entryTime: number;
  exitTime?: number;
  action: 'BUY' | 'SELL';
  pnl: number;
  
  // Объяснение входа
  entryReasons: FeatureImportance[];
  entryConfidence: number;
  
  // Объяснение выхода
  exitReasons?: FeatureImportance[];
  exitConfidence?: number;
  
  // Контрфактический анализ
  whatIf: {
    noEntry: number;       // PnL если бы не вошли
    earlierExit: number;   // PnL при более раннем выходе
    laterExit: number;     // PnL при более позднем выходе
  };
  
  summary: string;
}

export interface StrategyAnalysis {
  totalTrades: number;
  avgFeaturesPerTrade: number;
  topFeatures: FeatureImportance[];
  weakFeatures: FeatureImportance[];
  featureStability: number;  // Насколько стабильны важности признаков
  
  // Анализ по типам сделок
  winningTradesPattern: FeatureImportance[];
  losingTradesPattern: FeatureImportance[];
  
  // Рекомендации
  recommendations: string[];
}

// ============================================
// SHAP-подобный анализ для трейдинга
// ============================================

export class XAIAnalyzer {
  private featureNames: string[];
  private baseline: Record<string, number> = {};

  constructor(featureNames: string[]) {
    this.featureNames = featureNames;
  }

  /**
   * Анализирует отдельную сделку
   */
  analyzeTrade(
    trade: Trade,
    featureValues: Record<string, number>,
    modelPrediction: number
  ): TradeExplanation {
    const shapValues = this.calculateShapValues(featureValues, modelPrediction);
    const entryReasons = this.extractReasons(shapValues);
    
    // Контрфактический анализ
    const whatIf = this.calculateWhatIf(trade, featureValues);

    return {
      tradeId: trade.id,
      entryTime: trade.entryTime,
      exitTime: trade.exitTime,
      action: trade.side,
      pnl: trade.pnl,
      entryReasons,
      entryConfidence: this.calculateConfidence(shapValues),
      exitReasons: [], // Заполняется при выходе
      exitConfidence: 0,
      whatIf,
      summary: this.generateSummary(entryReasons, trade),
    };
  }

  /**
   * Анализирует всю стратегию
   */
  analyzeStrategy(
    trades: Trade[],
    allFeatureValues: Record<string, number[]>
  ): StrategyAnalysis {
    const featureImportances = this.calculateGlobalFeatureImportance(
      trades,
      allFeatureValues
    );

    const winningTrades = trades.filter(t => t.pnl > 0);
    const losingTrades = trades.filter(t => t.pnl <= 0);

    const winningPattern = this.calculateGlobalFeatureImportance(
      winningTrades,
      allFeatureValues
    );
    const losingPattern = this.calculateGlobalFeatureImportance(
      losingTrades,
      allFeatureValues
    );

    return {
      totalTrades: trades.length,
      avgFeaturesPerTrade: this.featureNames.length,
      topFeatures: featureImportances.slice(0, 5),
      weakFeatures: featureImportances.slice(-5),
      featureStability: this.calculateFeatureStability(allFeatureValues),
      winningTradesPattern: winningPattern.slice(0, 5),
      losingTradesPattern: losingPattern.slice(0, 5),
      recommendations: this.generateRecommendations(featureImportances, winningPattern, losingPattern),
    };
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  private calculateShapValues(
    featureValues: Record<string, number>,
    prediction: number
  ): Record<string, number> {
    // Упрощенная аппроксимация SHAP значений
    // В продакшене использовать library like 'shapjs'
    
    const shapValues: Record<string, number> = {};
    const baselinePrediction = this.getBaselinePrediction();
    
    let totalImportance = 0;
    
    // Рассчитываем вклад каждого признака
    for (const feature of this.featureNames) {
      const value = featureValues[feature] || 0;
      const normalizedValue = this.normalizeFeature(feature, value);
      
      // Простая эвристика: отклонение от базового уровня
      const contribution = (normalizedValue - 0.5) * Math.abs(prediction - baselinePrediction);
      shapValues[feature] = contribution;
      totalImportance += Math.abs(contribution);
    }
    
    // Нормализуем
    if (totalImportance > 0) {
      for (const feature of this.featureNames) {
        shapValues[feature] /= totalImportance;
      }
    }
    
    return shapValues;
  }

  private extractReasons(shapValues: Record<string, number>): FeatureImportance[] {
    const reasons: FeatureImportance[] = [];
    
    for (const [feature, value] of Object.entries(shapValues)) {
      const absValue = Math.abs(value);
      if (absValue < 0.05) continue; // Игнорируем слабые признаки
      
      reasons.push({
        feature,
        importance: absValue,
        direction: value > 0 ? 'positive' : value < 0 ? 'negative' : 'neutral',
        confidence: Math.min(1, absValue * 2),
      });
    }
    
    return reasons.sort((a, b) => b.importance - a.importance);
  }

  private calculateWhatIf(trade: Trade, featureValues: Record<string, number>): {
    noEntry: number;
    earlierExit: number;
    laterExit: number;
  } {
    // Контрфактический анализ
    // noEntry: PnL = 0 (не вошли бы в сделку)
    // earlierExit: Выход на 50% раньше
    // laterExit: Выход на 50% позже
    
    return {
      noEntry: 0,
      earlierExit: trade.pnl * 0.7,  // Эвристика
      laterExit: trade.pnl * 1.1,    // Эвристика
    };
  }

  private calculateConfidence(shapValues: Record<string, number>): number {
    const values = Object.values(shapValues);
    const maxImportance = Math.max(...values.map(Math.abs));
    return Math.min(1, maxImportance * 3);
  }

  private calculateGlobalFeatureImportance(
    trades: Trade[],
    allFeatureValues: Record<string, number[]>
  ): FeatureImportance[] {
    const importances: FeatureImportance[] = [];
    
    for (const feature of this.featureNames) {
      const values = allFeatureValues[feature] || [];
      if (values.length === 0) continue;
      
      // Статистический анализ важности признака
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);
      
      // Коэффициент вариации как мера важности
      const cv = mean !== 0 ? stdDev / Math.abs(mean) : 0;
      
      importances.push({
        feature,
        importance: Math.min(1, cv),
        direction: mean > 0 ? 'positive' : mean < 0 ? 'negative' : 'neutral',
        confidence: Math.min(1, values.length / 100),
      });
    }
    
    return importances.sort((a, b) => b.importance - a.importance);
  }

  private calculateFeatureStability(allFeatureValues: Record<string, number[]>): number {
    // Насколько стабильны важности признаков во времени
    const stabilities: number[] = [];
    
    for (const feature of this.featureNames) {
      const values = allFeatureValues[feature] || [];
      if (values.length < 10) continue;
      
      // Разделяем на две половины и сравниваем
      const mid = Math.floor(values.length / 2);
      const firstHalf = values.slice(0, mid);
      const secondHalf = values.slice(mid);
      
      const mean1 = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const mean2 = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      
      const stability = 1 - Math.abs(mean1 - mean2) / (Math.abs(mean1) + Math.abs(mean2) + 0.001);
      stabilities.push(stability);
    }
    
    return stabilities.length > 0 
      ? stabilities.reduce((a, b) => a + b, 0) / stabilities.length 
      : 0;
  }

  private generateSummary(reasons: FeatureImportance[], trade: Trade): string {
    if (reasons.length === 0) {
      return 'Сделка открыта без четких сигналов (высокий риск)';
    }
    
    const topReason = reasons[0];
    const action = trade.side === 'BUY' ? 'Покупка' : 'Продажа';
    
    return `${action} инициирована преимущественно из-за ${topReason.feature} ` +
           `(${(topReason.importance * 100).toFixed(1)}% важности). ` +
           `Уверенность сигнала: ${(this.calculateConfidence(reasons.reduce((acc, r) => ({...acc, [r.feature]: r.importance}), {})) * 100).toFixed(0)}%`;
  }

  private generateRecommendations(
    all: FeatureImportance[],
    winning: FeatureImportance[],
    losing: FeatureImportance[]
  ): string[] {
    const recommendations: string[] = [];
    
    // Находим признаки, которые важны в проигрышных сделках
    const losingFeatures = new Set(losing.map(f => f.feature));
    const winningFeatures = new Set(winning.map(f => f.feature));
    
    // Признаки, которые коррелируют с убытками
    for (const feature of losingFeatures) {
      if (!winningFeatures.has(feature)) {
        recommendations.push(
          `⚠️ Признак "${feature}" коррелирует с убыточными сделками. Рассмотрите возможность его исключения.`
        );
      }
    }
    
    // Признаки, которые коррелируют с прибылью
    for (const feature of winningFeatures) {
      if (!losingFeatures.has(feature)) {
        recommendations.push(
          `✅ Признак "${feature}" коррелирует с прибыльными сделками. Увеличьте его вес.`
        );
      }
    }
    
    // Общая стабильность
    const topFeature = all[0];
    if (topFeature && topFeature.importance < 0.3) {
      recommendations.push(
        `📊 Ни один признак не доминирует (макс. важность ${(topFeature.importance * 100).toFixed(1)}%). ` +
        'Стратегия может быть переоптимизирована.'
      );
    }
    
    return recommendations;
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private getBaselinePrediction(): number {
    return 0; // Базовая линия - нейтральное предсказание
  }

  private normalizeFeature(feature: string, value: number): number {
    // Нормализация признака к диапазону [0, 1]
    // В продакшене использовать параметры нормализации из обучения
    return 1 / (1 + Math.exp(-value)); // Sigmoid
  }
}

// ============================================
// VISUALIZATION HELPERS
// ============================================

export function generateWaterfallChart(
  explanation: TradeExplanation
): string {
  // Генерация данных для waterfall chart
  let cumulative = 0;
  const bars: string[] = [];
  
  bars.push(`Base: ${cumulative.toFixed(2)}`);
  
  for (const reason of explanation.entryReasons.slice(0, 5)) {
    const contribution = reason.direction === 'positive' ? reason.importance : -reason.importance;
    cumulative += contribution;
    bars.push(`${reason.feature}: ${contribution.toFixed(2)}`);
  }
  
  bars.push(`Total: ${cumulative.toFixed(2)}`);
  
  return bars.join(' → ');
}

export function exportToJSON(explanations: TradeExplanation[]): string {
  return JSON.stringify(explanations, null, 2);
}

// ============================================
// EXPORTS
// ============================================

export default XAIAnalyzer;
