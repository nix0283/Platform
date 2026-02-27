#!/usr/bin/env node
// ============================================
// STAGE 1: XAI + Synthetic Data Testing
// Быстрый старт ML модулей
// ============================================

const { createXAIAnalyzer, createSyntheticGenerator, compareStatistics } = require('../packages/ml/src');
const { createBacktester, strategies } = require('../packages/backtester/src');

console.log('🚀 STAGE 1: XAI + Synthetic Data Testing\n');
console.log('=' .repeat(60));

// ============================================
// 1. Генерация тестовых данных
// ============================================

console.log('\n📈 Шаг 1: Генерация тестовых данных...\n');

function generateMockCandles(count = 500, basePrice = 100) {
  const candles = [];
  let price = basePrice;
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const change = (Math.random() - 0.5) * 2;
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.random();
    const low = Math.min(open, close) - Math.random();
    const volume = Math.random() * 1000 + 500;

    candles.push({
      timestamp: now - (count - i) * 3600000,
      open,
      high,
      low,
      close,
      volume,
      symbol: 'BTC/USDT',
      interval: '1h',
    });

    price = close;
  }

  return candles;
}

const mockCandles = generateMockCandles(500, 100);
console.log(`✅ Сгенерировано ${mockCandles.length} свечей`);
console.log(`   Диапазон цен: $${Math.min(...mockCandles.map(c => c.low)).toFixed(2)} - $${Math.max(...mockCandles.map(c => c.high)).toFixed(2)}`);

// ============================================
// 2. Классический бэктест
// ============================================

console.log('\n📊 Шаг 2: Классический бэктест (SMA Crossover)...\n');

async function runClassicBacktest() {
  const backtester = new (require('../packages/backtester/src').Backtester)({
    initialCapital: 10000,
    commission: 0.1,
    slippage: 0.05,
  });

  const result = await backtester.run(mockCandles, strategies.smaCrossover);

  console.log('┌─────────────────────────────────────────────────┐');
  console.log('│           CLASSIC STRATEGY RESULTS              │');
  console.log('├─────────────────────────────────────────────────┤');
  console.log(`│ Total PnL:        $${result.totalPnl.toFixed(2).padStart(10)}          │`);
  console.log(`│ Total Return:     ${(result.totalPnlPercent).toFixed(2).padStart(10)}%          │`);
  console.log(`│ Win Rate:         ${(result.winRate * 100).toFixed(1).padStart(10)}%          │`);
  console.log(`│ Total Trades:     ${result.totalTrades.toString().padStart(10)}          │`);
  console.log(`│ Sharpe Ratio:     ${result.sharpeRatio.toFixed(2).padStart(10)}          │`);
  console.log(`│ Max Drawdown:     ${(result.maxDrawdownPercent).toFixed(1).padStart(10)}%          │`);
  console.log(`│ Profit Factor:    ${result.profitFactor.toFixed(2).padStart(10)}          │`);
  console.log('└─────────────────────────────────────────────────┘');

  return result;
}

// ============================================
// 3. XAI Анализ
// ============================================

console.log('\n🔍 Шаг 3: XAI Анализ стратегии...\n');

async function runXAIAnalysis(backtestResult) {
  const analyzer = createXAIAnalyzer(['sma9', 'sma21', 'rsi', 'volatility', 'volume']);

  // Имитация данных признаков для каждой сделки
  const allFeatureValues = {
    sma9: [],
    sma21: [],
    rsi: [],
    volatility: [],
    volume: [],
  };

  for (let i = 0; i < Math.max(backtestResult.trades.length, 50); i++) {
    allFeatureValues.sma9.push(95 + Math.random() * 10);
    allFeatureValues.sma21.push(90 + Math.random() * 15);
    allFeatureValues.rsi.push(30 + Math.random() * 40);
    allFeatureValues.volatility.push(0.01 + Math.random() * 0.05);
    allFeatureValues.volume.push(500 + Math.random() * 1000);
  }

  const analysis = analyzer.analyzeStrategy(backtestResult.trades, allFeatureValues);

  console.log('┌─────────────────────────────────────────────────┐');
  console.log('│              XAI ANALYSIS RESULTS               │');
  console.log('├─────────────────────────────────────────────────┤');
  console.log(`│ Total Trades Analyzed: ${analysis.totalTrades.toString().padStart(26)} │`);
  console.log(`│ Feature Stability:     ${(analysis.featureStability * 100).toFixed(1).padStart(26)}% │`);
  console.log('├─────────────────────────────────────────────────┤');
  console.log('│ TOP 3 FEATURES:                                 │');
  
  analysis.topFeatures.slice(0, 3).forEach((f, i) => {
    const direction = f.direction === 'positive' ? '📈' : f.direction === 'negative' ? '📉' : '➡️';
    console.log(`│ ${i + 1}. ${f.feature.padEnd(15)} ${(f.importance * 100).toFixed(1).padStart(5)}% ${direction.padEnd(2)}          │`);
  });
  
  console.log('├─────────────────────────────────────────────────┤');
  console.log('│ RECOMMENDATIONS:                                │');
  
  analysis.recommendations.slice(0, 3).forEach((rec, i) => {
    const shortRec = rec.length > 45 ? rec.substring(0, 42) + '...' : rec;
    console.log(`│ • ${shortRec.padEnd(45)} │`);
  });
  
  console.log('└─────────────────────────────────────────────────┘');

  return analysis;
}

