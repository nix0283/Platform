# 📈 Chart Trading Guide

Торговля прямо на графике как в TradingView.

---

## 🎯 Возможности

### 1. Клик-трейдинг
- **Клик по графику** → Панель ордера
- **Выбор BUY/SELL** → Мгновенное размещение
- **SL/TP настройки** → Автоматические линии на графике

### 2. Визуализация позиций
- **Линии входа** — Зеленая/Красная линия
- **Stop Loss** — Оранжевая линия
- **Take Profit** — Синяя линия
- **Drag & Drop** — Перетаскивание линий

### 3. Quick Order Panel
- **Быстрые ордера** — Без клика по графику
- **Настройка левериджа** — 1x-100x
- **Процент кнопки** — 25%, 50%, 75%, 100%

---

## 🚀 Быстрый старт

### 1. Включить торговлю на графике

```tsx
import { Chart } from '@/components/Chart';

<Chart
  config={chartConfig}
  enableTrading={true}  // Включить торговлю
/>
```

### 2. Разместить ордер

**Способ 1: Клик по графику**
1. Кликните в любое место на графике
2. Откроется панель ордера
3. Выберите BUY или SELL
4. Настройте SL/TP
5. Подтвердите ордер

**Способ 2: Quick Order Panel**
1. Откройте правую панель
2. Введите количество
3. Нажмите BUY или SELL

---

## 📊 Компоненты

### ChartTradingOverlay

Основной компонент для торговли на графике.

```tsx
import { ChartTradingOverlay } from '@/components/trading';

<ChartTradingOverlay
  chartContainerRef={containerRef}
  onOrderPlaced={(order) => console.log(order)}
  enabled={true}
/>
```

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `chartContainerRef` | `RefObject` | required | Ссылка на контейнер графика |
| `onOrderPlaced` | `Function` | - | Callback при размещении ордера |
| `enabled` | `boolean` | `true` | Включить/выключить торговлю |

### QuickOrderPanel

Панель быстрых ордеров.

```tsx
import { QuickOrderPanel } from '@/components/trading';

<QuickOrderPanel
  onOrderPlaced={(order) => console.log(order)}
  compact={false}
/>
```

### PositionManager

Управление открытыми позициями.

```tsx
import { PositionManager } from '@/components/trading';

<PositionManager
  positions={positions}
  onClosePosition={(symbol) => closePosition(symbol)}
/>
```

---

## 🎨 Визуализация на графике

### Линии позиций

```
┌─────────────────────────────────────────┐
│                                         │
│              🔵 TP: $52,000             │ ← Take Profit
│                                         │
│              🟢 Entry: $50,000          │ ← Точка входа
│                                         │
│              🟠 SL: $48,000             │ ← Stop Loss
│                                         │
└─────────────────────────────────────────┘
```

### Цветовая схема

| Элемент | Цвет | HEX |
|---------|------|-----|
| BUY Entry | 🟢 Зеленый | `#26a69a` |
| SELL Entry | 🔴 Красный | `#ef5350` |
| Stop Loss | 🟠 Оранжевый | `#ff9800` |
| Take Profit | 🔵 Синий | `#2196f3` |

---

## 📡 API Endpoints

### POST /api/trading/orders

Размещение ордера.

**Request:**
```json
{
  "exchange": "binance",
  "symbol": "BTC/USDT",
  "side": "BUY",
  "type": "MARKET",
  "quantity": 0.1,
  "stopLoss": 48000,
  "takeProfit": 52000,
  "leverage": 10
}
```

**Response:**
```json
{
  "success": true,
  "order": {
    "id": "order_1234567890",
    "symbol": "BTC/USDT",
    "side": "BUY",
    "entryPrice": 50000,
    "quantity": 0.1,
    "status": "active",
    "timestamp": 1705320000000
  }
}
```

### GET /api/trading/positions

Получение открытых позиций.

**Response:**
```json
{
  "success": true,
  "positions": [
    {
      "symbol": "BTC/USDT",
      "side": "BUY",
      "quantity": 0.1,
      "entryPrice": 50000,
      "markPrice": 51000,
      "unrealizedPnl": 100,
      "leverage": 10
    }
  ]
}
```

---

## 🔧 Настройка

### Включение/выключение торговли

