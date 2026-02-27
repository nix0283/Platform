// ============================================
// UNIFIED EXCHANGE INTERFACE
// Унифицированный интерфейс для всех бирж
// ============================================

import {
  Candle,
  Symbol,
  Order,
  OrderSide,
  OrderType,
  Position,
  Balance,
  ExchangeId,
  ExchangeInfo,
  WSMessage,
} from '@trading-platform/core';

// --- Абстрактный класс биржи ---
export abstract class ExchangeAdapter {
  abstract readonly id: ExchangeId;
  abstract readonly info: ExchangeInfo;

  protected apiKey?: string;
  protected apiSecret?: string;
  protected ws?: WebSocket;
  protected connected: boolean = false;

  constructor(apiKey?: string, apiSecret?: string) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
  }

  // === REST API ===

  /** Получить список символов */
  abstract getSymbols(): Promise<Symbol[]>;

  /** Получить исторические свечи */
  abstract getCandles(
    symbol: string,
    interval: string,
    limit?: number,
    startTime?: number,
    endTime?: number
  ): Promise<Candle[]>;

  /** Выставить ордер */
  abstract placeOrder(params: {
    symbol: string;
    side: OrderSide;
    type: OrderType;
    quantity: number;
    price?: number;
    stopPrice?: number;
  }): Promise<Order>;

  /** Отменить ордер */
  abstract cancelOrder(symbol: string, orderId: string): Promise<Order>;

  /** Получить активные ордера */
  abstract getOpenOrders(symbol?: string): Promise<Order[]>;

  /** Получить позицию */
  abstract getPosition(symbol: string): Promise<Position | null>;

  /** Получить все позиции */
  abstract getPositions(): Promise<Position[]>;

  /** Получить баланс */
  abstract getBalances(): Promise<Balance[]>;

  // === WebSocket ===

  /** Подключиться к WebSocket */
  abstract connect(): Promise<void>;

  /** Отключиться от WebSocket */
  abstract disconnect(): Promise<void>;

  /** Подписаться на свечи */
  abstract subscribeCandles(
    symbol: string,
    interval: string,
    callback: (candle: Candle) => void
  ): Promise<void>;

  /** Подписаться на сделки */
  abstract subscribeTrades(
    symbol: string,
    callback: (trade: unknown) => void
  ): Promise<void>;

  /** Подписаться на стакан */
  abstract subscribeOrderbook(
    symbol: string,
    callback: (orderbook: unknown) => void
  ): Promise<void>;

  /** Подписаться на обновления ордеров */
  abstract subscribeOrders(
    callback: (order: Order) => void
  ): Promise<void>;

  // === Утилиты ===

  /** Нормализовать символ в формат биржи */
  abstract normalizeSymbol(symbol: string): string;

  /** Денормализовать символ из формата биржи */
  abstract denormalizeSymbol(symbol: string): string;

  /** Подписать запрос (HMAC SHA256) */
  protected signRequest(params: Record<string, unknown>, timestamp: number): string {
    const crypto = require('crypto');
    const queryString = Object.entries(params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('&');
    return crypto
      .createHmac('sha256', this.apiSecret!)
      .update(queryString)
      .digest('hex');
  }

  /** Проверить наличие API ключей */
  protected requireAuth(): void {
    if (!this.apiKey || !this.apiSecret) {
      throw new Error('API keys required for this operation');
    }
  }
}

// === Реестр бирж ===
export class ExchangeRegistry {
  private static adapters: Map<ExchangeId, typeof ExchangeAdapter> = new Map();

  static register(id: ExchangeId, adapter: typeof ExchangeAdapter): void {
    this.adapters.set(id, adapter);
  }

  static create(
    id: ExchangeId,
    apiKey?: string,
    apiSecret?: string
  ): ExchangeAdapter {
    const Adapter = this.adapters.get(id);
    if (!Adapter) {
      throw new Error(`Exchange ${id} not registered`);
    }
    return new Adapter(apiKey, apiSecret);
  }

  static getSupportedExchanges(): ExchangeId[] {
    return Array.from(this.adapters.keys());
  }
}

// === Декоратор для автоматической регистрации ===
export function registerExchange(id: ExchangeId) {
  return function <T extends typeof ExchangeAdapter>(constructor: T) {
    ExchangeRegistry.register(id, constructor);
    return constructor;
  };
}
