# 📊 Trading Journal — Автоматический торговый журнал

Полнофункциональный торговый журнал с авто-захватом сделок и индикаторов.

---

## 🎯 Возможности

### Авто-захват сделок
- ✅ Автоматическое создание записи при открытии позиции
- ✅ Захват цены входа, времени, таймфрейма
- ✅ Захват Stop Loss и Take Profit уровней
- ✅ Захват активных индикаторов на момент входа
- ✅ Захват значений индикаторов

### Ручное редактирование
- ✅ Выбор типа сетапа (Setup Type)
- ✅ Описание сделки
- ✅ Эмоциональное состояние
- ✅ Ошибки и уроки
- ✅ Оценка исполнения (1-5)
- ✅ Оценка результата (1-5)
- ✅ Теги для категоризации
- ✅ Скриншоты графика

### Статистика и аналитика
- ✅ Win Rate
- ✅ Total P&L
- ✅ Avg Win / Avg Loss
- ✅ Profit Factor
- ✅ Monthly performance
- ✅ Performance по сетапам
- ✅ Средние рейтинги

---

## 📁 Структура данных

### Journal Entry

```typescript
interface JournalEntry {
  // Trade info
  symbol: string;           // "BTC/USDT"
  exchange: string;         // "binance"
  direction: 'LONG' | 'SHORT';
  status: 'open' | 'closed' | 'cancelled';
  
  // Entry details
  entryPrice: number;       // 42500
  entryTime: number;        // timestamp
  entryTimeframe: string;   // "1h"
  quantity: number;         // 0.1
  
  // Risk management
  stopLoss?: number;        // 42000
  stopLossTimeframe?: string;
  takeProfits?: TakeProfitLevel[];
  
  // Exit details
  exitPrice?: number;
  exitTime?: number;
  exitTimeframe?: string;
  
  // P&L
  pnl?: number;             // 200
  pnlPercent?: number;      // 4.71
  commission?: number;      // 2.5
  
  // Indicators at entry
  activeIndicators?: IndicatorSnapshot[];
  indicatorValues?: Record<string, number | Record<string, number>>;
  
  // Trade description
  setupType?: string;       // "Breakout"
  description?: string;     // "Clean breakout above resistance"
  tags?: string[];          // ["breakout", "volume"]
  emotions?: string;        // "Confident"
  mistakes?: string[];      // ["Took profit too early"]
  screenshotUrl?: string;
  
  // Rating
  executionRating?: number; // 1-5
  outcomeRating?: number;   // 1-5
  
  // Metadata
  orderId?: string;
  createdAt: number;
  updatedAt: number;
}
```

### Indicator Snapshot

```typescript
interface IndicatorSnapshot {
  name: string;             // "RSI", "EMA", "MACD"
  params: Record<string, any>; // { period: 14 }
  value: number | Record<string, number>; // 45 or { macd: 150, signal: 120 }
}
```

---

## 🚀 Использование

### 1. Авто-захват сделки

```typescript
import { JournalManager } from '@trading-platform/journal';

const journal = new JournalManager();

// При открытии позиции
await journal.captureTrade({
  orderId: 'order_123',
  symbol: 'BTC/USDT',
  exchange: 'binance',
  direction: 'LONG',
  entryPrice: 42500,
  entryTime: Date.now(),
  entryTimeframe: '1h',
  quantity: 0.1,
  stopLoss: 42000,
  takeProfits: [
    { price: 43500, percentage: 50 },
    { price: 44500, percentage: 50 },
  ],
}, [
  // Индикаторы на момент входа
  { name: 'RSI', params: { period: 14 }, value: 45 },
  { name: 'EMA', params: { period: 20 }, value: 42300 },
  { name: 'MACD', params: { fast: 12, slow: 26, signal: 9 }, 
    value: { macd: 150, signal: 120, histogram: 30 } },
]);
```

### 2. Закрытие сделки

```typescript
await journal.closeTrade(
  'journal_entry_id',
  44500,  // exit price
  Date.now(), // exit time
  '1h'    // exit timeframe
);
```

### 3. Добавление заметок

```typescript
await journal.addNote('journal_entry_id', {
  setupType: 'Breakout',
  description: 'Clean breakout above resistance with strong volume',
  tags: ['breakout', 'volume', 'resistance'],
  emotions: 'Confident',
  mistakes: ['Took profit too early'],
});
```

### 4. Добавление рейтингов

```typescript
await journal.addRating(
  'journal_entry_id',
  5, // execution rating (1-5)
  5  // outcome rating (1-5)
);
```

### 5. Получение статистики

```typescript
const stats = await journal.getStats();
console.log(stats);
// {
//   totalTrades: 50,
//   winRate: 62.5,
//   totalPnl: 1250,
//   avgPnl: 25,
//   profitFactor: 2.1,
//   ...
// }
```

---

## 📊 UI Компоненты

### Journal Panel

```tsx
import { JournalPanel } from '@/components/journal';

<JournalPanel compact={false} />
```

**Features:**
- Список всех сделок
- Фильтры (All, Open, Closed, Win, Loss)
- Статистика (Win Rate, P&L, Trades, Avg R)
- Детальный просмотр сделки
- Редактирование заметок

