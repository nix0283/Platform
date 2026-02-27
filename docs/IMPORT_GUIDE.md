# 📥 Exchange Import Guide

Импорт истории сделок с бирж в торговый журнал.

---

## 🎯 Возможности

### Поддерживаемые биржи
- ✅ **Binance** (Spot + Futures)
- ✅ **Bybit** (Spot + Futures)
- ✅ **OKX** (Spot)
- ✅ **Bitget** (Spot) - в разработке
- ✅ **BingX** (Spot) - в разработке

### Авто-захват данных
- ✅ Все исторические сделки
- ✅ Цена входа/выхода
- ✅ Количество
- ✅ Комиссии
- ✅ Время сделки
- ✅ Order ID

### Умная обработка
- ✅ Определение дубликатов
- ✅ Прогресс импорта
- ✅ Отчет об ошибках
- ✅ Пагинация (до 10,000 сделок)

---

## 🚀 Использование

### Через UI

1. Откройте **Trading Journal**
2. Нажмите **📥 Import**
3. Выберите биржу
4. Введите API ключи
5. Настройте опции (символ, даты)
6. Нажмите **Import Trades**

### Через API

```typescript
POST /api/journal/import

{
  "exchange": "binance",
  "apiKey": "your_api_key",
  "apiSecret": "your_api_secret",
  "symbol": "BTC/USDT",      // optional
  "startTime": 1704067200000, // optional
  "endTime": 1706745600000,   // optional
  "includeFutures": true      // for Binance/Bybit
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "imported": 150,
    "skipped": 10,
    "errors": [],
    "total": 160
  }
}
```

---

## 🔑 API Keys Setup

### Binance

1. Зайдите на https://www.binance.com/en/my/settings/api-management
2. Create API Key
3. **Важно:** Установите **Read-Only** permissions
4. Скопируйте API Key и Secret Key

**Required permissions:**
- ✅ Enable Reading
- ❌ Disable Spot & Margin Trading
- ❌ Disable Futures

### Bybit

1. Зайдите на https://testnet.bybit.com/app/user/api-management
2. Create New Key
3. Select **Read-Only** permissions
4. Скопируйте API Key и Secret

**Required permissions:**
- ✅ Account Transfer - Read
- ✅ Order - Read
- ✅ Position - Read
- ✅ Wallet - Read

### OKX

1. Зайдите на https://www.okx.com/account/my-api
2. Create API Key
3. Select **Read-Only** permissions
4. Скопируйте API Key, Secret, и Passphrase

**Required permissions:**
- ✅ Read access

---

## 📊 Import Options

### Symbol Filter
```
Оставьте пустым для импорта всех сделок
Или укажите конкретный символ: BTC/USDT
```

### Date Range
```
Start Date: 2024-01-01
End Date:   2024-01-31

Импортирует сделки за указанный период
```

### Include Futures
```
☑ Include Futures trades

Импортирует как Spot, так и Futures сделки
(доступно для Binance и Bybit)
```

---

## 🔒 Security

### Best Practices

1. **Используйте Read-Only ключи**
   - Никогда не давайте права на торговлю
   - Только чтение истории

2. **Не храните ключи**
   - Ключи используются только для импорта
   - Не сохраняются в базе данных

3. **IP Whitelist (рекомендуется)**
   - Добавьте IP сервера в whitelist
   - Ограничьте доступ по IP

4. **Регулярная ротация**
   - Меняйте API ключи каждые 30 дней
   - Удаляйте старые ключи

---

## 📈 Import Process

```
1. Ввод API ключей
         ↓
2. Проверка подключения
         ↓
3. Загрузка сделок (пагинация)
         ↓
4. Проверка на дубликаты
         ↓
5. Конвертация в JournalEntry
         ↓
6. Сохранение в журнал
         ↓
7. Отчет о результатах
```

---

## ⚠️ Limitations

### Binance
- Max 1000 trades per request
- Max 10,000 trades total per import
- Futures: 7 days per request

### Bybit
- Max 1000 trades per request
- Cursor-based pagination
- Futures: Supported

### OKX
- Max 1000 trades per request
- 3 months max per request

---

## 🐛 Troubleshooting

### Error: "Invalid API-key"

**Решение:** Проверьте что ключи правильные и имеют Read-Only permissions

### Error: "Request timestamp ahead of server time"

**Решение:** Синхронизируйте время системы

### Error: "Too many requests"

**Решение:** Подождите 1 минуту и попробуйте снова

### Import застрял на 50%

**Решение:** 
- Проверьте соединение с интернетом
- Уменьшите диапазон дат
- Импортируйте по одному символу

---

## 📊 Example Results

```
┌─────────────────────────────────────────┐
│ Import Result:                          │
├─────────────────────────────────────────┤
│ Imported:  150  ✅                      │
│ Skipped:    10  🔄 (duplicates)         │
│ Total:     160                          │
│ Errors:      0                          │
└─────────────────────────────────────────┘
```

---

## 💡 Tips

1. **Импортируйте по месяцам**
   - Разбейте на периоды по 1-3 месяца
   - Меньше нагрузка на API

2. **Сначала тестовый импорт**
   - Импортируйте 1 символ
   - Проверьте результаты
   - Затем импортируйте всё

3. **Проверяйте дубликаты**
   - Система автоматически пропускает дубликаты
   - Но лучше проверять перед импортом

4. **Сохраняйте отчеты**
   - Экспортируйте результат импорта
   - Для аудита и проверки

---

## 📡 API Reference

### GET /api/journal/import/status

Получение списка поддерживаемых бирж.

**Response:**
```json
{
  "success": true,
  "exchanges": [
    {
      "id": "binance",
      "name": "Binance",
      "fields": ["apiKey", "apiSecret"],
      "supportsFutures": true
    },
    ...
  ]
}
```

### POST /api/journal/import

Импорт сделок с биржи.

**Request:**
```json
{
  "exchange": "binance",
  "apiKey": "...",
  "apiSecret": "...",
  "symbol": "BTC/USDT",
  "startTime": 1704067200000,
  "endTime": 1706745600000,
  "includeFutures": true
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "imported": 150,
    "skipped": 10,
    "errors": [],
    "total": 160
  }
}
```

---

## ✅ Checklist

- [x] Binance importer (Spot + Futures)
- [x] Bybit importer (Spot + Futures)
- [x] OKX importer (Spot)
- [x] Duplicate detection
- [x] Progress tracking
- [x] Error reporting
- [x] UI component
- [x] API routes
- [x] Security notices
- [x] Documentation

---

**Ready to import your trades!** 📥
