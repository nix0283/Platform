# 📄 Paper Trading Guide

Полноценный демо-трейдинг с отдельным журналом и ML отслеживанием.

---

## 🎯 Возможности

### Trading Modes
- ✅ **Paper Trading** — Демо-торговля с виртуальными деньгами
- ✅ **Real Trading** — Реальная торговля через биржи
- ✅ **Мгновенное переключение** — Без потери данных

### Paper Trading Features
- ✅ Виртуальный баланс ($10,000 по умолчанию)
- ✅ Симуляция исполнения ордеров
- ✅ Симуляция комиссий и проскальзывания
- ✅ Отдельный журнал для paper trades
- ✅ Отдельная статистика
- ✅ Real-time P&L
- ✅ Управление позициями (SL/TP)
- ✅ Сброс аккаунта

### ML Integration
- ✅ ML отслеживает paper trades
- ✅ Анализ паттернов в демо-режиме
- ✅ Персональные подсказки
- ✅ Обучение на paper trades

---

## 🚀 Использование

### 1. Переключение режима

```tsx
import { TradingModeSwitcher } from '@/components/paper-trading/TradingModeSwitcher';

<TradingModeSwitcher
  onModeChange={(mode) => {
    console.log('Switched to:', mode);
  }}
/>
```

### 2. Paper Trading Panel

```tsx
import { PaperTradingPanel } from '@/components/paper-trading/PaperTradingPanel';

<PaperTradingPanel compact={false} />
```

### 3. Use Hook

```tsx
import { usePaperTrading } from '@/hooks/usePaperTrading';

function TradingComponent() {
  const {
    ready,
    mode,
    stats,
    positions,
    orders,
    placeOrder,
    closePosition,
    resetAccount,
  } = usePaperTrading();

  // Place paper order
  const handleBuy = () => {
    placeOrder({
      symbol: 'BTC/USDT',
      side: 'BUY',
      quantity: 0.1,
      leverage: 10,
    });
  };

  return <div>...</div>;
}
```

---

## 📊 UI Components

### Trading Mode Switcher

```
┌─────────────────────────────────────────┐
│ [📄 Paper Trading] [💰 Real Trading]    │
│ Balance: $10,250 | PnL: +$250 | 62% WR │
│ [🔄 Reset]                              │
└─────────────────────────────────────────┘
```

### Paper Trading Panel

**4 Tabs:**
1. **Positions** — Открытые позиции
2. **Orders** — История ордеров
3. **Statistics** — Статистика
4. **Quick Order** — Быстрые ордера

---

## 🎯 Paper Trading Flow

```
User Places Paper Order
        ↓
Paper Trading Engine
  - Check balance
  - Calculate margin
  - Simulate slippage
  - Simulate fee
        ↓
Create Paper Order
  - Status: FILLED
  - Average price with slippage
  - Fee deducted
        ↓
Update/Create Position
  - Calculate entry price
  - Set stop loss / take profit
        ↓
Update Account
  - Deduct margin
  - Update balance
        ↓
Sync to Journal
  - Create journal entry
  - Mark as paper trade
        ↓
ML Tracking
  - Capture trade context
  - Analyze patterns
  - Generate suggestions
```

---

## ⚙️ Configuration

### Default Config

```typescript
const config = {
  initialBalance: 10000,    // $10,000 virtual
  defaultLeverage: 10,      // 10x leverage
  defaultQuantity: 0.1,     // 0.1 BTC
  slippagePercent: 0.05,    // 0.05% slippage
  feePercent: 0.1,          // 0.1% fee
  enableAutoClose: true,    // Auto close at SL/TP
  enableLiquidation: true,  // Enable liquidation
};
```

### Custom Config

```typescript
const { resetAccount } = usePaperTrading({
  initialBalance: 50000,
  autoStart: true,
});

resetAccount(50000); // Reset with $50,000
```

---

## 📊 Statistics

### Paper Trading Stats

