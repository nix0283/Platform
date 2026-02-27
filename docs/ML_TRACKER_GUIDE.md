# 🤖 ML Trade Tracker & Self-Learning System

Автоматическое отслеживание действий трейдера и самообучение системы.

---

## 🎯 Возможности

### Отслеживание действий
- ✅ **Все сделки** — Вход, выход, модификация
- ✅ **Контекст графика** — Таймфрейм, индикаторы, параметры
- ✅ **Свечные паттерны** — Автоматическое распознавание
- ✅ **Уровни** — Поддержка/сопротивление, пики/впадины
- ✅ **Рисования** — Линии, фигуры на графике

### Самообучение
- ✅ **Анализ паттернов** — Какие паттерны работают лучше
- ✅ **Анализ индикаторов** — Эффективность индикаторов
- ✅ **Анализ таймфреймов** — На каких ТФ лучше результаты
- ✅ **Контекстный анализ** — Комбинации факторов
- ✅ **Персональные подсказки** — На основе вашей статистики

### Real-time Suggestions
- ✅ **Сигналы на вход** — На основе успешных паттернов
- ✅ **Управление риском** — Рекомендации по размеру позиции
- ✅ **Лучшие таймфреймы** — Где вы торгуете успешнее
- ✅ **Оптимизация индикаторов** — Какие использовать

---

## 🚀 Использование

### 1. Подключение трекера

```tsx
import { useTradeTracker } from '@/hooks/useTradeTracker';

function TradingComponent() {
  const { captureEntry, captureExit, stats } = useTradeTracker();

  // При открытии сделки
  const handleEntry = () => {
    captureEntry({
      type: 'entry',
      symbol: 'BTC/USDT',
      exchange: 'binance',
      direction: 'LONG',
      price: 42500,
      quantity: 0.1,
      stopLoss: 42000,
      takeProfits: [
        { price: 43500, percentage: 50 },
        { price: 44500, percentage: 50 },
      ],
    });
  };

  // При закрытии сделки
  const handleExit = (actionId: string, exitPrice: number) => {
    captureExit(actionId, exitPrice);
  };

  return <div>...</div>;
}
```

### 2. Подключение самообучения

```tsx
import { useSelfLearning } from '@/hooks/useSelfLearning';

function MLComponent() {
  const { model, suggestions, ready } = useSelfLearning();

  if (!ready) {
    return <div>Learning... ({actions.length}/20)</div>;
  }

  return (
    <div>
      {suggestions.map(s => (
        <div key={s.id}>{s.message}</div>
      ))}
    </div>
  );
}
```

### 3. ML Assistant Panel

```tsx
import { MLAssistantPanel } from '@/components/ml/MLAssistantPanel';

function Dashboard() {
  return (
    <div>
      <Chart />
      <MLAssistantPanel />
    </div>
  );
}
```

---

## 📊 Что отслеживается

### Chart State

```typescript
interface ChartState {
  timestamp: number;
  symbol: string;
  exchange: string;
  timeframe: string;        // "1h", "4h", etc.
  chartType: string;        // "candle", "bar", etc.
  scale: 'linear' | 'logarithmic';
  indicators: [             // Активные индикаторы
    {
      name: "RSI",
      params: { period: 14 },
      values: { rsi: 45 }
    }
  ];
  drawings: [...];          // Нарисованные объекты
  visibleRange: {...};      // Видимый диапазон
}
```

### Trade Action

```typescript
interface TradeAction {
  type: 'entry' | 'exit' | 'modify' | 'cancel';
  symbol: string;
  direction: 'LONG' | 'SHORT';
  price: number;
  quantity: number;
  
  // Context
  chartState: ChartState;
  candlePattern?: string;   // "Hammer", "Engulfing", etc.
  supportLevels?: number[];
  resistanceLevels?: number[];
  peaks?: [...];
  valleys?: [...];
  
  // Outcome
  outcome?: {
    exitPrice: number;
    pnl: number;
    pnlPercent: number;
    duration: number;
    maxProfit: number;
    maxLoss: number;
  };
}
```

---

## 🧠 Self-Learning Analysis

### Pattern Analysis

```
┌─────────────────────────────────────────┐
│ Pattern: Hammer                         │
├─────────────────────────────────────────┤
│ Occurrences: 25                         │
│ Wins: 18 (72.0%)                        │
│ Losses: 7 (28.0%)                       │
│ Avg PnL: +$125.50                       │
│ Confidence: 85%                         │
└─────────────────────────────────────────┘
```

### Indicator Effectiveness

```
┌─────────────────────────────────────────┐
│ Indicator: RSI (14)                     │
├─────────────────────────────────────────┤
│ Occurrences: 45                         │
│ Win Rate: 64.4%                         │
│ Avg PnL: +$98.20                        │
└─────────────────────────────────────────┘
```

### Timeframe Performance

```
┌─────────────────────────────────────────┐
│ Timeframe: 4h                           │
├─────────────────────────────────────────┤
│ Trades: 30                              │
│ Win Rate: 70.0%                         │
│ Avg PnL: +$145.00                       │
│ Avg Duration: 8.5 hours                 │
└─────────────────────────────────────────┘
```

