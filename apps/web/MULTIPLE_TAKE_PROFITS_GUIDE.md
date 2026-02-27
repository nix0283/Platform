# 🎯 Multiple Take-Profits Guide

Торговля с несколькими уровнями Take-Profit как в TradingView.

---

## 📊 Что нового

### Поддержка нескольких TP уровней

Теперь можно настроить до **5 уровней Take-Profit** с индивидуальным % закрытия позиции для каждого.

**Пример:**
- TP1: 30% позиции @ $52,000
- TP2: 30% позиции @ $54,000
- TP3: 40% позиции @ $56,000

---

## 🚀 Быстрый старт

### 1. Открыть панель ордера

**Клик по графику** или использовать **Quick Order Panel**

### 2. Настроить несколько TP

```
1. Включите "Take Profits" чекбокс
2. Нажмите "+ Add TP" для добавления уровня
3. Укажите % позиции для каждого TP
4. Общая сумма должна быть 100%
```

### 3. Разместить ордер

```
1. Выберите BUY или SELL
2. Настройте Stop Loss
3. Добавьте 2-5 Take Profit уровней
4. Подтвердите ордер
```

---

## 🎨 Визуализация на графике

```
┌─────────────────────────────────────────────────┐
│                                                 │
│         🔵 TP3: $56,000 (40%)                  │ ← 40% позиции
│         ─────────────                           │
│                                                 │
│         🔵 TP2: $54,000 (30%)                  │ ← 30% позиции
│         ─────────────                           │
│                                                 │
│         🔵 TP1: $52,000 (30%)                  │ ← 30% позиции
│         ─────────────                           │
│                                                 │
│         🟢 Entry: $50,000                      │ ← Точка входа
│         ─────────────                           │
│                                                 │
│         🟠 SL: $48,000                         │ ← Stop Loss
│         ─────────────                           │
└─────────────────────────────────────────────────┘
```

---

## 📋 Компоненты

### ChartTradingOverlay

**Новые возможности:**
- До 5 TP уровней
- Индивидуальный % для каждого TP
- Автоматический расчет цен
- Визуализация на графике

```tsx
import { ChartTradingOverlay } from '@/components/trading';

<ChartTradingOverlay
  chartContainerRef={containerRef}
  onOrderPlaced={handleOrder}
  enabled={true}
/>
```

### QuickOrderPanel

**Новые возможности:**
- Добавление/удаление TP уровней
- Включение/выключение отдельных TP
- Валидация общей суммы (100%)

```tsx
import { QuickOrderPanel } from '@/components/trading';

<QuickOrderPanel
  onOrderPlaced={handleOrder}
  compact={false}
/>
```

### PositionManager

**Новые возможности:**
- Отображение всех TP уровней
- Индикатор заполненности (✓ Filled)
- Прогресс бар TP
- Закрытие отдельных TP уровней

```tsx
import { PositionManager } from '@/components/trading';

<PositionManager
  positions={positions}
  onClosePosition={(symbol, tpLevel) => closeTP(symbol, tpLevel)}
/>
```

---

## 🔧 Настройка TP уровней

### Добавление TP

```typescript
// Кнопка "+ Add TP"
const addTakeProfitLevel = () => {
  if (takeProfitLevels.length >= 5) return;
  setTakeProfitLevels([...takeProfitLevels, { percent: '20', enabled: true }]);
};
```

### Удаление TP

```typescript
// Кнопка "✕"
const removeTakeProfitLevel = (index: number) => {
  if (takeProfitLevels.length <= 1) return;
  setTakeProfitLevels(takeProfitLevels.filter((_, i) => i !== index));
};
```

### Обновление TP

```typescript
// Изменение %
const updateTakeProfitLevel = (index: number, value: string) => {
  const updated = [...takeProfitLevels];
  updated[index].percent = value;
  setTakeProfitLevels(updated);
};
```

---

## 📡 API Integration

### POST /api/trading/orders

**Request с несколькими TP:**
```json
{
  "exchange": "binance",
  "symbol": "BTC/USDT",
  "side": "BUY",
  "type": "MARKET",
  "quantity": 0.1,
  "stopLoss": 48000,
  "takeProfits": [
    {
      "id": "tp_1",
      "price": 52000,
      "percentage": 30,
      "filled": false
    },
    {
      "id": "tp_2",
      "price": 54000,
      "percentage": 30,
      "filled": false
    },
    {
      "id": "tp_3",
      "price": 56000,
      "percentage": 40,
      "filled": false
    }
  ],
  "leverage": 10
}
```

**Валидация:**
```typescript
// Проверка что сумма TP = 100%
const totalPercent = takeProfits.reduce((sum, tp) => 
  sum + tp.percentage, 0
);

if (Math.abs(totalPercent - 100) > 1) {
  return { error: 'Take Profit percentages must total 100%' };
}
```

