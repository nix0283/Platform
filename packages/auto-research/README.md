# Auto-Research Package

Система авто-исследования и оптимизации торговых стратегий с AutoML, walk-forward валидацией, демо-трейдингом и auto-deployment.

## 🎯 Возможности

### 1. **AutoML**
- Автоматическое обучение ML моделей
- Поддержка: Linear Regression, Random Forest, XGBoost, LSTM, GRU, Transformer
- Ensemble predictions
- Feature importance

### 2. **Parameter Optimization**
- 5 методов оптимизации:
  - Grid Search
  - Random Search
  - Bayesian Optimization
  - Genetic Algorithm
  - Particle Swarm
- Early stopping
- Constraints support

### 3. **Walk-Forward Validation**
- Скользящие окна валидации
- Обнаружение переобучения
- Stability analysis
- Out-of-sample testing

### 4. **Demo Trading**
- 3-4 месяца демо-трейдинга
- Real-time мониторинг
- Success criteria tracking
- Deployment readiness scoring

### 5. **Auto-Deployment**
- Multi-stage deployment (research → demo → staging → production)
- Risk monitoring
- Auto-stop protection
- Performance tracking

## 🚀 Быстрый старт

```typescript
import { createAutoResearchManager } from '@trading-platform/auto-research';

// Создание менеджера
const autoResearch = createAutoResearchManager({
  target: {
    targetReturn: 10,      // 10% в месяц
    maxDrawdown: 15,       // 15% макс. просадка
    minSharpeRatio: 1.5,   // Sharpe > 1.5
    targetPeriod: 'month',
  },
  demoTrading: {
    duration: 90,  // 90 дней демо
  },
});

// Запуск исследования
await autoResearch.start({
  targetReturn: 10,
  targetPeriod: 'month',
  maxDrawdown: 15,
  minSharpeRatio: 1.5,
  minWinRate: 0.5,
  priority: 'sharpe',
});

// Мониторинг состояния
const state = autoResearch.getState();
console.log(`Phase: ${state.currentPhase}, Progress: ${state.progress}%`);

// Отчет
const report = autoResearch.generateReport('weekly');
```

## 📊 Pipeline

```
┌─────────────────┐
│  AutoML Phase   │  → Обучение ML моделей
│  (10-30%)       │
└────────┬────────┘
         │
┌────────▼────────┐
│  Optimization   │  → Оптимизация параметров
│  Phase (30-60%) │
└────────┬────────┘
         │
┌────────▼────────┐
│  Walk-Forward   │  → Валидация на истории
│  (60-80%)       │
└────────┬────────┘
         │
┌────────▼────────┐
│  Demo Trading   │  → 3-4 месяца демо
│  (80-95%)       │
└────────┬────────┘
         │
┌────────▼────────┐
│  Auto-Deploy    │  → Production
│  (95-100%)      │
└─────────────────┘
```

## ⚙️ Конфигурация

### Research Target
```typescript
const target = {
  targetReturn: 10,         // 10% в месяц
  targetPeriod: 'month',
  maxDrawdown: 15,          // 15% макс.
  minSharpeRatio: 1.5,      // Sharpe > 1.5
  minWinRate: 0.5,          // 50% win rate
  maxVolatility: 0.1,       // 10% волатильность
  minTrades: 30,            // Мин. 30 сделок
  priority: 'sharpe',       // Оптимизировать по Sharpe
};
```

### Optimization
```typescript
const optimization = {
  method: 'bayesian',       // Bayesian optimization
  maxIterations: 100,
  maxTime: 3600000,         // 1 час
  objective: 'sharpe',
  earlyStopping: true,
  patience: 20,
};
```

### Walk-Forward
```typescript
const walkForward = {
  trainingPeriod: 180,      // 6 месяцев
  validationPeriod: 30,     // 1 месяц
  testPeriod: 30,           // 1 месяц
  stepSize: 30,             // Шаг 30 дней
};
```

### Demo Trading
```typescript
const demoTrading = {
  duration: 90,             // 90 дней
  successCriteria: {
    minReturn: 5,           // 5% за период
    maxDrawdown: 10,        // 10% макс.
    minSharpeRatio: 1.5,
    minTrades: 30,
  },
  deploymentThreshold: 0.75, // 75% критериев
};
```

## 📈 Интеграция

### С Auto-Trading
```typescript
const autoResearch = createAutoResearchManager();
const autoTrading = createAutoTradingManager();

autoResearch.onEvent((event) => {
  if (event.type === 'strategy_deployed') {
    // Добавить стратегию в auto-trading
    autoTrading.addStrategy(event.deploymentStatus.strategy);
  }
});
```

### С Self-Learning
```typescript
// Self-learning улучшает predictions для AutoML
const predictions = selfLearning.predictSignal(marketState);
automl.train({ features: predictions });
```

### С Journal
```typescript
autoResearch.onEvent((event) => {
  if (event.type === 'demo_trading_completed') {
    journal.addReport(event.report);
  }
});
```

## 🎯 Критерии успеха

| Критерий | Demo | Staging | Production |
|----------|------|---------|------------|
| **Return** | 5% | 5% | 5% |
| **Drawdown** | <10% | <10% | <10% |
| **Sharpe** | >1.5 | >1.5 | >1.5 |
| **Days** | 30 | 14 | 7 |
| **Trades** | 30+ | 15+ | 7+ |

## 🔧 Расширение

### Добавление своей ML модели
```typescript
import { AutoMLEngine } from '@trading-platform/auto-research';

const automl = new AutoMLEngine({
  models: [
    { 
      type: 'my_custom_model',
      parameters: { param1: 10 },
      horizons: [1, 5, 10],
      features: ['rsi', 'ema'],
    },
  ],
});
```

### Кастомная оптимизация
```typescript
import { StrategyOptimizer } from '@trading-platform/auto-research';

const optimizer = new StrategyOptimizer({
  method: 'genetic',
  parameterSpace: [
    { name: 'lookback', type: 'discrete', min: 10, max: 100, step: 5 },
    { name: 'threshold', type: 'continuous', min: 0, max: 1, step: 0.01 },
  ],
});
```

## 📊 Метрики

| Метрика | Описание |
|---------|----------|
| **MAE/MSE/RMSE** | Ошибки предсказания |
| **Directional Accuracy** | % правильных направлений |
| **Sharpe Ratio** | Риск-скорректированная доходность |
| **Stability Score** | Стабильность между folds |
| **Overfitting Score** | Score переобучения |
| **Deployment Confidence** | Уверенность для deployment |

## 📋 Ожидаемые результаты

| Этап | Время | Результат |
|------|-------|-----------|
| **AutoML** | 1-2 дня | 5-10 обученных моделей |
| **Optimization** | 1-2 дня | Оптимизированные параметры |
| **Walk-Forward** | 1 день | Валидация на истории |
| **Demo Trading** | 3-4 месяца | Реальная валидация |
| **Deployment** | 1 день | Production стратегия |

## 🎯 Следующие шаги

1. ✅ **Фаза 1**: Самообучение (реализовано)
2. ✅ **Фаза 2**: Алготрейдинг (реализовано)
3. ✅ **Фаза 3**: Авто-исследование (реализовано)

**ВСЕ 3 ФАЗЫ ЗАВЕРШЕНЫ!** 🎉