---

## 💡 Real-time Suggestions

### Example Suggestions

```
┌─────────────────────────────────────────┐
│ 🔴 HIGH PRIORITY                        │
├─────────────────────────────────────────┤
│ Pattern "Hammer" detected.              │
│ Historical success: 72.0% (25 trades)   │
│ Confidence: 85%                         │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 🟠 MEDIUM PRIORITY                      │
├─────────────────────────────────────────┤
│ Timeframe "4h" shows 70.0% win rate     │
│ Your best performing timeframe          │
│ Based on 30 trades                      │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 🔵 LOW PRIORITY                         │
├─────────────────────────────────────────┤
│ Using "RSI" correlates with 64.4%       │
│ win rate. Consider adding to setup.     │
│ Based on 45 trades                      │
└─────────────────────────────────────────┘
```

---

## 🎯 Learning Process

```
┌─────────────────────────────────────────┐
│  1. Track All Actions                   │
│     - Entries, exits, modifications     │
│     - Chart context at each action      │
│     - Patterns, indicators, levels      │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│  2. Store in Database                   │
│     - Local storage (browser)           │
│     - Auto-save every 30 seconds        │
│     - Export to JSON/CSV                │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│  3. Analyze Patterns (20+ trades)       │
│     - Group by candlestick pattern      │
│     - Calculate win rates               │
│     - Identify high-probability setups  │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│  4. Generate Model                      │
│     - Pattern stats                     │
│     - Indicator effectiveness           │
│     - Timeframe performance             │
│     - Context analysis                  │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│  5. Provide Suggestions                 │
│     - Real-time pattern detection       │
│     - Risk management tips              │
│     - Optimal setups                    │
└─────────────────────────────────────────┘
```

---

## ⚙️ Configuration

### Minimum Trades for Learning

```typescript
const minTrades = 20; // Default
```

### Auto-save Interval

```typescript
const autoSaveInterval = 30000; // 30 seconds
```

### Pattern Detection

```typescript
// Supported patterns
const patterns = [
  'Doji',
  'Hammer',
  'Bullish Engulfing',
  'Bearish Engulfing',
  'Shooting Star',
  'Morning Star',
  'Evening Star',
];
```

---

## 📈 UI Components

### ML Assistant Panel

**3 Tabs:**
1. **Suggestions** — Real-time trading suggestions
2. **Patterns** — Your best/worst patterns
3. **Stats** — Overall statistics

**Status Indicators:**
- 🟢 Active — Model trained, providing suggestions
- 🟡 Learning... — Collecting data (< 20 trades)

### Stats Display

```
┌─────────────────────────────────────────┐
│ 🤖 ML Assistant              [Active]   │
├─────────────────────────────────────────┤
│ [💡 Suggestions] [📊 Patterns] [📈 Stats]│
├─────────────────────────────────────────┤
│                                         │
│ 3 Suggestions:                          │
│ ┌─────────────────────────────────┐    │
│ │ 🔴 HIGH                         │    │
│ │ Pattern "Hammer" detected...    │    │
│ └─────────────────────────────────┘    │
│                                         │
└─────────────────────────────────────────┘
```

---

## 🔒 Privacy & Storage

### Local Storage

```javascript
// Data stored in browser
localStorage.setItem('trade_actions', JSON.stringify(actions));
localStorage.setItem('ml_model', JSON.stringify(model));
```

### Export Options

```typescript
// Export to JSON
const json = tracker.exportToJSON();

// Export to CSV
const csv = tracker.exportToCSV();
```

### Clear Data

```typescript
// Reset everything
engine.reset();
```

---

## 🐛 Troubleshooting

### "Need at least 20 trades for learning"

**Решение:** Совершите еще сделки. Система требует минимум 20 завершенных сделок для обучения.

### Suggestions не появляются

**Решение:**
1. Проверьте что есть завершенные сделки (с outcome)
2. Подождите пока система проанализирует данные
3. Проверьте консоль на ошибки

### Данные не сохраняются

**Решение:**
1. Проверьте что localStorage доступен
2. Проверьте размер хранилища (может быть переполнено)

---

## 💡 Best Practices

1. **Торгуйте последовательно** — Система учится на ваших паттернах
2. **Заполняйте описание сделок** — Для лучшего контекстного анализа
3. **Регулярно экспортируйте данные** — Для бэкапа
4. **Следите за подсказками** — Но принимайте решения самостоятельно
5. **Периодически сбрасывайте модель** — Если стиль торговли изменился

---

## ✅ Checklist

- [x] Trade action tracker
- [x] Chart state capture
- [x] Pattern detection
- [x] Support/resistance detection
- [x] Peak/valley detection
- [x] Self-learning engine
- [x] Pattern analysis
- [x] Indicator analysis
- [x] Timeframe analysis
- [x] Suggestions generation
- [x] React hooks
- [x] ML Assistant Panel
- [x] Local storage
- [x] Export to JSON/CSV
- [x] Documentation

---

**Ready to learn from your trades!** 🧠
