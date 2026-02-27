# 🚀 TRADING PLATFORM — REVISED ROADMAP (2026)

**Аппаратные ограничения учтены:**
- CPU: i7-4790 (4C/8T, без GPU)
- RAM: 32GB DDR3
- Mobile: Snapdragon 8 Elite (с GPU/NPU)
- Sync: Email (mail.ru/yandex)

---

## 📊 ПРИОРИТЕТЫ (обновлено)

| Приоритет | Компонент | Статус | Срок |
|-----------|-----------|--------|------|
| **P0** | CPU-optimized ML | ⏳ В работе | 1-2 недели |
| **P0** | Email Sync Service | ⏳ В работе | 1 неделя |
| **P0** | Mobile ML (TFLite) | ⏳ В работе | 1 неделя |
| **P1** | Production Hardening | ⏳ | 2 недели |
| **P1** | 5 Exchange Integration | ✅ | Готово |
| **P2** | Advanced Backtesting | ⏳ | 2-3 недели |
| **P3** | Genetic Optimization | ❌ Отложено | - |
| **P3** | Deep RL | ❌ Отключено | - |

---

## 🗓️ ФАЗЫ РЕАЛИЗАЦИИ

### Фаза 1: CPU ML Adaptation (Недели 1-2)

**Цель:** Адаптировать ML под CPU без GPU

| Задача | Файлы | Статус | Сложность |
|--------|-------|--------|-----------|
| **1.1** Meta-Labeling Lite | `packages/ml/src/cpu-optimized/` | ✅ | Средняя |
| **1.2** Feature Importance Lite | `packages/ml/src/cpu-optimized/` | ✅ | Низкая |
| **1.3** ONNX Runtime интеграция | `backend/src/ml/` | ⏳ | Высокая |
| **1.4** Model quantization | `scripts/convert_models.py` | ⏳ | Средняя |
| **1.5** Performance тесты | `tests/ml/cpu-benchmark.ts` | ⏳ | Низкая |

**Ожидаемые метрики:**
- Inference время: < 100ms
- CPU загрузка: < 40%
- RAM использование: < 2GB

---

### Фаза 2: Email Sync (Неделя 3)

**Цель:** Синхронизация через email (один аккаунт, разные ключи)

| Задача | Файлы | Статус | Сложность |
|--------|-------|--------|-----------|
| **2.1** Email Sync Service | `packages/core/src/sync/email/` | ✅ | Высокая |
| **2.2** AES-256 шифрование | `packages/core/src/sync/email/` | ✅ | Средняя |
| **2.3** SMTP интеграция | `packages/core/src/sync/email/` | ⏳ | Средняя |
| **2.4** IMAP интеграция | `packages/core/src/sync/email/` | ⏳ | Средняя |
| **2.5** Mail.ru/Yandex конфиги | `config/email-config.ts` | ⏳ | Низкая |
| **2.6** Sync conflict resolution | `packages/core/src/sync/` | ⏳ | Высокая |

**Конфигурация:**
```typescript
// Mail.ru
smtp.mail.ru:465 (SSL)
imap.mail.ru:993 (SSL)

// Yandex
smtp.yandex.ru:465 (SSL)
imap.yandex.ru:993 (SSL)
```

---

### Фаза 3: Mobile Optimization (Неделя 4)

**Цель:** Оптимизация под Snapdragon 8 Elite

| Задача | Файлы | Статус | Сложность |
|--------|-------|--------|-----------|
| **3.1** TensorFlow Lite интеграция | `apps/mobile/src/ml/` | ✅ | Высокая |
| **3.2** GPU acceleration (Adreno) | `apps/mobile/src/ml/` | ⏳ | Средняя |
| **3.3** Model caching | `apps/mobile/src/ml/` | ✅ | Низкая |
| **3.4** Offline-first ML | `apps/mobile/src/ml/` | ⏳ | Средняя |
| **3.5** Battery optimization | `apps/mobile/` | ⏳ | Низкая |

**Ожидаемые метрики:**
- Inference время: < 50ms (с GPU)
- Battery drain: < 5%/час
- Model size: < 10MB (квантованная)

---

### Фаза 4: Production Hardening (Недели 5-6)

