/**
 * CPU-Optimized Feature Importance Analysis
 * Быстрый анализ важности признаков без тяжелых вычислений
 * 
 * Методы:
 * - Pearson Correlation (O(n), очень быстро)
 * - Mutual Information (аппроксимация)
 * - Permutation Importance (упрощенная)
 */

export interface FeatureImportanceResult {
  name: string;
  importance: number;      // 0-1
  pValue: number;          // Статистическая значимость
  direction: 'positive' | 'negative' | 'neutral';
  stability: number;       // 0-1 (консистентность во времени)
}

export class CpuFeatureImportance {
  // ============================================
  // PEARSON CORRELATION
  // ============================================

  /**
   * Вычисление корреляции Пирсона между двумя массивами
   * O(n) сложность, очень быстро
   */
  static pearsonCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    if (n !== y.length || n === 0) return 0;
    if (n < 3) return 0;  // Недостаточно данных

    // Вычисление средних
    let sumX = 0, sumY = 0;
    for (let i = 0; i < n; i++) {
      sumX += x[i];
      sumY += y[i];
    }
    const meanX = sumX / n;
    const meanY = sumY / n;

    // Вычисление корреляции (one-pass algorithm)
    let num = 0, denX = 0, denY = 0;
    for (let i = 0; i < n; i++) {
      const dx = x[i] - meanX;
      const dy = y[i] - meanY;
      num += dx * dy;
      denX += dx * dx;
      denY += dy * dy;
    }

    const den = Math.sqrt(denX * denY);
    if (den === 0) return 0;

