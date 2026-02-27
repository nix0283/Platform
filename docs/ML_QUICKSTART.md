# 🚀 ML Quick Start Guide

## Установка

```bash
cd trading-platform
pnpm install
```

## 1️⃣ XAI — Анализ стратегии (5 минут)

```bash
node -e "
const { createXAIAnalyzer } = require('./packages/ml/src');

const analyzer = createXAIAnalyzer(['rsi', 'sma20', 'volatility', 'volume']);

console.log('✅ XAI Analyzer готов');
console.log('Признаки:', ['rsi', 'sma20', 'volatility', 'volume']);
"
```

## 2️⃣ Synthetic Data — Стресс-тест (5 минут)

```bash
node -e "
const { createSyntheticGenerator } = require('./packages/ml/src');

const generator = createSyntheticGenerator(42);

// Пример данных (в реальности загрузить из биржи)
const mockCandles = Array.from({ length: 100 }, (_, i) => ({
  timestamp: Date.now() - (100 - i) * 3600000,
  open: 100 + Math.random() * 10,
  high: 110 + Math.random() * 10,
  low: 90 + Math.random() * 10,
  close: 100 + Math.random() * 10,
  volume: 1000 + Math.random() * 500,
  symbol: 'BTC/USDT',
  interval: '1h',
}));

// Генерация краш-сценария
const crashData = generator.generateStressTest(mockCandles, {
  scenario: 'crash',
  severity: 0.8,
  duration: 20,
});

console.log('✅ Стресс-тест готов');
console.log('Оригинал свечей:', mockCandles.length);
console.log('После стресса:', crashData.length);
"
```

## 3️⃣ RL — Обучение агента (10 минут)

```bash
node -e "
const { createTradingEnvironment, createDQNAgent } = require('./packages/ml/src');

const env = createTradingEnvironment({ initialCapital: 10000, rewardType: 'sharpe' });
const agent = createDQNAgent({ episodes: 50, learningRate: 0.001 });

// Моковые данные
const mockCandles = Array.from({ length: 200 }, (_, i) => ({
  timestamp: Date.now() - (200 - i) * 3600000,
  open: 100 + Math.random() * 10,
  high: 110 + Math.random() * 10,
  low: 90 + Math.random() * 10,
  close: 100 + Math.random() * 10,
  volume: 1000 + Math.random() * 500,
  symbol: 'BTC/USDT',
  interval: '1h',
}));

console.log('🎯 Начало обучения RL агента...');

for (let episode = 0; episode < 10; episode++) {
  let state = env.reset(mockCandles);
  let done = false;
  let totalReward = 0;
  
  while (!done) {
    const action = agent.selectAction(state);
    const result = env.step(action);
    agent.remember(state, action, result.reward, result.state, result.done);
    agent.train();
    state = result.state;
    totalReward += result.reward;
    done = result.done;
  }
  
  const stats = env.getEpisodeStats();
  console.log(\\\`Episode \${episode}: Return=\\\${(stats.totalReturn * 100).toFixed(2)}%, Sharpe=\\\${stats.sharpeRatio.toFixed(2)}\\\`);
}

console.log('✅ Обучение завершено');
"
```

## 4️⃣ Graph — Анализ корреляций (5 минут)

```bash
node -e "
const { createCorrelationGraphBuilder } = require('./packages/ml/src');

const builder = createCorrelationGraphBuilder({
  lookbackWindow: 20,
  correlationThreshold: 0.5,
});

// Моковые данные для 3 символов
const mockCandles = {};
for (const symbol of ['BTC/USDT', 'ETH/USDT', 'SOL/USDT']) {
  mockCandles[symbol] = Array.from({ length: 50 }, (_, i) => ({
    timestamp: Date.now() - (50 - i) * 3600000,
    open: 100 + Math.random() * 10,
    high: 110 + Math.random() * 10,
    low: 90 + Math.random() * 10,
    close: 100 + Math.random() * 10,
    volume: 1000 + Math.random() * 500,
    symbol,
    interval: '1h',
  }));
}

const graph = builder.build(mockCandles);

console.log('✅ Граф построен');
console.log('Узлов:', graph.nodes.length);
console.log('Ребер:', graph.edges.length);

if (graph.edges.length > 0) {
  console.log('Пример ребра:', graph.edges[0]);
}
"
```

## 📊 Полный пример: Интеграция с бэктестером

```bash
node examples/ml-integration.js
```

Создайте файл `examples/ml-integration.js`:

```javascript
const { createBacktester, strategies } = require('./packages/backtester/src');
const { createXAIAnalyzer, createSyntheticGenerator, createTradingEnvironment } = require('./packages/ml/src');

async function runMLBacktest() {
  console.log('🚀 ML-Enhanced Backtest\n');
  
  // 1. Генерация тестовых данных
  const generator = createSyntheticGenerator(42);
  const mockCandles = Array.from({ length: 500 }, (_, i) => ({
    timestamp: Date.now() - (500 - i) * 3600000,
    open: 100 + Math.sin(i / 50) * 20 + Math.random() * 5,
    high: 105 + Math.sin(i / 50) * 20 + Math.random() * 5,
    low: 95 + Math.sin(i / 50) * 20 - Math.random() * 5,
    close: 100 + Math.sin(i / 50) * 20 + Math.random() * 5,
    volume: 1000 + Math.random() * 500,
    symbol: 'BTC/USDT',
    interval: '1h',
  }));
  
  console.log('📈 Данные:', mockCandles.length, 'свечей');
  
  // 2. Классический бэктест
  const backtester = createBacktester({ initialCapital: 10000 });
  const result = await backtester.run(mockCandles, strategies.smaCrossover);
  
  console.log('\\n📊 Classic Strategy Results:');
  console.log('  Total PnL:', result.totalPnl.toFixed(2));
  console.log('  Win Rate:', (result.winRate * 100).toFixed(1) + '%');
  console.log('  Sharpe Ratio:', result.sharpeRatio.toFixed(2));
  console.log('  Max Drawdown:', result.maxDrawdownPercent.toFixed(1) + '%');
  
  // 3. XAI анализ
  const analyzer = createXAIAnalyzer(['sma9', 'sma21', 'rsi', 'volatility']);
  console.log('\\n🔍 XAI Analysis ready');
  
  // 4. RL обучение
  const env = createTradingEnvironment({ initialCapital: 10000, rewardType: 'sharpe' });
  console.log('\\n🤖 RL Environment ready');
  
  console.log('\\n✅ ML Integration complete!');
}

runMLBacktest().catch(console.error);
```

## 🎯 Следующие шаги

1. **Запустить тесты**
   ```bash
   pnpm --filter @trading-platform/ml test
   ```

2. **Изучить документацию**
   ```bash
   cat packages/ml/README.md
   ```

3. **Интегрировать в платформу**
   - Добавить XAI в результаты бэктеста
   - Использовать синтетические данные для стресс-тестов
   - Обучить RL агента на исторических данных
   - Построить граф корреляций для топ-50 монет

## 📚 Примеры кода

Полные примеры в:
- `packages/ml/src/index.ts` — пример usage functions
- `packages/ml/README.md` — детальная документация
- `TESTING.md` — тестирование ML модулей

---

**Время реализации:** ~30 минут для знакомства со всеми модулями
