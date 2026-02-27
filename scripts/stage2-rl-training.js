#!/usr/bin/env node
// ============================================
// STAGE 2: RL Agent Training
// Обучение RL агента и сравнение с классикой
// ============================================

const { createTradingEnvironment, createDQNAgent } = require('../packages/ml/src');
const { createBacktester, strategies } = require('../packages/backtester/src');

console.log('🤖 STAGE 2: RL Agent Training\n');
console.log('=' .repeat(60));

// ============================================
// Генерация данных
// ============================================

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

// ============================================
// RL Training
// ============================================

async function trainRLAgent(candles, config = {}) {
  const {
    episodes = 50,
    learningRate = 0.001,
    rewardType = 'sharpe',
  } = config;

  console.log('\n📚 Шаг 1: Обучение RL агента...\n');
  console.log(`   Episodes: ${episodes}`);
  console.log(`   Learning Rate: ${learningRate}`);
  console.log(`   Reward Type: ${rewardType}`);
  console.log('');

  const env = createTradingEnvironment({
    initialCapital: 10000,
    commission: 0.1,
    slippage: 0.05,
    maxPositionSize: 100,
    stopLoss: 2,
    takeProfit: 4,
    rewardType,
  });

  const agent = createDQNAgent({
    episodes,
    maxStepsPerEpisode: candles.length,
    learningRate,
    gamma: 0.99,
    epsilonStart: 1.0,
    epsilonEnd: 0.01,
    epsilonDecay: 0.995,
    batchSize: 32,
  });

  const episodeStats = [];
  const startTime = Date.now();

  for (let episode = 0; episode < episodes; episode++) {
    let state = env.reset(candles);
    let done = false;
    let totalReward = 0;
    let steps = 0;

    while (!done) {
      const action = agent.selectAction(state);
      const result = env.step(action);

      agent.remember(state, action, result.reward, result.state, result.done);
      const loss = agent.train();

      state = result.state;
      totalReward += result.reward;
      steps++;
      done = result.done;
    }

    const stats = env.getEpisodeStats();
    episodeStats.push(stats);

    // Прогресс каждые 10 эпизодов
    if ((episode + 1) % 10 === 0 || episode === 0) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`   Episode ${String(episode + 1).padStart(3)}/${episodes} | ` +
                  `Return: ${(stats.totalReturn * 100).toFixed(2).padStart(7)}% | ` +
                  `Sharpe: ${stats.sharpeRatio.toFixed(2).padStart(6)} | ` +
                  `Trades: ${stats.totalTrades.toString().padStart(3)} | ` +
                  `Time: ${elapsed.padStart(5)}s`);
    }
  }

  const trainingTime = ((Date.now() - startTime) / 1000).toFixed(2);
  const model = agent.save();

  console.log(`\n   ✅ Обучение завершено за ${trainingTime}s`);

  return { env, agent, model, episodeStats, trainingTime };
}

// ============================================
// Сравнение с классической стратегией
// ============================================

async function compareStrategies(candles, rlEnv) {
  console.log('\n📊 Шаг 2: Сравнение RL vs Classic...\n');

  // RL статистика
  const rlStats = rlEnv.getEpisodeStats();

  // Classic бэктест
  const backtester = new (require('../packages/backtester/src').Backtester)({
    initialCapital: 10000,
    commission: 0.1,
    slippage: 0.05,
  });

  const classicResult = await backtester.run(candles, strategies.smaCrossover);

  console.log('┌──────────────────────────────────────────────────────────┐');
  console.log('│              STRATEGY COMPARISON                         │');
  console.log('├──────────────────────────────────────────────────────────┤');
  console.log('│ Metric              │ RL Agent   │ Classic    │ Delta   │');
  console.log('├─────────────────────┼────────────┼────────────┼─────────┤');

  const metrics = [
    { name: 'Total Return', rl: rlStats.totalReturn * 100, classic: classicResult.totalPnlPercent, unit: '%' },
    { name: 'Sharpe Ratio', rl: rlStats.sharpeRatio, classic: classicResult.sharpeRatio, unit: '' },
    { name: 'Max Drawdown', rl: rlStats.maxDrawdown * 100, classic: classicResult.maxDrawdownPercent, unit: '%' },
    { name: 'Total Trades', rl: rlStats.totalTrades, classic: classicResult.totalTrades, unit: '' },
    { name: 'Win Rate', rl: 0, classic: classicResult.winRate * 100, unit: '%' },
  ];

  metrics.forEach(m => {
    const delta = m.rl - m.classic;
    const deltaStr = delta >= 0 ? `+${delta.toFixed(2)}` : delta.toFixed(2);
    const deltaColor = delta >= 0 ? '✅' : '❌';
    
    console.log(`│ ${m.name.padEnd(19)} │ ${String(m.rl).padStart(10).slice(0, 10)} ${m.unit.padEnd(1)} │ ${String(m.classic).padStart(10).slice(0, 10)} ${m.unit.padEnd(1)} │ ${deltaStr.padStart(7)} ${deltaColor} │`);
  });

  console.log('└──────────────────────────────────────────────────────────┘');

  // Определение победителя
  const rlWins = metrics.filter(m => m.name !== 'Total Trades' && m.rl > m.classic).length;
  const classicWins = metrics.filter(m => m.name !== 'Total Trades' && m.rl <= m.classic).length;

  console.log(`\n   🏆 Score: RL ${rlWins} - ${classicWins} Classic`);

  if (rlWins > classicWins) {
    console.log('   ✅ RL Agent показывает лучшие результаты!');
  } else {
    console.log('   ⚠️ Classic стратегия пока лучше (требуется дообучение RL)');
  }

  return { rlStats, classicResult };
}

// ============================================
// Сохранение модели
// ============================================

function saveModel(model) {
  const fs = require('fs');
  const path = require('path');

  const modelPath = path.join(__dirname, '..', 'models', 'rl-agent.json');

  if (!fs.existsSync(path.dirname(modelPath))) {
    fs.mkdirSync(path.dirname(modelPath), { recursive: true });
  }

  fs.writeFileSync(modelPath, JSON.stringify(model, null, 2));

  console.log(`\n💾 Модель сохранена: ${modelPath}`);
  console.log(`   Размер: ${(JSON.stringify(model).length / 1024).toFixed(2)} KB`);
}

// ============================================
// ЗАПУСК
// ============================================

async function runStage2() {
  try {
    const startTime = Date.now();

    // Генерация данных
    console.log('📈 Генерация тестовых данных...');
    const candles = generateMockCandles(500, 100);
    console.log(`   ✅ ${candles.length} свечей\n`);

    // Обучение RL
    const { env, agent, model, episodeStats, trainingTime } = await trainRLAgent(candles, {
      episodes: 50,
      learningRate: 0.001,
      rewardType: 'sharpe',
    });

    // Сравнение
    await compareStrategies(candles, env);

    // Сохранение
    saveModel(model);

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n' + '='.repeat(60));
    console.log(`✅ STAGE 2 COMPLETED in ${totalTime} seconds`);
    console.log('='.repeat(60));
    console.log('\n📝 Summary:');
    console.log('   ✅ RL Agent trained');
    console.log('   ✅ Comparison with classic strategy completed');
    console.log('   ✅ Model saved');
    console.log('\n🎯 Next: Run Stage 3 (Graph Analysis)');
    console.log('   Command: node scripts/stage3-graph-analysis.js\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runStage2();
