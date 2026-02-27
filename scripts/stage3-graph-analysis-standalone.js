#!/usr/bin/env node
// ============================================
// STAGE 3: Graph Correlation Analysis
// АВТОНОМНАЯ ВЕРСИЯ (без зависимости от TS)
// ============================================

console.log('🕸️ STAGE 3: Graph Correlation Analysis\n');
console.log('=' .repeat(70));

// ============================================
// ГЕНЕРАТОР ДАННЫХ
// ============================================

function generateMockCandles(symbol, count = 100, basePrice = 100) {
  const candles = [];
  let price = basePrice;
  const now = Date.now();

  // Добавляем корреляцию между символами через общий рыночный тренд
  const marketTrend = Math.sin(count / 15) * 0.3;

  for (let i = 0; i < count; i++) {
    const marketMove = marketTrend + (Math.random() - 0.5) * 0.2;
    const change = price * marketMove * 0.05;
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.abs(change) * Math.random() * 0.5;
    const low = Math.min(open, close) - Math.abs(change) * Math.random() * 0.5;
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
// КОРРЕЛЯЦИОННЫЙ АНАЛИЗ
// ============================================

function calculateReturns(candles) {
  const returns = [];
  for (let i = 1; i < candles.length; i++) {
    returns.push((candles[i].close - candles[i - 1].close) / candles[i - 1].close);
  }
  return returns;
}

function calculatePearsonCorrelation(x, y) {
  const n = Math.min(x.length, y.length);
  if (n < 10) return 0;

  const meanX = x.slice(0, n).reduce((a, b) => a + b, 0) / n;
  const meanY = y.slice(0, n).reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let sumX2 = 0;
  let sumY2 = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    numerator += dx * dy;
    sumX2 += dx * dx;
    sumY2 += dy * dy;
  }

  const denominator = Math.sqrt(sumX2 * sumY2);
  return denominator === 0 ? 0 : numerator / denominator;
}

function buildCorrelationMatrix(candlesBySymbol) {
  const symbols = Object.keys(candlesBySymbol);
  const returns = {};

  // Расчет доходностей
  for (const symbol of symbols) {
    returns[symbol] = calculateReturns(candlesBySymbol[symbol]);
  }

  // Расчет корреляций
  const matrix = [];
  for (let i = 0; i < symbols.length; i++) {
    matrix[i] = [];
    for (let j = 0; j < symbols.length; j++) {
      if (i === j) {
        matrix[i][j] = 1;
      } else {
        matrix[i][j] = calculatePearsonCorrelation(
          returns[symbols[i]],
          returns[symbols[j]]
        );
      }
    }
  }

  return { symbols, matrix };
}

// ============================================
// ПОСТРОЕНИЕ ГРАФА
// ============================================

function buildGraph(candlesBySymbol, config = {}) {
  const {
    lookbackWindow = 60,
    correlationThreshold = 0.5,
    maxEdges = 50,
  } = config;

  const symbols = Object.keys(candlesBySymbol);
  const nodes = [];
  const edges = [];

  // Создание узлов
  for (const symbol of symbols) {
    const candles = candlesBySymbol[symbol].slice(-lookbackWindow);
    if (candles.length < lookbackWindow) continue;

    const features = extractFeatures(candles);
    nodes.push({
      id: symbol,
      features,
      metadata: {
        symbol,
        exchange: 'BINANCE',
        sector: inferSector(symbol),
      },
    });
  }

  // Расчет корреляционной матрицы
  const correlationMatrix = buildCorrelationMatrix(candlesBySymbol);

  // Создание ребер
  for (let i = 0; i < correlationMatrix.symbols.length; i++) {
    for (let j = i + 1; j < correlationMatrix.symbols.length; j++) {
      const correlation = correlationMatrix.matrix[i][j];

      if (Math.abs(correlation) >= correlationThreshold) {
        edges.push({
          source: correlationMatrix.symbols[i],
          target: correlationMatrix.symbols[j],
          weight: correlation,
          type: 'correlation',
        });
      }
    }
  }

  // Сортировка и ограничение ребер
  edges.sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));
  const trimmedEdges = edges.slice(0, maxEdges);

  return {
    nodes,
    edges: trimmedEdges,
    timestamp: Date.now(),
  };
}

