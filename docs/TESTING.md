# 🧪 TESTING GUIDE

## Запуск тестов

### 1. Тесты бирж (Exchange Tests)

```bash
cd trading-platform

# Установить зависимости
pnpm install

# Запустить тесты бирж
pnpm --filter @trading-platform/exchanges test

# Запустить с покрытием
pnpm --filter @trading-platform/exchanges test --coverage

# Запустить конкретный тест
pnpm --filter @trading-platform/exchanges test -- --run binance
```

**Конфигурация API ключей для тестов:**

Создайте `.env.test` в корне проекта:

```bash
# Binance Testnet
BINANCE_TEST_API_KEY=your_binance_testnet_key
BINANCE_TEST_API_SECRET=your_binance_testnet_secret

# Bybit Testnet
BYBIT_TEST_API_KEY=your_bybit_testnet_key
BYBIT_TEST_API_SECRET=your_bybit_testnet_secret

# OKX Testnet
OKX_TEST_API_KEY=your_okx_testnet_key
OKX_TEST_API_SECRET=your_okx_testnet_secret
OKX_TEST_PASSPHRASE=your_okx_testnet_passphrase

# Bitget Testnet
BITGET_TEST_API_KEY=your_bitget_testnet_key
BITGET_TEST_API_SECRET=your_bitget_testnet_secret
BITGET_TEST_PASSPHRASE=your_bitget_testnet_passphrase

# BingX Testnet
BINGX_TEST_API_KEY=your_bingx_testnet_key
BINGX_TEST_API_SECRET=your_bingx_testnet_secret
```

**Testnet URLs:**
- Binance: https://testnet.binance.vision
- Bybit: https://testnet.bybit.com
- OKX: https://www.okx.com/demo-trading

### 2. Тесты Pine Script конвертера

```bash
# Запустить тесты парсера
pnpm --filter @trading-platform/pine-converter test

# Проверить примеры
node -e "
const { compilePineScript } = require('./packages/pine-converter/src');
const fs = require('fs');

const pineCode = fs.readFileSync('./packages/pine-converter/examples/indicators.pine', 'utf8');
const js = compilePineScript(pineCode);
console.log(js);
"
```

### 3. Тесты бэктестера

```bash
# Запустить тесты бэктестера
pnpm --filter @trading-platform/backtester test

# Запустить с verbose выводом
pnpm --filter @trading-platform/backtester test -- --reporter=verbose
```

### 4. Все тесты проекта

```bash
# Запустить все тесты
pnpm test

# Запустить с покрытием
pnpm test --coverage
```

## 📊 Примеры использования

### Бэктестинг стратегии

```typescript
import { createBacktester, strategies } from '@trading-platform/backtester';
import { BinanceAdapter } from '@trading-platform/exchanges';

async function runBacktest() {
  // 1. Получить исторические данные
  const exchange = new BinanceAdapter();
  const candles = await exchange.getCandles('BTC/USDT', '1h', 1000);

  // 2. Создать бэктестер
  const backtester = createBacktester({
    initialCapital: 10000,
    commission: 0.1,
    slippage: 0.05,
    leverage: 1,
  });

  // 3. Запустить бэктест
  const result = await backtester.run(candles, strategies.smaCrossover);

  // 4. Вывести результаты
  console.log('Total PnL:', result.totalPnl);
  console.log('Win Rate:', result.winRate * 100, '%');
  console.log('Sharpe Ratio:', result.sharpeRatio);
  console.log('Max Drawdown:', result.maxDrawdownPercent, '%');
  console.log('Profit Factor:', result.profitFactor);
}

runBacktest();
```

### Компиляция Pine Script

```typescript
import { compilePineScript, validatePineScript } from '@trading-platform/pine-converter';
import fs from 'fs';

// Валидация
const pineCode = fs.readFileSync('./my-strategy.pine', 'utf8');
const validation = validatePineScript(pineCode);

if (!validation.valid) {
  console.error('Errors:', validation.errors);
  process.exit(1);
}

// Компиляция
const jsCode = compilePineScript(pineCode, {
  outputFormat: 'module',
  includeRuntime: true,
  optimize: true,
});

fs.writeFileSync('./my-strategy.js', jsCode);
console.log('Compiled successfully!');
```

### Desktop приложение

```bash
# Development
cd apps/desktop
pnpm tauri dev

# Build production
pnpm tauri build

# Build для конкретной платформы
pnpm tauri build --target x86_64-pc-windows-msvc
pnpm tauri build --target x86_64-apple-darwin
pnpm tauri build --target x86_64-unknown-linux-gnu
```

## 🔍 Отладка

### Логирование бирж

```typescript
import { BinanceAdapter } from '@trading-platform/exchanges';

const exchange = new BinanceAdapter();
exchange.on('debug', (msg) => console.log('DEBUG:', msg));
exchange.on('error', (err) => console.error('ERROR:', err));
```

### Pine Script отладка

```typescript
import { PineLexer, PineParser } from '@trading-platform/pine-converter';

const code = '//@version=5\nindicator("Test")\nsma = ta.sma(close, 20)';

// Лексический анализ
const lexer = new PineLexer(code);
const tokens = lexer.tokenize();
console.log('Tokens:', tokens);

// Синтаксический анализ
const parser = new PineParser(code);
const ast = parser.parse();
console.log('AST:', JSON.stringify(ast, null, 2));
```

### Бэктестинг отладка

```typescript
const backtester = createBacktester({
  initialCapital: 10000,
  commission: 0,  // Отключить комиссии для отладки
  slippage: 0,    // Отключить проскальзывание
});

const result = await backtester.run(candles, strategy);

// Детальная информация по сделкам
result.trades.forEach(trade => {
  console.log({
    entry: trade.entryTime,
    exit: trade.exitTime,
    pnl: trade.pnl,
    tags: trade.tags,
  });
});
```

## 📈 Визуализация результатов

```typescript
import { createBacktester, strategies } from '@trading-platform/backtester';
import { Chart } from 'chart.js';

async function visualizeBacktest() {
  const result = await backtester.run(candles, strategies.smaCrossover);

  // Equity curve
  const equityChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: result.equity.map((_, i) => i),
      datasets: [{
        label: 'Equity',
        data: result.equity,
        borderColor: '#2962ff',
        fill: true,
        backgroundColor: 'rgba(41, 98, 255, 0.1)',
      }],
    },
  });

  // Drawdowns
  const drawdownChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: result.drawdowns.map((_, i) => i),
      datasets: [{
        label: 'Drawdown %',
        data: result.drawdowns,
        backgroundColor: result.drawdowns.map(d => d > 10 ? '#ef5350' : '#26a69a'),
      }],
    },
  });
}
```

## 🐛 Troubleshooting

### Ошибки подключения к биржам

```
Error: API request failed: 401
```
→ Проверьте API ключи в `.env.test`

```
Error: Rate limit exceeded
```
→ Используйте testnet или уменьшите частоту запросов

### Ошибки Pine Script парсера

```
Error: [Line 5] Expected expression
```
→ Проверьте синтаксис Pine Script на указанной строке

### Ошибки бэктестера

```
Error: Insufficient data for indicators
```
→ Увеличьте количество свечей (минимум 200 для 200 SMA)

## 📚 Документация

- [Binance API](https://binance-docs.github.io/apidocs/)
- [Bybit API](https://bybit-exchange.github.io/docs/)
- [OKX API](https://www.okx.com/docs-v5/)
- [Pine Script Reference](https://www.tradingview.com/pine-script-reference/)
- [Tauri Documentation](https://tauri.app/v1/guides/)
