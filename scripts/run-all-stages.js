#!/usr/bin/env node
// ============================================
// ALL STAGES RUNNER
// Запускает все 4 этапа последовательно
// ============================================

const { execSync } = require('child_process');
const path = require('path');

console.log('\n' + '🚀'.repeat(30));
console.log('   TRADING PLATFORM - ML INTEGRATION');
console.log('   All Stages Runner');
console.log('🚀'.repeat(30) + '\n');

const stages = [
  {
    name: 'Stage 1: XAI + Synthetic Data',
    script: 'stage1-xai-synthetic.js',
    description: 'Тестирование XAI анализа и синтетических данных',
  },
  {
    name: 'Stage 2: RL Training',
    script: 'stage2-rl-training.js',
    description: 'Обучение RL агента и сравнение с классикой',
  },
  {
    name: 'Stage 3: Graph Analysis',
    script: 'stage3-graph-analysis.js',
    description: 'Построение графа корреляций и генерация сигналов',
  },
  {
    name: 'Stage 4: Production Integration',
    script: 'stage4-production.js',
    description: 'Интеграция в продакшен и мониторинг',
  },
];

async function runAllStages() {
  const startTime = Date.now();
  const results = [];

  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];
    const stageStartTime = Date.now();

    console.log('\n' + '='.repeat(70));
    console.log(`   ${i + 1}/${stages.length}: ${stage.name}`);
    console.log(`   ${stage.description}`);
    console.log('='.repeat(70) + '\n');

    try {
      execSync(`node ${path.join(__dirname, stage.script)}`, {
        stdio: 'inherit',
        cwd: __dirname,
      });

      const stageDuration = ((Date.now() - stageStartTime) / 1000).toFixed(2);
      results.push({
        stage: stage.name,
        status: '✅ SUCCESS',
        duration: stageDuration,
      });
    } catch (error) {
      const stageDuration = ((Date.now() - stageStartTime) / 1000).toFixed(2);
      results.push({
        stage: stage.name,
        status: '❌ FAILED',
        duration: stageDuration,
        error: error.message,
      });

      console.error(`\n   ❌ ${stage.name} failed!`);
      console.error('   Stopping execution.\n');
      break;
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(2);

  // Final summary
  console.log('\n' + '🏁'.repeat(30));
  console.log('   FINAL SUMMARY');
  console.log('🏁'.repeat(30) + '\n');

  console.log('┌──────────────────────────────────────────────────────────────────────┐');
  console.log('│ Stage                              │ Status      │ Duration         │');
  console.log('├────────────────────────────────────┼─────────────┼──────────────────┤');

  results.forEach(result => {
    const stageName = result.stage.substring(0, 34).padEnd(34);
    const status = result.status.padEnd(11);
    const duration = `${result.duration}s`.padEnd(16);
    console.log(`│ ${stageName} │ ${status} │ ${duration} │`);
  });

  console.log('└──────────────────────────────────────────────────────────────────────┘');

  const allSuccess = results.every(r => r.status === '✅ SUCCESS');

  console.log(`\n   Total Time: ${totalTime} minutes`);
  console.log(`   Stages Completed: ${results.length}/${stages.length}`);

  if (allSuccess) {
    console.log('\n   🎉 ALL STAGES COMPLETED SUCCESSFULLY!');
    console.log('\n   📁 Check the following directories:');
    console.log('      - models/       (RL models)');
    console.log('      - results/      (Analysis results)');
    console.log('      - config/       (Production config)');
    console.log('\n   🚀 Ready for production!\n');
  } else {
    console.log('\n   ⚠️ Some stages failed. Check the errors above.\n');
    process.exit(1);
  }
}

runAllStages();
