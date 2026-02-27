# 📰 News Crawler System

Автоматический сбор новостей и анонсов с крипто-источников.

---

## 🎯 Возможности

- **Авто-краулинг** — Сбор новостей по расписанию
- **8+ источников** — Биржи, новостные сайты, регуляторы
- **3 месяца хранения** — Авто-удаление старых новостей
- **Категоризация** — Листинг, делистинг, maintenance, regulation
- **Важность** — Оценка 1-5 для приоритизации
- **Связь с символами** — Автоматическое определение упомянутых монет
- **Sentiment анализ** — Positive/Negative/Neutral

---

## 📁 Архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                    News Crawler System                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Binance   │  │   Bybit     │  │   OKX       │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
│         │                │                │                │
│  ┌──────┴────────────────┴────────────────┴──────┐        │
│  │              Parsers Module                    │        │
│  │   (RSS, HTML scraping, API)                    │        │
│  └─────────────────────┬─────────────────────────┘        │
│                        │                                   │
│  ┌─────────────────────▼─────────────────────────┐        │
│  │          News Crawler Service                  │        │
│  │  - Schedule crawls (cron)                      │        │
│  │  - Filter duplicates                           │        │
│  │  - Classify & score                            │        │
│  │  - Store in PostgreSQL                         │        │
│  └─────────────────────┬─────────────────────────┘        │
│                        │                                   │
│  ┌─────────────────────▼─────────────────────────┐        │
│  │            PostgreSQL Database                 │        │
│  │  - news_items (3 month retention)              │        │
│  │  - news_sources                                │        │
│  │  - crawl_logs                                  │        │
│  └─────────────────────┬─────────────────────────┘        │
│                        │                                   │
│  ┌─────────────────────▼─────────────────────────┐        │
│  │           Next.js API Routes                   │        │
│  │  - GET /api/news                               │        │
│  └─────────────────────┬─────────────────────────┘        │
│                        │                                   │
│  ┌─────────────────────▼─────────────────────────┐        │
│  │          News Panel Component                  │        │
│  │  - Real-time display                           │        │
│  │  - Filters (all/important/exchange/regulation) │        │
│  │  - Auto-refresh (60s)                          │        │
│  └─────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Быстрый старт

### 1. Инициализация базы данных

```bash
# Применить схему
psql -U postgres -d trading -f docker/news_schema.sql
```

### 2. Запустить crawler сервис

```bash
cd packages/news-crawler
pnpm install
pnpm dev
```

### 3. Открыть News Panel

```
http://localhost:3000
```

News Panel автоматически отображается в правой панели.

---

## 📊 Источники новостей

### Exchange Announcements

| Источник | Категория | Интервал |
|----------|-----------|----------|
| Binance | exchange | 5 min |
| Bybit | exchange | 5 min |
| OKX | exchange | 5 min |

### Crypto News

| Источник | Категория | Интервал |
|----------|-----------|----------|
| CoinDesk | crypto_news | 10 min |
| CoinTelegraph | crypto_news | 10 min |
| The Block | crypto_news | 10 min |

### Regulatory

| Источник | Категория | Интервал |
|----------|-----------|----------|
| SEC | regulatory | 15 min |
| CFTC | regulatory | 15 min |

---

## 🎯 Классификация новостей

### Категории

| Категория | Описание | Пример |
|-----------|----------|--------|
| `listing` | Новый листинг | "Binance Will List XYZ" |
| `delisting` | Делистинг | "Delisting of ABC" |
| `maintenance` | Технические работы | "System Maintenance" |
| `partnership` | Партнерства | "Partnership with XYZ" |
| `regulation` | Регуляторные новости | "SEC Announces..." |
| `trading` | Изменения в торговле | "New Trading Pairs" |
| `other` | Другое | - |

### Важность (1-5)

| Score | Ключевые слова | Пример |
|-------|---------------|--------|
| **5** | hack, security, urgent, suspend | "Security Incident" |
| **4** | listing, delist, maintenance, fee | "New Listing" |
| **3** | partner, launch, add | "New Partnership" |
| **2** | General news | "Market Update" |
| **1** | Minor updates | - |

### Sentiment

| Sentiment | Определение |
|-----------|-------------|
| 🟢 Positive | listing, partner, launch, growth |
| 🔴 Negative | delist, suspend, hack, crash, ban |
| ⚪ Neutral | Нет явных маркеров |

---

## 🔧 Настройка

### Добавить новый источник

```typescript
import { startNewsCrawler } from '@trading-platform/news-crawler';

const crawler = await startNewsCrawler();

await crawler.addNewsSource({
  name: 'New Exchange',
  url: 'https://example.com/announcements',
  category: 'exchange',
  enabled: true,
  crawlInterval: 300,
});
```

### Изменить интервал краулинга

```sql
UPDATE news_sources 
SET crawl_interval = 600 
WHERE name = 'CoinDesk';
```

### Настроить важность по ключевым словам

```typescript
// В packages/news-crawler/src/parsers.ts
function calculateImportance(title: string): number {
  const titleLower = title.toLowerCase();
  
  // Custom keywords
  if (titleLower.includes('your_keyword')) return 5;
  
  // ... existing logic
}
```

---

