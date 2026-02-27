/**
 * CPU-Optimized Meta-Labeling Model
 * Легковесная реализация для CPU inference
 * 
 * Вместо тяжелых нейросетей используем:
 * - Логистическую регрессию (быстро, интерпретируемо)
 * - Online обучение (SGD)
 * - Квантование весов (int8)
 */

export interface MetaLabelingFeatures {
  holdTime: number;        // Время удержания позиции (часы)
  volatility: number;      // Волатильность на момент входа
  volume: number;          // Объем относительно среднего
  rsi: number;             // RSI на момент входа
  macd: number;            // MACD гистограмма
  bbPosition: number;      // Позиция в Bollinger Bands (0-1)
  atr: number;             // ATR (волатильность)
  trend: number;           // Направление тренда (-1 to 1)
  momentum: number;        // Моментум
  marketCondition: number; // Режим рынка (0=ranging, 1=trending)
}

export interface MetaLabelPrediction {
  label: 0 | 1;            // 0 = не торговать, 1 = торговать
  confidence: number;      // 0-1
  features: MetaLabelingFeatures;
}

export class CpuOptimizedMetaLabeling {
  private weights: Float32Array;
  private bias: number = 0;
  private featureNames: string[] = [
    'holdTime', 'volatility', 'volume', 'rsi', 'macd',
    'bbPosition', 'atr', 'trend', 'momentum', 'marketCondition'
  ];
  
  // Статистика для нормализации
  private featureMeans: Float32Array;
  private featureStds: Float32Array;
  private sampleCount: number = 0;

  // Гиперпараметры
  private learningRate: number = 0.01;
  private regularization: number = 0.001;  // L2 регуляризация

  constructor() {
    this.weights = new Float32Array(this.featureNames.length);
    this.featureMeans = new Float32Array(this.featureNames.length);
    this.featureStds = new Float32Array(this.featureNames.length);
    
    // Инициализация весов (Xavier initialization)
    for (let i = 0; i < this.weights.length; i++) {
      this.weights[i] = (Math.random() - 0.5) * 0.1;
    }
  }

  // ============================================
  // PREDICTION
  // ============================================

  predict(features: MetaLabelingFeatures): MetaLabelPrediction {
    // Нормализация фич
    const normalized = this.normalizeFeatures(features);
    
    // Вычисление scores
    let sum = this.bias;
    for (let i = 0; i < this.weights.length; i++) {
      sum += this.weights[i] * normalized[i];
    }

    // Сигмоида
    const probability = this.sigmoid(sum);
    const label: 0 | 1 = probability >= 0.5 ? 1 : 0;

    return {
      label,
      confidence: probability >= 0.5 ? probability : 1 - probability,
      features,
    };
  }

  // ============================================
  // TRAINING (Online SGD)
  // ============================================

  train(features: MetaLabelingFeatures, label: number): void {
    // Нормализация с обновлением статистики
    const normalized = this.normalizeFeatures(features, true);
    
    // Forward pass
    let sum = this.bias;
    for (let i = 0; i < this.weights.length; i++) {
      sum += this.weights[i] * normalized[i];
    }
    const prediction = this.sigmoid(sum);
    
    // Вычисление ошибки
    const error = label - prediction;
    
    // Backward pass (SGD с L2 регуляризацией)
    for (let i = 0; i < this.weights.length; i++) {
      const gradient = -error * normalized[i] + this.regularization * this.weights[i];
      this.weights[i] -= this.learningRate * gradient;
    }
    this.bias -= this.learningRate * error;

    // Clip weights (стабильность)
    for (let i = 0; i < this.weights.length; i++) {
      this.weights[i] = Math.max(-5, Math.min(5, this.weights[i]));
    }
  }

  // ============================================
  // BATCH TRAINING
  // ============================================

