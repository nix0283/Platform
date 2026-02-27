# 🖥️ CPU-OPTIMIZED ML ADAPTATION PLAN

## Аппаратные ограничения

| Компонент | Спецификация | Влияние на ML |
|-----------|--------------|---------------|
| **CPU** | Intel Core i7-4790 (4C/8T, 3.6-4.0 GHz, Haswell) | ❌ Нет AVX2 для современных библиотек |
| **RAM** | 32GB DDR3 | ⚠️ Ограничено для больших моделей |
| **GPU** | Встроенная (Intel HD 4600) | ❌ **Нет CUDA** — только CPU inference |
| **SSD** | 500GB M.2 | ✅ Достаточно для моделей и кэша |

---

## 🎯 РЕШЕНИЕ: Гибридный подход к ML

### Вариант A: Полная ML система (рекомендуется)

**Преимущества:**
- Сохраняем все конкурентные преимущества
- Self-learning улучшает стратегии со временем
- Meta-labeling фильтрует ложные сигналы

**Ограничения:**
- Inference время: 50-200ms (вместо 5-10ms на GPU)
- Обучение только в фоне (не в реальном времени)
- Максимум 2-3 модели одновременно

**Техническая реализация:**
```
┌─────────────────────────────────────────────────────────────┐
│                    ML ARCHITECTURE (CPU)                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │  Training       │    │  Inference      │                │
│  │  (Background)   │    │  (Real-time)    │                │
│  │                 │    │                 │                │
│  │ • Nightly only  │    │ • ONNX Runtime  │                │
│  │ • Small batches │    │ • Quantized     │                │
│  │ • CPU threads=4 │    │ • Batch size=1  │                │
│  └────────┬────────┘    └────────┬────────┘                │
│           │                      │                          │
│           └──────────┬───────────┘                          │
│                      │                                      │
│           ┌──────────▼───────────┐                          │
│           │   Model Storage      │                          │
│           │   - ONNX format      │                          │
│           │   - int8 quantized   │                          │
│           │   - < 50MB each      │                          │
│           └──────────────────────┘                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Вариант B: Упрощенная ML система (альтернатива)

**Если CPU нагрузка слишком высока:**

| Компонент | Статус | Альтернатива |
|-----------|--------|--------------|
| **Self-Learning** | ⚠️ Упростить | Правило-базированный анализ |
| **Meta-Labeling** | ✅ Оставить | Логистическая регрессия (быстрая) |
| **RL Agent** | ❌ Отключить | Слишком тяжело для CPU |
| **Graph Analysis** | ⚠️ Упростить | Простая корреляция (Pearson) |
| **XAI** | ✅ Оставить | Feature importance (легкий) |
| **Synthetic Data** | ⚠️ Упростить | Только Monte Carlo (быстро) |

---

## 📦 ТЕХНИЧЕСКАЯ РЕАЛИЗАЦИЯ

### 1. ONNX Runtime для CPU Inference

```typescript
// packages/ml/src/cpu-optimized/onnx-inference.ts

import * as onnx from 'onnxruntime-node';

export class CpuOptimizedInference {
  private session: onnx.InferenceSession | null = null;
  private sessionOptions: onnx.InferenceSession.SessionOptions;

  constructor() {
    this.sessionOptions = {
      executionProviders: ['cpu'],
      graphOptimizationLevel: 'all',
      intraOpNumThreads: 4,  // i7-4790 = 4 физических ядра
      interOpNumThreads: 2,
      enableCpuMemArena: true,
    };
  }

  async loadModel(modelPath: string): Promise<void> {
    this.session = await onnx.InferenceSession.create(
      modelPath,
      this.sessionOptions
    );
  }

  async infer(input: Float32Array): Promise<Float32Array> {
    if (!this.session) throw new Error('Model not loaded');

    const tensor = new onnx.Tensor('float32', input, [1, input.length]);
    const results = await this.session.run({ input: tensor });
    
    return results.output.data as Float32Array;
  }