**Цель:** Production-ready качество

| Задача | Файлы | Статус | Сложность |
|--------|-------|--------|-----------|
| **4.1** Error handling | Все модули | ⏳ | Высокая |
| **4.2** Logging (Winston) | `backend/src/` | ⏳ | Средняя |
| **4.3** Retry logic | Все API вызовы | ⏳ | Средняя |
| **4.4** Circuit breakers | `backend/src/` | ⏳ | Высокая |
| **4.5** Health checks | `backend/src/api/` | ⏳ | Низкая |
| **4.6** Backup automation | `scripts/backup.ts` | ⏳ | Средняя |
| **4.7** Security audit | Все модули | ⏳ | Высокая |

---

### Фаза 5: Exchange Integration (Готово)

**Цель:** 5 бирж полностью интегрированы

| Биржа | REST | WebSocket | Ордера | Позиции | Тесты |
|-------|------|-----------|--------|---------|-------|
| **Binance** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Bybit** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **OKX** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Bitget** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **BingX** | ✅ | ✅ | ✅ | ✅ | ✅ |

---

### Фаза 6: Trading Modes (Недели 7-8)

**Цель:** 3 режима торговли

| Режим | Описание | Статус | Сложность |
|-------|----------|--------|-----------|
| **Paper Trading** | Тестирование без риска | ✅ | Низкая |
| **Real Trading (Small)** | Реальные сделки, малый капитал | ⏳ | Высокая |
| **Production** | Полноценная торговля | ⏳ | Высокая |

**Risk Management:**
```typescript
// Paper Trading
maxPositionSize: 1.0  // 100% капитала
leverage: 1

// Real Trading (Small)
maxPositionSize: 0.1  // 10% капитала
leverage: 5
dailyLossLimit: 0.05  // 5%

// Production
maxPositionSize: 0.2  // 20% капитала
leverage: 10
dailyLossLimit: 0.02  // 2%
```

---

## 📦 ML АРХИТЕКТУРА (CPU-Only)

### Включено ✅

| Компонент | Метод | Время inference | Частота |
|-----------|-------|-----------------|---------|
| **Meta-Labeling** | Логистическая регрессия | 1-5 ms | Real-time |
| **Feature Importance** | Pearson Correlation | 10-50 ms | Per trade |
| **XAI** | SHAP-аппроксимация | 20-50 ms | On demand |
| **Synthetic Data** | Monte Carlo | 50-100 ms | Nightly |

### Отключено ❌

| Компонент | Причина | Альтернатива |
|-----------|---------|--------------|
| **RL Agent** | Слишком тяжело для CPU | Правило-базированный |
| **Deep Learning** | Нет GPU | Логистическая регрессия |
| **Graph Neural Networks** | Нет GPU | Корреляционная матрица |
| **Transformer Models** | Нет GPU | Упрощенные фичи |

---

## 🔄 SYNC АРХИТЕКТУРА

### Email-based Sync

```
┌─────────────────────────────────────────────────────────────┐
│                    EMAIL SYNC FLOW                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   Web App   │    │ Desktop App │    │  Mobile App │     │
│  │  (Windows)  │    │  (Windows)  │    │  (Android)  │     │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘     │
│         │                  │                  │              │
│         │  SMTP (send)     │  SMTP (send)     │  SMTP (send) │
│         ▼                  ▼                  ▼              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           Email Server (mail.ru / yandex)           │   │
│  │           - Один аккаунт для всех устройств         │   │
│  │           - Разные app passwords для SMTP/IMAP      │   │
│  │           - AES-256 шифрование данных               │   │
│  └─────────────────────────────────────────────────────┘   │
│         ▲                  ▲                  ▲              │
│         │  IMAP (receive)  │  IMAP (receive)  │ IMAP (recv) │
│         │                  │                  │              │
│  ┌──────┴──────┐    ┌──────┴──────┐    ┌──────┴──────┐     │
│  │   Web App   │    │ Desktop App │    │  Mobile App │     │
│  │  (Windows)  │    │  (Windows)  │    │  (Android)  │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Security

| Мера | Описание |
|------|----------|
| **AES-256** | Шифрование всех данных перед отправкой |
| **HMAC-SHA256** | Верификация целостности писем |
| **App Passwords** | Отдельные пароли для SMTP/IMAP |
| **Device IDs** | Уникальные ID для каждого устройства |
| **Email Age Limit** | Автоматическое удаление старых писем (24ч) |

---

## 📱 МОБИЛЬНАЯ ОПТИМИЗАЦИЯ

### Snapdragon 8 Elite Преимущества

| Компонент | Спецификация | Использование |
|-----------|--------------|---------------|
| **CPU** | 2× 4.32 GHz + 6× 3.53 GHz | General compute |
| **GPU** | Adreno (8-е поколение) | ML inference |
| **NPU** | Hexagon (AI accelerator) | TensorFlow Lite |
| **RAM** | 24GB LPDDR5X | Model caching |
| **Storage** | 1TB UFS 4.0 | Local database |

### Оптимизации

```typescript
// apps/mobile/src/ml/config.ts