function extractFeatures(candles) {
  const closes = candles.map(c => c.close);
  const returns = [];
  for (let i = 1; i < closes.length; i++) {
    returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
  }

  const mean = returns.reduce((a, b) => a + b, 0) / returns.length || 0;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length || 0;
  const stdDev = Math.sqrt(variance);
  const sma20 = closes.length >= 20 ? closes.slice(-20).reduce((a, b) => a + b, 0) / 20 : closes[closes.length - 1];

  return [mean, stdDev, closes[closes.length - 1] / sma20, returns[returns.length - 1] || 0];
}

function inferSector(symbol) {
  const base = symbol.split('/')[0];
  if (['BTC', 'ETH'].includes(base)) return 'L1';
  if (['UNI', 'AAVE', 'COMP'].includes(base)) return 'DeFi';
  if (['DOGE', 'SHIB', 'PEPE'].includes(base)) return 'Meme';
  return 'Other';
}

// ============================================
// ГЕНЕРАЦИЯ СИГНАЛОВ
// ============================================

function generateSignals(graph, priceChanges) {
  const signals = [];

  for (const node of graph.nodes) {
    const edges = graph.edges.filter(e => e.source === node.id || e.target === node.id);
    const relatedSymbols = [];

    let expectedMove = 0;
    let totalWeight = 0;

    for (const edge of edges) {
      const neighbor = edge.source === node.id ? edge.target : edge.source;
      const neighborChange = priceChanges[neighbor] || 0;
      const influence = edge.weight * neighborChange;

      expectedMove += influence;
      totalWeight += Math.abs(edge.weight);

      relatedSymbols.push({
        symbol: neighbor,
        correlation: edge.weight,
        influence: edge.weight > 0 ? 'positive' : 'negative',
      });
    }

    if (totalWeight > 0) {
      expectedMove /= totalWeight;
    }

    // Генерация сигнала
    const threshold = 0.02;
    let signal = 'HOLD';
    let confidence = 0;

    if (expectedMove > threshold) {
      signal = 'BUY';
      confidence = Math.min(1, expectedMove / threshold);
    } else if (expectedMove < -threshold) {
      signal = 'SELL';
      confidence = Math.min(1, Math.abs(expectedMove) / threshold);
    } else {
      confidence = 1 - Math.abs(expectedMove) / threshold;
    }

    signals.push({
      symbol: node.id,
      signal,
      confidence,
      reasons: generateReasons(signal, expectedMove, relatedSymbols),
      relatedSymbols: relatedSymbols.slice(0, 5),
    });
  }

  return signals.sort((a, b) => b.confidence - a.confidence);
}

function generateReasons(signal, expectedMove, relatedSymbols) {
  const reasons = [];

  if (signal === 'BUY') {
    reasons.push(`Ожидаемый рост: ${(expectedMove * 100).toFixed(2)}%`);
    const positiveInfluencers = relatedSymbols.filter(r => r.influence === 'positive' && r.correlation > 0.7);
    if (positiveInfluencers.length > 0) {
      reasons.push(`Корреляция с: ${positiveInfluencers.map(s => s.symbol.split('/')[0]).join(', ')}`);
    }
  } else if (signal === 'SELL') {
    reasons.push(`Ожидаемое падение: ${(Math.abs(expectedMove) * 100).toFixed(2)}%`);
    const negativeInfluencers = relatedSymbols.filter(r => r.influence === 'negative' && Math.abs(r.correlation) > 0.7);
    if (negativeInfluencers.length > 0) {
      reasons.push(`Обратная корреляция: ${negativeInfluencers.map(s => s.symbol.split('/')[0]).join(', ')}`);
    }
  } else {
    reasons.push('Недостаточно сигналов для входа');
  }

  return reasons;
}

// ============================================
// ОБНАРУЖЕНИЕ АНОМАЛИЙ
// ============================================

