# 📦 EMAIL SYNC SETUP GUIDE

Настройка синхронизации через email (mail.ru / yandex)

---

## 🔐 БЕЗОПАСНОСТЬ

**Важно:** Никогда не используйте основной пароль от почты!

### Создание App Password

#### Mail.ru
1. Зайти в настройки аккаунта
2. Безопасность → Пароли для внешних приложений
3. Создать новый пароль
4. Скопировать и сохранить (показывается один раз)
5. Создать **два разных пароля**: один для SMTP, один для IMAP

#### Yandex
1. Зайти в Яндекс ID
2. Безопасность → Пароли приложений
3. Создать новый пароль
4. Выбрать приложение: "Почта"
5. Скопировать и сохранить
6. Создать **два разных пароля**: один для SMTP, один для IMAP

---

## ⚙️ КОНФИГУРАЦИЯ

### Создание конфига

```typescript
// config/email-sync.ts

import { EmailProvider, createEmailSyncService } from '@trading-platform/core';

export const emailSyncConfig = {
  // Web/Desktop (Windows)
  web: createEmailSyncService(
    EmailProvider.MAIL_RU,  // или EmailProvider.YANDEX
    'your-email@mail.ru',
    'web-desktop-001',      // Device ID
    {
      smtpPassword: 'smtp-app-password-here',
      imapPassword: 'imap-app-password-here',
      encryptionKey: 'your-32-byte-hex-key-here-0000000000000000',
      syncInterval: 60000,   // 1 минута
    }
  ),
  
  // Mobile (Android)
  mobile: createEmailSyncService(
    EmailProvider.MAIL_RU,
    'your-email@mail.ru',
    'mobile-android-001',
    {
      smtpPassword: 'smtp-app-password-here',
      imapPassword: 'imap-app-password-here',
      encryptionKey: 'your-32-byte-hex-key-here-0000000000000000',
      syncInterval: 120000,  // 2 минуты (battery saving)
    }
  ),
};
```

### Генерация ключа шифрования

```typescript
// scripts/generate-encryption-key.ts

import * as crypto from 'crypto';

const key = crypto.randomBytes(32).toString('hex');
console.log('Encryption Key (32 bytes):', key);
console.log('Length:', key.length);  // Должно быть 64 символа

// Сохранить в .env
// EMAIL_ENCRYPTION_KEY=<key>
```

---

## 📧 SMTP/IMAP НАСТРОЙКИ

### Mail.ru

```typescript
{
  provider: EmailProvider.MAIL_RU,
  
  // SMTP (отправка)
  smtpHost: 'smtp.mail.ru',
  smtpPort: 465,
  smtpSecure: true,  // SSL
  
  // IMAP (получение)
  imapHost: 'imap.mail.ru',
  imapPort: 993,
  imapSecure: true,  // SSL
}
```

### Yandex

```typescript
{
  provider: EmailProvider.YANDEX,
  
  // SMTP (отправка)
  smtpHost: 'smtp.yandex.ru',
  smtpPort: 465,
  smtpSecure: true,  // SSL
  
  // IMAP (получение)
  imapHost: 'imap.yandex.ru',
  imapPort: 993,
  imapSecure: true,  // SSL
}
```

---

## 🔧 УСТАНОВКА ЗАВИСИМОСТЕЙ

### Backend (Node.js)

```bash
cd packages/core
pnpm add nodemailer imapflow
pnpm add -D @types/nodemailer @types/imapflow
```

### Mobile (React Native)

```bash
cd apps/mobile
pnpm add @tensorflow/tfjs @tensorflow/tfjs-react-native
pnpm add expo-file-system expo-secure-store
```

---

## 🧪 ТЕСТИРОВАНИЕ

### Тест отправки

```typescript
// tests/email-sync.test.ts

import { createEmailSyncService, EmailProvider } from '../src/sync/email';

const sync = createEmailSyncService(
  EmailProvider.MAIL_RU,
  'test@mail.ru',
  'test-device-001',
  {
    smtpPassword: '...',
    imapPassword: '...',
    encryptionKey: '...',
  }
);

// Тест отправки
await sync.syncJournal({
  trades: [{ id: 'test', pnl: 100 }],
});

// Тест получения
const payloads = await sync.receiveSyncData();
console.log('Received:', payloads.length, 'messages');
```

