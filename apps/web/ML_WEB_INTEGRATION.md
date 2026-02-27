# 🌐 ML Web Integration Guide

Интеграция ML модулей в веб-интерфейс торговой платформы.

---

## 📁 Созданные файлы

### API Routes
```
apps/web/src/app/api/ml/
├── graph/route.ts       # Получение данных графа
├── signals/route.ts     # Торговые сигналы
└── anomalies/route.ts   # Обнаруженные аномалии
```

### Компоненты
```
apps/web/src/components/ml/
└── MLDashboard.tsx      # Основной ML дашборд
```

### Утилиты
```
apps/web/src/lib/
└── exchange-data.ts     # Подключение к реальным биржам
```

---

## 🚀 Быстрый старт

### 1. Запустить Stage 3 (генерация ML данных)

```bash
cd trading-platform
node scripts/stage3-graph-analysis.js
```

Это создаст файл `results/graph-analysis.json` с данными для дашборда.

### 2. Запустить веб-приложение

```bash
cd apps/web
pnpm install
pnpm dev
```

### 3. Открыть в браузере

```
http://localhost:3000
```

Справа откроется ML дашборд с:
- Торговыми сигналами
- Обнаруженными аномалиями
- Статистикой графа корреляций

---

## 🎨 ML Dashboard Features

### Вкладка Signals 📊
- Отображение торговых сигналов (BUY/SELL/HOLD)
- Confidence meter (уверенность сигнала)
- Причины сигнала
- Коррелирующие символы

### Вкладка Anomalies ⚠️
- Обнаруженные аномалии корреляций
- Severity indicator (серьезность)
- Цветовая индикация (🔴🟡🟢)

### Вкладка Graph 🕸️
- Статистика графа (узлы, ребра)
- Средняя корреляция
- Максимальная корреляция (пара символов)

---

## 🔄 Авто-обновление

Дашборд автоматически обновляется каждые 60 секунд.

Ручное обновление: кнопка "🔄 Refresh" в хедере.

---

## 📡 API Endpoints

### GET /api/ml/graph
Возвращает данные графа корреляций.

**Response:**
```json
{
  "success": true,
  "source": "cache",
  "timestamp": 1705320000000,
  "data": {
    "graph": { "nodes": 20, "edges": 47 },
    "signals": [...],
    "anomalies": [...]
  }
}
```

### GET /api/ml/signals
Возвращает торговые сигналы.

**Response:**
```json
{
  "success": true,
  "timestamp": 1705320000000,
  "signals": [
    {
      "symbol": "ETH/USDT",
      "signal": "BUY",
      "confidence": 0.783,
      "reasons": ["Ожидаемый рост: 3.24%"],
      "relatedSymbols": [...]
    }
  ],
  "summary": { "buy": 4, "sell": 2, "hold": 14 }
}
```

### GET /api/ml/anomalies
Возвращает обнаруженные аномалии.

**Response:**
```json
{
  "success": true,
  "timestamp": 1705320000000,
  "anomalies": [
    {
      "symbol": "MATIC/USDT",
      "anomalyType": "correlation_break",
      "severity": 0.452,
      "description": "Разрыв корреляции с ETH..."
    }
  ],
  "summary": { "total": 3, "critical": 0, "warning": 2, "low": 1 }
}
```

---

## 🔌 Подключение реальных данных

### Через Backend

```typescript
import { fetchCandlesFromExchange } from '@/lib/exchange-data';

// Получить свечи с Binance
const candles = await fetchCandlesFromExchange(
  'binance',
  'BTC/USDT',
  '1h',
  100
);
```

### Прямой запрос к бирже

```typescript
// Fallback если backend недоступен
const candles = await fetchCandlesFromExchange(
  'binance',
  'ETH/USDT',
  '1h',
  100
);
// Автоматически использует публичное API Binance
```

### Поддерживаемые биржи

| Биржа | Статус | API |
|-------|--------|-----|
| Binance | ✅ | Public + Private |
| Bybit | ✅ | Public + Private |
| OKX | ✅ | Public + Private |

---

