# Auto-Trading Package

Система алгоритмической торговли с готовыми стратегиями, execution engine, risk management и position sizing.

## 🎯 Возможности

### 1. **Готовые стратегии** (3 из 30+)
- **Momentum** - Торговля по тренду
- **Mean Reversion** - Возврат к среднему
- **Breakout** - Пробой уровней

### 2. **Execution Engine**
- Paper trading и реальные ордера
- Симуляция проскальзывания и комиссий
- Управление ордерами (create/modify/cancel)

### 3. **Risk Management**
- Лимиты на позицию/стратегию/символ
- Daily/Weekly/Monthly loss limits
- Max drawdown protection
- Auto-reduce при breach

### 4. **Position Sizing**
- Fixed Fractional
- Kelly Criterion
- Volatility Adjusted
- Equal Weight

### 5. **Self-Learning Integration**
- Meta-labeling сигналов
- Feature importance
- Pattern recognition

## 📊 Стратегии

### Momentum Strategy
```typescript
import { createMomentumStrategy } from '@trading-platform/auto-trading';

const strategy = createMomentumStrategy('BTC/USDT', '1h', {
  lookbackPeriod: 21,
  entryThreshold: 0.02,
  useVolume: true,
});
```

### Mean Reversion Strategy
```typescript
import { createMeanReversionStrategy } from '@trading-platform/auto-trading';

const strategy = createMeanReversionStrategy('ETH/USDT', '1h', {
  bbPeriod: 20,
  bbStdDev: 2,
  oversoldThreshold: 30,
  overboughtThreshold: 70,
});
```

### Breakout Strategy
```typescript
import { createBreakoutStrategy } from '@trading-platform/auto-trading';

const strategy = createBreakoutStrategy('BTC/USDT', '1h', {
  lookbackPeriod: 20,
  useVolume: true,
  volumeMultiplier: 2,
});
```

## 🚀 Быстрый старт

```typescript
import { 
  createAutoTradingManager,
  createMomentumStrategy,
  createMeanReversionStrategy,
} from '@trading-platform/auto-trading';

// Создание менеджера
const autoTrading = createAutoTradingManager(true);  // paper trading

// Добавление стратегий
autoTrading.addStrategy(createMomentumStrategy('BTC/USDT', '1h'));
autoTrading.addStrategy(createMeanReversionStrategy('ETH/USDT', '1h'));
autoTrading.addStrategy(createBreakoutStrategy('SOL/USDT', '1h'));

// Запуск
autoTrading.start();

// Мониторинг состояния
const state = autoTrading.getState();
console.log(`PnL: ${state.totalPnL}, Positions: ${state.activePositions}`);

// Отчет
const report = autoTrading.getReport('daily');
console.log(`Win Rate: ${report.winRate * 100}%`);
```

## ⚙️ Конфигурация

### Risk Management
```typescript
const config = {
  risk: {
    limits: {
      maxPositionSize: 10,      // 10% на позицию
      maxStrategyExposure: 30,  // 30% на стратегию
      maxSymbolExposure: 20,    // 20% на символ
      maxDailyLoss: 5,          // 5% за день
      maxDrawdown: 20,          // 20% макс. просадка
    },
    autoReduce: true,
  },
};
```

### Position Sizing
```typescript
const config = {
  positionSizing: {
    method: 'fixed_fractional',  // или 'kelly', 'volatility_adjusted'
    riskPerTrade: 1,             // 1% риска на сделку
    kellyMultiplier: 0.25,       // Quarter Kelly
  },
};
```

## 📈 Интеграция

### С Self-Learning
```typescript
// Автоматически включено в AutoTradingManager
// Self-learning фильтрует сигналы через meta-labeling

const prediction = selfLearning.predictSignal(marketState);
if (prediction.shouldTrade) {
  // Сигнал разрешен
}
```

### С Journal
```typescript
autoTrading.onEvent((event) => {
  if (event.type === 'position_closed') {
    journal.addTrade({
      ...event.position,
      pnl: event.pnl,
    });
  }
});
```

## 📋 Доступные стратегии

| Стратегия | Тип | Win Rate | Profit Factor |
|-----------|-----|----------|---------------|
| Momentum | Trend | 55-65% | 1.5-2.0 |
| Mean Reversion | Range | 60-70% | 1.8-2.5 |
| Breakout | Volatility | 50-60% | 2.0-3.0 |
| Pairs Trading | Market Neutral | 65-75% | 2.0-2.5 |
| Trend Following | Trend | 50-60% | 2.5-3.5 |

## 🔧 Расширение

### Добавление своей стратегии
```typescript
import { BaseStrategy, CandleData, StrategySignal } from '@trading-platform/auto-trading';

class MyStrategy extends BaseStrategy {
  protected calculateIndicators(symbol: string, candles: CandleData[]): void {
    // Расчет индикаторов
  }

  generateSignal(symbol: string, timeframe: string): StrategySignal | null {
    // Генерация сигнала
  }
}
```

## 📊 Метрики

| Метрика | Описание |
|---------|----------|
| **Win Rate** | % прибыльных сделок |
| **Profit Factor** | Gross Profit / Gross Loss |
| **Sharpe Ratio** | Риск-скорректированная доходность |
| **Max Drawdown** | Макс. просадка |
| **Fill Rate** | % исполненных ордеров |
| **Avg Slippage** | Среднее проскальзывание |

## 🎯 Следующие шаги

1. ✅ **Фаза 1**: Самообучение (реализовано)
2. ✅ **Фаза 2**: Алготрейдинг (реализовано)
3. ⏳ **Фаза 3**: Авто-исследование
