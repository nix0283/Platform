#!/usr/bin/env node
// ============================================
// STAGE 3: Graph Correlation Analysis
// Построение графа и генерация сигналов
// ============================================

const { createCorrelationGraphBuilder } = require('../packages/ml/src');

console.log('🕸️ STAGE 3: Graph Correlation Analysis\n');
console.log('=' .repeat(60));

// ============================================
// Генерация данных для нескольких символов
// ============================================

function generateMockCandles(symbol, count = 100, basePrice = 100) {
  const candles = [];
  let price = basePrice;
  const now = Date.now();

  // Добавляем некоторую корреляцию между символами
  const marketBias = Math.sin(count / 20) * 0.5;

  for (let i = 0; i < count; i++) {
    const marketMove = marketBias + (Math.random() - 0.5) * 0.3;
    const change = price * marketMove * 0.1;
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.abs(change) * Math.random();
    const low = Math.min(open, close) - Math.abs(change) * Math.random();
    const volume = Math.random() * 1000 + 500;

    candles.push({
      timestamp: now - (count - i) * 3600000,
      open,
      high,
      low,
      close,
      volume,
      symbol,
      interval: '1h',
    });

    price = close;
  }

  return candles;
}

// ============================================
// Построение графа
// ============================================

async function buildCorrelationGraph() {
  console.log('\n📈 Шаг 1: Построение графа корреляций...\n');

  // Топ-20 крипто символов
  const symbols = [
    'BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT', 'XRP/USDT',
    'ADA/USDT', 'AVAX/USDT', 'DOGE/USDT', 'DOT/USDT', 'MATIC/USDT',
    'LTC/USDT', 'LINK/USDT', 'UNI/USDT', 'ATOM/USDT', 'ETC/USDT',
    'XLM/USDT', 'ALGO/USDT', 'VET/USDT', 'ICP/USDT', 'FIL/USDT',
  ];

  console.log(`   Анализ ${symbols.length} символов...`);

  const candlesBySymbol = {};
  for (const symbol of symbols) {
    const basePrice = symbol === 'BTC/USDT' ? 30000 :
                      symbol === 'ETH/USDT' ? 2000 :
                      symbol === 'BNB/USDT' ? 300 :
                      symbol === 'SOL/USDT' ? 100 :
                      symbol === 'XRP/USDT' ? 0.5 : 50;

    candlesBySymbol[symbol] = generateMockCandles(symbol, 100, basePrice);
  }

  const builder = createCorrelationGraphBuilder({
    lookbackWindow: 60,
    correlationThreshold: 0.5,
    maxEdges: 50,
  });

  const graph = builder.build(candlesBySymbol);

  console.log(`\n   ✅ Граф построен:`);
  console.log(`      Узлов: ${graph.nodes.length}`);
  console.log(`      Ребер: ${graph.edges.length}`);

  return { graph, builder, candlesBySymbol };
}

// ============================================
// Анализ корреляций
// ============================================

async function analyzeCorrelations(graph) {
  console.log('\n📊 Шаг 2: Анализ корреляций...\n');

  // Топ корреляций
  const topEdges = graph.edges
    .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))
    .slice(0, 10);

  console.log('┌──────────────────────────────────────────────────────────┐');
  console.log('│              TOP 10 CORRELATIONS                         │');
  console.log('├──────────────────────────────────────────────────────────┤');
  console.log('│ Source        │ Target        │ Corr   │ Type           │');
  console.log('├───────────────┼───────────────┼────────┼────────────────┤');

  topEdges.forEach(edge => {
    const type = edge.weight > 0 ? '📈 Positive' : '📉 Negative';
    console.log(`│ ${edge.source.padEnd(13)} │ ${edge.target.padEnd(13)} │ ${(edge.weight).toFixed(3).padStart(6)} │ ${type.padEnd(14)} │`);
  });

  console.log('└──────────────────────────────────────────────────────────┘');

  // Поиск хабов (наиболее связанных узлов)
  const connectionCount = {};
  for (const edge of graph.edges) {
    connectionCount[edge.source] = (connectionCount[edge.source] || 0) + 1;
    connectionCount[edge.target] = (connectionCount[edge.target] || 0) + 1;
  }

  const hubs = Object.entries(connectionCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  console.log('\n   🎯 Top Hubs (наиболее связанные):');
  hubs.forEach(([symbol, count], i) => {
    console.log(`      ${i + 1}. ${symbol}: ${count} связей`);
  });

  return { topEdges, hubs };
}

// ============================================
// Генерация сигналов
// ============================================