```tsx
const [tradingEnabled, setTradingEnabled] = useState(true);

<Chart
  config={chartConfig}
  enableTrading={tradingEnabled}
/>

<button onClick={() => setTradingEnabled(!tradingEnabled)}>
  {tradingEnabled ? 'Trading ON' : 'Trading OFF'}
</button>
```

### Кастомизация панелей

```tsx
<ChartTradingOverlay
  enabled={true}
  onOrderPlaced={handleOrder}
/>

<QuickOrderPanel
  compact={false}  // compact=true для мини-версии
  onOrderPlaced={handleOrder}
/>
```

---

## 💡 Примеры использования

### Пример 1: Размещение ордера с клика

```tsx
import { ChartTradingOverlay } from '@/components/trading';

function MyChart() {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleOrderPlaced = (order) => {
    console.log('Order placed:', order);
    // Отправить на backend
    fetch('/api/trading/orders', {
      method: 'POST',
      body: JSON.stringify(order),
    });
  };

  return (
    <div ref={containerRef}>
      <Chart config={chartConfig} />
      <ChartTradingOverlay
        chartContainerRef={containerRef}
        onOrderPlaced={handleOrderPlaced}
      />
    </div>
  );
}
```

### Пример 2: Управление позициями

```tsx
import { PositionManager } from '@/components/trading';

function PositionsPanel() {
  const { positions } = useAppStore();

  const closePosition = async (symbol: string) => {
    await fetch('/api/trading/positions', {
      method: 'DELETE',
      body: JSON.stringify({ symbol }),
    });
  };

  return (
    <PositionManager
      positions={positions}
      onClosePosition={closePosition}
    />
  );
}
```

### Пример 3: Quick Order в sidebar

```tsx
import { QuickOrderPanel } from '@/components/trading';

function Sidebar() {
  const handleOrder = (order) => {
    // Обработка ордера
  };

  return (
    <div className="sidebar">
      <QuickOrderPanel onOrderPlaced={handleOrder} />
    </div>
  );
}
```

---

## 🎯 Trading Flow

```
1. Клик по графику
         ↓
2. Показать Order Panel
         ↓
3. Выбрать BUY/SELL
         ↓
4. Настроить SL/TP
         ↓
5. Отправить на backend
         ↓
6. Нарисовать линии на графике
         ↓
7. Мониторинг позиции
         ↓
8. Закрытие (клик на линию или кнопка)
```

---

## ⚙️ Конфигурация

### Переменные окружения

```bash
# .env.local
NEXT_PUBLIC_BACKEND_URL=http://localhost:8080
NEXT_PUBLIC_WS_URL=ws://localhost:8080/ws
```

### Настройки по умолчанию

```typescript
const defaultTradingSettings = {
  enableTrading: true,
  defaultLeverage: 10,
  defaultStopLoss: 2,    // %
  defaultTakeProfit: 4,  // %
  quickAmounts: ['25%', '50%', '75%', '100%'],
};
```

---

## 🐛 Troubleshooting

### Ошибка: "Order failed"

**Решение:** Проверьте что backend запущен и API ключи настроены.

### Линии не отображаются

**Решение:** Убедитесь что `enableTrading={true}` в компоненте Chart.

### Клик не открывает панель

**Решение:** Проверьте что `chartContainerRef` передан правильно.

---

## 📚 Best Practices

1. **Всегда устанавливайте SL** — Для защиты от больших потерь
2. **Проверяйте confidence** — Используйте ML сигналы для фильтрации
3. **Мониторьте позиции** — Закрывайте при достижении TP/SL
4. **Используйте леверидж осторожно** — Не более 10x для начала
5. **Тестируйте на демо** — Перед реальной торговлей

---

## 🎉 Features Summary

| Feature | Status | Description |
|---------|--------|-------------|
| Click-to-trade | ✅ | Клик по графику для ордера |
| Quick Order Panel | ✅ | Быстрые ордера с панели |
| Position Lines | ✅ | Визуализация на графике |
| SL/TP Lines | ✅ | Stop Loss / Take Profit |
| Drag & Drop | ✅ | Перетаскивание линий |
| Position Manager | ✅ | Управление позициями |
| Leverage Control | ✅ | 1x-100x леверидж |
| Market/Limit/Stop | ✅ | Типы ордеров |

---

**Ready to trade!** 🚀
