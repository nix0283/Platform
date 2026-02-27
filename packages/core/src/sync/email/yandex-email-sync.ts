/**
 * Email Sync Service — Yandex Specific Implementation
 * 
 * Особенности Yandex:
 * - Специфичный шаблон писем для распознавания
 * - HMAC подпись в теме письма
 * - Base64 кодирование вложений
 * - Фильтрация по префиксу темы
 * 
 * Шаблон письма:
 * Subject: TPSYNC:v2:{deviceId}:{timestamp}:{hmac}
 * Attachment: sync_data.enc (AES-256 encrypted)
 * 
 * Только письма с префиксом "TPSYNC:v2:" обрабатываются
 * Все остальные игнорируются
 */

import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';
import { ImapFlow } from 'imapflow';

// ============================================
// CONSTANTS & TYPES
// ============================================

export const EMAIL_TEMPLATE = {
  SUBJECT_PREFIX: 'TPSYNC:v2:',
  VERSION: '2.0',
  ENCRYPTION_ALGORITHM: 'aes-256-cbc',
  HMAC_ALGORITHM: 'sha256',
  IV_LENGTH: 16,
  MAX_EMAIL_AGE_HOURS: 24,
};

export enum EmailProvider {
  YANDEX = 'yandex.ru',
  MAIL_RU = 'mail.ru',
}

export interface EmailSyncConfig {
  provider: EmailProvider;
  email: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  imapHost: string;
  imapPort: number;
  imapUser: string;
  imapPassword: string;
  encryptionKey: string;  // 64 hex chars (32 bytes)
  deviceId: string;
  syncInterval: number;
  maxEmailAgeHours: number;
}

export interface SyncPayload {
  version: string;
  type: 'journal' | 'ml_model' | 'settings' | 'paper_trading' | 'full_sync';
  deviceId: string;
  timestamp: number;
  data: any;
  checksum: string;  // SHA256 of data
}

export interface EncryptedEmail {
  subject: string;
  encryptedData: string;
  iv: string;
  hmac: string;
}

// ============================================
// YANDEX CONFIG
// ============================================

export const YANDEX_CONFIG = {
  smtp: {
    host: 'smtp.yandex.ru',
    port: 465,
    secure: true,
  },
  imap: {
    host: 'imap.yandex.ru',
    port: 993,
    secure: true,
  },
};

// ============================================
// EMAIL SYNC SERVICE
// ============================================

export class YandexEmailSyncService {
  private config: EmailSyncConfig;
  private transporter: nodemailer.Transporter | null = null;
  private eventListeners: Set<(payload: SyncPayload) => void> = new Set();
  private syncInterval?: NodeJS.Timeout;
  private isSyncing: boolean = false;
  private processedEmailIds: Set<string> = new Set();

  constructor(config: EmailSyncConfig) {
    this.config = config;
    this.validateConfig();
    this.initializeTransporter();
  }

  // ============================================
  // VALIDATION
  // ============================================

  private validateConfig(): void {
    // Проверка ключа шифрования (64 hex chars = 32 bytes)
    if (!this.config.encryptionKey || this.config.encryptionKey.length !== 64) {
      throw new Error('Encryption key must be exactly 64 hex characters (32 bytes)');
    }

    // Проверка deviceId
    if (!this.config.deviceId || this.config.deviceId.length < 3) {
      throw new Error('Device ID must be at least 3 characters');
    }

    // Проверка Yandex email
    if (!this.config.email.endsWith('@yandex.ru') && 
        !this.config.email.endsWith('@ya.ru')) {
      throw new Error('Email must be a Yandex email (@yandex.ru or @ya.ru)');
    }

    console.log(`✅ Yandex Email Sync validated for ${this.config.email}`);
  }

  private initializeTransporter(): void {
    this.transporter = nodemailer.createTransport({
      host: this.config.smtpHost,
      port: this.config.smtpPort,
      secure: true,
      auth: {
        user: this.config.smtpUser,
        pass: this.config.smtpPassword,
      },
      logger: true,
      debug: false,
    });

    this.transporter.verify((error, success) => {
      if (error) {
        console.error('❌ SMTP verification failed:', error);
      } else {
        console.log('✅ SMTP connection verified');
      }
    });
  }

  // ============================================
  // SUBJECT TEMPLATE (Yandex Specific)
  // ============================================