---

## 💡 Примеры использования

### Пример 1: Консервативная стратегия

```
TP1: 50% @ 2%  (быстрая прибыль)
TP2: 30% @ 4%  (средняя цель)
TP3: 20% @ 6%  (долгосрочная цель)
```

**Преимущества:**
- Быстрая фиксация половины прибыли
- Оставшаяся часть работает на тренд
- Снижение риска

### Пример 2: Агрессивная стратегия

```
TP1: 20% @ 3%  (малая часть)
TP2: 30% @ 6%  (основная)
TP3: 50% @ 10% (большая цель)
```

**Преимущества:**
- Максимальная прибыль на тренде
- Частичная фиксация для уверенности

### Пример 3: Сбалансированная стратегия

```
TP1: 33% @ 2%
TP2: 33% @ 4%
TP3: 34% @ 6%
```

**Преимущества:**
- Равномерное распределение
- Простое управление

---

## 🎯 Trading Flow с несколькими TP

```
1. Клик по графику
         ↓
2. Order Panel открывается
         ↓
3. Настройка Stop Loss
         ↓
4. Добавление 2-5 TP уровней
         ↓
5. Указание % для каждого TP
         ↓
6. Проверка: сумма = 100%
         ↓
7. Размещение ордера (BUY/SELL)
         ↓
8. Линии TP отображаются на графике
         ↓
9. Цена достигает TP1 → 30% закрывается
         ↓
10. Цена достигает TP2 → 30% закрывается
         ↓
11. Цена достигает TP3 → 40% закрывается
         ↓
12. Позиция полностью закрыта
```

---

## 📊 Position Manager с несколькими TP

### Отображение

```
┌─────────────────────────────────────────┐
│ BTC/USDT  LONG 0.1 @ $50,000           │
│ PnL: +$100 (+2%)                        │
├─────────────────────────────────────────┤
│ Take Profit Levels                      │
├─────────────────────────────────────────┤
│ ✓ TP1: $52,000 (30%)    Filled         │
│ → TP2: $54,000 (30%)    Next           │
│ ○ TP3: $56,000 (40%)    Pending        │
├─────────────────────────────────────────┤
│ TP Progress: [████████░░] 1/3          │
└─────────────────────────────────────────┘
```

### Закрытие отдельных TP

```typescript
// Закрытие конкретного TP уровня
const closeTP = (symbol: string, tpLevel: number) => {
  fetch('/api/trading/positions/close-tp', {
    method: 'POST',
    body: JSON.stringify({ symbol, tpLevel }),
  });
};
```

---

## ⚙️ Конфигурация

### Максимальное количество TP

```typescript
const MAX_TP_LEVELS = 5;

const addTakeProfitLevel = () => {
  if (takeProfitLevels.length >= MAX_TP_LEVELS) return;
  // ...
};
```

### Default настройки

```typescript
const defaultTPLevels = [
  { percent: '30', enabled: true }, // TP1
  { percent: '30', enabled: true }, // TP2
  { percent: '40', enabled: true }, // TP3
];
```

### Валидация

```typescript
// Проверка суммы
const totalPercent = levels.reduce((sum, l) => 
  sum + (parseFloat(l.percent) || 0), 0
);

const isValid = Math.abs(totalPercent - 100) <= 1;
```

---

## 🐛 Troubleshooting

### Ошибка: "Take Profit percentages must total 100%"

**Решение:** Проверьте что сумма всех % равна 100.

```
TP1: 30%
TP2: 30%
TP3: 40%
Total: 100% ✓
```

### TP линии не отображаются

**Решение:** Убедитесь что `takeProfits` массив не пустой и `enabled=true`.

### Невозможно удалить последний TP

**Решение:** Минимум 1 TP уровень должен оставаться. Используйте `removeTakeProfitLevel` только если `length > 1`.

---

## 📈 Best Practices

1. **Всегда используйте несколько TP** — Для снижения риска
2. **Первый TP ближе** — Для быстрой фиксации прибыли
3. **Сумма = 100%** — Для полного закрытия позиции
4. **Визуализируйте на графике** — Для лучшего контроля
5. **Мониторьте прогресс** — Position Manager показывает статус

---

## ✅ Feature Summary

| Feature | Status | Description |
|---------|--------|-------------|
| Multiple TP (до 5) | ✅ | До 5 уровней Take-Profit |
| Individual % | ✅ | % позиции для каждого TP |
| Auto-calc prices | ✅ | Автоматический расчет цен |
| Visual lines | ✅ | Линии на графике |
| TP progress | ✅ | Прогресс бар заполнения |
| Close individual TP | ✅ | Закрытие отдельных уровней |
| Validation | ✅ | Проверка суммы 100% |
| Add/Remove TP | ✅ | Динамическое управление |

---

**Ready for multi-TP trading!** 🚀