## 📡 API Endpoints

### GET /api/news

Получение новостей.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 50 | Максимум новостей |
| `category` | string | - | Фильтр по категории |
| `symbol` | string | - | Новости по символу |
| `important` | boolean | false | Только важные (importance >= 3) |

**Примеры:**

```bash
# Все новости
GET /api/news

# Только важные
GET /api/news?important=true

# По символу
GET /api/news?symbol=BTC

# По категории
GET /api/news?category=listing
```

**Response:**
```json
{
  "success": true,
  "count": 50,
  "news": [
    {
      "id": "uuid",
      "sourceName": "Binance",
      "title": "Binance Will List XYZ",
      "summary": "Binance will list XYZ token...",
      "url": "https://...",
      "publishedAt": "2024-01-15T10:00:00Z",
      "category": "listing",
      "sentiment": "positive",
      "importance": 5,
      "relatedSymbols": ["XYZ", "USDT"]
    }
  ]
}
```

---

## 🎨 News Panel Component

### Basic Usage

```tsx
import { NewsPanel } from '@/components/news';

<NewsPanel
  compact={false}
  autoRefresh={true}
  refreshInterval={60000}
/>
```

### Compact Mode

```tsx
<NewsPanel compact={true} />
```

### Filters

- **All** — Все новости
- **Important** — Важные (importance >= 3)
- **Exchange** — Анонсы бирж
- **Regulation** — Регуляторные новости

---

## 🗄️ Database Schema

### news_items

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `source_id` | UUID | Foreign key to news_sources |
| `title` | VARCHAR(500) | Заголовок |
| `summary` | TEXT | Краткое описание |
| `url` | VARCHAR(1000) | Ссылка на оригинал |
| `published_at` | TIMESTAMPTZ | Дата публикации |
| `category` | VARCHAR(50) | Категория |
| `sentiment` | VARCHAR(20) | Positive/Negative/Neutral |
| `importance` | INTEGER | 1-5 |
| `related_symbols` | TEXT[] | Упомянутые символы |
| `expires_at` | TIMESTAMPTZ | Авто-удаление (3 месяца) |

### news_sources

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `name` | VARCHAR(100) | Название источника |
| `url` | VARCHAR(500) | URL для краулинга |
| `category` | VARCHAR(50) | Категория |
| `crawl_interval` | INTEGER | Интервал в секундах |

---

## 🧹 Auto-Cleanup

### 3-Month Retention

Новости автоматически удаляются через 3 месяца:

```sql
-- Функция удаления
SELECT delete_expired_news();

-- Запускается ежедневно в 00:00
-- Через pg_cron или внешний scheduler
```

### Manual Cleanup

```sql
-- Удалить все новости старше 3 месяцев
DELETE FROM news_items WHERE expires_at < NOW();

-- Удалить новости конкретного источника
DELETE FROM news_items 
WHERE source_id = (SELECT id FROM news_sources WHERE name = '...');
```

---

## 📈 Monitoring

### Crawl Logs

```sql
-- Последние краулы
SELECT 
  ns.name,
  cl.status,
  cl.items_found,
  cl.items_new,
  cl.duration_ms,
  cl.crawled_at
FROM crawl_logs cl
JOIN news_sources ns ON cl.source_id = ns.id
ORDER BY cl.crawled_at DESC
LIMIT 20;
```

### News Statistics

```sql
-- Статистика по новостям
SELECT 
  category,
  COUNT(*) as count,
  AVG(importance) as avg_importance,
  MAX(published_at) as latest
FROM news_items
WHERE expires_at > NOW()
GROUP BY category;
```

---

## 🐛 Troubleshooting

### Ошибка: "Database connection failed"

**Решение:** Проверьте DATABASE_URL в .env

### Новости не обновляются

**Решение:** Проверьте логи crawler сервиса:
```bash
cd packages/news-crawler
pnpm dev
```

### Пустой список новостей

**Решение:** 
1. Проверьте что источники включены:
   ```sql
   SELECT * FROM news_sources WHERE enabled = true;
   ```
2. Запустите краулер вручную:
   ```typescript
   await crawler.crawlSource(source);
   ```

---

## 📚 Best Practices

1. **Не увеличивайте интервал краулинга** — 5-15 минут оптимально
2. **Мониторьте crawl_logs** — Для обнаружения проблем
3. **Настройте алёрты** — На важные новости (importance >= 4)
4. **Регулярно проверяйте** — Что источники работают
5. **Добавляйте новые источники** — Для полноты покрытия

---

## 🎯 Integration Examples

### Trading Alert on Important News

```typescript
// При получении важной новости
if (news.importance >= 4 && news.relatedSymbols.includes('BTC')) {
  // Отправить алёрт трейдеру
  sendAlert({
    type: 'IMPORTANT_NEWS',
    title: news.title,
    symbols: news.relatedSymbols,
  });
}
```

### Filter News by Portfolio

```typescript
// Показать только новости по монетам из портфеля
const portfolioSymbols = ['BTC', 'ETH', 'SOL'];
const filteredNews = news.filter(n => 
  n.relatedSymbols?.some(s => portfolioSymbols.includes(s))
);
```

---

**Ready to crawl!** 🕷️