### Entry Card

```
┌─────────────────────────────────────────┐
│ [LONG] BTC/USDT binance        [WIN]   │
├─────────────────────────────────────────┤
│ Entry: $42,500    Exit: $44,500        │
│ TF: 1h            SL: $42,000          │
├─────────────────────────────────────────┤
│                    +$200.00 (+4.71%)   │
├─────────────────────────────────────────┤
│ 📈 RSI: 45.00  EMA: 42300  MACD: ...   │
├─────────────────────────────────────────┤
│                        2024-01-15      │
└─────────────────────────────────────────┘
```

---

## 🎯 Setup Types

```typescript
const SETUP_TYPES = [
  'Breakout',
  'Pullback',
  'Reversal',
  'Trend Following',
  'Range Trading',
  'Support/Resistance',
  'Fibonacci',
  'Pattern',
  'News Event',
  'Scalp',
  'Swing',
  'Position',
  'Other',
];
```

---

## 😊 Emotions

```typescript
const EMOTIONS = [
  'Confident',
  'Hesitant',
  'FOMO',
  'Fearful',
  'Greedy',
  'Calm',
  'Anxious',
  'Excited',
  'Frustrated',
  'Neutral',
];
```

---

## ❌ Common Mistakes

```typescript
const COMMON_MISTAKES = [
  'Entered too early',
  'Entered too late',
  'Stop loss too tight',
  'Stop loss too wide',
  'Took profit too early',
  'Held too long',
  'Position too large',
  'Position too small',
  'Ignored stop loss',
  'Moved stop loss',
  'Revenge trading',
  'Overtrading',
  'No plan',
  'Ignored trend',
  'Chased price',
  'None',
];
```

---

## 📡 API Endpoints

### GET /api/journal

Получение записей журнала.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `symbol` | string | Фильтр по символу |
| `exchange` | string | Фильтр по бирже |
| `direction` | string | LONG/SHORT |
| `status` | string | open/closed/cancelled |
| `setupType` | string | Тип сетапа |
| `tags` | string[] | Теги |
| `dateFrom` | number | Start timestamp |
| `dateTo` | number | End timestamp |
| `minPnl` | number | Минимальный P&L |
| `maxPnl` | number | Максимальный P&L |

**Response:**
```json
{
  "success": true,
  "count": 50,
  "entries": [...]
}
```

### POST /api/journal

Создание/обновление записи.

**Request:**
```json
{
  "action": "create" | "update",
  "entry": { ... }
}
```

### DELETE /api/journal?id=xxx

Удаление записи.

---

## 📈 Статистика

### Journal Stats

```typescript
interface JournalStats {
  totalTrades: number;
  closedTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;          // %
  totalPnl: number;         // $
  avgPnl: number;           // $
  maxWin: number;           // $
  maxLoss: number;          // $
  avgWin: number;           // $
  avgLoss: number;          // $
  avgExecutionRating: number; // 1-5
  avgOutcomeRating: number;   // 1-5
  profitFactor: number;     // ratio
}
```

### Monthly Stats

```typescript
interface JournalMonthlyStats {
  month: string;    // YYYY-MM
  trades: number;
  pnl: number;
  winRate: number;
  avgPnl: number;
}
```

### Setup Stats

```typescript
interface JournalSetupStats {
  setupType: string;
  trades: number;
  totalPnl: number;
  winRate: number;
  avgPnl: number;
  avgExecution: number;
  avgOutcome: number;
}
```

---

## 💾 Экспорт

### CSV Export

```typescript
const csv = await journal.exportToCSV({
  status: 'closed',
  dateFrom: Date.now() - 30 * 24 * 60 * 60 * 1000, // last 30 days
});
```

### JSON Export

```typescript
const json = await journal.exportToJSON({
  setupType: 'Breakout',
});
```

---

## 🎨 Интеграция с платформой

### Автоматический захват при торговле

```typescript
// В ChartTradingOverlay.tsx
const handleOrderPlaced = async (order: TradingOrder) => {
  // Захват индикаторов
  const indicators = chartRef.current?.getActiveIndicators();
  
  // Создание записи в журнале
  await journal.captureTrade({
    orderId: order.id,
    symbol: order.symbol,
    exchange: order.exchange,
    direction: order.side,
    entryPrice: order.entryPrice,
    entryTime: order.timestamp,
    entryTimeframe: chartConfig.interval,
    quantity: order.quantity,
    stopLoss: order.stopLoss,
    takeProfits: order.takeProfits,
  }, indicators);
};
```

---

## ✅ Checklist

- [x] Database schema
- [x] Journal types
- [x] Journal manager
- [x] Auto-capture trades
- [x] Capture indicators
- [x] Update entries
- [x] Close trades
- [x] Add notes
- [x] Add ratings
- [x] Query entries
- [x] Statistics
- [x] Monthly stats
- [x] Setup stats
- [x] Export CSV/JSON
- [x] UI Panel
- [x] Entry cards
- [x] Entry form
- [x] Filters
- [x] API routes

---

**Ready to track your trades!** 📊
