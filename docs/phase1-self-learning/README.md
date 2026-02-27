# 🧠 Self-Learning Documentation

Система самообучения на торговле пользователя.

---

## 📋 Содержание

- [Overview](#overview)
- [Triple Barrier Method](#triple-barrier-method)
- [Meta-Labeling](#meta-labeling)
- [Feature Importance](#feature-importance)
- [Manager](#manager)
- [Examples](#examples)

---

## Overview

Self-Learning система анализирует вашу торговлю и автоматически извлекает паттерны успешных сделок.

**Компоненты:**
1. Triple Barrier Method - Разметка сделок
2. Meta-Labeling - Улучшение сигналов
3. Feature Importance - Важность индикаторов
4. Pattern Recognition - Распознавание паттернов

---

## Triple Barrier Method

### Концепция
Разметка сделок по трем барьерам:
- **Vertical Barrier** - Выход по времени
- **Horizontal Upper Barrier** - Take Profit
- **Horizontal Lower Barrier** - Stop Loss

### Использование
```typescript
import { TripleBarrierMethod } from '@trading-platform/ml';

const method = new TripleBarrierMethod({
  timeHorizon: 3,      // 3 дня
  profitTarget: 5,     // 5%
  stopLoss: 2,         // 2%
});

const label = method.labelTrade({
  tradeId: 'trade_1',
  entryTime: Date.now(),
  entryPrice: 50000,
  exitTime: Date.now() + 1000000,
  exitPrice: 52000,
  side: 'LONG',
});

console.log(label);
// { label: 1, touchedBarrier: 'upper', return: 0.04 }
```

### Методы
- `labelTrade(trade)` - Разметка одной сделки
- `labelTrades(trades[])` - Пакетная разметка
- `getStatistics(labels)` - Статистика
- `optimizeParameters(trades, grid)` - Оптимизация

---

## Meta-Labeling

### Концепция
Вторичная модель для фильтрации сигналов:
- Первичная стратегия генерирует сигнал
- Meta-модель решает стоит ли торговать

### Использование
```typescript
import { MetaLabelingModel, MetaLabelingFeatureFactory } from '@trading-platform/ml';

const model = new MetaLabelingModel({
  modelType: 'simple',
  minConfidence: 0.6,
});

// Обучение
const result = model.train(labeledTrades, features);
console.log(`Accuracy: ${result.accuracy}, Improvement: ${result.improvement}%`);

// Предсказание
const features = MetaLabelingFeatureFactory.extractFromMarketState(marketState);
const prediction = model.predict(features);

if (prediction.metaLabel === 1 && prediction.confidence > 0.6) {
  // Торговать сигнал
}
```

### Методы
- `train(trades, features)` - Обучение
- `predict(features)` - Предсказание
- `filterSignals(signals[])` - Фильтрация
- `getStats()` - Статистика

---

## Feature Importance

### Концепция
Определение важных индикаторов для прибыльных сделок.

**Методы:**
- Correlation
- Permutation
- Gain (Information Gain)
- SHAP (планируется)

### Использование
```typescript
import { FeatureImportanceAnalyzer } from '@trading-platform/ml';

const analyzer = new FeatureImportanceAnalyzer({
  method: 'correlation',
  minStability: 0.5,
  topN: 10,
});

const importance = analyzer.analyze(labeledTrades, features);

importance.forEach(f => {
  console.log(`${f.name}: ${f.importance} (${f.direction})`);
});
// RSI: 0.85 (positive)
// EMA: 0.72 (positive)
// Volume: 0.45 (neutral)
```

### Методы
- `analyze(trades, features)` - Анализ
- `getHistoricalImportance(name)` - История
- `getStats()` - Статистика

---

## Manager

### Концепция
Главный модуль управления самообучением.

### Использование
```typescript
import { createSelfLearningManager } from '@trading-platform/ml';

const manager = createSelfLearningManager({
  tripleBarrier: {
    timeHorizon: 3,
    profitTarget: 5,
    stopLoss: 2,
  },
  metaLabeling: {
    enabled: true,
    minConfidence: 0.6,
  },
  retraining: {
    enabled: true,
    minTrades: 50,
  },
});

// Анализ сделки
const result = await manager.analyzeTrade({
  tradeId: 'trade_1',
  symbol: 'BTC/USDT',
  side: 'LONG',
  entryPrice: 50000,
  exitPrice: 52000,
  pnl: 200,
  pnlPercent: 4,
  indicators: { rsi: 45, ema: 49500 },
});

// Предсказание
const prediction = manager.predictSignal({
  symbol: 'BTC/USDT',
  price: 51000,
  indicators: { rsi: 50, ema: 50500 },
  volatility: 0.02,
  volume: 1000,
});

if (prediction.shouldTrade) {
  console.log(`Trade with ${prediction.confidence * 100}% confidence`);
}

// Статистика
const stats = manager.getStats();
console.log(`Win Rate: ${stats.overallWinRate * 100}%`);
```

### Методы
- `analyzeTrade(trade)` - Анализ сделки
- `predictSignal(marketState)` - Предсказание
- `trainMetaModel()` - Обучение meta-модели
- `getStats()` - Статистика
- `exportData()` - Экспорт данных
- `onEvent(listener)` - Подписка на события

---

## Examples

### Интеграция с Journal
```typescript
journal.onTradeCreated((trade) => {
  selfLearning.analyzeTrade({
    tradeId: trade.id,
    symbol: trade.symbol,
    side: trade.side,
    entryPrice: trade.entryPrice,
    exitPrice: trade.exitPrice,
    pnl: trade.pnl,
    pnlPercent: trade.pnlPercent,
    indicators: trade.indicators,
  });
});
```

### Интеграция с Auto-Trading
```typescript
autoTrading.onSignal((signal) => {
  const prediction = selfLearning.predictSignal(signal.marketState);
  if (prediction.shouldTrade) {
    autoTrading.execute(signal);
  }
});
```

### Мониторинг
```typescript
selfLearning.onEvent((event) => {
  switch (event.type) {
    case 'trade_analyzed':
      console.log(`Trade ${event.tradeId} analyzed`);
      break;
    case 'pattern_discovered':
      console.log(`New pattern: ${event.pattern.name}`);
      break;
    case 'model_retrained':
      console.log(`Model v${event.version} trained`);
      break;
  }
});
```

---

## 📊 Метрики

| Метрика | Описание | Target |
|---------|----------|--------|
| **Triple Barrier Accuracy** | Точность разметки | >80% |
| **Meta-Label Improvement** | % улучшения win rate | >10% |
| **Feature Stability** | Стабильность фич | >0.7 |
| **Pattern Win Rate** | Win rate паттернов | >60% |

---

**Последнее обновление:** 2025-01-22  
**Версия:** 1.0.0
