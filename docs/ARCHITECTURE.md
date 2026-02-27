# 🏗️ Architecture

Архитектура торговой платформы с системой самообучения, алгоритмической торговли и авто-исследования.

---

## 📊 Общая архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                    TRADING PLATFORM                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Self-Learning│  │ Auto-Trading │  │ Auto-Research│     │
│  │   (Фаза 1)   │  │   (Фаза 2)   │  │   (Фаза 3)   │     │
│  │              │  │              │  │              │     │
│  │ • Meta-Label │  │ • Strategies │  │ • AutoML     │     │
│  │ • Features   │  │ • Execution  │  │ • Optimizer  │     │
│  │ • Patterns   │  │ • Risk Mgmt  │  │ • Walk-Forward│    │
│  │              │  │ • Sizing     │  │ • Demo       │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                 │                 │               │
│         └─────────────────┼─────────────────┘               │
│                           │                                 │
│                  ┌────────▼────────┐                        │
│                  │  Unified Core   │                        │
│                  │  (Journal, ML,  │                        │
│                  │   Web, Mobile)  │                        │
│                  └─────────────────┘                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Структура пакетов

```
trading-platform/
├── packages/
│   ├── core/                 # Общие типы и утилиты
│   ├── charting/             # Графики (Lightweight Charts)
│   ├── exchanges/            # Коннекторы к биржам
│   ├── pine-converter/       # Pine Script конвертер
│   ├── backtester/           # Бэктестер
│   ├── ml/                   # ML модули
│   │   └── src/
│   │       ├── xai/          # Интерпретируемость
│   │       ├── synthetic/    # Синтетические данные
│   │       ├── rl/           # Reinforcement Learning
│   │       ├── graph/        # Графовый анализ
│   │       ├── tracker/      # Трекер действий
│   │       ├── learning/     # Self-Learning (legacy)
│   │       └── self-learning/# Self-Learning (new) ⭐
│   ├── auto-trading/         # Auto-Trading ⭐
│   │   └── src/
│   │       ├── strategies/   # Стратегии
│   │       ├── execution/    # Execution engine
│   │       ├── risk-management/ # Risk management
│   │       ├── position-sizing/ # Position sizing
│   │       └── auto-trading-manager.ts
│   └── auto-research/        # Auto-Research ⭐
│       └── src/
│           ├── automl/       # AutoML
│           ├── optimization/ # Optimization
│           ├── walk-forward/ # Walk-Forward
│           ├── demo-trading/ # Demo Trading
│           └── auto-research-manager.ts
├── apps/
│   ├── web/                  # Next.js веб-приложение
│   ├── mobile/               # React Native
│   └── desktop/              # Tauri
└── docs/                     # Документация ⭐
```

---

## 🔄 Поток данных

### Self-Learning Pipeline
```
Trade → Journal → Self-Learning Manager
    ↓
Triple Barrier Labeling
    ↓
Meta-Labeling Prediction
    ↓
Feature Importance Analysis
    ↓
Pattern Recognition
    ↓
Recommendations
```

### Auto-Trading Pipeline
```
Market Data → Strategies → Signals
    ↓
Self-Learning Filter (Meta-Labeling)
    ↓
Risk Manager Check
    ↓
Position Sizing
    ↓
Execution Engine
    ↓
Exchange API
```

### Auto-Research Pipeline
```
Research Target → AutoML → Models
    ↓
Parameter Optimization
    ↓
Walk-Forward Validation
    ↓
Demo Trading (90 days)
    ↓
Auto-Deployment → Production
```

---

## 🔗 Интеграция между модулями

### Self-Learning ↔ Auto-Trading
```typescript
// Auto-Trading использует Self-Learning для фильтрации сигналов
const prediction = selfLearning.predictSignal(marketState);
if (prediction.shouldTrade) {
  autoTrading.execute(signal);
}
```

### Auto-Trading ↔ Auto-Research
```typescript
// Auto-Research деплоит стратегии в Auto-Trading
autoResearch.onEvent((event) => {
  if (event.type === 'strategy_deployed') {
    autoTrading.addStrategy(event.deploymentStatus.strategy);
  }
});
```

### Self-Learning ↔ Auto-Research
```typescript
// Self-Learning улучшает predictions для AutoML
const predictions = selfLearning.predictSignal(marketState);
automl.train({ features: predictions });
```

---

## 📊 База данных

```
┌─────────────────────────────────────────┐
│              PostgreSQL                 │
├─────────────────────────────────────────┤
│  - users                                │
│  - accounts                             │
│  - trades (journal)                     │
│  - positions                            │
│  - orders                               │
│  - strategies                           │
│  - models (ML)                          │
│  - research_results                     │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│                Redis                    │
├─────────────────────────────────────────┤
│  - cache (market data)                  │
│  - sessions                             │
│  - real-time prices                     │
│  - ml predictions                       │
└─────────────────────────────────────────┘
```

---

## 🔐 Безопасность

### API Keys
- Хранение в encrypted vault
- Read-only permissions для импорта
- IP whitelist

### Data Protection
- Шифрование чувствительных данных
- Secure WebSocket connections
- Rate limiting

### Risk Controls
- Max position size limits
- Daily/Weekly/Monthly loss limits
- Auto-stop при breach

---

## 📈 Масштабируемость

### Horizontal Scaling
```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   Web 1     │  │   Web 2     │  │   Web N     │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                │                │
       └────────────────┼────────────────┘
                        │
              ┌─────────▼─────────┐
              │   Load Balancer   │
              └─────────┬─────────┘
                        │
       ┌────────────────┼────────────────┐
       │                │                │
┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐
│  Backend 1  │  │  Backend 2  │  │  Backend N  │
└─────────────┘  └─────────────┘  └─────────────┘
```

### Vertical Scaling
- Rust backend для критичных компонентов
- Web Workers для ML inference
- Database connection pooling

---

## 🎯 Performance Targets

| Метрика | Target |
|---------|--------|
| **Order Latency** | < 100ms |
| **ML Inference** | < 50ms |
| **Data Refresh** | < 1s |
| **Chart Render** | < 16ms (60fps) |
| **API Response** | < 200ms |

---

## 📝 Конфигурация

### Environment Variables
```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/trading
REDIS_URL=redis://localhost:6379

# Exchanges
BINANCE_API_KEY=...
BINANCE_API_SECRET=...

# ML
ML_MODEL_PATH=./models/
ML_BATCH_SIZE=32

# Trading
PAPER_TRADING=true
DEFAULT_LEVERAGE=10
MAX_POSITION_SIZE=0.1
```

---

**Последнее обновление:** 2025-01-22  
**Версия:** 1.0.0