async function generateSignals(graph, builder, candlesBySymbol) {
  console.log('\n🎯 Шаг 3: Генерация торговых сигналов...\n');

  // Расчет изменений цен
  const priceChanges = {};
  for (const [symbol, candles] of Object.entries(candlesBySymbol)) {
    const last = candles[candles.length - 1].close;
    const prev = candles[candles.length - 2].close;
    priceChanges[symbol] = (last - prev) / prev;
  }

  const signals = builder.generateSignals(graph, priceChanges);

  // Фильтрация сильных сигналов
  const strongSignals = signals.filter(s => s.confidence > 0.5).slice(0, 10);

  console.log('┌──────────────────────────────────────────────────────────┐');
  console.log('│              TRADING SIGNALS                             │');
  console.log('├──────────────────────────────────────────────────────────┤');
  console.log('│ Symbol        │ Signal │ Conf  │ Related Symbols         │');
  console.log('├───────────────┼────────┼───────┼─────────────────────────┤');

  strongSignals.forEach(signal => {
    const signalIcon = signal.signal === 'BUY' ? '🟢' : signal.signal === 'SELL' ? '🔴' : '⚪';
    const related = signal.relatedSymbols.slice(0, 2).map(s => s.symbol.split('/')[0]).join(', ');
    console.log(`│ ${signal.symbol.padEnd(13)} │ ${signalIcon} ${signal.signal.padEnd(4)} │ ${(signal.confidence * 100).toFixed(0).padStart(3)}% │ ${related.padEnd(23)} │`);
  });

  console.log('└──────────────────────────────────────────────────────────┘');

  // Детализация топ сигнала
  if (strongSignals.length > 0) {
    const topSignal = strongSignals[0];
    console.log(`\n   📝 Топ сигнал: ${topSignal.symbol}`);
    console.log(`      Действие: ${topSignal.signal}`);
    console.log(`      Уверенность: ${(topSignal.confidence * 100).toFixed(1)}%`);
    console.log(`      Причины:`);
    topSignal.reasons.forEach(reason => {
      console.log(`        • ${reason}`);
    });
  }

  return signals;
}

// ============================================
// Обнаружение аномалий
// ============================================

async function detectAnomalies(builder, graph) {
  console.log('\n⚠️ Шаг 4: Обнаружение аномалий...\n');

  // Генерация "исторических" графов для сравнения
  const historicalGraphs = [];
  for (let i = 0; i < 3; i++) {
    const mockGraph = {
      nodes: graph.nodes,
      edges: graph.edges.map(e => ({
        ...e,
        weight: e.weight + (Math.random() - 0.5) * 0.2,
      })),
      timestamp: Date.now() - i * 3600000,
    };
    historicalGraphs.push(mockGraph);
  }

  const anomalies = builder.detectAnomalies(graph, historicalGraphs);

  if (anomalies.length === 0) {
    console.log('   ✅ Аномалий не обнаружено');
  } else {
    console.log(`   🚨 Обнаружено ${anomalies.length} аномалий:\n`);

    anomalies.slice(0, 5).forEach((anomaly, i) => {
      const severityColor = anomaly.severity > 0.7 ? '🔴' : anomaly.severity > 0.4 ? '🟡' : '🟢';
      console.log(`   ${severityColor} ${i + 1}. ${anomaly.symbol}`);
      console.log(`      Тип: ${anomaly.anomalyType}`);
      console.log(`      Серьезность: ${(anomaly.severity * 100).toFixed(1)}%`);
      console.log(`      ${anomaly.description}`);
      console.log('');
    });
  }

  return anomalies;
}

// ============================================
// Экспорт результатов
// ============================================

function exportResults(graph, signals, anomalies) {
  const fs = require('fs');
  const path = require('path');

  const resultsPath = path.join(__dirname, '..', 'results', 'graph-analysis.json');

  if (!fs.existsSync(path.dirname(resultsPath))) {
    fs.mkdirSync(path.dirname(resultsPath), { recursive: true });
  }

  const results = {
    timestamp: Date.now(),
    graph: {
      nodes: graph.nodes.length,
      edges: graph.edges.length,
    },
    signals: signals.slice(0, 10),
    anomalies: anomalies.slice(0, 5),
  };

  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));

  console.log(`\n💾 Результаты экспортированы: ${resultsPath}`);
}

// ============================================
// ЗАПУСК
// ============================================

async function runStage3() {
  try {
    const startTime = Date.now();

    // Шаг 1: Построение графа
    const { graph, builder, candlesBySymbol } = await buildCorrelationGraph();

    // Шаг 2: Анализ корреляций
    await analyzeCorrelations(graph);

    // Шаг 3: Генерация сигналов
    const signals = await generateSignals(graph, builder, candlesBySymbol);

    // Шаг 4: Обнаружение аномалий
    const anomalies = await detectAnomalies(builder, graph);

    // Экспорт
    exportResults(graph, signals, anomalies);

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n' + '='.repeat(60));
    console.log(`✅ STAGE 3 COMPLETED in ${totalTime} seconds`);
    console.log('='.repeat(60));
    console.log('\n📝 Summary:');
    console.log('   ✅ Correlation graph built');
    console.log('   ✅ Top correlations identified');
    console.log('   ✅ Trading signals generated');
    console.log('   ✅ Anomalies detected');
    console.log('   ✅ Results exported');
    console.log('\n🎯 Next: Run Stage 4 (Production Integration)');
    console.log('   Command: node scripts/stage4-production.js\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runStage3();