function detectAnomalies(graph, historicalGraphs = []) {
  const anomalies = [];

  if (historicalGraphs.length === 0) {
    // Создаем "исторические" графы для сравнения
    for (let i = 0; i < 3; i++) {
      historicalGraphs.push({
        nodes: graph.nodes,
        edges: graph.edges.map(e => ({
          ...e,
          weight: e.weight + (Math.random() - 0.5) * 0.2,
        })),
        timestamp: Date.now() - i * 3600000,
      });
    }
  }

  // Средняя историческая корреляция
  const historicalCorrelations = new Map();
  for (const histGraph of historicalGraphs) {
    for (const edge of histGraph.edges) {
      const key = edge.source < edge.target
        ? `${edge.source}-${edge.target}`
        : `${edge.target}-${edge.source}`;
      if (!historicalCorrelations.has(key)) {
        historicalCorrelations.set(key, []);
      }
      historicalCorrelations.get(key).push(edge.weight);
    }
  }

  const avgHistorical = new Map();
  for (const [key, values] of historicalCorrelations.entries()) {
    avgHistorical.set(key, values.reduce((a, b) => a + b, 0) / values.length);
  }

  // Проверка разрывов корреляций
  for (const edge of graph.edges) {
    const key = edge.source < edge.target
      ? `${edge.source}-${edge.target}`
      : `${edge.target}-${edge.source}`;
    const historical = avgHistorical.get(key);

    if (historical !== undefined) {
      const change = Math.abs(edge.weight - historical);
      if (change > 0.3) {
        anomalies.push({
          symbol: edge.source,
          anomalyType: 'correlation_break',
          severity: Math.min(1, change / 0.5),
          description: `Разрыв корреляции с ${edge.target}: ${historical.toFixed(2)} → ${edge.weight.toFixed(2)}`,
        });
      }
    }
  }

  return anomalies.sort((a, b) => b.severity - a.severity);
}

// ============================================
// ЭКСПОРТ РЕЗУЛЬТАТОВ
// ============================================

const fs = require('fs');
const path = require('path');

function exportResults(graph, signals, anomalies) {
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
    topCorrelations: graph.edges.slice(0, 10),
    signals: signals.slice(0, 10),
    anomalies: anomalies.slice(0, 5),
  };

  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  return resultsPath;
}

// ============================================
// ЗАПУСК
// ============================================

