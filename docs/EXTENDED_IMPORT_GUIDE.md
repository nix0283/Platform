# 🔄 Extended Import & Auto-Sync Guide

Расширенный импорт фьючерсов и авто-синхронизация с биржами.

---

## 🎯 Новые возможности

### Фьючерсные биржи
- ✅ **OKX** - Futures/Swap импорт
- ✅ **Bitget** - Futures/Swap импорт
- ✅ **BingX** - Futures/Swap импорт

### Авто-синхронизация
- ✅ Автоматический импорт новых сделок
- ✅ Синхронизация открытых позиций
- ✅ Настраиваемый интервал (30 сек - 30 мин)
- ✅ Работа в фоне

### Интеграция с графиком
- ✅ Отображение открытых позиций
- ✅ Линии входа/выхода на графике
- ✅ Real-time P&L

---

## 🚀 Настройка авто-синхронизации

### Через UI

1. Откройте **Trading Journal**
2. Нажмите **🔄 Sync**
3. Включите **Auto-Sync Trades**
4. Выберите интервал:
   - 30 seconds
   - 1 minute
   - 5 minutes
   - 10 minutes
   - 30 minutes
5. Настройте биржи:
   - OKX (API Key, Secret, Passphrase)
   - Bitget (API Key, Secret, Passphrase)
   - BingX (API Key, Secret)
6. Включите опции:
   - ☑ Import Trades
   - ☑ Sync Positions
7. Нажмите **Save Settings**

### Через API

```typescript
POST /api/journal/sync/start

{
  "enabled": true,
  "interval": 60,
  "exchanges": [
    {
      "id": "okx",
      "apiKey": "...",
      "apiSecret": "...",
      "passphrase": "...",
      "autoImport": true,
      "autoSyncPositions": true
    },
    {
      "id": "bitget",
      "apiKey": "...",
      "apiSecret": "...",
      "passphrase": "...",
      "autoImport": true,
      "autoSyncPositions": false
    }
  ]
}
```

---

## 📊 Supported Exchanges

### OKX Futures
```
API Fields: apiKey, apiSecret, passphrase
Supports: Spot + Swap (Perpetual Futures)
Max Trades: 1000 per request
Pagination: Cursor-based
```

### Bitget Futures
```
API Fields: apiKey, apiSecret, passphrase
Supports: Spot + Swap (UMCBL)
Max Trades: 1000 per request
Pagination: Time-based
```

### BingX Futures
```
API Fields: apiKey, apiSecret
Supports: Spot + Swap
Max Trades: 1000 per request
Pagination: Offset-based
```

---

## 🔑 API Keys Setup

### OKX
```
1. https://www.okx.com/account/my-api
2. Create API Key
3. Permissions: Read-Only
4. Copy: API Key, Secret, Passphrase
```

### Bitget
```
1. https://www.bitget.com/api-management
2. Create API Key
3. Permissions: Read-Only
4. Copy: API Key, Secret, Passphrase
```

### BingX
```
1. https://www.bingx.com/en-us/api/
2. Create API Key
3. Permissions: Read-Only
4. Copy: API Key, Secret
```

---

## 📈 Auto-Sync Flow

```
┌─────────────────────────────────────────┐
│  Auto-Sync Enabled                      │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│  Wait for Interval (e.g., 60s)          │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│  For Each Exchange:                     │
│  - Fetch new trades since last sync     │
│  - Fetch open positions                 │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│  Check for Duplicates                   │
│  (by Order ID or time+price+qty)        │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│  Convert to JournalEntry                │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│  Save to Journal                        │
│  Update Open Positions                  │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│  Update Chart with Positions            │
│  (Entry lines, P&L)                     │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│  Update Last Sync Time                  │
└─────────────────────────────────────────┘
```

---

## 📊 Position Tracking

### Open Positions Display

```
┌─────────────────────────────────────────┐
│ Open Positions (3)                      │
├─────────────────────────────────────────┤
│ BTC/USDT  LONG  0.1 @ $42,500           │
│ Mark: $43,000  PnL: +$50 (+1.18%)      │
│ Liq: $40,000  [Close] [Add Margin]     │
├─────────────────────────────────────────┤
│ ETH/USDT  SHORT  1.0 @ $2,250           │
│ Mark: $2,200  PnL: +$50 (+2.22%)       │
│ Liq: $2,500   [Close] [Add Margin]     │
├─────────────────────────────────────────┤
│ SOL/USDT  LONG  10 @ $95.50             │
│ Mark: $96.00  PnL: +$5 (+0.52%)        │
│ Liq: $90.00   [Close] [Add Margin]     │
└─────────────────────────────────────────┘
```

### Chart Integration

```
On Chart:
├─ Entry Line (green for LONG, red for SHORT)
├─ Stop Loss Line (orange)
├─ Take Profit Lines (blue)
└─ Current P&L Label
```

---

## ⚙️ Sync Settings

### Interval Options

| Interval | Use Case |
|----------|----------|
| 30 seconds | High-frequency trading |
| 1 minute | Active day trading |
| 5 minutes | Normal trading |
| 10 minutes | Swing trading |
| 30 minutes | Position trading |

### Exchange Options

| Option | Description |
|--------|-------------|
| Import Trades | Auto-import new trades |
| Sync Positions | Sync open positions |

---

## 🐛 Troubleshooting

### Error: "Invalid API credentials"

**Решение:** Проверьте ключи и permissions (Read-Only)

### Error: "Rate limit exceeded"

**Решение:** Увеличьте интервал синхронизации

### Sync не работает

**Решение:**
1. Проверьте что Auto-Sync включен
2. Проверьте API ключи
3. Посмотрите логи ошибок

### Позиции не отображаются

**Решение:**
1. Включите "Sync Positions" для биржи
2. Проверьте что есть открытые позиции
3. Обновите страницу

---

## 💡 Best Practices

1. **Используйте Read-Only ключи**
   - Никогда не давайте права на торговлю

2. **Настройте разумный интервал**
   - 1-5 минут для активного трейдинга
   - 10-30 минут для свинга

3. **Мониторьте логи**
   - Проверяйте ошибки синхронизации

4. **IP Whitelist**
   - Добавьте IP сервера в whitelist

---

## 📡 API Reference

### POST /api/journal/sync/start

Настройка авто-синхронизации.

**Request:**
```json
{
  "enabled": true,
  "interval": 60,
  "exchanges": [...]
}
```

### GET /api/journal/sync/status

Статус синхронизации.

**Response:**
```json
{
  "success": true,
  "status": {
    "enabled": true,
    "lastSync": "2024-01-15T10:00:00Z",
    "nextSync": "2024-01-15T10:01:00Z",
    "imported": 150,
    "errors": []
  }
}
```

### POST /api/journal/sync/positions

Синхронизация позиций.

**Response:**
```json
{
  "success": true,
  "positions": [
    {
      "exchange": "okx",
      "symbol": "BTC/USDT",
      "side": "LONG",
      "quantity": 0.1,
      "entryPrice": 42500,
      "markPrice": 43000,
      "unrealizedPnl": 50
    }
  ]
}
```

---

## ✅ Checklist

- [x] OKX Futures importer
- [x] Bitget importer (Spot + Futures)
- [x] BingX importer (Spot + Futures)
- [x] Auto-sync service
- [x] Position sync
- [x] Sync settings UI
- [x] Chart integration
- [x] Duplicate detection
- [x] Error handling
- [x] Documentation

---

**Ready to auto-sync your trades!** 🔄
