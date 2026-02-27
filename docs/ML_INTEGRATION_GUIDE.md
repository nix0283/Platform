# 🚀 ML Integration Guide

Полное руководство по интеграции ML модулей в торговую платформу.

---

## 📋 Обзор

Этот гайд проведет вас через 4 этапа интеграции ML модулей:

| Этап | Название | Время | Цель |
|------|----------|-------|------|
| **1** | XAI + Synthetic Data | 5-10 мин | Тестирование интерпретируемости и синтетических данных |
| **2** | RL Training | 10-30 мин | Обучение RL агента и сравнение с классикой |
| **3** | Graph Analysis | 5-10 мин | Построение графа корреляций и сигналов |
| **4** | Production Integration | 5-10 мин | Деплой и настройка мониторинга |

---

## 🎯 Быстрый старт

### Вариант 1: Запустить все этапы сразу

```bash
cd trading-platform

# Установить зависимости (если еще не установлены)
pnpm install

# Запустить все 4 этапа последовательно
pnpm ml:all
```

### Вариант 2: Запускать поэтапно

```bash
# Этап 1: XAI + Synthetic
pnpm ml:stage1

# Этап 2: RL Training
pnpm ml:stage2

# Этап 3: Graph Analysis
pnpm ml:stage3

# Этап 4: Production
pnpm ml:stage4
```

---

## 📁 Структура файлов

```
trading-platform/
├── scripts/
│   ├── stage1-xai-synthetic.js    # Этап 1
│   ├── stage2-rl-training.js      # Этап 2
│   ├── stage3-graph-analysis.js   # Этап 3
│   ├── stage4-production.js       # Этап 4
│   └── run-all-stages.js          # Мастер-скрипт
├── packages/ml/
│   ├── src/
│   │   ├── xai/                   # XAI модуль
│   │   ├── synthetic/             # Synthetic Data модуль
│   │   ├── rl/                    # Reinforcement Learning модуль
│   │   └── graph/                 # Graph Analysis модуль
│   └── README.md                  # Документация ML
├── models/                        # Сохраненные модели (создается)
│   └── rl-agent.json
├── results/                       # Результаты анализа (создается)
│   ├── graph-analysis.json
│   └── dashboard.json
└── config/                        # Конфигурация (создается)
    └── production.json
```

---

## 📊 Детальное описание этапов

### Этап 1: XAI + Synthetic Data

**Что делает:**
- Запускает классический бэктест (SMA Crossover)
- Анализирует важность признаков через XAI
- Генерирует стресс-сценарии (crash, flash crash)
- Создает Monte Carlo пути для VaR анализа

**Результаты:**
```
┌─────────────────────────────────────────────────┐
│           CLASSIC STRATEGY RESULTS              │
├─────────────────────────────────────────────────┤
│ Total PnL:        $XXXX.XX                      │
│ Win Rate:         XX.X%                         │
│ Sharpe Ratio:     X.XX                          │
│ Max Drawdown:     XX.X%                         │
└─────────────────────────────────────────────────┘
```

**Команда:**
```bash
pnpm ml:stage1
```

---

### Этап 2: RL Training

**Что делает:**
- Создает RL среду для трейдинга
- Обучает DQN агента (50 эпизодов)
- Сравнивает RL с классической стратегией
- Сохраняет обученную модель

**Результаты:**
```
┌──────────────────────────────────────────────────────────┐
│              STRATEGY COMPARISON                         │
├──────────────────────────────────────────────────────────┤
│ Metric              │ RL Agent   │ Classic    │ Delta   │
├─────────────────────┼────────────┼────────────┼─────────┤
│ Total Return        │   XX.XX%   │   XX.XX%   │  +X.XX ✅│
│ Sharpe Ratio        │    X.XX    │    X.XX    │  +X.XX ✅│
│ Max Drawdown        │   XX.X%    │   XX.X%    │  -X.XX ✅│
└──────────────────────────────────────────────────────────┘
```

**Команда:**
```bash
pnpm ml:stage2
```

---

### Этап 3: Graph Analysis

**Что делает:**
- Строит граф корреляций для топ-20 символов
- Находит топ корреляции
- Генерирует торговые сигналы
- Обнаруживает аномалии

**Результаты:**
```
┌──────────────────────────────────────────────────────────┐
│              TOP 10 CORRELATIONS                         │
├──────────────────────────────────────────────────────────┤
│ Source        │ Target        │ Corr   │ Type           │
├───────────────┼───────────────┼────────┼────────────────┤
│ BTC/USDT      │ ETH/USDT      │  0.XXX │ 📈 Positive    │
└──────────────────────────────────────────────────────────┘
```