// ============================================
// 4. Synthetic Data Stress Test
// ============================================

console.log('\n💾 Шаг 4: Synthetic Data Stress Test...\n');

async function runSyntheticStressTest() {
  const generator = createSyntheticGenerator(42);

  // Генерация краш-сценария
  console.log('   Генерация сценария CRASH...');
  const crashData = generator.generateStressTest(mockCandles, {
    scenario: 'crash',
    severity: 0.8,
    duration: 50,
    startOffset: 0.5,
  });

  // Генерация Monte Carlo путей
  console.log('   Генерация Monte Carlo путей (100)...');
  const paths = generator.generatePaths(mockCandles, {
    method: 'monte_carlo',
    count: 100,
    volatility: 1.5,
  }, 100);

  // Статистическое сравнение
  const comparison = compareStatistics(mockCandles, crashData);

  console.log('\n┌─────────────────────────────────────────────────┐');
  console.log('│          SYNTHETIC DATA STATISTICS            │');
  console.log('├─────────────────────────────────────────────────┤');
  console.log('│ ORIGINAL vs CRASH SCENARIO:                     │');
  console.log(`│   Mean Return:      ${(comparison.original.mean * 100).toFixed(3).padStart(8)}% vs ${(comparison.synthetic.mean * 100).toFixed(3).padStart(8)}%  │`);
  console.log(`│   Volatility:       ${(comparison.original.stdDev * 100).toFixed(3).padStart(8)}% vs ${(comparison.synthetic.stdDev * 100).toFixed(3).padStart(8)}%  │`);
  console.log(`│   Max Drawdown:     ${(comparison.original.maxDrawdown * 100).toFixed(1).padStart(8)}% vs ${(comparison.synthetic.maxDrawdown * 100).toFixed(1).padStart(8)}%  │`);
  console.log(`│   Divergence:       ${(comparison.divergence * 100).toFixed(1).padStart(8)}%                    │`);
  console.log('├─────────────────────────────────────────────────┤');
  console.log(`│ Monte Carlo Paths Generated: ${paths.length.toString().padStart(21)} │`);
  
  // VaR расчет
  const finalValues = paths.map(p => p[p.length - 1].close);
  finalValues.sort((a, b) => a - b);
  const var95 = finalValues[Math.floor(finalValues.length * 0.05)];
  const var99 = finalValues[Math.floor(finalValues.length * 0.01)];
  
  console.log(`│ VaR 95%:            $${var95.toFixed(2).padStart(20)}  │`);
  console.log(`│ VaR 99%:            $${var99.toFixed(2).padStart(20)}  │`);
  console.log('└─────────────────────────────────────────────────┘');

  return { crashData, paths, comparison };
}

// ============================================
// ЗАПУСК ВСЕХ ЭТАПОВ
// ============================================

async function runStage1() {
  try {
    const startTime = Date.now();

    // Шаг 2: Бэктест
    const backtestResult = await runClassicBacktest();

    // Шаг 3: XAI
    await runXAIAnalysis(backtestResult);

    // Шаг 4: Synthetic
    await runSyntheticStressTest();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n' + '='.repeat(60));
    console.log(`✅ STAGE 1 COMPLETED in ${duration} seconds`);
    console.log('='.repeat(60));
    console.log('\n📝 Summary:');
    console.log('   ✅ Classic backtest executed');
    console.log('   ✅ XAI analysis completed');
    console.log('   ✅ Synthetic stress test completed');
    console.log('\n🎯 Next: Run Stage 2 (RL Training)');
    console.log('   Command: node scripts/stage2-rl-training.js\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

runStage1();
