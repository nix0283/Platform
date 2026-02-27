# 📰 News Panel — TradingView Style

Окно новостей как в терминале TradingView с возможностью добавлять свои источники.

---

## 🎯 Возможности

- **TradingView стиль** — Компактное окно с новостями
- **Свои источники** — Добавляйте любые URL
- **Авто-обновление** — Каждые 60 секунд
- **Auto-scroll** — Автоматическая прокрутка
- **Важность** — Цветовые индикаторы (🔴🟠🔵⚪)
- **Сохранение** — Источники сохраняются в localStorage

---

## 🚀 Использование

### Basic

```tsx
import { NewsPanel } from '@/components/news';

<NewsPanel
  compact={false}
  defaultSources={[
    'https://your-source.com/news',
    'https://another-source.com/announcements',
  ]}
/>
```

### Compact Mode (Ticker)

```tsx
<NewsPanel compact={true} />
```

### Сvoи источники

```tsx
<NewsPanel
  defaultSources={[
    'https://my-crypto-blog.com',
    'https://exchange.com/announcements',
    'https://news-site.com/crypto',
  ]}
/>
```

---

## 📊 Как выглядит

```
┌─────────────────────────────────────────┐
│ 📰 News (50)              ⚙️ 🔄        │
├─────────────────────────────────────────┤
│ 🔴 Binance Will List XYZ    5m  BTC    │
│ 🟠 SEC Announces New Rules  15m ETH    │
│ 🔵 New Partnership Announced 1h  SOL   │
│ ⚪ Market Update Daily      2h  BTC    │
│ 🔴 Critical Security Alert  3h         │
├─────────────────────────────────────────┤
│ Auto-refresh: 60s • Storage: 3 months  │
└─────────────────────────────────────────┘
```

---

## ⚙️ Управление источниками

### Кнопка ⚙️ (Settings)

Открывает панель управления источниками:

```
┌─────────────────────────────────────────┐
│ News Sources:                           │
├─────────────────────────────────────────┤
│ https://binance.com/...           ✕    │
│ https://bybit.com/...             ✕    │
│ https://okx.com/...               ✕    │
│ https://your-custom-url.com       ✕    │
├─────────────────────────────────────────┤
│ [Add URL...]                    [+]    │
├─────────────────────────────────────────┤
│ Quick Add:                              │
│ + Binance                               │
│ + Bybit                                 │
│ + OKX                                   │
│ + CoinDesk                              │
└─────────────────────────────────────────┘
```

### Добавить источник

1. Нажмите ⚙️
2. Введите URL в поле
3. Нажмите "+"

### Удалить источник

Нажмите ✕ рядом с источником

### Изменить порядок

Используйте ↑ ↓ кнопки для сортировки

---

## 🎨 Цветовые индикаторы

| Цвет | Важность | Пример |
|------|----------|--------|
| 🔴 Красный | 5/5 | Hack, Security, Urgent |
| 🟠 Оранжевый | 4/5 | Listing, Delist |
| 🔵 Синий | 3/5 | Partner, Launch |
| ⚪ Серый | 1-2/5 | General news |

---

## 💾 Сохранение источников

Источники сохраняются в **localStorage**:

```javascript
// Ключ: 'news_sources'
// Формат: JSON array

[
  "https://binance.com/en/support/announcement",
  "https://bybit.com/announcements",
  "https://your-custom-url.com"
]
```

**Не сбрасывается** при обновлении страницы!

---

## 🔧 Настройки

### Auto-scroll

```tsx
<NewsPanel
  autoScroll={true}
  scrollSpeed={30} // ms per pixel
/>
```

### Refresh interval

```tsx
// В NewsTicker.tsx
const interval = setInterval(loadNews, 60000); // 60 seconds
```

### Max items

```tsx
<NewsPanel maxItems={100} />
```

---

## 📡 API Integration

### GET /api/news

```bash
GET /api/news?limit=50
```

**Response:**
```json
{
  "success": true,
  "count": 50,
  "news": [
    {
      "id": "uuid",
      "source": "Binance",
      "title": "Binance Will List XYZ",
      "url": "https://...",
      "publishedAt": "2024-01-15T10:00:00Z",
      "importance": 5,
      "relatedSymbols": ["XYZ", "USDT"]
    }
  ]
}
```

---

## 🎯 Примеры использования

### В Trading Platform

```tsx
// apps/web/src/app/page.tsx
import { NewsPanel } from '@/components/news';

function HomePage() {
  return (
    <div className="flex h-screen">
      <Chart />
      <NewsPanel
        defaultSources={[
          'https://binance.com/en/support/announcement',
          'https://bybit.com/announcements',
        ]}
      />
    </div>
  );
}
```

### Compact Ticker (внизу графика)

```tsx
import { NewsPanel } from '@/components/news';

<NewsPanel compact={true} />
```

### Сvoи источники

```tsx
const mySources = [
  'https://my-crypto-news.com',
  'https://exchange-announcements.com',
  'https://regulatory-updates.gov',
];

<NewsPanel defaultSources={mySources} />
```

---

## 🐛 Troubleshooting

### Источники не сохраняются

**Решение:** Проверьте localStorage:
```javascript
console.log(localStorage.getItem('news_sources'));
```

### Новости не загружаются

**Решение:** Проверьте API:
```bash
curl http://localhost:3000/api/news
```

### Auto-scroll не работает

**Решение:** Убедитесь что `autoScroll={true}`:
```tsx
<NewsPanel autoScroll={true} scrollSpeed={30} />
```

---

## 📚 Best Practices

1. **Добавляйте проверенные источники** — Только официальные сайты
2. **Не более 20 источников** — Для производительности
3. **Используйте Quick Add** — Для популярных источников
4. **Сортируйте по важности** — Важные источники выше
5. **Проверяйте URL** — Должны начинаться с `http://` или `https://`

---

## ✅ Features

| Feature | Status |
|---------|--------|
| TradingView style | ✅ |
| Custom sources | ✅ |
| Auto-refresh (60s) | ✅ |
| Auto-scroll | ✅ |
| Importance colors | ✅ |
| localStorage save | ✅ |
| Quick add presets | ✅ |
| Compact mode | ✅ |
| Source management | ✅ |

---

**Ready to use!** 📰
