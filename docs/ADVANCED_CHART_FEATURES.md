# 📊 Advanced Chart Features — TradingView Clone

Полная реализация всех функций графика TradingView.

---

## 🎯 Реализованные функции

### 1. Типы графиков (12 типов)

| Тип | Статус | Описание |
|-----|--------|----------|
| **Candle** | ✅ | Японские свечи (стандарт) |
| **Bar** | ✅ | OHLC бары |
| **Hollow Candle** | ✅ | Полые свечи |
| **Line** | ✅ | Линейный график |
| **Area** | ✅ | Площадь |
| **Baseline** | ✅ | Базовая линия |
| **Heikin Ashi** | ✅ | Сглаженные свечи |
| **Renko** | ✅ | Кирпичный график |
| **Point & Figure** | ✅ | Крестики-нолики |
| **Kagi** | ✅ | Каги график |
| **Line Break** | ✅ | 3-х линейный график |
| **Range** | ✅ | Range бары |

---

### 2. Инструменты рисования (40+)

#### Lines (Линии)
- ✅ Trend Line (трендовая)
- ✅ Horizontal Line (горизонталь)
- ✅ Vertical Line (вертикаль)
- ✅ Ray (луч)
- ✅ Extended Line (продленная)
- ✅ Parallel Channel (параллельный канал)
- ✅ Regression Channel (регрессионный канал)

#### Fibonacci
- ✅ Fib Retracement (ретрейсмент)
- ✅ Fib Extension (расширение)
- ✅ Fib Fan (веер)
- ✅ Fib Arc (дуги)
- ✅ Fib Time Zones (временные зоны)
- ✅ Fib Wedge (клин)
- ✅ Fib Circle (круг)

#### Gann
- ✅ Gann Fan (веер Ганна)
- ✅ Gann Grid (сетка Ганна)
- ✅ Gann Box (коробка Ганна)

#### Andrews Pitchfork
- ✅ Andrews Pitchfork (вилка Эндрюса)
- ✅ Schiff Pitchfork
- ✅ Modified Schiff Pitchfork

#### Shapes (Фигуры)
- ✅ Rectangle (прямоугольник)
- ✅ Ellipse (эллипс)
- ✅ Triangle (треугольник)
- ✅ Polygon (многоугольник)

#### Text (Текст)
- ✅ Text (текст)
- ✅ Text Label (надпись)
- ✅ Balloon (облачко)
- ✅ Note (заметка)

#### Arrows (Стрелки)
- ✅ Arrow Up
- ✅ Arrow Down
- ✅ Arrow Left
- ✅ Arrow Right
- ✅ Arrow Marker

#### Measurement (Измерения)
- ✅ Price Range (диапазон цен)
- ✅ Distance (расстояние)
- ✅ Time Cycle (временной цикл)
- ✅ Countdown (отсчет)

#### Patterns (Паттерны)
- ✅ Head & Shoulders (голова и плечи)
- ✅ Double Top (двойная вершина)
- ✅ Double Bottom (двойное дно)
- ✅ Triangle Pattern (треугольник)
- ✅ Flag (флаг)
- ✅ Pennant (вымпел)
- ✅ Wedge (клин)
- ✅ Channel (канал)

---

### 3. Шкалы (Scale Options)

| Шкала | Статус | Описание |
|-------|--------|----------|
| **Linear** | ✅ | Обычная линейная шкала |
| **Logarithmic** | ✅ | Логарифмическая шкала |
| **Percentage** | ✅ | Процентная шкала |
| **Inverted** | ✅ | Инвертированная шкала |
| **Lock Ratio** | ✅ | Фиксация соотношения |
| **Auto Scale** | ✅ | Авто-масштабирование |

---

### 4. Таймфреймы (1 секунда - 6 месяцев)

#### Стандартные (32 таймфрейма)

| Категория | Таймфреймы |
|-----------|------------|
| **Seconds** | 1s, 5s, 10s, 15s, 30s |
| **Minutes** | 1m, 3m, 5m, 15m, 30m, 45m |
| **Hours** | 1h, 2h, 3h, 4h, 6h, 8h, 12h |
| **Days** | 1d, 2d, 3d, 5d, 7d |
| **Weeks** | 1w, 2w, 3w |
| **Months** | 1M, 2M, 3M, 4M, 5M, 6M |

#### Кастомные
- ✅ Ввод произвольного таймфрейма
- ✅ Валидация диапазона
- ✅ Формат: `число + единица` (10s, 45m, 8h, 10d)

---

### 5. Мульти-чарт система

- ✅ Вкладки для новых графиков
- ✅ Переключение между вкладками
- ✅ Закрытие вкладок
- ✅ Переименование вкладок
- ✅ Независимые настройки для каждой вкладки

---

## 📁 Структура файлов

```
packages/charting/src/
├── types/
│   ├── chart-types.ts      # 12 типов графиков
│   ├── scale-options.ts    # Шкалы
│   └── timeframes.ts       # Таймфреймы
├── drawings/
│   └── drawing-tools.ts    # 40+ инструментов
├── patterns/
│   └── patterns.ts         # Графические паттерны
└── extended-chart.ts       # Основной компонент

apps/web/src/components/chart/
├── toolbars/               # 4 тулбара
├── tabs/
│   └── ChartTabs.tsx       # Мульти-чарт вкладки
└── timeframes/
    └── TimeframeSelector.tsx # Селектор таймфреймов
```

---

## 🚀 Использование

### Переключение типа графика

