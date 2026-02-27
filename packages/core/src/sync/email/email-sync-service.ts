/**
 * Email Sync Service
 * Синхронизация между устройствами через email (mail.ru / yandex)
 * 
 * Архитектура:
 * - Один email аккаунт для всех устройств
 * - Разные ключи шифрования для отправки/получения
 * - AES-256 шифрование данных
 * - Base64 кодирование вложений
 * 
 * Провайдеры:
 * - mail.ru: smtp.mail.ru:465 (SSL), imap.mail.ru:993 (SSL)
 * - yandex.ru: smtp.yandex.ru:465 (SSL), imap.yandex.ru:993 (SSL)
 */

import * as crypto from 'crypto';

// ============================================
// TYPES
// ============================================

export enum EmailProvider {
  MAIL_RU = 'mail.ru',
  YANDEX = 'yandex.ru',
}

export interface EmailSyncConfig {
  provider: EmailProvider;
  email: string;
  // Ключи для отправки (SMTP)
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;  // App password, не основной пароль
  // Ключи для получения (IMAP)
  imapHost: string;
  imapPort: number;
  imapUser: string;
  imapPassword: string;  // Может быть другим app password
  // Шифрование
  encryptionKey: string;  // 32 байта для AES-256
  ivLength: number;       // 16 байт для AES
  // Синхронизация
  syncInterval: number;   // мс между проверками
  maxEmailAge: number;    // Макс возраст писем для обработки (часы)
  deviceId: string;       // Уникальный ID устройства
}

export interface SyncPayload {
  type: 'journal' | 'ml_model' | 'settings' | 'paper_trading' | 'full_sync';
  deviceId: string;
  timestamp: number;
  data: any;
  signature: string;  // HMAC для верификации
}

export interface EncryptedEmail {
  subject: string;
  encryptedData: string;  // Base64
  iv: string;             // Base64
  signature: string;      // HMAC
}

// ============================================
// EMAIL SYNC SERVICE
// ============================================

export class EmailSyncService {
  private config: EmailSyncConfig;
  private smtpClient: any = null;
  private imapClient: any = null;
  private eventListeners: Set<(payload: SyncPayload) => void> = new Set();
  private syncInterval?: NodeJS.Timeout;
  private isSyncing: boolean = false;

  constructor(config: EmailSyncConfig) {
    this.config = config;
    this.validateConfig();
  }

  // ============================================
  // CONFIGURATION
  // ============================================

  private validateConfig(): void {
    if (!this.config.encryptionKey || this.config.encryptionKey.length < 32) {
      throw new Error('Encryption key must be at least 32 bytes for AES-256');
    }
    if (!this.config.deviceId) {
      throw new Error('Device ID is required');
    }
  }

  static getDefaultConfig(provider: EmailProvider, email: string, deviceId: string): EmailSyncConfig {
    const isMailRu = provider === EmailProvider.MAIL_RU;
    
    return {
      provider,
      email,
      smtpHost: isMailRu ? 'smtp.mail.ru' : 'smtp.yandex.ru',
      smtpPort: 465,
      smtpUser: email,
      smtpPassword: '',  // Заполнить app password
      imapHost: isMailRu ? 'imap.mail.ru' : 'imap.yandex.ru',
      imapPort: 993,
      imapUser: email,
      imapPassword: '',  // Может быть другим app password
      encryptionKey: crypto.randomBytes(32).toString('hex'),
      ivLength: 16,
      syncInterval: 60000,  // 1 минута
      maxEmailAge: 24,      // 24 часа
      deviceId,
    };
  }

  // ============================================
  // ENCRYPTION
  // ============================================

  private encrypt(data: any): EncryptedEmail {
    const iv = crypto.randomBytes(this.config.ivLength);
    const key = Buffer.from(this.config.encryptionKey, 'hex');
    
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'base64');
    encrypted += cipher.final('base64');

    // HMAC подпись
    const hmac = crypto.createHmac('sha256', key);
    hmac.update(encrypted);
    const signature = hmac.digest('base64');