```typescript
interface PaperTradingStats {
  accountId: string;
  mode: 'PAPER';
  
  // Balance
  initialBalance: number;
  currentBalance: number;
  
  // Performance
  totalPnl: number;
  totalPnlPercent: number;
  realizedPnl: number;
  unrealizedPnl: number;
  
  // Trade stats
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  
  // Risk metrics
  maxDrawdown: number;
  sharpeRatio: number;
  avgLeverage: number;
}
```

---

## 🎨 UI Preview

### Header with Mode Switcher

```
┌─────────────────────────────────────────────────────────────┐
│ 📊 Trading Platform  [📄 Paper] [💰 Real]                   │
│ Balance: $10,250 | PnL: +$250 (+2.5%) | 62.0% WR [🔄 Reset]│
└─────────────────────────────────────────────────────────────┘
```

### Paper Trading Panel

```
┌─────────────────────────────────────────┐
│ 📄 Paper Trading              [🔄 Reset]│
├─────────────────────────────────────────┤
│ ┌────────┬────────┬────────┬──────────┐│
│ │Balance │  PnL   │  Win   │  Trades  ││
│ │$10,250 │ +$250  │  62%   │    50    ││
│ └────────┴────────┴────────┴──────────┘│
├─────────────────────────────────────────┤
│ [Positions] [Orders] [Statistics]       │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────┐    │
│ │ [LONG] BTC/USDT  10x            │    │
│ │ Qty: 0.1 | Entry: $42,500       │    │
│ │ PnL: +$50 (+1.18%)  [Close]     │    │
│ └─────────────────────────────────┘    │
├─────────────────────────────────────────┤
│ Quick Paper Order                       │
│ [BTC/USDT] [0.1] [10x]                  │
│ [BUY/LONG]         [SELL/SHORT]         │
└─────────────────────────────────────────┘
```

---

## 🔗 Integration with Journal

### Paper Trades in Journal

```typescript
// Paper trades are marked with isPaper: true
{
  id: 'journal_123',
  symbol: 'BTC/USDT',
  isPaper: true,
  pnl: 250,
  ...
}
```

### Filter by Mode

```typescript
// Get only paper trades
const paperTrades = journal.getEntries({
  isPaper: true,
});

// Get only real trades
const realTrades = journal.getEntries({
  isPaper: false,
});
```

---

## 🎯 ML Integration

### ML Tracks Paper Trades

```typescript
// Paper trades are sent to ML tracker
mlTracker.captureEntry({
  ...trade,
  isPaper: true,
});

// ML learns from paper trades
mlEngine.learnFromActions(paperTrades);

// Suggestions based on paper performance
const suggestions = mlEngine.getSuggestions();
```

### Separate Stats

```typescript
// Paper trading stats
const paperStats = usePaperTrading();

// Real trading stats (from journal)
const journalStats = useJournalMLIntegration();

// Display based on mode
const displayStats = mode === 'PAPER' ? paperStats : journalStats;
```

---

## 🐛 Troubleshooting

### "Insufficient balance"

**Решение:** Уменьшите размер позиции или леверидж

### Paper trades not showing in journal

**Решение:** Проверьте что Journal-ML integration активна

### Stats not updating

**Решение:** Обновите страницу или подождите 5 секунд (авто-обновление)

---

## 💡 Best Practices

1. **Тестируйте стратегии на paper** — Перед реальной торговлей
2. **Используйте реальные суммы** — Для реалистичности
3. **Следите за статистикой** — Анализируйте performance
4. **Сбрасывайте при необходимости** — Для чистого старта
5. **ML обучается на paper** — Получайте подсказки

---

## ✅ Checklist

- [x] Paper trading engine
- [x] Virtual balance management
- [x] Order simulation
- [x] Position management
- [x] P&L calculation
- [x] Separate journal for paper
- [x] ML tracking for paper
- [x] Mode switcher UI
- [x] Paper trading panel
- [x] Statistics display
- [x] Reset functionality
- [x] API routes
- [x] Documentation

---

**Ready to practice risk-free!** 📄
