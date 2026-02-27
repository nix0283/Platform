# Self-Learning Module

Система самообучения на торговле пользователя, основанная на методах из **financial-machine-learning** (Marcos López de Prado).

## 🎯 Возможности

### 1. Triple Barrier Method
Разметка сделок по трем барьерам:
- **Vertical Barrier** - выход по времени
- **Horizontal Upper Barrier** - Take Profit
- **Horizontal Lower Barrier** - Stop Loss

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

### 2. Meta-Labeling
Вторичная модель для улучшения сигналов:
- Первичная стратегия генерирует сигнал
- Meta-модель решает стоит ли торговать

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

### 3. Feature Importance
Определение важных индикаторов:

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
```

### 4. Self-Learning Manager
Главный модуль управления:

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

// Предсказание для нового сигнала
const prediction = manager.predictSignal({
  symbol: 'BTC/USDT',
  price: 51000,
  indicators: { rsi: 50, ema: 50500 },
  volatility: 0.02,
  volume: 1000,
});

if (prediction.shouldTrade) {
  console.log(`Торговать с уверенностью ${prediction.confidence}`);
}

// Статистика
const stats = manager.getStats();
console.log(`Win Rate: ${stats.overallWinRate * 100}%`);
```

## 📊 Метрики

| Метрика | Описание |
|---------|----------|
| **Triple Barrier Accuracy** | Точность разметки сделок |
| **Meta-Label Improvement** | % улучшения от meta-labeling |
| **Feature Stability** | Стабильность важности фич |
| **Pattern Win Rate** | Win rate паттернов |

## 🔧 Конфигурация

```typescript
interface SelfLearningConfig {
  tripleBarrier: {
    timeHorizon: number;      // Дней
    profitTarget: number;     // %
    stopLoss: number;         // %
  };
  metaLabeling: {
    enabled: boolean;
    modelType: 'random_forest' | 'xgboost' | 'simple';
    minConfidence: number;
  };
  featureImportance: {
    enabled: boolean;
    method: 'permutation' | 'shap' | 'gain' | 'correlation';
    minStability: number;
  };
  retraining: {
    enabled: boolean;
    minTrades: number;
    frequency: 'daily' | 'weekly' | 'monthly';
  };
}
```

## 📈 Интеграция с платформой

### С Journal
```typescript
journal.onTradeCreated((trade) => {
  selfLearning.analyzeTrade(trade);
});
```

### С ML Tracker
```typescript
const patterns = selfLearning.exportData().patterns;
mlTracker.updatePatterns(patterns);
```

### С Auto-Trading
```typescript
const prediction = selfLearning.predictSignal(marketState);
if (prediction.shouldTrade) {
  autoTrading.execute(signal);
}
```

## 🚀 Следующие шаги

1. ✅ **Фаза 1**: Самообучение (реализовано)
2. ⏳ **Фаза 2**: Алготрейдинг
3. ⏳ **Фаза 3**: Авто-исследование
