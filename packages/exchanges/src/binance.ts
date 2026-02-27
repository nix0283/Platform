// ============================================
// BINANCE EXCHANGE ADAPTER
// Реализация коннектора к Binance
// ============================================

import {
  Candle,
  Symbol,
  Order,
  OrderSide,
  OrderType,
  OrderStatus,
  Position,
  Balance,
  ExchangeId,
  ExchangeInfo,
  ExchangeFeatures,
} from '@trading-platform/core';
import { ExchangeAdapter, registerExchange } from './base';

@registerExchange('binance')
export class BinanceAdapter extends ExchangeAdapter {
  readonly id: ExchangeId = 'binance';
  
  readonly info: ExchangeInfo = {
    id: 'binance',
    name: 'Binance',
    wsUrl: 'wss://stream.binance.com:9443/ws',
    restUrl: 'https://api.binance.com',
    features: {
      spot: true,
      futures: true,
      options: true,
      wsTrades: true,
      wsCandles: true,
      wsOrderbook: true,
      placeOrder: true,
      cancelOrder: true,
    } as ExchangeFeatures,
  };

  private wsSubscriptions: Map<string, () => void> = new Map();

  // === REST API ===

  async getSymbols(): Promise<Symbol[]> {
    const response = await fetch(`${this.info.restUrl}/api/v3/exchangeInfo`);
    const data = await response.json();

    return data.symbols
      .filter((s: any) => s.status === 'TRADING')
      .map((s: any): Symbol => ({
        symbol: s.symbol,
        baseAsset: s.baseAsset,
        quoteAsset: s.quoteAsset,
        exchange: 'binance',
        status: 'TRADING',
        minQty: parseFloat(s.filters.find((f: any) => f.filterType === 'LOT_SIZE')?.minQty || '0'),
        maxQty: parseFloat(s.filters.find((f: any) => f.filterType === 'LOT_SIZE')?.maxQty || '0'),
        stepSize: parseFloat(s.filters.find((f: any) => f.filterType === 'LOT_SIZE')?.stepSize || '0'),
        minNotional: parseFloat(s.filters.find((f: any) => f.filterType === 'MIN_NOTIONAL')?.minNotional || '0'),
        tickSize: parseFloat(s.filters.find((f: any) => f.filterType === 'PRICE_FILTER')?.tickSize || '0'),
      }));
  }

  async getCandles(
    symbol: string,
    interval: string,
    limit: number = 1000,
    startTime?: number,
    endTime?: number
  ): Promise<Candle[]> {
    const params = new URLSearchParams({
      symbol: this.normalizeSymbol(symbol),
      interval,
      limit: limit.toString(),
    });

    if (startTime) params.append('startTime', startTime.toString());
    if (endTime) params.append('endTime', endTime.toString());

    const response = await fetch(
      `${this.info.restUrl}/api/v3/klines?${params}`
    );
    const data = await response.json();

    return data.map((k: any[]): Candle => ({
      timestamp: k[0],
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
      symbol: this.denormalizeSymbol(k[0].s || symbol),
      interval,
    }));
  }

