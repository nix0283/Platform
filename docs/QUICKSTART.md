# 🚀 Quick Start

Быстрый старт для начала работы с торговой платформой.

---

## 📋 Требования

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- PostgreSQL >= 14
- Redis >= 6
- Docker (опционально)

---

## ⚡ Установка за 5 минут

### 1. Клонирование репозитория
```bash
git clone https://github.com/yourusername/trading-platform.git
cd trading-platform
```

### 2. Установка зависимостей
```bash
pnpm install
```

### 3. Настройка окружения
```bash
cp .env.example .env.local
```

### 4. Запуск баз данных (Docker)
```bash
pnpm docker:up
```

### 5. Запуск разработки
```bash
pnpm dev
```

### 6. Открыть в браузере
```
http://localhost:3000
```

---

## 🎯 Первый запуск

### Шаг 1: Настройка API ключей
```
Settings → Exchanges → Add API Key
- Exchange: Binance
- API Key: your_key
- API Secret: your_secret
- Permissions: Read-Only
```

### Шаг 2: Импорт истории сделок
```
Journal → Import → Select Exchange
- Choose: Binance
- Date Range: Last 90 days
- Click: Import
```

### Шаг 3: Включение Self-Learning
```
ML Settings → Self-Learning → Enable
- Triple Barrier: 3 days / 5% / 2%
- Meta-Labeling: Min confidence 60%
- Feature Importance: Enable
```

### Шаг 4: Запуск Auto-Trading (Paper)
```
Auto-Trading → Enable Paper Trading
- Add Strategy: Momentum
- Risk per Trade: 1%
- Max Positions: 3
- Click: Start
```

### Шаг 5: Мониторинг
```
Dashboard → View Real-time Stats
- PnL: Live updates
- Positions: Active trades
- ML Predictions: Signal confidence
```

---

## 📊 Использование Self-Learning

### Анализ сделки
```typescript
import { createSelfLearningManager } from '@trading-platform/ml';

const manager = createSelfLearningManager();

await manager.analyzeTrade({
  tradeId: 'trade_1',
  symbol: 'BTC/USDT',
  side: 'LONG',
  entryPrice: 50000,
  exitPrice: 52000,
  pnl: 200,
  pnlPercent: 4,
  indicators: { rsi: 45, ema: 49500 },
});
```

### Предсказание сигнала
```typescript
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
```

---

## 🤖 Использование Auto-Trading

### Быстрый старт
```typescript
import { createAutoTradingManager, createMomentumStrategy } from '@trading-platform/auto-trading';

const autoTrading = createAutoTradingManager(true);  // paper trading

autoTrading.addStrategy(createMomentumStrategy('BTC/USDT', '1h'));
autoTrading.start();

const state = autoTrading.getState();
console.log(`PnL: $${state.totalPnL}`);
```

### Конфигурация risk
```typescript
const autoTrading = createAutoTradingManager({
  risk: {
    limits: {
      maxPositionSize: 5,    // 5% на позицию
      maxDailyLoss: 2,       // 2% за день
      maxDrawdown: 10,       // 10% макс.
    },
    autoReduce: true,
  },
});
```

---

## 🔬 Использование Auto-Research

### Запуск исследования
```typescript
import { createAutoResearchManager } from '@trading-platform/auto-research';

const autoResearch = createAutoResearchManager();

await autoResearch.start({
  targetReturn: 10,
  targetPeriod: 'month',
  maxDrawdown: 15,
  minSharpeRatio: 1.5,
  priority: 'sharpe',
});

const state = autoResearch.getState();
console.log(`Phase: ${state.currentPhase}, Progress: ${state.progress}%`);
```

### Мониторинг демо-трейдинга
```typescript
const demoState = autoResearch.getState().demoState;
console.log(`
  Days Remaining: ${demoState.daysRemaining}
  Total Return: ${demoState.totalReturn}%
  Sharpe Ratio: ${demoState.sharpeRatio}
  Deployment Ready: ${demoState.deploymentReady}
`);
```

---

## 📈 Команды CLI

```bash
# Разработка
pnpm dev                    # Запуск всех приложений
pnpm --filter @trading-platform/web dev  # Только веб

# Сборка
pnpm build                  # Сборка всех приложений
pnpm --filter @trading-platform/web build  # Только веб

# Тесты
pnpm test                   # Запуск всех тестов
pnpm ml:stage1              # Тест ML Phase 1
pnpm ml:all                 # Все ML тесты

# Docker
pnpm docker:up              # Запуск баз данных
pnpm docker:down            # Остановка баз данных

# ML Scripts
pnpm ml:stage1              # XAI + Synthetic
pnpm ml:stage2              # RL Training
pnpm ml:stage3              # Graph Analysis
pnpm ml:stage4              # Production
pnpm ml:all                 # Все этапы
```

---

## 🔧 Конфигурация

### .env.local
```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/trading
REDIS_URL=redis://localhost:6379

# Exchanges
BINANCE_API_KEY=your_key
BINANCE_API_SECRET=your_secret
BYBIT_API_KEY=your_key
BYBIT_API_SECRET=your_secret

# ML
ML_MODEL_PATH=./models
ML_BATCH_SIZE=32
ML_LEARNING_RATE=0.001

# Trading
PAPER_TRADING=true
DEFAULT_LEVERAGE=10
MAX_POSITION_SIZE=0.1
RISK_PER_TRADE=0.01

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=ws://localhost:8080
```

---

## 📚 Дополнительные ресурсы

- [Full Documentation](./README.md)
- [Architecture](./ARCHITECTURE.md)
- [Worklog](./WORKLOG.md)
- [API Reference](./integration/api-reference.md)

---

## ❓ Troubleshooting

### Проблема: "Module not found"
```bash
pnpm install
pnpm clean
pnpm install
```

### Проблема: Database connection error
```bash
pnpm docker:down
pnpm docker:up
```

### Проблема: ML models not loading
```bash
# Переобучить модели
pnpm ml:stage2
```

---

## 🎯 Следующие шаги

1. ✅ Настроить API ключи
2. ✅ Импортировать историю сделок
3. ✅ Включить Self-Learning
4. ✅ Запустить Paper Trading
5. ✅ Начать Auto-Research

---

**Готово к торговле!** 🚀

**Последнее обновление:** 2025-01-22  
**Версия:** 1.0.0