  /**
   * Генерация темы письма по шаблону Yandex
   * Формат: TPSYNC:v2:{deviceId}:{timestamp}:{hmac}
   * 
   * Только письма с этим префиксом будут обрабатываться
   */
  private createSubject(payload: SyncPayload): string {
    const hmacInput = `${payload.version}:${payload.deviceId}:${payload.timestamp}:${payload.type}`;
    const hmac = crypto
      .createHmac('sha256', this.config.encryptionKey)
      .update(hmacInput)
      .digest('hex')
      .substring(0, 16);  // Первые 16 символов для компактности

    return `${EMAIL_TEMPLATE.SUBJECT_PREFIX}${payload.deviceId}:${payload.timestamp}:${hmac}`;
  }

  /**
   * Парсинг темы письма
   * Возвращает null если тема не соответствует шаблону
   */
  private parseSubject(subject: string): {
    deviceId: string;
    timestamp: number;
    hmac: string;
  } | null {
    // Проверка префикса
    if (!subject.startsWith(EMAIL_TEMPLATE.SUBJECT_PREFIX)) {
      return null;
    }

    // Парсинг: TPSYNC:v2:{deviceId}:{timestamp}:{hmac}
    const parts = subject.substring(EMAIL_TEMPLATE.SUBJECT_PREFIX.length).split(':');
    
    if (parts.length !== 3) {
      return null;
    }

    const [deviceId, timestampStr, hmac] = parts;
    const timestamp = parseInt(timestampStr, 10);

    if (isNaN(timestamp)) {
      return null;
    }

    // Верификация HMAC
    const expectedHmacInput = `2.0:${deviceId}:${timestamp}:sync`;
    const expectedHmac = crypto
      .createHmac('sha256', this.config.encryptionKey)
      .update(expectedHmacInput)
      .digest('hex')
      .substring(0, 16);

    if (hmac !== expectedHmac && hmac !== expectedHmac.substring(0, hmac.length)) {
      // HMAC не совпадает - письмо не от нашей системы
      return null;
    }

    return { deviceId, timestamp, hmac };
  }

  // ============================================
  // ENCRYPTION
  // ============================================

