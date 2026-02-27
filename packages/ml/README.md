# 🤖 ML Module Documentation

## Обзор

Пакет `@trading-platform/ml` предоставляет 4 ключевых направления машинного обучения для трейдинга:

1. **XAI** — Интерпретируемость стратегий
2. **Synthetic Data** — Генерация синтетических данных
3. **Reinforcement Learning** — Обучение с подкреплением
4. **Graph Analysis** — Анализ корреляций

---

## 1️⃣ XAI (Explainable AI)

### Назначение
Объяснение решений торговых стратегий, анализ важности признаков, отладка.

### Быстрый старт

```typescript
import { createXAIAnalyzer } from '@trading-platform/ml';

// Создание анализатора
const analyzer = createXAIAnalyzer([
  'rsi', 'sma20', 'ema50', 'volatility', 'volume', 'trend'
]);

// Анализ отдельной сделки
const explanation = analyzer.analyzeTrade(trade, featureValues, modelPrediction);

console.log(explanation.summary);
// "Покупка инициирована преимущественно из-за rsi (45.2% важности). Уверенность сигнала: 78%"

// Анализ всей стратегии
const analysis = analyzer.analyzeStrategy(trades, allFeatureValues);

console.log('Топ признаки:', analysis.topFeatures);
console.log('Рекомендации:', analysis.recommendations);
```

### Интерпретация результатов

```typescript
// FeatureImportance
{
  feature: 'rsi',
  importance: 0.45,      // 45% важности в решении
  direction: 'positive', // Положительная корреляция с прибылью
  confidence: 0.87       // 87% уверенность
}

// TradeExplanation
{
  tradeId: 'trade_001',
  entryReasons: [...],   // Почему вошли в сделку
  exitReasons: [...],    // Почему вышли
  whatIf: {              // Контрфактический анализ
    noEntry: 0,          // PnL если бы не вошли
    earlierExit: 150,    // PnL при раннем выходе
    laterExit: 220       // PnL при позднем выходе
  }
}
```

### Визуализация

```typescript
import { generateWaterfallChart } from '@trading-platform/ml';

const chart = generateWaterfallChart(explanation);
// "Base: 0.00 → rsi: +0.45 → sma20: +0.23 → volatility: -0.12 → Total: 0.56"
```

---

## 2️⃣ Synthetic Data

### Назначение
Генерация синтетических рыночных данных для стресс-тестирования и дообучения моделей.

### Быстрый старт

```typescript
import { createSyntheticGenerator, compareStatistics } from '@trading-platform/ml';

const generator = createSyntheticGenerator(42); // seed для воспроизводимости

// Генерация методом Monte Carlo
const synthetic = generator.generate(historicalCandles, {
  method: 'monte_carlo',
  count: 500,
  volatility: 1.2,  // 20% больше волатильности
  trend: 0,         // Без тренда
  addNoise: true,
  noiseLevel: 0.1,
});

// Проверка статистической схожести
const comparison = compareStatistics(historicalCandles, synthetic);
console.log(`Дивергенция: ${(comparison.divergence * 100).toFixed(1)}%`);
// Дивергенция: 12.3% (хорошо, < 20%)
```

### Стресс-тесты

```typescript
// Сценарий краха рынка
const crashData = generator.generateStressTest(historicalCandles, {
  scenario: 'crash',      // crash, flash_crash, pump, sideways, high_volatility
  severity: 0.8,          // 80% интенсивности
  duration: 50,           // 50 свечей
  startOffset: 0.5,       // Начать с середины данных
});

// Monte Carlo симуляция для оценки риска
const paths = generator.generatePaths(historicalCandles, {
  method: 'monte_carlo',
  count: 100,
  volatility: 1.5,
}, 1000); // 1000 путей

// Анализ VaR (Value at Risk)
const finalValues = paths.map(path => path[path.length - 1].close);
finalValues.sort((a, b) => a - b);
const var95 = finalValues[Math.floor(finalValues.length * 0.05)];
console.log(`VaR 95%: ${var95}`);
```

### Сценарии стресс-тестов

| Сценарий | Описание | Использование |
|----------|----------|---------------|
| `crash` | Плавное падение до -30% | Тест устойчивости портфеля |
| `flash_crash` | Быстрое падение на -50% и отскок | Тест ликвидности |
| `pump` | Рост на +50% | Тест шорт-позиций |
| `sideways` | Боковое движение | Тест флэт-стратегий |
| `high_volatility` | Высокая волатильность | Тест риск-менеджмента |

---

## 3️⃣ Reinforcement Learning

### Назначение
Обучение агента для оптимального исполнения ордеров и управления позициями.

### Быстрый старт