## 🎯 Интеграция с Trading Platform

### 1. Добавить ML дашборд на страницу

```tsx
import MLDashboard from '@/components/ml/MLDashboard';

function MyPage() {
  return (
    <div className="flex">
      <Chart />
      <MLDashboard />
    </div>
  );
}
```

### 2. Использовать данные в торговых решениях

```typescript
// Получить сигналы
const response = await fetch('/api/ml/signals');
const data = await response.json();

// Фильтровать сильные сигналы
const strongSignals = data.signals.filter(
  (s: any) => s.confidence > 0.7 && s.signal === 'BUY'
);

// Использовать для открытия позиций
for (const signal of strongSignals) {
  await placeOrder({
    symbol: signal.symbol,
    side: 'BUY',
    quantity: calculatePositionSize(signal.confidence),
  });
}
```

### 3. Мониторинг аномалий

```typescript
// Проверка аномалий перед торговлей
const anomaliesRes = await fetch('/api/ml/anomalies');
const { anomalies } = await anomaliesRes.json();

const criticalAnomalies = anomalies.filter(
  (a: any) => a.severity > 0.7
);

if (criticalAnomalies.length > 0) {
  // Предупредить пользователя или отменить сделку
  showWarning('High correlation anomaly detected!');
}
```

---

## 📊 Визуализация данных

### Signal Confidence Meter
```tsx
<div className="w-full bg-[#363c4e] rounded-full h-2">
  <div
    className="h-2 rounded-full bg-[#26a69a]"
    style={{ width: `${confidence * 100}%` }}
  />
</div>
```

### Anomaly Severity Indicator
```tsx
<span className={severity > 0.7 ? 'text-[#ef5350]' : 'text-[#26a69a]'}>
  {(severity * 100).toFixed(1)}%
</span>
```

---

## ⚙️ Конфигурация

### Переменные окружения

```bash
# .env.local
NEXT_PUBLIC_BACKEND_URL=http://localhost:8080
NEXT_PUBLIC_WS_URL=ws://localhost:8080/ws
```

### Настройки дашборда

```typescript
// В MLDashboard.tsx
const [mlPanelWidth, setMlPanelWidth] = useState(350); // Ширина панели
const [autoRefresh, setAutoRefresh] = useState(true);  // Авто-обновление
const [refreshInterval, setRefreshInterval] = useState(60000); // 60 секунд
```

---

## 🐛 Troubleshooting

### Ошибка: "No ML data available"

**Решение:** Запустите Stage 3 для генерации данных:
```bash
node scripts/stage3-graph-analysis.js
```

### Ошибка: "Failed to load ML data"

**Решение:** Проверьте что backend запущен:
```bash
cd backend && cargo run
```

Или используйте fallback данные (моковые).

### Дашборд не отображается

**Решение:** Проверьте консоль браузера на ошибки.
Убедитесь что компонент импортирован правильно:
```tsx
import MLDashboard from '@/components/ml/MLDashboard';
```

---

## 📈 Performance Optimization

### Кэширование данных

API routes автоматически кэшируют данные из `results/graph-analysis.json`.

### Lazy loading

```tsx
const MLDashboard = dynamic(
  () => import('@/components/ml/MLDashboard'),
  { loading: () => <p>Loading...</p> }
);
```

### Debounce обновлений

```typescript
const debouncedRefresh = useMemo(
  () => debounce(loadMLData, 500),
  []
);
```

---

## 🎯 Best Practices

1. **Всегда проверяйте confidence сигнала** перед торговлей
2. **Мониторьте аномалии** для раннего обнаружения рисков
3. **Используйте кэш** для снижения нагрузки на backend
4. **Обновляйте данные** каждые 60 секунд для актуальности
5. **Фильтруйте слабые сигналы** (confidence < 0.5)

---

## 📚 Дополнительные ресурсы

- [ML Module Documentation](../../packages/ml/README.md)
- [Stage 3 Documentation](../../results/STAGE3_COMPLETE.md)
- [Exchange API Docs](../../packages/exchanges/README.md)

---

**Готово к использованию!** 🚀