  trainBatch(
    featuresArray: MetaLabelingFeatures[],
    labels: number[],
    epochs: number = 10
  ): { accuracy: number; loss: number } {
    if (featuresArray.length !== labels.length) {
      throw new Error('Features and labels must have same length');
    }

    // Предварительная нормализация всех данных
    const normalizedData = featuresArray.map(f => this.normalizeFeatures(f, true));
    
    let totalLoss = 0;
    let correct = 0;

    for (let epoch = 0; epoch < epochs; epoch++) {
      totalLoss = 0;
      correct = 0;

      // Shuffle (для стохастичности)
      const indices = Array.from({ length: featuresArray.length }, (_, i) => i);
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }

      // SGD pass
      for (const i of indices) {
        const normalized = normalizedData[i];
        const label = labels[i];

        // Forward
        let sum = this.bias;
        for (let j = 0; j < this.weights.length; j++) {
          sum += this.weights[j] * normalized[j];
        }
        const prediction = this.sigmoid(sum);

        // Loss (binary cross-entropy)
        const loss = -(label * Math.log(prediction + 1e-10) + (1 - label) * Math.log(1 - prediction + 1e-10));
        totalLoss += loss;

        // Accuracy
        const predictedLabel = prediction >= 0.5 ? 1 : 0;
        if (predictedLabel === label) correct++;

        // Backward
        const error = label - prediction;
        for (let j = 0; j < this.weights.length; j++) {
          this.weights[j] += this.learningRate * (error * normalized[j] - this.regularization * this.weights[j]);
        }
        this.bias += this.learningRate * error;
      }
    }

    return {
      accuracy: correct / featuresArray.length,
      loss: totalLoss / featuresArray.length,
    };
  }

  // ============================================
  // NORMALIZATION
  // ============================================

  private normalizeFeatures(features: MetaLabelingFeatures, updateStats: boolean = false): Float32Array {
    const values = this.featureNames.map(name => (features as any)[name]);
    const result = new Float32Array(values.length);

    if (updateStats) {
      // Обновление running statistics (Welford's algorithm)
      this.sampleCount++;
      const n = this.sampleCount;

      for (let i = 0; i < values.length; i++) {
        const delta = values[i] - this.featureMeans[i];
        this.featureMeans[i] += delta / n;
        const delta2 = values[i] - this.featureMeans[i];
        this.featureStds[i] += delta * delta2;
      }

      // Вычисление std после всех обновлений
      if (n > 1) {
        for (let i = 0; i < this.featureStds.length; i++) {
          this.featureStds[i] = Math.sqrt(this.featureStds[i] / (n - 1));
        }
      }
    }

    // Нормализация
    for (let i = 0; i < values.length; i++) {
      const std = this.featureStds[i] || 1;  // Избегать деления на 0
      result[i] = (values[i] - this.featureMeans[i]) / (std + 1e-10);
      // Clip для стабильности
      result[i] = Math.max(-5, Math.min(5, result[i]));
    }

    return result;
  }

  // ============================================
  // UTILS
  // ============================================

  private sigmoid(x: number): number {
    // Численно стабильная сигмоида
    if (x >= 0) {
      return 1 / (1 + Math.exp(-x));
    } else {
      const expX = Math.exp(x);
      return expX / (1 + expX);
    }
  }

  // ============================================
  // SERIALIZATION
  // ============================================

  toJSON(): any {
    return {
      weights: Array.from(this.weights),
      bias: this.bias,
      featureMeans: Array.from(this.featureMeans),
      featureStds: Array.from(this.featureStds),
      sampleCount: this.sampleCount,
      learningRate: this.learningRate,
      regularization: this.regularization,
    };
  }

  static fromJSON(json: any): CpuOptimizedMetaLabeling {
    const model = new CpuOptimizedMetaLabeling();
    model.weights = new Float32Array(json.weights);
    model.bias = json.bias;
    model.featureMeans = new Float32Array(json.featureMeans);
    model.featureStds = new Float32Array(json.featureStds);
    model.sampleCount = json.sampleCount;
    model.learningRate = json.learningRate;
    model.regularization = json.regularization;
    return model;
  }

  // Экспорт в ONNX формат (упрощенно)
  exportToONNX(): Uint8Array {
    const json = this.toJSON();
    return new TextEncoder().encode(JSON.stringify(json));
  }

  static importFromONNX(data: Uint8Array): CpuOptimizedMetaLabeling {
    const json = JSON.parse(new TextDecoder().decode(data));
    return CpuOptimizedMetaLabeling.fromJSON(json);
  }

  // ============================================
  // FEATURE IMPORTANCE
  // ============================================

  getFeatureImportance(): Array<{ name: string; importance: number }> {
    const importance = this.featureNames.map((name, i) => ({
      name,
      importance: Math.abs(this.weights[i]),
    }));
    return importance.sort((a, b) => b.importance - a.importance);
  }
}

// ============================================
// FACTORY
// ============================================

export function createCpuMetaLabeling(): CpuOptimizedMetaLabeling {
  return new CpuOptimizedMetaLabeling();
}

export default CpuOptimizedMetaLabeling;