```typescript
import { createTradingEnvironment, createDQNAgent } from '@trading-platform/ml';

// Создание среды
const env = createTradingEnvironment({
  initialCapital: 10000,
  commission: 0.1,      // 0.1% комиссия
  slippage: 0.05,       // 0.05% проскальзывание
  maxPositionSize: 100, // 100% капитала в позицию
  stopLoss: 2,          // 2% стоп-лосс
  takeProfit: 4,        // 4% тейк-профит
  rewardType: 'sharpe', // Оптимизация по Sharpe Ratio
});

// Создание агента
const agent = createDQNAgent({
  episodes: 100,
  maxStepsPerEpisode: 1000,
  learningRate: 0.001,
  gamma: 0.99,          // Discount factor
  epsilonStart: 1.0,    // 100% exploration в начале
  epsilonEnd: 0.01,     // 1% exploration в конце
  epsilonDecay: 0.995,  // Затухание exploration
  batchSize: 32,
});

// Обучение
for (let episode = 0; episode < 100; episode++) {
  let state = env.reset(candles);
  let done = false;
  let totalReward = 0;
  
  while (!done) {
    const action = agent.selectAction(state);  // 0=HOLD, 1=BUY, 2=SELL
    const result = env.step(action);
    
    agent.remember(state, action, result.reward, result.state, result.done);
    agent.train();
    
    state = result.state;
    totalReward += result.reward;
    done = result.done;
  }
  
  const stats = env.getEpisodeStats();
  console.log(`Episode ${episode}: Return=${(stats.totalReturn * 100).toFixed(2)}%, Sharpe=${stats.sharpeRatio.toFixed(2)}`);
}

// Сохранение модели
const model = agent.save();
fs.writeFileSync('rl-model.json', JSON.stringify(model));
```

### Загрузка и использование модели

```typescript
// Загрузка обученной модели
const savedModel = JSON.parse(fs.readFileSync('rl-model.json', 'utf8'));
agent.load(savedModel);

// Инференс (торговля)
let state = env.reset(latestCandles);
const action = agent.selectAction(state);

if (action === 1) {
  console.log('BUY signal');
  // placeOrder('BUY', ...)
} else if (action === 2) {
  console.log('SELL signal');
  // placeOrder('SELL', ...)
}
```

### Типы наград (Reward Functions)

| Тип | Формула | Когда использовать |
|-----|---------|-------------------|
| `pnl` | `(equity_t - equity_{t-1}) / equity_{t-1}` | Максимальная прибыль |
| `sharpe` | `mean(returns) / std(returns)` | Риск-скорректированная доходность |
| `sortino` | `mean(returns) / downside_std(returns)` | Только downside риск |
| `calmar` | `total_return / max_drawdown` | Отношение прибыль/просадка |

---

## 4️⃣ Graph Analysis

### Назначение
Анализ корреляций между активами, обнаружение аномалий, генерация сигналов.

### Быстрый старт

```typescript
import { createCorrelationGraphBuilder } from '@trading-platform/ml';

const builder = createCorrelationGraphBuilder({
  lookbackWindow: 60,        // 60 свечей для расчета
  correlationThreshold: 0.6, // Минимальная корреляция для ребра
  maxEdges: 100,             // Максимум ребер в графе
});

// Построение графа
const graph = builder.build({
  'BTC/USDT': btcCandles,
  'ETH/USDT': ethCandles,
  'SOL/USDT': solCandles,
  // ...
});

console.log(`Узлов: ${graph.nodes.length}, Ребер: ${graph.edges.length}`);
```

### Генерация сигналов

```typescript
// Расчет изменений цен
const priceChanges: Record<string, number> = {};
for (const [symbol, candles] of Object.entries(candlesBySymbol)) {
  const last = candles[candles.length - 1].close;
  const prev = candles[candles.length - 2].close;
  priceChanges[symbol] = (last - prev) / prev;
}

// Генерация сигналов
const signals = builder.generateSignals(graph, priceChanges);

for (const signal of signals.slice(0, 5)) {
  console.log(`${signal.symbol}: ${signal.signal} (${(signal.confidence * 100).toFixed(0)}%)`);
  console.log(`  Причины: ${signal.reasons.join(', ')}`);
  console.log(`  Связанные: ${signal.relatedSymbols.map(s => s.symbol).join(', ')}`);
}
```

### Обнаружение аномалий

```typescript
// Обнаружение аномалий в графе
const anomalies = builder.detectAnomalies(currentGraph, historicalGraphs);

for (const anomaly of anomalies) {
  console.log(`⚠️ ${anomaly.symbol}: ${anomaly.anomalyType}`);
  console.log(`   Серьезность: ${(anomaly.severity * 100).toFixed(0)}%`);
  console.log(`   Описание: ${anomaly.description}`);
}
```

### Типы аномалий

