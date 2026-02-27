# 🚀 Trading Platform — Аналог TradingView

## 📋 Важные документы

| Документ | Описание | Статус |
|----------|----------|--------|
| **[Техническое Задание (ТЗ)](./TECHNICAL_SPECIFICATION.md)** | Полное ТЗ со всеми требованиями | ✅ |
| **[Техническое Решение](./TECHNICAL_SOLUTION.md)** | Ответ на ТЗ с реализацией | ✅ |
| **[Worklog](./docs/WORKLOG.md)** | Журнал всех выполненных работ | ✅ |
| **[Документация](./docs/README.md)** | Полная документация проекта | ✅ |
| **[Quick Start](./docs/QUICKSTART.md)** | Быстрый старт | ✅ |

---

## 📐 Архитектура

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                │
├─────────────────────┬─────────────────────┬─────────────────────┤
│   Web (Next.js)     │   Desktop (Tauri)   │   Mobile (React)    │
│   - PWA support     │   - Native API      │   - React Native    │
│   - SSR/SSG         │   - System tray     │   - Offline-first   │
└─────────┬───────────┴──────────┬──────────┴──────────┬──────────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │ WebSocket + REST + Sync
┌────────────────────────────────▼────────────────────────────────┐
│                      BACKEND (Rust + Node.js)                   │
├─────────────────────┬─────────────────────┬─────────────────────┤
│   API Gateway       │   Data Engine       │   Trading Engine    │
│   - Auth            │   - WebSocket mgr   │   - Order mgmt      │
│   - Rate limiting   │   - Data normalize  │   - Risk check      │
│   - Routing         │   - Cache (Redis)   │   - Position track  │
└─────────┬───────────┴──────────┬──────────┴──────────┬──────────┘
          │                      │                      │
