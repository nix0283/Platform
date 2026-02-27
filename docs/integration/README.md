# 🔗 Integration Guide

Руководство по интеграции всех модулей платформы.

---

## 📋 Содержание

- [Overview](#overview)
- [Self-Learning Integration](#self-learning-integration)
- [Auto-Trading Integration](#auto-trading-integration)
- [Auto-Research Integration](#auto-research-integration)
- [Event System](#event-system)
- [API Reference](#api-reference)

---

## Overview

Все модули платформы интегрированы через единую event system и shared state.

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Self-Learning│ ←→  │ Auto-Trading │ ←→  │ Auto-Research│
└──────────────┘     └──────────────┘     └──────────────┘
         ↓                   ↓                    ↓
         └───────────────────┼────────────────────┘
                             ↓
                    ┌────────────────┐
                    │  Unified Core  │
                    │  (Journal, DB) │
                    └────────────────┘
```

---

## Self-Learning Integration

### С Journal
```typescript
import { createSelfLearningManager } from '@trading-platform/ml';

const selfLearning = createSelfLearningManager();

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

### С Auto-Trading
```typescript
autoTrading.onSignal((signal) => {
  const prediction = selfLearning.predictSignal(signal.marketState);
  
  if (prediction.shouldTrade && prediction.confidence >= 0.6) {
    autoTrading.execute(signal);
  } else {
    console.log('Signal filtered by self-learning');
  }
});
```

### С Auto-Research
```typescript
const predictions = selfLearning.predictSignal(marketState);
automl.train({ 
  features: predictions,
  labels: actualReturns 
});
```

---

## Auto-Trading Integration

### С Self-Learning
```typescript
const autoTrading = createAutoTradingManager({
  selfLearningEnabled: true,
  minConfidence: 0.6,  // Meta-labeling фильтр
});
```

### С Journal
```typescript
autoTrading.onEvent((event) => {
  switch (event.type) {
    case 'position_closed':
      journal.addTrade({
        ...event.position,
        pnl: event.pnl,
      });
      break;
    case 'order_created':
      journal.addOrder(event.order);
      break;
  }
});
```

### С Auto-Research
```typescript
autoResearch.onEvent((event) => {
  if (event.type === 'strategy_deployed') {
    autoTrading.addStrategy(event.deploymentStatus.strategy);
  }
});
```

---

## Auto-Research Integration

### С Self-Learning
```typescript
const autoResearch = createAutoResearchManager({
  target: {
    targetReturn: 10,
    minSharpeRatio: 1.5,
  },
  automl: {
    featureSelection: true,
  },
});

// Self-learning улучшает features для AutoML
selfLearning.onEvent((event) => {
  if (event.type === 'feature_importance_updated') {
    autoResearch.updateFeatures(event.features);
  }
});
```

### С Auto-Trading
```typescript
autoResearch.onEvent((event) => {
  if (event.type === 'demo_trading_completed' && event.report.deploymentReady) {
    // Деплой стратегии в auto-trading
    const strategy = createStrategyFromReport(event.report);
    autoTrading.addStrategy(strategy);
  }
});
```

---

## Event System

### Подписка на события
```typescript
// Self-Learning events
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

// Auto-Trading events
autoTrading.onEvent((event) => {
  switch (event.type) {
    case 'signal_generated':
      console.log(`Signal: ${event.signal.side} ${event.signal.symbol}`);
      break;
    case 'order_filled':
      console.log(`Order filled at ${event.fillPrice}`);
      break;
    case 'risk_limit_breached':
      console.log(`Risk breach: ${event.breach.limit}`);
      break;
  }
});

// Auto-Research events
autoResearch.onEvent((event) => {
  switch (event.type) {
    case 'model_trained':
      console.log(`Model ${event.modelId} trained`);
      break;
    case 'optimization_completed':
      console.log(`Optimization done, best score: ${event.result.bestResult.score}`);
      break;
    case 'strategy_deployed':
      console.log(`Strategy deployed to production`);
      break;
  }
});
```

### Отписка от событий
```typescript
const unsubscribe = selfLearning.onEvent(handler);
unsubscribe();  // Отписка
```

---

## API Reference

### Self-Learning API
```typescript
interface SelfLearningAPI {
  analyzeTrade(trade: TradeInput): Promise<TradeAnalysisResult>;
  predictSignal(marketState: MarketState): PredictionResult;
  trainMetaModel(): Promise<TrainingResult>;
  getStats(): SelfLearningStats;
  exportData(): ExportData;
  onEvent(listener: EventHandler): () => void;
}
```

### Auto-Trading API
```typescript
interface AutoTradingAPI {
  addStrategy(strategy: BaseStrategy): void;
  removeStrategy(strategyId: string): void;
  start(): void;
  stop(): void;
  getState(): AutoTradingState;
  getReport(period: Period): AutoTradingReport;
  onEvent(listener: EventHandler): () => void;
}
```

### Auto-Research API
```typescript
interface AutoResearchAPI {
  start(target: ResearchTarget): Promise<void>;
  stop(): void;
  getState(): AutoResearchState;
  getReport(period: Period): AutoResearchReport;
  onEvent(listener: EventHandler): () => void;
}
```

---

## Unified State Management

### Получение общего состояния
```typescript
const platformState = {
  selfLearning: selfLearning.getStats(),
  autoTrading: autoTrading.getState(),
  autoResearch: autoResearch.getState(),
  journal: journal.getStats(),
};

console.log(`
  Self-Learning: ${platformState.selfLearning.analyzedTrades} trades analyzed
  Auto-Trading: $${platformState.autoTrading.totalPnL} PnL
  Auto-Research: ${platformState.autoResearch.progress}% progress
`);
```

### Экспорт всех данных
```typescript
const exportData = {
  selfLearning: selfLearning.exportData(),
  autoTrading: autoTrading.exportData(),
  autoResearch: autoResearch.exportData(),
  journal: journal.exportData(),
  timestamp: Date.now(),
};

// Сохранение
fs.writeFileSync('platform-export.json', JSON.stringify(exportData, null, 2));
```

---

## Best Practices

### 1. Обработка ошибок
```typescript
try {
  await selfLearning.analyzeTrade(trade);
} catch (error) {
  console.error('Self-learning error:', error);
  // Fallback логика
}
```

### 2. Rate Limiting
```typescript
const rateLimiter = new RateLimiter({
  maxRequests: 100,
  windowMs: 60000,  // 1 минута
});

autoTrading.onSignal(async (signal) => {
  if (await rateLimiter.canMakeRequest()) {
    const prediction = selfLearning.predictSignal(signal.marketState);
    // ...
  }
});
```

### 3. Logging
```typescript
const logger = createLogger({
  level: 'info',
  format: 'json',
});

selfLearning.onEvent((event) => {
  logger.info('self_learning_event', event);
});
```

---

**Последнее обновление:** 2025-01-22  
**Версия:** 1.0.0