  private encrypt(payload: SyncPayload): EncryptedEmail {
    const iv = crypto.randomBytes(EMAIL_TEMPLATE.IV_LENGTH);
    const key = Buffer.from(this.config.encryptionKey, 'hex');
    
    // Вычисление checksum данных
    const checksum = crypto
      .createHash('sha256')
      .update(JSON.stringify(payload.data))
      .digest('hex');

    // Данные для шифрования
    const dataToEncrypt = JSON.stringify({
      ...payload,
      checksum,
    });

    // Шифрование AES-256-CBC
    const cipher = crypto.createCipheriv(
      EMAIL_TEMPLATE.ENCRYPTION_ALGORITHM,
      key,
      iv
    );
    
    let encrypted = cipher.update(dataToEncrypt, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    // HMAC для верификации целостности
    const hmac = crypto
      .createHmac('sha256', key)
      .update(encrypted)
      .digest('base64');

    return {
      subject: this.createSubject(payload),
      encryptedData: encrypted,
      iv: iv.toString('base64'),
      hmac,
    };
  }

  private decrypt(email: EncryptedEmail): SyncPayload {
    const key = Buffer.from(this.config.encryptionKey, 'hex');
    const iv = Buffer.from(email.iv, 'base64');

    // Верификация HMAC
    const expectedHmac = crypto
      .createHmac('sha256', key)
      .update(email.encryptedData)
      .digest('base64');

    if (email.hmac !== expectedHmac) {
      throw new Error('Invalid HMAC - email may be tampered');
    }

    // Дешифрование
    const decipher = crypto.createDecipheriv(
      EMAIL_TEMPLATE.ENCRYPTION_ALGORITHM,
      key,
      iv
    );
    
    let decrypted = decipher.update(email.encryptedData, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    const payload: SyncPayload = JSON.parse(decrypted);

    // Верификация checksum
    const checksum = crypto
      .createHash('sha256')
      .update(JSON.stringify(payload.data))
      .digest('hex');

    if (payload.checksum !== checksum) {
      throw new Error('Invalid checksum - data corrupted');
    }

    return payload;
  }

  // ============================================
  // SEND (SMTP)
  // ============================================

  async sendSyncData(payload: SyncPayload): Promise<boolean> {
    try {
      const encrypted = this.encrypt(payload);

      if (!this.transporter) {
        throw new Error('Transporter not initialized');
      }

      const info = await this.transporter.sendMail({
        from: this.config.email,
        to: this.config.email,  // Отправляем сами себе
        subject: encrypted.subject,
        text: `Trading Platform Sync\nDevice: ${this.config.deviceId}\nType: ${payload.type}\nTime: ${new Date(payload.timestamp).toISOString()}`,
        html: `
          <div style="font-family: monospace; background: #f5f5f5; padding: 10px;">
            <h3>Trading Platform Sync</h3>
            <p><strong>Device:</strong> ${this.config.deviceId}</p>
            <p><strong>Type:</strong> ${payload.type}</p>
            <p><strong>Time:</strong> ${new Date(payload.timestamp).toISOString()}</p>
            <p><strong>Version:</strong> ${payload.version}</p>
          </div>
        `,
        attachments: [
          {
            filename: 'sync_data.enc',
            content: encrypted.encryptedData,
            encoding: 'base64',
            contentType: 'application/octet-stream',
          },
          {
            filename: 'sync_iv.txt',
            content: encrypted.iv,
            contentType: 'text/plain',
          },
          {
            filename: 'sync_hmac.txt',
            content: encrypted.hmac,
            contentType: 'text/plain',
          },
        ],
      });

      console.log(`📧 Sent: ${payload.type} from ${this.config.deviceId} (${info.messageId})`);
      return true;
    } catch (error: any) {
      console.error('❌ Send failed:', error.message);
      return false;
    }
  }

  // ============================================
  // RECEIVE (IMAP)
  // ============================================

  async receiveSyncData(): Promise<SyncPayload[]> {
    const payloads: SyncPayload[] = [];

    const client = new ImapFlow({
      host: this.config.imapHost,
      port: this.config.imapPort,
      secure: true,
      auth: {
        user: this.config.imapUser,
        pass: this.config.imapPassword,
      },
    });

    try {
      await client.connect();
      await client.mailboxOpen('INBOX');

      const maxAge = new Date(Date.now() - this.config.maxEmailAgeHours * 60 * 60 * 1000);
      let emailCount = 0;
      let processedCount = 0;
      let ignoredCount = 0;

      for await (const message of client.fetch(
        { seen: false },
        { envelope: true, source: true, bodyStructure: true }
      )) {
        emailCount++;

        // Проверка темы на соответствие шаблону
        const parsed = message.envelope.subject 
          ? this.parseSubject(message.envelope.subject)
          : null;

        if (!parsed) {
          ignoredCount++;
          continue;  // Игнорируем письмо не нашего формата
        }

        // Проверка возраста
        if (message.envelope.date && message.envelope.date < maxAge) {
          ignoredCount++;
          continue;
        }

        // Проверка на уже обработанные
        if (this.processedEmailIds.has(message.envelope.messageId || '')) {
          continue;
        }

        // Игнорировать свои же письма
        if (parsed.deviceId === this.config.deviceId) {
          this.processedEmailIds.add(message.envelope.messageId || '');
          await client.messageFlagsAdd(message.uid, ['\\Seen']);
          continue;
        }

        // Парсинг вложений
        const attachments = await this.parseAttachments(message);
        if (!attachments.encryptedData || !attachments.iv || !attachments.hmac) {
          console.warn('⚠️ Invalid attachments, skipping');
          continue;
        }

        try {
          const payload = this.decrypt({
            subject: message.envelope.subject!,
            encryptedData: attachments.encryptedData,
            iv: attachments.iv,
            hmac: attachments.hmac,
          });

          payloads.push(payload);
          this.emit(payload);
          processedCount++;

          // Пометить как прочитанное
          await client.messageFlagsAdd(message.uid, ['\\Seen']);
          this.processedEmailIds.add(message.envelope.messageId || '');

          console.log(`📥 Received: ${payload.type} from ${payload.deviceId}`);
        } catch (error: any) {
          console.error('❌ Decrypt failed:', error.message);
        }
      }

      console.log(`📊 Scan complete: ${emailCount} total, ${processedCount} processed, ${ignoredCount} ignored`);

      // Очистка старых ID (оптимизация памяти)
      if (this.processedEmailIds.size > 1000) {
        this.processedEmailIds = new Set(Array.from(this.processedEmailIds).slice(-500));
      }

    } catch (error: any) {
      console.error('❌ IMAP error:', error.message);
    } finally {
      await client.logout().catch(() => {});
    }

    return payloads;
  }

  private async parseAttachments(message: any): Promise<{
    encryptedData?: string;
    iv?: string;
    hmac?: string;
  }> {
    const result: any = {};

    // Упрощённый парсер - в production использовать mailparser
    if (message.source) {
      const source = message.source.toString('utf8');
      
      // Поиск вложений по filename
      const encryptedMatch = source.match(/filename="sync_data\.enc"[\s\S]*?Content-Transfer-Encoding: base64[\r\n]+([\s\S]*?)(?=\r\n\r\n|\r\n--)/);
      const ivMatch = source.match(/filename="sync_iv\.txt"[\s\S]*?([\s\S]*?)(?=\r\n\r\n|\r\n--)/);
      const hmacMatch = source.match(/filename="sync_hmac\.txt"[\s\S]*?([\s\S]*?)(?=\r\n\r\n|\r\n--)/);

      if (encryptedMatch) {
        result.encryptedData = encryptedMatch[1].replace(/[\r\n\s]/g, '');
      }
      if (ivMatch) {
        result.iv = ivMatch[1].replace(/[\r\n\s]/g, '');
      }
      if (hmacMatch) {
        result.hmac = hmacMatch[1].replace(/[\r\n\s]/g, '');
      }
    }

    return result;
  }

  // ============================================
  // SYNC OPERATIONS
  // ============================================

  async sync(payload: Omit<SyncPayload, 'version'>): Promise<boolean> {
    const fullPayload: SyncPayload = {
      ...payload,
      version: EMAIL_TEMPLATE.VERSION,
    };
    return await this.sendSyncData(fullPayload);
  }

  async syncJournal(data: any): Promise<boolean> {
    return this.sync({
      type: 'journal',
      deviceId: this.config.deviceId,
      timestamp: Date.now(),
      data,
    });
  }

  async syncMLModel(data: any): Promise<boolean> {
    return this.sync({
      type: 'ml_model',
      deviceId: this.config.deviceId,
      timestamp: Date.now(),
      data,
    });
  }

  async syncSettings(data: any): Promise<boolean> {
    return this.sync({
      type: 'settings',
      deviceId: this.config.deviceId,
      timestamp: Date.now(),
      data,
    });
  }

  async syncPaperTrading(data: any): Promise<boolean> {
    return this.sync({
      type: 'paper_trading',
      deviceId: this.config.deviceId,
      timestamp: Date.now(),
      data,
    });
  }

  // ============================================
  // AUTO-SYNC
  // ============================================

  startAutoSync(): void {
    console.log(`🔄 Starting Yandex auto-sync every ${this.config.syncInterval / 1000}s`);
    
    // Начальная синхронизация
    this.receiveSyncData();

    this.syncInterval = setInterval(async () => {
      if (this.isSyncing) return;
      this.isSyncing = true;

      try {
        await this.receiveSyncData();
      } catch (error: any) {
        console.error('Auto-sync error:', error.message);
      } finally {
        this.isSyncing = false;
      }
    }, this.config.syncInterval);
  }

  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = undefined;
    }
    console.log('⏹️ Yandex auto-sync stopped');
  }