┌─────────▼───────────┐ ┌────────▼──────────┐ ┌────────▼──────────┐
│    Binance API      │ │    Bybit API      │ │    OKX API        │
└─────────────────────┘ └───────────────────┘ └───────────────────┘
│    Bitget API       │ │    BingX API      │
└─────────────────────┘ └───────────────────┘
```

## 🎯 Реализованный функционал

### ✅ 5 Бирж — Полные коннекторы + Тесты
| Биржа | REST | WebSocket | Ордера | Позиции | Тесты |
|-------|------|-----------|--------|---------|-------|
| Binance | ✅ | ✅ | ✅ | ✅ | ✅ |
| Bybit | ✅ | ✅ | ✅ | ✅ | ✅ |
| OKX | ✅ | ✅ | ✅ | ✅ | ✅ |
| Bitget | ✅ | ✅ | ✅ | ✅ | ✅ |
| BingX | ✅ | ✅ | ✅ | ✅ | ✅ |

**Файлы:**
- `packages/exchanges/tests/exchange.test.ts` — тесты всех коннекторов
- `packages/exchanges/src/{binance,bybit,okx,bitget,bingx}.ts` — коннекторы

### ✅ Pine Script Конвертер + Примеры
- **Lexer** — токенизация Pine Script v5
- **Parser** — синтаксический анализ в AST
- **Compiler** — конвертация в JavaScript
- **Runtime** — выполнение индикаторов
- **10 индикаторов** в примерах (SMA, EMA, RSI, MACD, BB, ATR, Ichimoku, etc.)
- **10 стратегий** в примерах (Golden Cross, RSI Mean Reversion, Breakout, Grid, DCA, etc.)

**Файлы:**
- `packages/pine-converter/examples/indicators.pine` — библиотека индикаторов
- `packages/pine-converter/examples/strategies.pine` — библиотека стратегий

### ✅ 4 Тулбара вокруг графика
| Тулбар | Функции |
|--------|---------|
| **Верхний** | Символ, таймфрейм, 10 индикаторов, 5 типов графиков, **Log scale** |
| **Левый** | 16+ инструментов рисования (трендовые, Fibonacci, фигуры, текст) |
| **Правый** | Выставление ордеров, позиции, активные ордера, аккаунт |
| **Нижний** | Навигация по времени, алёрты, скринер, масштабирование |

### ✅ Мобильное приложение (React Native)
- **Offline-first** архитектура
- **Синхронизация** с веб-приложением
- **Secure Store** для API ключей
- **Очередь действий** для офлайн-работы

### ✅ Desktop приложение (Tauri)
- **Нативные уведомления**
- **Системный трей**
- **Глобальные хоткеи**
- **Экспорт/Импорт данных**
- **Работа с файлами**

**Файлы:**
- `apps/desktop/src-tauri/src/main.rs` — Rust backend
- `apps/desktop/src-tauri/tauri.conf.json` — конфигурация

### ✅ Бэктестинг стратегий
- **Движок бэктестинга** с полной статистикой
- **6 готовых стратегий** (SMA Crossover, RSI, MACD, Breakout, Mean Reversion, Combined)
- **Метрики**: Sharpe Ratio, Sortino Ratio, Profit Factor, Max Drawdown, Win Rate
- **Учет комиссий и проскальзывания**
- **Тесты производительности**

**Файлы:**
- `packages/backtester/src/backtester.ts` — движок
- `packages/backtester/src/index.ts` — готовые стратегии
- `packages/backtester/tests/backtester.test.ts` — тесты

### ✅ ML Модули (2026 Trends) — ПОЛНАЯ ИНТЕГРАЦИЯ
- **XAI** — Интерпретируемость стратегий (SHAP-анализ, контрфактический анализ)
- **Synthetic Data** — Генерация синтетических данных (Monte Carlo, GBM, стресс-тесты)
- **Reinforcement Learning** — DQN агент для трейдинга (оптимизация исполнения, управление позициями)
- **Graph Analysis** — Анализ корреляций между активами (GNN, обнаружение аномалий)

**Файлы:**
- `packages/ml/src/xai/analyzer.ts` — XAI анализатор
- `packages/ml/src/synthetic/generator.ts` — Генератор синтетических данных
- `packages/ml/src/rl/environment.ts` — RL среда + DQN агент
- `packages/ml/src/graph/correlation.ts` — Построитель графов корреляций
- `packages/ml/README.md` — Полная документация

**Scripts:**
- `scripts/stage1-xai-synthetic.js` — Этап 1: XAI + Synthetic
- `scripts/stage2-rl-training.js` — Этап 2: RL Training
- `scripts/stage3-graph-analysis.js` — Этап 3: Graph Analysis
- `scripts/stage4-production.js` — Этап 4: Production
- `scripts/run-all-stages.js` — Запуск всех этапов

**Документация:**
- `ML_INTEGRATION_GUIDE.md` — Полное руководство по интеграции
- `ML_QUICKSTART.md` — Быстрый старт

## 🏗️ Стек технологий

| Слой | Технология | Обоснование |
|------|-----------|-------------|
| **Web Frontend** | Next.js 14 + TypeScript | SSR, API Routes, оптимизация |
| **Desktop** | Tauri v2 + React | Легче Electron, Rust backend |
| **Charting** | Lightweight Charts + Custom | MIT лицензия, расширяемость |
| **Backend API** | Node.js + Fastify | Быстрый REST, WebSocket |
| **Data Engine** | Rust (Actix) | Производительность, low-latency |
| **Database** | PostgreSQL + TimescaleDB | Временные ряды для свечей |
| **Cache** | Redis + Redis Streams | Real-time данные, pub/sub |
| **Queue** | BullMQ | Очереди задач, индикаторы |
| **Deploy** | Docker + Kubernetes | Масштабирование |

## 📁 Структура проекта

```
trading-platform/
├── apps/
│   ├── web/              # Next.js веб-приложение
│   └── desktop/          # Tauri десктоп приложение
├── packages/
│   ├── core/             # Общая бизнес-логика, типы
│   ├── charting/         # Расширенная библиотека графиков
│   └── exchanges/        # Унифицированный API бирж
├── backend/
│   ├── src/
│   │   ├── api/          # REST API endpoints
│   │   ├── ws/           # WebSocket handlers
│   │   ├── exchanges/    # Коннекторы к биржам
│   │   ├── indicators/   # Расчёт индикаторов
│   │   └── trading/      # Ордер-менеджмент
│   └── Cargo.toml        # Rust зависимости
└── docker/               # Docker конфигурации
```

## 🎯 Фазы реализации

### Фаза 1: MVP (2-3 недели)
- [ ] Базовая структура проекта
- [ ] Подключение 1 биржи (Binance)
- [ ] Отображение свечей на графике
- [ ] WebSocket для real-time данных
- [ ] Базовая авторизация

### Фаза 2: Core (3-4 недели)
- [ ] Все 5 бирж подключены
- [ ] Мульти-символ поддержка
- [ ] 10+ технических индикаторов
- [ ] Рисования на графике
- [ ] Синхронизация между вкладками

### Фаза 3: Trading (4-6 недель)
- [ ] Выставление ордеров
- [ ] Управление позициями
- [ ] P&L расчёт
- [ ] История сделок
- [ ] Риск-менеджмент

### Фаза 4: Advanced (6-8 недель)
- [ ] Конвертер Pine Script
- [ ] Скринер рынка
- [ ] Алёрты и уведомления
- [ ] Бэктестинг стратегий
- [ ] Desktop приложение

## 🚀 Быстрый старт

```bash
# Клонировать
git clone <repo> && cd trading-platform

# Установить зависимости
pnpm install

# Запустить backend
cd backend && cargo run

# Запустить веб
cd apps/web && pnpm dev

# Запустить desktop
cd apps/desktop && pnpm tauri dev
```

## 📊 Производительность

| Метрика | Цель | Метод достижения |
|---------|------|------------------|
| Latency (WS) | < 50ms | Rust + бинарный протокол |
| FPS отрисовки | 60 | WebGL + виртуализация |
| Одновременных символов | 100+ | WebSocket multiplexing |
| История свечей | 10k+ | TimescaleDB + кэширование |

## 🔐 Безопасность

- API ключи шифруются (AES-256)
- 2FA для торговых операций
- Rate limiting на всех endpoints
- Audit log всех действий

## 📝 Лицензия

MIT — все компоненты open-source