  // Квантованная инференция (int8)
  async inferQuantized(input: Int8Array): Promise<Float32Array> {
    // Конвертация int8 → float32
    const floatInput = new Float32Array(input.length);
    for (let i = 0; i < input.length; i++) {
      floatInput[i] = input[i] / 128.0;  // Де-квантование
    }
    return this.infer(floatInput);
  }
}
```

### 2. Модель для Meta-Labeling (Логистическая регрессия)

```typescript
// packages/ml/src/cpu-optimized/meta-labeling-lite.ts

export class LightweightMetaLabeling {
  private weights: Float32Array;
  private bias: number = 0;
  private featureNames: string[] = [];

  constructor(featureNames: string[]) {
    this.featureNames = featureNames;
    this.weights = new Float32Array(featureNames.length);
    // Инициализация весов (будут обучены)
    for (let i = 0; i < this.weights.length; i++) {
      this.weights[i] = (Math.random() - 0.5) * 0.1;
    }
  }

  // Сигмоида для бинарной классификации
  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, x))));
  }

  predict(features: Map<string, number>): {
    label: 0 | 1;
    confidence: number;
  } {
    let sum = this.bias;
    
    for (let i = 0; i < this.featureNames.length; i++) {
      const value = features.get(this.featureNames[i]) || 0;
      sum += this.weights[i] * value;
    }

    const probability = this.sigmoid(sum);
    const label: 0 | 1 = probability >= 0.5 ? 1 : 0;

    return {
      label,
      confidence: probability >= 0.5 ? probability : 1 - probability,
    };
  }

  // Online обучение (SGD)
  train(features: Map<string, number>, label: number, learningRate: number = 0.01): void {
    const prediction = this.predict(features);
    const error = label - prediction.confidence;

    // Обновление весов
    for (let i = 0; i < this.featureNames.length; i++) {
      const value = features.get(this.featureNames[i]) || 0;
      this.weights[i] += learningRate * error * value;
    }
    this.bias += learningRate * error;
  }

  // Экспорт в ONNX
  exportToONNX(): Uint8Array {
    // Сериализация модели для ONNX Runtime
    const modelData = {
      weights: Array.from(this.weights),
      bias: this.bias,
      featureNames: this.featureNames,
    };
    return Buffer.from(JSON.stringify(modelData));
  }
}
```

### 3. Feature Importance (CPU-optimized)

```typescript
// packages/ml/src/cpu-optimized/feature-importance-lite.ts

export class LightweightFeatureImportance {
  // Корреляция Пирсона (быстрая, O(n))
  static pearsonCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    if (n !== y.length || n === 0) return 0;

    const meanX = x.reduce((a, b) => a + b, 0) / n;
    const meanY = y.reduce((a, b) => a + b, 0) / n;

    let num = 0, denX = 0, denY = 0;
    for (let i = 0; i < n; i++) {
      const dx = x[i] - meanX;
      const dy = y[i] - meanY;
      num += dx * dy;
      denX += dx * dx;
      denY += dy * dy;
    }