  async placeOrder(params: {
    symbol: string;
    side: OrderSide;
    type: OrderType;
    quantity: number;
    price?: number;
    stopPrice?: number;
  }): Promise<Order> {
    this.requireAuth();

    const timestamp = Date.now();
    const orderParams: Record<string, any> = {
      symbol: this.normalizeSymbol(params.symbol),
      side: params.side,
      type: this.mapOrderType(params.type),
      quantity: params.quantity.toFixed(8),
      timestamp,
    };

    if (params.price) orderParams.price = params.price.toFixed(8);
    if (params.stopPrice) {
      orderParams.stopPrice = params.stopPrice.toFixed(8);
      orderParams.type = 'STOP_LOSS_MARKET';
    }

    const signature = this.signRequest(orderParams, timestamp);
    orderParams.signature = signature;

    const response = await fetch(
      `${this.info.restUrl}/api/v3/order`,
      {
        method: 'POST',
        headers: {
          'X-MBX-APIKEY': this.apiKey!,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(orderParams).toString(),
      }
    );

    const data = await response.json();

    return this.normalizeOrder(data);
  }

  async cancelOrder(symbol: string, orderId: string): Promise<Order> {
    this.requireAuth();

    const timestamp = Date.now();
    const params = {
      symbol: this.normalizeSymbol(symbol),
      orderId,
      timestamp,
    };

    const signature = this.signRequest(params, timestamp);

    const response = await fetch(
      `${this.info.restUrl}/api/v3/order?symbol=${params.symbol}&orderId=${orderId}&timestamp=${timestamp}&signature=${signature}`,
      {
        method: 'DELETE',
        headers: {
          'X-MBX-APIKEY': this.apiKey!,
        },
      }
    );

    const data = await response.json();
    return this.normalizeOrder(data);
  }

  async getOpenOrders(symbol?: string): Promise<Order[]> {
    this.requireAuth();

    const timestamp = Date.now();
    const params: Record<string, any> = { timestamp };
    if (symbol) params.symbol = this.normalizeSymbol(symbol);

    const signature = this.signRequest(params, timestamp);
    params.signature = signature;

    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(
      `${this.info.restUrl}/api/v3/openOrders?${queryString}`,
      {
        headers: {
          'X-MBX-APIKEY': this.apiKey!,
        },
      }
    );

    const data = await response.json();
    return data.map((o: any) => this.normalizeOrder(o));
  }

  async getPosition(symbol: string): Promise<Position | null> {
    // Для спота позиции не существуют, только для фьючерсов
    // Здесь упрощённая реализация
    return null;
  }

  async getPositions(): Promise<Position[]> {
    return [];
  }

  async getBalances(): Promise<Balance[]> {
    this.requireAuth();

    const timestamp = Date.now();
    const params = { timestamp };
    const signature = this.signRequest(params, timestamp);

    const response = await fetch(
      `${this.info.restUrl}/api/v3/account?timestamp=${timestamp}&signature=${signature}`,
      {
        headers: {
          'X-MBX-APIKEY': this.apiKey!,
        },
      }
    );

    const data = await response.json();
    return data.balances
      .filter((b: any) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
      .map((b: any): Balance => ({
        asset: b.asset,
        free: parseFloat(b.free),
        locked: parseFloat(b.locked),
        total: parseFloat(b.free) + parseFloat(b.locked),
        usdValue: 0, // Нужно рассчитывать отдельно
      }));
  }

  // === WebSocket ===

  async connect(): Promise<void> {
    if (this.connected) return;

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.info.wsUrl);

      this.ws.onopen = () => {
        this.connected = true;
        resolve();
      };

      this.ws.onerror = (error) => {
        reject(error);
      };

      this.ws.onclose = () => {
        this.connected = false;
      };
    });
  }

  async disconnect(): Promise<void> {
    if (!this.ws) return;

    this.wsSubscriptions.forEach((cleanup) => cleanup());
    this.wsSubscriptions.clear();
    this.ws.close();
    this.connected = false;
  }

  async subscribeCandles(
    symbol: string,
    interval: string,
    callback: (candle: Candle) => void
  ): Promise<void> {
    const streamName = `${this.normalizeSymbol(symbol).toLowerCase()}@kline_${interval}`;
    await this.subscribeStream(streamName, (data: any) => {
      const k = data.k;
      callback({
        timestamp: k.t,
        open: parseFloat(k.o),
        high: parseFloat(k.h),
        low: parseFloat(k.l),
        close: parseFloat(k.c),
        volume: parseFloat(k.v),
        symbol: this.denormalizeSymbol(data.s),
        interval,
      });
    });
  }

  async subscribeTrades(
    symbol: string,
    callback: (trade: unknown) => void
  ): Promise<void> {
    const streamName = `${this.normalizeSymbol(symbol).toLowerCase()}@trade`;
    await this.subscribeStream(streamName, callback);
  }

  async subscribeOrderbook(
    symbol: string,
    callback: (orderbook: unknown) => void
  ): Promise<void> {
    const streamName = `${this.normalizeSymbol(symbol).toLowerCase()}@depth20@100ms`;
    await this.subscribeStream(streamName, callback);
  }

  async subscribeOrders(callback: (order: Order) => void): Promise<void> {
    this.requireAuth();
    // Binance требует отдельный WebSocket для user data
    // Упрощённая реализация
    console.warn('Order subscription requires additional setup');
  }

  // === Утилиты ===

  normalizeSymbol(symbol: string): string {
    // BTC/USDT -> BTCUSDT
    return symbol.replace('/', '').replace('-', '');
  }

  denormalizeSymbol(symbol: string): string {
    // BTCUSDT -> BTC/USDT
    const match = symbol.match(/^([A-Z]+)([A-Z]+)$/);
    if (match) {
      return `${match[1]}/${match[2]}`;
    }
    return symbol;
  }

  // === Приватные методы ===

  private mapOrderType(type: OrderType): string {
    const mapping: Record<OrderType, string> = {
      MARKET: 'MARKET',
      LIMIT: 'LIMIT',
      STOP_MARKET: 'STOP_MARKET',
      STOP_LIMIT: 'STOP_LOSS_LIMIT',
    };
    return mapping[type];
  }

  private normalizeOrder(data: any): Order {
    return {
      id: data.orderId.toString(),
      symbol: this.denormalizeSymbol(data.symbol),
      exchange: 'binance',
      side: data.side as OrderSide,
      type: this.denormalizeOrderType(data.type),
      quantity: parseFloat(data.origQty),
      price: data.price ? parseFloat(data.price) : undefined,
      stopPrice: data.stopPrice ? parseFloat(data.stopPrice) : undefined,
      status: this.normalizeStatus(data.status),
      filledQty: parseFloat(data.executedQty),
      avgPrice: parseFloat(data.avgPrice || 0),
      createdAt: data.time,
      updatedAt: data.updateTime,
      clientOrderId: data.clientOrderId,
    };
  }

  private denormalizeOrderType(type: string): OrderType {
    const mapping: Record<string, OrderType> = {
      MARKET: 'MARKET',
      LIMIT: 'LIMIT',
      STOP_MARKET: 'STOP_MARKET',
      STOP_LOSS_MARKET: 'STOP_MARKET',
      STOP_LOSS_LIMIT: 'STOP_LIMIT',
      TAKE_PROFIT_LIMIT: 'STOP_LIMIT',
    };
    return mapping[type] || 'MARKET';
  }

  private normalizeStatus(status: string): OrderStatus {
    const mapping: Record<string, OrderStatus> = {
      NEW: 'NEW',
      PARTIALLY_FILLED: 'PARTIALLY_FILLED',
      FILLED: 'FILLED',
      CANCELED: 'CANCELED',
      REJECTED: 'REJECTED',
      EXPIRED: 'CANCELED',
    };
    return mapping[status] || 'NEW';
  }

  private async subscribeStream(
    streamName: string,
    callback: (data: any) => void
  ): Promise<void> {
    if (!this.connected) {
      await this.connect();
    }

    const subscribeMsg = {
      method: 'SUBSCRIBE',
      params: [streamName],
      id: Date.now(),
    };

    this.ws?.send(JSON.stringify(subscribeMsg));

    const messageHandler = (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      // Проверка что это данные стрима, а не ответ на подписку
      if (data.e) {
        callback(data);
      }
    };

    this.ws?.addEventListener('message', messageHandler);

    // Сохраняем cleanup функцию
    this.wsSubscriptions.set(streamName, () => {
      this.ws?.removeEventListener('message', messageHandler);
    });
  }
}
