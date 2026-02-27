# 🔬 Auto-Research Documentation

Система авто-исследования и оптимизации стратегий.

---

## 📋 Содержание

- [Overview](#overview)
- [AutoML](#automl)
- [Optimization](#optimization)
- [Walk-Forward](#walk-forward)
- [Demo Trading](#demo-trading)
- [Manager](#manager)
- [Examples](#examples)

---

## Overview

Auto-Research автоматически исследует, оптимизирует и валидирует торговые стратегии.

**Компоненты:**
1. AutoML - Автоматическое обучение ML моделей
2. Optimization - Оптимизация параметров
3. Walk-Forward - Валидация на скользящих окнах
4. Demo Trading - Демо-трейдинг (3-4 месяца)
5. Auto-Deployment - Авто-деплой в production

---

## AutoML

### Конфигурация
```typescript
import { createAutoMLEngine } from '@trading-platform/auto-research';

const automl = createAutoMLEngine({
  models: [
    { type: 'linear_regression', horizons: [1, 5, 10] },
    { type: 'random_forest', horizons: [1, 5, 10] },
    { type: 'xgboost', horizons: [1, 5, 10] },
    { type: 'lstm', horizons: [1, 5, 10] },
  ],
  maxModels: 10,
  ensembleMethod: 'weighted',
});
```

### Обучение
```typescript
const performances = await automl.train(trainingData);

const bestModel = automl.getBestModel('sharpe');
console.log(`Best: ${bestModel.id}, Sharpe: ${bestModel.performance.sharpeRatio}`);
```

### Предсказание
```typescript
const predictions = automl.predict(
  'BTC/USDT',
  ['model_1', 'model_2'],
  { rsi: 50, ema: 50500 },
  [1, 5, 10]  // horizons
);
```

---

## Optimization

### Методы оптимизации
- Grid Search
- Random Search
- Bayesian Optimization
- Genetic Algorithm
- Particle Swarm

### Конфигурация
```typescript
import { createStrategyOptimizer } from '@trading-platform/auto-research';

const optimizer = createStrategyOptimizer('bayesian', [
  { name: 'lookback', type: 'discrete', min: 10, max: 100, step: 5 },
  { name: 'threshold', type: 'continuous', min: 0, max: 1, step: 0.01 },
], {
  maxIterations: 100,
  objective: 'sharpe',
  earlyStopping: true,
});
```

### Запуск оптимизации
```typescript
const backtestFn = async (parameters) => {
  return {
    totalReturn: 20,
    sharpeRatio: 2.5,
    maxDrawdown: 10,
    totalTrades: 50,
    winRate: 0.6,
  };
};

const report = await optimizer.optimize(backtestFn);
console.log(`Best Sharpe: ${report.bestResult.metrics.sharpeRatio}`);
```

---

## Walk-Forward

### Конфигурация
```typescript
import { createWalkForwardValidator } from '@trading-platform/auto-research';

const wf = createWalkForwardValidator({
  trainingPeriod: 180,    // 6 месяцев
  validationPeriod: 30,   // 1 месяц
  testPeriod: 30,         // 1 месяц
  stepSize: 30,           // Шаг 30 дней
});
```

### Валидация
```typescript
const backtestFn = async (startDate, endDate, parameters) => {
  return {
    totalReturn: 15,
    sharpeRatio: 2.0,
    maxDrawdown: 8,
    totalTrades: 30,
    winRate: 0.55,
    profitFactor: 2.0,
  };
};

const report = await wf.validate(startDate, endDate, {}, backtestFn);

console.log(`
  Stability: ${report.stabilityScore}
  Overfitting: ${report.overfittingDetected}
  Recommendations: ${report.recommendations.join(', ')}
`);
```

---

## Demo Trading

### Конфигурация
```typescript
import { createDemoTradingManager } from '@trading-platform/auto-research';

const demo = createDemoTradingManager(90, {  // 90 дней
  successCriteria: {
    minReturn: 5,         // 5% за период
    maxDrawdown: 10,      // 10% макс.
    minSharpeRatio: 1.5,  // Sharpe > 1.5
    minTrades: 30,        // Мин. 30 сделок
  },
  deploymentThreshold: 0.75,  // 75% критериев
});
```

### Запуск
```typescript
demo.start();

// Мониторинг
const state = demo.getState();
console.log(`
  Days Remaining: ${state.daysRemaining}
  Total Return: ${state.totalReturn}%
  Sharpe Ratio: ${state.sharpeRatio}
  Deployment Ready: ${state.deploymentReady}
`);

// Отчет
const report = demo.generateReport('total');
```

---

## Manager

### Быстрый старт
```typescript
import { createAutoResearchManager } from '@trading-platform/auto-research';

const autoResearch = createAutoResearchManager({
  target: {
    targetReturn: 10,
    targetPeriod: 'month',
    maxDrawdown: 15,
    minSharpeRatio: 1.5,
  },
  demoTrading: {
    duration: 90,
  },
});

await autoResearch.start({
  targetReturn: 10,
  targetPeriod: 'month',
  maxDrawdown: 15,
  minSharpeRatio: 1.5,
  priority: 'sharpe',
});
```

### Мониторинг
```typescript
const state = autoResearch.getState();
console.log(`
  Phase: ${state.currentPhase}
  Progress: ${state.progress}%
  Best Strategy: ${state.bestStrategy?.id}
  Demo Ready: ${state.demoState?.deploymentReady}
`);
```

### Отчеты
```typescript
const report = autoResearch.generateReport('weekly');
console.log(`
  Strategies Researched: ${report.strategiesResearched}
  Best Return: ${report.bestStrategy.return}%
  Demo Performance: ${report.demoPerformance?.totalReturn}%
`);
```

---

## Examples

### Интеграция с Auto-Trading
```typescript
autoResearch.onEvent((event) => {
  if (event.type === 'strategy_deployed') {
    autoTrading.addStrategy(event.deploymentStatus.strategy);
  }
});
```

### Интеграция с Self-Learning
```typescript
const predictions = selfLearning.predictSignal(marketState);
automl.train({ features: predictions });
```

### Pipeline
```typescript
// 1. AutoML
await autoResearch.runAutoMLPhase();

// 2. Optimization
await autoResearch.runOptimizationPhase();

// 3. Walk-Forward
await autoResearch.runWalkForwardPhase();

// 4. Demo Trading (90 days)
await autoResearch.runDemoTradingPhase();

// 5. Deployment
if (state.demoState.deploymentReady) {
  await autoResearch.runDeploymentPhase();
}
```

---

## 📊 Метрики

| Метрика | Описание | Target |
|---------|----------|--------|
| **MAE/MSE** | Ошибки предсказания | <0.05 |
| **Directional Accuracy** | % правильных направлений | >55% |
| **Stability Score** | Стабильность между folds | >0.7 |
| **Overfitting Score** | Score переобучения | <0.3 |
| **Deployment Confidence** | Уверенность для deployment | >0.75 |

---

## 📈 Pipeline

```
AutoML (10-30%)
    ↓
Optimization (30-60%)
    ↓
Walk-Forward (60-80%)
    ↓
Demo Trading (80-95%)
    ↓
Deployment (95-100%)
```

---

**Последнее обновление:** 2025-01-22  
**Версия:** 1.0.0
