# 🤖 Auto-Trading Documentation

Система алгоритмической торговли с готовыми стратегиями.

---

## 📋 Содержание

- [Overview](#overview)
- [Strategies](#strategies)
- [Execution Engine](#execution-engine)
- [Risk Management](#risk-management)
- [Position Sizing](#position-sizing)
- [Manager](#manager)
- [Examples](#examples)

---

## Overview

Auto-Trading система автоматически торгует на основе стратегий с управлением рисками.

**Компоненты:**
1. Strategies - Готовые стратегии (Momentum, Mean Reversion, Breakout)
2. Execution Engine - Управление ордерами
3. Risk Management - Управление рисками
4. Position Sizing - Расчет размера позиции
5. Auto-Trading Manager - Главный модуль

---

## Strategies

### Momentum Strategy
```typescript
import { createMomentumStrategy } from '@trading-platform/auto-trading';

const strategy = createMomentumStrategy('BTC/USDT', '1h', {
  lookbackPeriod: 21,
  entryThreshold: 0.02,
  useVolume: true,
});
```

### Mean Reversion Strategy
```typescript
import { createMeanReversionStrategy } from '@trading-platform/auto-trading';

const strategy = createMeanReversionStrategy('ETH/USDT', '1h', {
  bbPeriod: 20,
  bbStdDev: 2,
  oversoldThreshold: 30,
  overboughtThreshold: 70,
});
```

### Breakout Strategy
```typescript
import { createBreakoutStrategy } from '@trading-platform/auto-trading';

const strategy = createBreakoutStrategy('SOL/USDT', '1h', {
  lookbackPeriod: 20,
  useVolume: true,
  volumeMultiplier: 2,
});
```

---

## Execution Engine

### Создание ордера
```typescript
import { createExecutionEngine } from '@trading-platform/auto-trading';

const execution = createExecutionEngine(true);  // paper trading

const order = execution.createOrder({
  strategyId: 'momentum_btc',
  symbol: 'BTC/USDT',
  side: 'BUY',
  type: 'MARKET',
  quantity: 0.1,
  stopLoss: 49000,
  takeProfit: 52000,
});
```

### Методы
- `createOrder(params)` - Создание ордера
- `cancelOrder(orderId)` - Отмена
- `modifyOrder(orderId, modifications)` - Модификация
- `getOrders(filters)` - Получение ордеров
- `getExecutionReport()` - Отчет

---

## Risk Management

### Конфигурация
```typescript
import { createRiskManager } from '@trading-platform/auto-trading';

const risk = createRiskManager({
  limits: {
    maxPositionSize: 10,      // 10% на позицию
    maxStrategyExposure: 30,  // 30% на стратегию
    maxSymbolExposure: 20,    // 20% на символ
    maxDailyLoss: 5,          // 5% за день
    maxDrawdown: 20,          // 20% макс.
  },
  autoReduce: true,
});
```

### Проверка перед сделкой
```typescript
const canOpen = risk.canOpenPosition(
  'BTC/USDT',
  'LONG',
  50000,
  'strategy_1'
);

if (canOpen.allowed) {
  // Открыть позицию
} else {
  console.log(canOpen.reason);
}
```

---

## Position Sizing

### Методы
```typescript
import { createPositionSizingManager } from '@trading-platform/auto-trading';

// Fixed Fractional
const sizing = createPositionSizingManager('fixed_fractional', {
  riskPerTrade: 1,  // 1% риска
});

// Kelly Criterion
const sizing = createPositionSizingManager('kelly', {
  kellyMultiplier: 0.25,  // Quarter Kelly
});

// Volatility Adjusted
const sizing = createPositionSizingManager('volatility_adjusted', {
  volatilityTarget: 0.02,  // 2% волатильность
});
```

### Расчет размера
```typescript
const size = sizing.calculateSize({
  symbol: 'BTC/USDT',
  side: 'LONG',
  entryPrice: 50000,
  stopLoss: 49000,
  accountBalance: 100000,
});

console.log(`Quantity: ${size.quantity}, Value: $${size.value}`);
```

---

## Manager

### Быстрый старт
```typescript
import { createAutoTradingManager, createMomentumStrategy } from '@trading-platform/auto-trading';

const autoTrading = createAutoTradingManager(true);  // paper trading

autoTrading.addStrategy(createMomentumStrategy('BTC/USDT', '1h'));
autoTrading.addStrategy(createMeanReversionStrategy('ETH/USDT', '1h'));
autoTrading.start();

const state = autoTrading.getState();
console.log(`PnL: $${state.totalPnL}, Positions: ${state.activePositions}`);
```

### Конфигурация
```typescript
const autoTrading = createAutoTradingManager({
  paperTrading: true,
  selfLearningEnabled: true,
  minConfidence: 0.6,
  risk: {
    limits: {
      maxPositionSize: 5,
      maxDailyLoss: 2,
      maxDrawdown: 10,
    },
  },
  positionSizing: {
    method: 'fixed_fractional',
    riskPerTrade: 1,
  },
});
```

### Методы
- `addStrategy(strategy)` - Добавление стратегии
- `removeStrategy(strategyId)` - Удаление
- `start()` - Запуск
- `stop()` - Остановка
- `getState()` - Состояние
- `getReport(period)` - Отчет
- `onEvent(listener)` - События

---

## Examples

### Интеграция с Self-Learning
```typescript
const autoTrading = createAutoTradingManager({
  selfLearningEnabled: true,
  minConfidence: 0.6,  // Meta-labeling фильтр
});
```

### Интеграция с Journal
```typescript
autoTrading.onEvent((event) => {
  if (event.type === 'position_closed') {
    journal.addTrade({
      ...event.position,
      pnl: event.pnl,
    });
  }
});
```

### Мониторинг
```typescript
setInterval(() => {
  const state = autoTrading.getState();
  console.log(`
    PnL: $${state.totalPnL}
    Positions: ${state.activePositions}
    Win Rate: ${state.winRate * 100}%
    Drawdown: ${state.currentDrawdown * 100}%
  `);
}, 60000);
```

---

## 📊 Метрики

| Метрика | Описание | Target |
|---------|----------|--------|
| **Win Rate** | % прибыльных сделок | >55% |
| **Profit Factor** | Gross Profit / Loss | >2.0 |
| **Sharpe Ratio** | Риск-скорр. доходность | >1.5 |
| **Max Drawdown** | Макс. просадка | <20% |
| **Fill Rate** | % исполненных ордеров | >95% |

---

**Последнее обновление:** 2025-01-22  
**Версия:** 1.0.0