```tsx
import { ChartTypeConverter } from '@trading-platform/charting';

// Конвертация в Heikin Ashi
const haCandles = ChartTypeConverter.convert(candles, { type: 'heikin_ashi' });

// Конвертация в Renko
const renkoCandles = ChartTypeConverter.convert(candles, {
  type: 'renko',
  boxSize: 10,
  source: 'close',
});

// Конвертация в Point & Figure
const pnfCandles = ChartTypeConverter.convert(candles, {
  type: 'point_figure',
  boxSizeP&F: 10,
  reversalAmount: 3,
});
```

### Добавление рисования

```tsx
import { DrawingManager } from '@trading-platform/charting';

const drawingManager = new DrawingManager();

// Добавить трендовую линию
drawingManager.addDrawing({
  id: 'draw_1',
  tool: 'trend_line',
  points: [
    { x: 100, y: 200, time: 1000, price: 50000 },
    { x: 300, y: 100, time: 2000, price: 52000 },
  ],
  style: {
    color: '#2962ff',
    lineWidth: 2,
    lineStyle: 'solid',
  },
  symbol: 'BTC/USDT',
  timeframe: '1h',
  createdAt: Date.now(),
  updatedAt: Date.now(),
});
```

### Переключение шкалы

```tsx
import { ScaleManager } from '@trading-platform/charting';

const scaleManager = new ScaleManager();

// Логарифмическая шкала
scaleManager.setScaleType('logarithmic');

// Инвертировать
scaleManager.toggleInverted();

// Зафиксировать соотношение
scaleManager.toggleLockRatio();
```

### Мульти-чарт

```tsx
import { useChartTabsManager } from '@/components/chart/tabs/ChartTabs';

const {
  tabs,
  activeTab,
  addTab,
  closeTab,
  renameTab,
  updateActiveTabConfig,
} = useChartTabsManager(initialConfig);

// Добавить новую вкладку
addTab();

// Закрыть вкладку
closeTab(tabId);

// Переименовать
renameTab(tabId, 'New Name');

// Обновить настройки активного графика
updateActiveTabConfig({ symbol: 'ETH/USDT' });
```

---

## 🎨 Примеры использования

### Heikin Ashi

```typescript
// Сглаживание свечей для лучшего визуального тренда
const haCandles = convertToHeikinAshi(candles);
// HA Close = (O + H + L + C) / 4
// HA Open = (Prev HA Open + Prev HA Close) / 2
```

### Renko

```typescript
// Кирпичный график (игнорирует время)
const renkoCandles = convertToRenko(candles, {
  boxSize: 10,      // Размер кирпича
  source: 'close',  // или 'high_low'
});
```

### Point & Figure

```typescript
// Крестики-нолики
const pnfCandles = convertToPointAndFigure(candles, {
  boxSize: 10,           // Размер коробки
  reversalAmount: 3,     // Количество для разворота
});
```

### Fibonacci Retracement

```typescript
// Расчет уровней Фибоначчи
const fibLevels = calculateFibRetracement(
  { x: 0, y: 0, price: 100 },   // Start (low)
  { x: 100, y: 100, price: 200 } // End (high)
);
// Returns: 0%, 23.6%, 38.2%, 50%, 61.8%, 78.6%, 100%
```

### Andrews Pitchfork

```typescript
// Вилка Эндрюса (3 точки)
const pitchfork = calculateAndrewsPitchfork(
  p1, // Start (pivot high/low)
  p2, // Second point
  p3  // Third point
);
// Returns: median line + 2 parallel lines
```

---

## 📊 Измерения

### Price Range Measurement

```typescript
const measurement = calculateMeasurement(
  { price: 50000, time: 1000 },
  { price: 52000, time: 2000 }
);
// {
//   priceChange: 2000,
//   priceChangePercent: 4,
//   timeChange: 1000,
//   bars: 10
// }
```

### Risk/Reward Ratio

```typescript
const rr = calculateRiskReward(
  { price: 50000 }, // Entry
  { price: 49000 }, // Stop Loss
  { price: 53000 }  // Take Profit
);
// { risk: 1000, reward: 3000, ratio: 3 }
```

---

## ⚙️ Настройки

### Chart Type Config

```typescript
interface ChartTypeConfig {
  type: ChartType;
  boxSize?: number;           // Для Renko, P&F, Range
  source?: 'close' | 'high_low'; // Для Renko
  reversalAmount?: number;    // Для P&F
  kagiReversal?: number;      // Для Kagi
  lineBreakPeriod?: number;   // Для Line Break
}
```

### Scale Config

```typescript
interface ScaleConfig {
  type: 'linear' | 'logarithmic' | 'percentage' | 'inverted';
  inverted: boolean;
  lockRatio?: boolean;
  autoScale?: boolean;
  top?: number;
  bottom?: number;
}
```

---

## ✅ Checklist реализации

### Chart Types
- [x] Candle
- [x] Bar
- [x] Hollow Candle
- [x] Line
- [x] Area
- [x] Baseline
- [x] Heikin Ashi
- [x] Renko
- [x] Point & Figure
- [x] Kagi
- [x] Line Break
- [x] Range

### Drawing Tools
- [x] Lines (7 types)
- [x] Fibonacci (7 types)
- [x] Gann (3 types)
- [x] Andrews Pitchfork (3 types)
- [x] Shapes (4 types)
- [x] Text (4 types)
- [x] Arrows (5 types)
- [x] Measurement (4 types)
- [x] Patterns (8 types)

### Scales
- [x] Linear
- [x] Logarithmic
- [x] Percentage
- [x] Inverted
- [x] Lock Ratio
- [x] Auto Scale

### Timeframes
- [x] Seconds (5)
- [x] Minutes (6)
- [x] Hours (7)
- [x] Days (5)
- [x] Weeks (3)
- [x] Months (6)
- [x] Custom input

### Multi-Chart
- [x] Tabs
- [x] Add/Close
- [x] Rename
- [x] Independent configs

---

**Все функции TradingView реализованы!** 🚀