    return {
      subject: `SYNC_${this.config.deviceId}_${Date.now()}`,
      encryptedData: encrypted,
      iv: iv.toString('base64'),
      signature,
    };
  }

  private decrypt(email: EncryptedEmail): any {
    const key = Buffer.from(this.config.encryptionKey, 'hex');
    const iv = Buffer.from(email.iv, 'base64');

    // Верификация HMAC
    const hmac = crypto.createHmac('sha256', key);
    hmac.update(email.encryptedData);
    const expectedSignature = hmac.digest('base64');
    
    if (email.signature !== expectedSignature) {
      throw new Error('Invalid email signature - possible tampering');
    }

    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(email.encryptedData, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  }

  // ============================================
  // SEND (SMTP)
  // ============================================

  async sendSyncData(payload: SyncPayload): Promise<void> {
    // Шифрование данных
    const encrypted = this.encrypt(payload);

    // SMTP отправка (используем nodemailer)
    const nodemailer = await import('nodemailer');
    
    const transporter = nodemailer.createTransport({
      host: this.config.smtpHost,
      port: this.config.smtpPort,
      secure: true,
      auth: {
        user: this.config.smtpUser,
        pass: this.config.smtpPassword,
      },
    });

    await transporter.sendMail({
      from: this.config.email,
      to: this.config.email,  // Отправляем сами себе
      subject: encrypted.subject,
      text: `Device: ${this.config.deviceId}\nTimestamp: ${payload.timestamp}\nType: ${payload.type}`,
      attachments: [
        {
          filename: 'sync_data.enc',
          content: encrypted.encryptedData,
          encoding: 'base64',
        },
        {
          filename: 'sync_iv.txt',
          content: encrypted.iv,
        },
        {
          filename: 'sync_signature.txt',
          content: encrypted.signature,
        },
      ],
    });

    console.log(`📧 Sent sync data: ${payload.type} from ${this.config.deviceId}`);
  }

  // ============================================
  // RECEIVE (IMAP)
  // ============================================

  async receiveSyncData(): Promise<SyncPayload[]> {
    const payloads: SyncPayload[] = [];

    // IMAP получение (используем imapflow)
    const { ImapFlow } = await import('imapflow');

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

      // Поиск писем с синхронизацией
      const maxAge = new Date(Date.now() - this.config.maxEmailAge * 60 * 60 * 1000);
      
      for await (const message of client.fetch(
        { seen: false },
        { envelope: true, source: true }
      )) {
        // Проверка темы
        if (!message.envelope.subject?.startsWith('SYNC_')) {
          continue;
        }

        // Проверка возраста
        if (message.envelope.date && message.envelope.date < maxAge) {
          continue;
        }

        // Парсинг вложений
        const attachments = this.parseAttachments(message.source);
        if (!attachments.encryptedData || !attachments.iv || !attachments.signature) {
          continue;
        }

        try {
          const payload = this.decrypt({
            subject: message.envelope.subject,
            encryptedData: attachments.encryptedData,
            iv: attachments.iv,
            signature: attachments.signature,
          });

          // Игнорировать свои же письма
          if (payload.deviceId === this.config.deviceId) {
            continue;
          }

          payloads.push(payload);
          this.emit(payload);

          // Пометить как прочитанное
          await client.messageFlagsAdd(message.uid, ['\\Seen']);
        } catch (error) {
          console.error('Failed to decrypt email:', error);
        }
      }
    } finally {
      await client.logout();
    }

    return payloads;
  }

  private parseAttachments(source: any): {
    encryptedData?: string;
    iv?: string;
    signature?: string;
  } {
    // Парсинг MIME сообщений для извлечения вложений
    // Упрощенная реализация - в production использовать mailparser
    const result: any = {};
    
    // Здесь должен быть полноценный MIME парсер
    // Для краткости - заглушка
    
    return result;
  }

  // ============================================
  // SYNC OPERATIONS
  // ============================================

  async sync(payload: SyncPayload): Promise<void> {
    await this.sendSyncData(payload);
  }

  async syncJournal(data: any): Promise<void> {
    await this.sync({
      type: 'journal',
      deviceId: this.config.deviceId,
      timestamp: Date.now(),
      data,
      signature: this.createHMAC(data),
    });
  }

  async syncMLModel(data: any): Promise<void> {
    await this.sync({
      type: 'ml_model',
      deviceId: this.config.deviceId,
      timestamp: Date.now(),
      data,
      signature: this.createHMAC(data),
    });
  }

  async syncSettings(data: any): Promise<void> {
    await this.sync({
      type: 'settings',
      deviceId: this.config.deviceId,
      timestamp: Date.now(),
      data,
      signature: this.createHMAC(data),
    });
  }

  async syncPaperTrading(data: any): Promise<void> {
    await this.sync({
      type: 'paper_trading',
      deviceId: this.config.deviceId,
      timestamp: Date.now(),
      data,
      signature: this.createHMAC(data),
    });
  }

  private createHMAC(data: any): string {
    const hmac = crypto.createHmac('sha256', this.config.encryptionKey);
    hmac.update(JSON.stringify(data));
    return hmac.digest('hex');
  }

  // ============================================
  // AUTO-SYNC
  // ============================================

  startAutoSync(): void {
    console.log(`🔄 Starting email auto-sync every ${this.config.syncInterval / 1000}s`);
    
    // Начальная синхронизация
    this.receiveSyncData();

    this.syncInterval = setInterval(async () => {
      if (this.isSyncing) return;
      this.isSyncing = true;

      try {
        await this.receiveSyncData();
      } catch (error) {
        console.error('Auto-sync error:', error);
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
    console.log('⏹️ Email auto-sync stopped');
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
  // SECURITY
  // ============================================

  rotateEncryptionKey(newKey: string): void {
    if (newKey.length < 32) {
      throw new Error('New encryption key must be at least 32 bytes');
    }
    this.config.encryptionKey = newKey;
    console.log('🔑 Encryption key rotated');
  }

  validateEmailSignature(email: EncryptedEmail): boolean {
    try {
      this.decrypt(email);
      return true;
    } catch {
      return false;
    }
  }
}

// ============================================
// FACTORY
// ============================================

export function createEmailSyncService(
  provider: EmailProvider,
  email: string,
  deviceId: string,
  overrides?: Partial<EmailSyncConfig>
): EmailSyncService {
  const config = EmailSyncService.getDefaultConfig(provider, email, deviceId);
  const finalConfig = { ...config, ...overrides };
  
  return new EmailSyncService(finalConfig);
}

export default EmailSyncService;