    const den = Math.sqrt(denX * denY);
    return den === 0 ? 0 : num / den;
  }

  // Анализ важности фич
  static analyze(
    features: Map<string, number[]>,
    target: number[]
  ): Array<{ name: string; importance: number; pValue: number }> {
    const results: Array<{ name: string; importance: number; pValue: number }> = [];

    for (const [name, values] of features) {
      const correlation = this.pearsonCorrelation(values, target);
      const importance = Math.abs(correlation);
      
      // Упрощенный p-value (для n > 30)
      const n = values.length;
      const t = correlation * Math.sqrt((n - 2) / (1 - correlation * correlation + 0.0001));
      const pValue = 2 * (1 - this.normalCDF(Math.abs(t)));

      results.push({ name, importance, pValue });
    }

    return results.sort((a, b) => b.importance - a.importance);
  }

  // CDF нормального распределения (аппроксимация)
  private static normalCDF(x: number): number {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp(-x * x / 2);
    const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return x > 0 ? 1 - prob : prob;
  }
}
```

---

## 📊 ОЖИДАЕМАЯ ПРОИЗВОДИТЕЛЬНОСТЬ

### Inference Время (i7-4790, CPU)

| Модель | Размер | Время inference | Частота обновления |
|--------|--------|-----------------|-------------------|
| **Meta-Labeling Lite** | < 1 MB | 1-5 ms | Real-time (100Hz) |
| **Feature Importance** | < 1 MB | 10-50 ms | Per trade |
| **Pattern Recognition** | < 5 MB | 50-100 ms | Per candle |
| **XAI Analyzer** | < 2 MB | 20-50 ms | On demand |
| **RL Agent** | ~50 MB | 200-500 ms | ❌ Отключить |
| **Graph Analysis** | ~10 MB | 100-200 ms | 1Hz |

### Обучение (Background, Nightly)

| Задача | Время (32GB RAM) | Расписание |
|--------|------------------|------------|
| **Meta-Labeling** | 5-10 мин | Каждую ночь |
| **Feature Importance** | 2-5 мин | После каждой сделки |
| **Pattern Mining** | 10-20 мин | Еженедельно |
| **Full Retraining** | 30-60 мин | Еженедельно (ночь) |

---

## 🔧 МОДИФИКАЦИИ СУЩЕСТВУЮЩЕГО КОДА

### 1. Обновить SelfLearningManager

```typescript
// packages/ml/src/self-learning/manager.ts
// Добавить импорт CPU-optimized версий

import { LightweightMetaLabeling } from '../cpu-optimized/meta-labeling-lite';
import { LightweightFeatureImportance } from '../cpu-optimized/feature-importance-lite';

// Заменить тяжелые модели на легкие
private metaLabeling: LightweightMetaLabeling;  // Вместо MetaLabelingModel
private featureImportance: typeof LightweightFeatureImportance;  // Статический класс
```

### 2. Обновить backend (Rust)

```toml
# backend/Cargo.toml
# Добавить зависимости для CPU ML

[dependencies]
# ONNX Runtime для Rust
ort = { version = "2", features = ["download-binaries"] }
ndarray = "0.15"
ndarray-npy = "0.9"

# Математика для статистики
statrs = "0.17"
```

### 3. Конвертация существующих моделей в ONNX

```python
# scripts/convert_models_to_onnx.py
import torch
import onnx

# Загрузить PyTorch модель
model = torch.load('models/meta-labeling.pth')
model.eval()

# Экспорт в ONNX
dummy_input = torch.randn(1, 20)  # 20 фич
torch.onnx.export(
    model,
    dummy_input,
    'models/meta-labeling.onnx',
    opset_version=11,
    do_constant_folding=True,
    optimization=True  # CPU оптимизации
)

# Квантование (опционально)
import onnxruntime.quantization as quant
quant.quantize_dynamic(
    'models/meta-labeling.onnx',
    'models/meta-labeling-quantized.onnx',
    weight_type=quant.QuantType.QUInt8
)
```

---

## ✅ РЕКОМЕНДАЦИЯ

**Использовать Вариант A (Полная ML система) с оптимизациями:**

1. ✅ **Meta-Labeling** — Логистическая регрессия (быстро, эффективно)
2. ✅ **Feature Importance** — Корреляция Пирсона (O(n), очень быстро)
3. ✅ **XAI** — SHAP-аппроксимация (легкая версия)
4. ✅ **Synthetic Data** — Monte Carlo только (GBM отключить)
5. ❌ **RL Agent** — Отключить (слишком тяжело для CPU)
6. ⚠️ **Graph Analysis** — Упростить до корреляционной матрицы

**Ожидаемый результат:**
- ML inference: < 100ms (приемлемо для swing trading)
- CPU загрузка: 20-40% в фоне
- RAM использование: < 2GB для ML
- Без влияния на trading execution

---

**Следующий шаг:** Реализация Email Sync Service