| Тип | Описание | Торговое значение |
|-----|----------|-------------------|
| `isolation` | Резкое падение числа связей | Актив ведет себя независимо от рынка |
| `hub` | Резкий рост числа связей | Актив становится системно важным |
| `correlation_break` | Разрыв исторической корреляции | Возможность для парного трейдинга |

---

## 📊 Интеграция с бэктестером

### Полный пример: XAI + Бэктестер

```typescript
import { createBacktester, strategies } from '@trading-platform/backtester';
import { createXAIAnalyzer } from '@trading-platform/ml';

// Запуск бэктеста
const backtester = createBacktester({ initialCapital: 10000 });
const result = await backtester.run(candles, strategies.smaCrossover);

// XAI анализ
const analyzer = createXAIAnalyzer(['sma9', 'sma21', 'rsi', 'volatility']);

// Сбор данных для анализа
const allFeatureValues: Record<string, number[]> = {
  sma9: [], sma21: [], rsi: [], volatility: []
};

for (const trade of result.trades) {
  // Здесь должны быть реальные значения признаков на момент входа
  // allFeatureValues.sma9.push(...)
}

const analysis = analyzer.analyzeStrategy(result.trades, allFeatureValues);

console.log('Топ признаки:', analysis.topFeatures.map(f => f.feature));
console.log('Рекомендации:', analysis.recommendations);
```

### Полный пример: RL + Бэктестер

```typescript
import { createBacktester } from '@trading-platform/backtester';
import { createTradingEnvironment, createDQNAgent } from '@trading-platform/ml';

// Обучение RL агента
const env = createTradingEnvironment({ rewardType: 'sharpe' });
const agent = createDQNAgent({ episodes: 100 });

for (let episode = 0; episode < 100; episode++) {
  let state = env.reset(candles);
  let done = false;
  
  while (!done) {
    const action = agent.selectAction(state);
    const result = env.step(action);
    agent.remember(state, action, result.reward, result.state, result.done);
    agent.train();
    state = result.state;
    done = result.done;
  }
}

// Сравнение с классической стратегией
const rlStats = env.getEpisodeStats();

const backtester = createBacktester({ initialCapital: 10000 });
const classicResult = await backtester.run(candles, strategies.smaCrossover);

console.log('RL Sharpe:', rlStats.sharpeRatio);
console.log('Classic Sharpe:', classicResult.sharpeRatio);
```

---

## 🚀 Performance Tips

### Оптимизация XAI

```typescript
// Кэширование базовых предсказаний
const analyzer = createXAIAnalyzer(features);
// Анализ только топ-10 признаков для скорости
const topReasons = explanation.entryReasons.slice(0, 10);
```

### Оптимизация Synthetic Data

```typescript
// Генерация только необходимого количества путей
const paths = generator.generatePaths(data, config, 100); // Не 1000
// Использование bootstrap для быстрых тестов
const synthetic = generator.generate(data, { method: 'bootstrap', count: 100 });
```

### Оптимизация RL

```typescript
// Уменьшение lookback window для скорости
const env = createTradingEnvironment({ lookbackWindow: 10 });
// Batch training реже
const agent = createDQNAgent({ batchSize: 64, targetUpdateFreq: 200 });
```

### Оптимизация Graph

```typescript
// Ограничение количества ребер
const builder = createCorrelationGraphBuilder({ maxEdges: 50 });
// Расчет корреляций только для топ-20 символов по объему
```

---

## 📝 Best Practices

1. **Всегда валидируйте синтетические данные** через `compareStatistics()`
2. **Используйте XAI для отладки** перед запуском на реальных деньгах
3. **Обучайте RL на разных рыночных режимах** (бычий, медвежий, флэт)
4. **Мониторьте аномалии графа** для раннего обнаружения изменений режима
5. **Сохраняйте модели** после обучения для воспроизводимости

---

## 🐛 Troubleshooting

### XAI показывает низкую уверенность

→ Проверьте, что признаки имеют достаточную вариативность
→ Увеличьте количество сделок для анализа

### Синтетические данные не похожи на оригинал

→ Увеличьте `lookbackWindow` для лучшей статистики
→ Используйте `monte_carlo` вместо `bootstrap`

### RL агент не сходится

→ Увеличьте `episodes` до 500+
→ Уменьшите `learningRate` до 0.0001
→ Проверьте `rewardType` — `sharpe` стабильнее `pnl`

### Граф слишком разреженный

→ Уменьшите `correlationThreshold` до 0.4
→ Увеличьте `lookbackWindow`

---

## 📚 Дополнительные ресурсы

- [Reinforcement Learning for Trading](https://www.example.com/rl-trading)
- [Explainable AI in Finance](https://www.example.com/xai-finance)
- [Graph Neural Networks](https://www.example.com/gnn)