### Тест шифрования

```typescript
// tests/encryption.test.ts

import * as crypto from 'crypto';

const key = crypto.randomBytes(32);
const iv = crypto.randomBytes(16);
const data = { test: 'data' };

// Шифрование
const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'base64');
encrypted += cipher.final('base64');

// Дешифрование
const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
let decrypted = decipher.update(encrypted, 'base64', 'utf8');
decrypted += decipher.final('utf8');

console.log('Original:', data);
console.log('Decrypted:', JSON.parse(decrypted));
```

---

## 📱 МОБИЛЬНАЯ НАСТРОЙКА

### Android Permissions

```xml
<!-- apps/mobile/android/app/src/main/AndroidManifest.xml -->

<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
```

### Background Sync (опционально)

```typescript
// apps/mobile/src/services/background-sync.ts

import BackgroundFetch from 'react-native-background-fetch';

BackgroundFetch.configure({
  minimumFetchInterval: 15,  // 15 минут
  stopOnTerminate: false,
  startOnBoot: true,
}, async (taskId) => {
  console.log('[BackgroundFetch] taskId:', taskId);
  
  // Синхронизация
  await syncService.syncWithServer();
  
  BackgroundFetch.finish(taskId);
}, (error) => {
  console.log('[BackgroundFetch] Error:', error);
});

BackgroundFetch.status((status) => {
  switch (status) {
    case BackgroundFetch.STATUS_RESTRICTED:
      console.log('BackgroundFetch restricted');
      break;
    case BackgroundFetch.STATUS_DENIED:
      console.log('BackgroundFetch denied');
      break;
    case BackgroundFetch.STATUS_AVAILABLE:
      console.log('BackgroundFetch available');
      break;
  }
});
```

---

## 🔒 БЕЗОПАСНОСТЬ

### Best Practices

1. **App Passwords:**
   - Никогда не коммитить в git
   - Хранить в `.env` файле
   - Использовать разные пароли для SMTP/IMAP

2. **Encryption Key:**
   - Генерировать один раз
   - Хранить в secure storage
   - Не передавать по сети

3. **Email:**
   - Использовать отдельный аккаунт для синхронизации
   - Включить 2FA
   - Настроить фильтры для писем синхронизации

4. **Data:**
   - Все данные шифруются перед отправкой
   - HMAC подпись для верификации
   - Автоматическое удаление старых писем (24ч)

---

## 🐛 TROUBLESHOOTING

### Ошибка: "Authentication failed"

**Причина:** Неверный app password

**Решение:**
1. Пересоздать app password в настройках почты
2. Проверить что используется app password, а не основной пароль
3. Проверить что включен IMAP/SMTP в настройках почты

### Ошибка: "Connection timeout"

**Причина:** Блокировка фаерволом

**Решение:**
1. Проверить что порты 465 (SMTP) и 993 (IMAP) открыты
2. Отключить антивирус на время теста
3. Проверить настройки роутера

### Ошибка: "Invalid signature"

**Причина:** Несоответствие ключей шифрования

**Решение:**
1. Проверить что все устройства используют одинаковый `encryptionKey`
2. Перегенерировать ключ и обновить на всех устройствах
3. Очистить кэш синхронизации

---

## 📊 МОНИТОРИНГ

### Логи синхронизации

```typescript
// Включение подробного логирования

import { createLogger } from 'winston';

const logger = createLogger({
  level: 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/sync.log' }),
  ],
});

// Использование в EmailSyncService
logger.debug('Sending sync data', { type: payload.type, deviceId });
logger.debug('Received sync data', { count: payloads.length });
```

### Метрики

```typescript
// apps/web/src/components/SyncStatus.tsx

const SyncStatus = () => {
  const [stats, setStats] = useState({
    lastSync: null,
    sentCount: 0,
    receivedCount: 0,
    errors: 0,
  });

  return (
    <div>
      <p>Last Sync: {stats.lastSync?.toLocaleString()}</p>
      <p>Sent: {stats.sentCount}</p>
      <p>Received: {stats.receivedCount}</p>
      <p>Errors: {stats.errors}</p>
    </div>
  );
};
```

---

**Версия:** 1.0.0  
**Дата:** 2026-01-22