**Команда:**
```bash
pnpm ml:stage3
```

---

### Этап 4: Production Integration

**Что делает:**
- Валидирует все модели
- Создает production конфигурацию
- Интегрирует ML с бэктестером
- Создает мониторинг дашборд
- Генерирует production checklist

**Результаты:**
```
┌──────────────────────────────────────────────────────────┐
│           PRODUCTION CHECKLIST                           │
├──────────────────────────────────────────────────────────┤
│ ✅ ML модели валидированы                                │
│ ✅ Конфигурация создана                                  │
│ ✅ Интеграция с бэктестером                              │
│ ✅ Мониторинг настроен                                   │
│ ✅ Risk management правила                               │
│ ✅ Alert system                                          │
└──────────────────────────────────────────────────────────┘
```

**Команда:**
```bash
pnpm ml:stage4
```

---

## 🔧 Конфигурация

После выполнения этапов создаются следующие файлы:

### `config/production.json`

```json
{
  "ml": {
    "xai": {
      "enabled": true,
      "featureNames": ["rsi", "sma9", "sma21", "volatility", "volume"],
      "minConfidence": 0.6
    },
    "rl": {
      "enabled": true,
      "modelPath": "./models/rl-agent.json",
      "rewardType": "sharpe",
      "maxPositionSize": 50
    },
    "graph": {
      "enabled": true,
      "symbols": ["BTC/USDT", "ETH/USDT", ...],
      "correlationThreshold": 0.6
    }
  },
  "risk": {
    "maxDailyLoss": 5,
    "maxDrawdown": 15,
    "maxOpenPositions": 5
  }
}
```

### `models/rl-agent.json`

Сохраненная модель RL агента (веса Q-сети).

### `results/dashboard.json`

Мониторинг дашборд в реальном времени.

---

## 📈 Интерпретация результатов

### XAI Analysis

**Хорошо:**
- Feature Stability > 0.7
- Top features имеют четкую направленность
- Рекомендации конкретны

**Плохо:**
- Feature Stability < 0.3
- Все признаки имеют одинаковую важность
- Нет четких рекомендаций

### RL Training

**Хорошо:**
- Sharpe Ratio > 1.0
- Max Drawdown < 15%
- Win Rate > 50%

**Плохо:**
- Sharpe Ratio < 0.5
- Max Drawdown > 30%
- Эпизоды не сходятся

### Graph Analysis

**Хорошо:**
- Корреляции > 0.7 между связанными активами
- Сигналы с confidence > 0.7
- Мало аномалий

**Плохо:**
- Корреляции < 0.3
- Нет сильных сигналов
- Много аномалий

---

## 🐛 Troubleshooting

### Ошибка: "Cannot find module"

```bash
pnpm install
```

### Ошибка: "RL Agent не сходится"

Увеличьте количество эпизодов:
```javascript
// В stage2-rl-training.js
episodes: 100, // вместо 50
```

### Ошибка: "Graph пустой"

Уменьшите порог корреляции:
```javascript
// В stage3-graph-analysis.js
correlationThreshold: 0.4, // вместо 0.6
```

### Ошибка: "Модели не найдены"

Запустите этапы 2 и 3 перед этапом 4:
```bash
pnpm ml:stage2
pnpm ml:stage3
pnpm ml:stage4
```

---

## 🎯 Следующие шаги после интеграции

1. **Замените моковые данные на реальные:**
   ```javascript
   const candles = await exchange.getCandles('BTC/USDT', '1h', 1000);
   ```

2. **Настройте алерты:**
   ```javascript
   // В config/production.json
   "alertThresholds": {
     "drawdown": 10,
     "dailyLoss": 3
   }
   ```

3. **Подключите к веб-интерфейсу:**
   ```typescript
   // В apps/web/src/app/api/ml/route.ts
   import { createTradingEnvironment } from '@trading-platform/ml';
   ```

4. **Запустите мониторинг:**
   ```bash
   # Каждые 5 минут
   node scripts/stage4-production.js
   ```

---

## 📚 Дополнительные ресурсы

- [ML Module Documentation](packages/ml/README.md)
- [Testing Guide](TESTING.md)
- [Quick Start](ML_QUICKSTART.md)

---

## 💡 Best Practices

1. **Всегда запускайте этапы последовательно**
2. **Сохраняйте модели после обучения**
3. **Мониторьте дрифт моделей**
4. **Регулярно дообучайте RL агента**
5. **Валидируйте синтетические данные**

---

**Время выполнения всех этапов:** ~30-60 минут

**Готово к продакшену:** ✅