    return num / den;
  }

  /**
   * Вычисление p-value для корреляции
   * Использует t-распределение Стьюдента
   */
  static pValue(correlation: number, n: number): number {
    if (n < 3) return 1;
    
    // t-статистика
    const t = correlation * Math.sqrt((n - 2) / (1 - correlation * correlation + 1e-10));
    
    // Аппроксимация p-value через нормальное распределение (для n > 30)
    return 2 * (1 - this.normalCDF(Math.abs(t)));
  }

  // ============================================
  // MUTUAL INFORMATION (аппроксимация)
  // ============================================

  /**
   * Аппроксимация mutual information через биннинг
   * Быстрее чем полноценный MI, но менее точно
   */
  static mutualInformationApprox(x: number[], y: number[], bins: number = 10): number {
    const n = x.length;
    if (n !== y.length || n === 0) return 0;

    // Биннинг данных
    const xMin = Math.min(...x), xMax = Math.max(...x);
    const yMin = Math.min(...y), yMax = Math.max(...y);
    
    const xBinSize = (xMax - xMin) / bins;
    const yBinSize = (yMax - yMin) / bins;

    // Гистограммы
    const jointHist = Array.from({ length: bins }, () => Array(bins).fill(0));
    const xHist = Array(bins).fill(0);
    const yHist = Array(bins).fill(0);

    for (let i = 0; i < n; i++) {
      const xBin = Math.min(bins - 1, Math.floor((x[i] - xMin) / (xBinSize + 1e-10)));
      const yBin = Math.min(bins - 1, Math.floor((y[i] - yMin) / (yBinSize + 1e-10)));
      
      jointHist[xBin][yBin]++;
      xHist[xBin]++;
      yHist[yBin]++;
    }

    // Вычисление MI
    let mi = 0;
    for (let i = 0; i < bins; i++) {
      for (let j = 0; j < bins; j++) {
        if (jointHist[i][j] === 0) continue;
        
        const pxy = jointHist[i][j] / n;
        const px = xHist[i] / n;
        const py = yHist[j] / n;
        
        if (px > 0 && py > 0) {
          mi += pxy * Math.log(pxy / (px * py) + 1e-10);
        }
      }
    }

    return Math.max(0, mi);
  }

  // ============================================
  // FEATURE ANALYSIS
  // ============================================

  /**
   * Анализ важности всех фич
   */
  static analyze(
    features: Map<string, number[]>,
    target: number[]
  ): FeatureImportanceResult[] {
    const n = target.length;
    const results: FeatureImportanceResult[] = [];

    for (const [name, values] of features) {
      if (values.length !== n) continue;

      // Pearson correlation
      const correlation = this.pearsonCorrelation(values, target);
      const importance = Math.abs(correlation);
      
      // p-value
      const pValue = this.pValue(correlation, n);

      // Direction
      let direction: 'positive' | 'negative' | 'neutral' = 'neutral';
      if (correlation > 0.1) direction = 'positive';
      else if (correlation < -0.1) direction = 'negative';

      // Stability (bootstrap approximation)
      const stability = this.computeStability(values, target);

      results.push({ name, importance, pValue, direction, stability });
    }

    return results.sort((a, b) => b.importance - a.importance);
  }

  /**
   * Вычисление стабильности фичи (bootstrap)
   */
  private static computeStability(values: number[], target: number[], iterations: number = 10): number {
    const n = values.length;
    if (n < 20) return 0.5;  // Недостаточно данных

    const correlations: number[] = [];

    for (let i = 0; i < iterations; i++) {
      // Bootstrap sample
      const indices = new Set<number>();
      while (indices.size < Math.floor(n * 0.8)) {
        indices.add(Math.floor(Math.random() * n));
      }

      const sampleValues = Array.from(indices).map(idx => values[idx]);
      const sampleTarget = Array.from(indices).map(idx => target[idx]);

      correlations.push(this.pearsonCorrelation(sampleValues, sampleTarget));
    }

    // Std dev корреляций (меньше = стабильнее)
    const mean = correlations.reduce((a, b) => a + b, 0) / iterations;
    const variance = correlations.reduce((a, b) => a + (b - mean) ** 2, 0) / iterations;
    const std = Math.sqrt(variance);

    // Конвертация в stability score (0-1)
    return Math.max(0, 1 - std * 10);
  }

  // ============================================
  // PERMUTATION IMPORTANCE (упрощенная)
  // ============================================

  /**
   * Permutation importance для модели
   * Перемешивает фичи и измеряет падение accuracy
   */
  static permutationImportance(
    features: Map<string, number[]>,
    target: number[],
    model: { predict: (f: Map<string, number>) => number },
    iterations: number = 5
  ): FeatureImportanceResult[] {
    const n = target.length;
    const results: FeatureImportanceResult[] = [];

    // Baseline accuracy
    let baselineCorrect = 0;
    for (let i = 0; i < n; i++) {
      const featureMap = new Map<string, number>();
      features.forEach((values, name) => {
        featureMap.set(name, values[i]);
      });
      const pred = model.predict(featureMap);
      if (Math.round(pred) === target[i]) baselineCorrect++;
    }
    const baselineAccuracy = baselineCorrect / n;

    // Permutation для каждой фичи
    for (const [name, values] of features) {
      let accuracyDrop = 0;

      for (let iter = 0; iter < iterations; iter++) {
        // Перемешивание фичи
        const shuffled = [...values].sort(() => Math.random() - 0.5);

        // Accuracy с перемешанной фичей
        let permCorrect = 0;
        for (let i = 0; i < n; i++) {
          const featureMap = new Map<string, number>();
          features.forEach((v, fname) => {
            featureMap.set(fname, fname === name ? shuffled[i] : v[i]);
          });
          const pred = model.predict(featureMap);
          if (Math.round(pred) === target[i]) permCorrect++;
        }
        const permAccuracy = permCorrect / n;
        accuracyDrop += baselineAccuracy - permAccuracy;
      }

      const importance = Math.max(0, accuracyDrop / iterations);
      
      results.push({
        name,
        importance,
        pValue: 0,  // Не вычисляется для permutation
        direction: 'neutral',
        stability: 0.8,  // Заглушка
      });
    }

    return results.sort((a, b) => b.importance - a.importance);
  }

  // ============================================
  // UTILS
  // ============================================

  /**
   * CDF нормального распределения (аппроксимация)
   */
  private static normalCDF(x: number): number {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp(-x * x / 2);
    const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return x > 0 ? 1 - prob : prob;
  }

  /**
   * Отбор топ N фич
   */
  static selectTopFeatures(
    results: FeatureImportanceResult[],
    n: number,
    minImportance: number = 0.1,
    maxPValue: number = 0.05
  ): FeatureImportanceResult[] {
    return results
      .filter(r => r.importance >= minImportance && r.pValue <= maxPValue)
      .slice(0, n);
  }

  /**
   * Отбор фич по порогу важности
   */
  static selectByImportance(
    results: FeatureImportanceResult[],
    threshold: number = 0.3
  ): FeatureImportanceResult[] {
    return results.filter(r => r.importance >= threshold);
  }
}

export default CpuFeatureImportance;