export const MobileMLConfig = {
  // Использовать GPU для inference
  useGPU: true,
  
  // Квантованные модели (int8)
  quantized: true,
  
  // Макс размер модели
  maxModelSize: 10 * 1024 * 1024,  // 10MB
  
  // Кэш моделей
  cacheEnabled: true,
  cacheExpiry: 7 * 24 * 60 * 60 * 1000,  // 7 дней
  
  // Battery optimization
  backgroundInference: false,  // Не в фоне
  lowBatteryThreshold: 0.2,    // 20%
};
```

---

## 🎯 KPI И МЕТРИКИ

### Производительность (Desktop, i7-4790)

| Метрика | Цель | Метод измерения |
|---------|------|-----------------|
| **ML Inference** | < 100ms | `performance.now()` |
| **Email Sync** | < 5s | SMTP/IMAP latency |
| **API Response** | < 200ms | HTTP request time |
| **Chart Render** | 60 FPS | `requestAnimationFrame` |
| **CPU Usage** | < 60% | `os.cpus()` |
| **RAM Usage** | < 4GB | `process.memoryUsage()` |

### Производительность (Mobile, Snapdragon 8 Elite)

| Метрика | Цель | Метод измерения |
|---------|------|-----------------|
| **ML Inference** | < 50ms | `performance.now()` |
| **App Startup** | < 3s | Time to interactive |
| **Battery Drain** | < 5%/hour | Android Battery Stats |
| **Memory Usage** | < 500MB | `DeviceInfo.getMemoryInfo()` |

---

## ⚠️ РИСКИ И МИТИГАЦИЯ

| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| **ML слишком медленный** | Средняя | Высокое | Упрощение моделей, отключение RL |
| **Email sync ненадежный** | Средняя | Среднее | Retry logic, fallback на WebSocket |
| **Mobile battery drain** | Низкая | Среднее | Отключение background inference |
| **Windows совместимость** | Низкая | Высокое | Тестирование на целевой машине |
| **Exchange API changes** | Средняя | Высокое | Abstract layer, auto-tests |

---

## 📝 СЛЕДУЮЩИЕ ШАГИ

### Неделя 1-2 (CPU ML)
1. ✅ Завершить `meta-labeling-lite.ts`
2. ✅ Завершить `feature-importance-lite.ts`
3. ⏳ Интегрировать в `SelfLearningManager`
4. ⏳ Создать ONNX конвертер
5. ⏳ Performance тесты

### Неделя 3 (Email Sync)
1. ✅ Завершить `email-sync-service.ts`
2. ⏳ Добавить nodemailer/imapflow зависимости
3. ⏳ Настроить mail.ru/yandex конфиги
4. ⏳ Тесты шифрования
5. ⏳ Интеграция с `CentralSyncService`

### Неделя 4 (Mobile)
1. ✅ Завершить `mobile-ml-engine.ts`
2. ⏳ Добавить TensorFlow Lite зависимости
3. ⏳ Настроить GPU acceleration
4. ⏳ Тесты на реальном устройстве
5. ⏳ Battery optimization

---

**Версия:** 2.0.0 (Revised for CPU-only)  
**Дата:** 2026-01-22  
**Автор:** Trading Platform Team