async function runStage3() {
  try {
    const startTime = Date.now();

    // Шаг 1: Генерация данных
    console.log('\n📈 Шаг 1: Генерация данных для 20 символов...\n');

    const symbols = [
      'BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT', 'XRP/USDT',
      'ADA/USDT', 'AVAX/USDT', 'DOGE/USDT', 'DOT/USDT', 'MATIC/USDT',
      'LTC/USDT', 'LINK/USDT', 'UNI/USDT', 'ATOM/USDT', 'ETC/USDT',
      'XLM/USDT', 'ALGO/USDT', 'VET/USDT', 'ICP/USDT', 'FIL/USDT',
    ];

    const basePrices = {
      'BTC/USDT': 30000, 'ETH/USDT': 2000, 'BNB/USDT': 300, 'SOL/USDT': 100,
      'XRP/USDT': 0.5, 'ADA/USDT': 0.3, 'AVAX/USDT': 35, 'DOGE/USDT': 0.08,
      'DOT/USDT': 7, 'MATIC/USDT': 0.8, 'LTC/USDT': 90, 'LINK/USDT': 15,
      'UNI/USDT': 6, 'ATOM/USDT': 10, 'ETC/USDT': 20, 'XLM/USDT': 0.12,
      'ALGO/USDT': 0.15, 'VET/USDT': 0.02, 'ICP/USDT': 5, 'FIL/USDT': 5,
    };

    const candlesBySymbol = {};
    for (const symbol of symbols) {
      candlesBySymbol[symbol] = generateMockCandles(symbol, 100, basePrices[symbol] || 50);
    }

    console.log(`   ✅ Сгенерировано ${symbols.length} наборов данных`);
    console.log(`   Объем: ${Object.values(candlesBySymbol)[0].length} свечей каждый`);

    // Шаг 2: Построение графа
    console.log('\n🕸️ Шаг 2: Построение графа корреляций...\n');

    const graph = buildGraph(candlesBySymbol, {
      lookbackWindow: 60,
      correlationThreshold: 0.5,
      maxEdges: 50,
    });

    console.log(`   ✅ Граф построен:`);
    console.log(`      Узлов: ${graph.nodes.length}`);
    console.log(`      Ребер: ${graph.edges.length}`);

    // Шаг 3: Анализ корреляций
    console.log('\n📊 Шаг 3: Топ корреляций...\n');

    const topEdges = graph.edges.slice(0, 10);

    console.log('┌──────────────────────────────────────────────────────────────┐');
    console.log('│                  TOP 10 CORRELATIONS                         │');
    console.log('├──────────────────────────────────────────────────────────────┤');
    console.log('│ Source        │ Target        │ Corr   │ Type               │');
    console.log('├───────────────┼───────────────┼────────┼────────────────────┤');

    topEdges.forEach(edge => {
      const type = edge.weight > 0 ? '📈 Positive' : '📉 Negative';
      console.log(`│ ${edge.source.padEnd(13)} │ ${edge.target.padEnd(13)} │ ${edge.weight.toFixed(3).padStart(6)} │ ${type.padEnd(18)} │`);
    });

    console.log('└──────────────────────────────────────────────────────────────┘');

    // Поиск хабов
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

    // Шаг 4: Генерация сигналов
    console.log('\n🎯 Шаг 4: Генерация торговых сигналов...\n');

    const priceChanges = {};
    for (const [symbol, candles] of Object.entries(candlesBySymbol)) {
      const last = candles[candles.length - 1].close;
      const prev = candles[candles.length - 2].close;
      priceChanges[symbol] = (last - prev) / prev;
    }

    const signals = generateSignals(graph, priceChanges);
    const strongSignals = signals.filter(s => s.confidence > 0.5).slice(0, 10);

    console.log('┌──────────────────────────────────────────────────────────────┐');
    console.log('│                   TRADING SIGNALS                            │');
    console.log('├──────────────────────────────────────────────────────────────┤');
    console.log('│ Symbol        │ Signal │ Conf  │ Related Symbols             │');
    console.log('├───────────────┼────────┼───────┼─────────────────────────────┤');

    strongSignals.forEach(signal => {
      const signalIcon = signal.signal === 'BUY' ? '🟢' : signal.signal === 'SELL' ? '🔴' : '⚪';
      const related = signal.relatedSymbols.slice(0, 2).map(s => s.symbol.split('/')[0]).join(', ');
      console.log(`│ ${signal.symbol.padEnd(13)} │ ${signalIcon} ${signal.signal.padEnd(4)} │ ${(signal.confidence * 100).toFixed(0).padStart(3)}% │ ${related.padEnd(27)} │`);
    });

    console.log('└──────────────────────────────────────────────────────────────┘');

    // Топ сигнал
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

    // Шаг 5: Обнаружение аномалий
    console.log('\n⚠️ Шаг 5: Обнаружение аномалий...\n');

    const anomalies = detectAnomalies(graph);

    if (anomalies.length === 0) {
      console.log('   ✅ Аномалий не обнаружено');
    } else {
      console.log(`   🚨 Обнаружено ${anomalies.length} аномалий:\n`);
      anomalies.slice(0, 5).forEach((anomaly, i) => {
        const severityColor = anomaly.severity > 0.7 ? '🔴' : anomaly.severity > 0.4 ? '🟡' : '🟢';
        console.log(`   ${severityColor} ${i + 1}. ${anomaly.symbol}`);
        console.log(`      Тип: ${anomaly.anomalyType}`);
        console.log(`      Серьезность: ${(anomaly.severity * 100).toFixed(1)}%`);
        console.log(`      ${anomaly.description}\n`);
      });
    }

    // Шаг 6: Экспорт результатов
    console.log('\n💾 Шаг 6: Экспорт результатов...\n');

    const resultsPath = exportResults(graph, signals, anomalies);
    console.log(`   ✅ Результаты: ${resultsPath}`);

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n' + '='.repeat(70));
    console.log(`✅ STAGE 3 COMPLETED in ${totalTime} seconds`);
    console.log('='.repeat(70));
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