  // ============================================
  // EVENTS
  // ============================================

  onSync(listener: (payload: SyncPayload) => void): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  private emit(payload: SyncPayload): void {
    this.eventListeners.forEach(listener => listener(payload));
  }

  // ============================================
  // UTILS
  // ============================================

  getStats(): {
    processedEmails: number;
    isSyncing: boolean;
    lastSyncTime: number;
  } {
    return {
      processedEmails: this.processedEmailIds.size,
      isSyncing: this.isSyncing,
      lastSyncTime: 0,  // Можно добавить tracking
    };
  }

  clearProcessedCache(): void {
    this.processedEmailIds.clear();
    console.log('🗑️ Processed email cache cleared');
  }
}

// ============================================
// FACTORY
// ============================================

export function createYandexEmailSyncService(
  email: string,
  deviceId: string,
  smtpPassword: string,
  imapPassword: string,
  encryptionKey: string,
  overrides?: Partial<EmailSyncConfig>
): YandexEmailSyncService {
  const config: EmailSyncConfig = {
    provider: EmailProvider.YANDEX,
    email,
    smtpHost: YANDEX_CONFIG.smtp.host,
    smtpPort: YANDEX_CONFIG.smtp.port,
    smtpUser: email,
    smtpPassword,
    imapHost: YANDEX_CONFIG.imap.host,
    imapPort: YANDEX_CONFIG.imap.port,
    imapUser: email,
    imapPassword,
    encryptionKey,
    deviceId,
    syncInterval: 60000,  // 1 минута
    maxEmailAgeHours: 24,
    ...overrides,
  };

  return new YandexEmailSyncService(config);
}

export default YandexEmailSyncService;
