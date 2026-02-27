// ============================================
// BYBIT EXCHANGE CONNECTOR
// Специфика: v5 API, WebSocket единый для всех продуктов
// ============================================

import { ExchangeAdapter, registerExchange } from './base';
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
import crypto from 'crypto';

@registerExchange('bybit')
export class BybitAdapter extends ExchangeAdapter {
  readonly id: ExchangeId = 'bybit';

  readonly info: ExchangeInfo = {
    id: 'bybit',
    name: 'Bybit',
    wsUrl: 'wss://stream.bybit.com/v5/public/linear',
    restUrl: 'https://api.bybit.com',
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

  private wsPrivate?: WebSocket;
  private recvWindow: number = 5000;

  // === REST API ===

  async getSymbols(): Promise<Symbol[]> {
    const response = await fetch(`${this.info.restUrl}/v5/market/instruments-info?category=linear`);
    const data = await response.json();

    return data.result.list.map((s: any): Symbol => ({
      symbol: s.symbol,
      baseAsset: s.baseCoin,
      quoteAsset: s.quoteCoin,
      exchange: 'bybit',
      status: s.status === 'Trading' ? 'TRADING' : 'DELISTED',
      minQty: parseFloat(s.lotSizeFilter?.minOrderQty || '0'),
      maxQty: parseFloat(s.lotSizeFilter?.maxOrderQty || '0'),
      stepSize: parseFloat(s.lotSizeFilter?.qtyStep || '0'),
      minNotional: parseFloat(s.lotSizeFilter?.minOrderAmt || '0'),
      tickSize: parseFloat(s.priceFilter?.tickSize || '0'),
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
      category: 'linear',
      symbol: this.normalizeSymbol(symbol),
      interval: this.mapInterval(interval),
      limit: limit.toString(),
    });

    if (startTime) params.append('start', startTime.toString());
    if (endTime) params.append('end', endTime.toString());

    const response = await fetch(
      `${this.info.restUrl}/v5/market/kline?${params}`
    );
    const data = await response.json();

    return data.result.list.map((k: any[]): Candle => ({
      timestamp: parseInt(k[0]),
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
    const body = {
      category: 'linear',
      symbol: this.normalizeSymbol(params.symbol),
      side: params.side.toUpperCase(),
      orderType: params.type.toUpperCase(),
      qty: params.quantity.toString(),
      timeInForce: 'GTC',
      orderIv: timestamp.toString(),
    };

    if (params.price) {
      (body as any).price = params.price.toString();
    }

    const signature = this.signRequest(body, timestamp);

    const response = await fetch(`${this.info.restUrl}/v5/order/create`, {
      method: 'POST',
      headers: {
        'X-BAPI-API-KEY': this.apiKey!,
        'X-BAPI-SIGN': signature,
        'X-BAPI-SIGN-TYPE': '2',
        'X-BAPI-TIMESTAMP': timestamp.toString(),
        'X-BAPI-RECV-WINDOW': this.recvWindow.toString(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return this.normalizeOrder(data.result);
  }

  async cancelOrder(symbol: string, orderId: string): Promise<Order> {
    this.requireAuth();

    const timestamp = Date.now();
    const body = {
      category: 'linear',
      symbol: this.normalizeSymbol(symbol),
      orderId,
    };

    const signature = this.signRequest(body, timestamp);

    const response = await fetch(`${this.info.restUrl}/v5/order/cancel`, {
      method: 'POST',
      headers: {
        'X-BAPI-API-KEY': this.apiKey!,
        'X-BAPI-SIGN': signature,
        'X-BAPI-SIGN-TYPE': '2',
        'X-BAPI-TIMESTAMP': timestamp.toString(),
        'X-BAPI-RECV-WINDOW': this.recvWindow.toString(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return this.normalizeOrder(data.result);
  }

  async getOpenOrders(symbol?: string): Promise<Order[]> {
    this.requireAuth();

    const timestamp = Date.now();
    const params = new URLSearchParams({
      category: 'linear',
      symbol: symbol ? this.normalizeSymbol(symbol) : '',
    });

    const signature = this.signRequest(
      { category: 'linear', symbol: symbol ? this.normalizeSymbol(symbol) : '' },
      timestamp
    );

    const response = await fetch(
      `${this.info.restUrl}/v5/order/realtime?${params}`,
      {
        headers: {
          'X-BAPI-API-KEY': this.apiKey!,
          'X-BAPI-SIGN': signature,
          'X-BAPI-SIGN-TYPE': '2',
          'X-BAPI-TIMESTAMP': timestamp.toString(),
          'X-BAPI-RECV-WINDOW': this.recvWindow.toString(),
        },
      }
    );

    const data = await response.json();
    return data.result.list.map((o: any) => this.normalizeOrder(o));
  }

  async getPosition(symbol: string): Promise<Position | null> {
    this.requireAuth();

    const timestamp = Date.now();
    const params = new URLSearchParams({
      category: 'linear',
      symbol: this.normalizeSymbol(symbol),
    });

    const signature = this.signRequest({ category: 'linear', symbol: this.normalizeSymbol(symbol) }, timestamp);

    const response = await fetch(
      `${this.info.restUrl}/v5/position/list?${params}`,
      {
        headers: {
          'X-BAPI-API-KEY': this.apiKey!,
          'X-BAPI-SIGN': signature,
          'X-BAPI-SIGN-TYPE': '2',
          'X-BAPI-TIMESTAMP': timestamp.toString(),
          'X-BAPI-RECV-WINDOW': this.recvWindow.toString(),
        },
      }
    );

    const data = await response.json();
    const position = data.result.list[0];

    if (!position || parseFloat(position.size) === 0) return null;

    return {
      symbol: this.denormalizeSymbol(position.symbol),
      exchange: 'bybit',
      side: position.side === 'Buy' ? 'BUY' : 'SELL',
      quantity: parseFloat(position.size),
      entryPrice: parseFloat(position.avgPrice),
      markPrice: parseFloat(position.markPrice),
      unrealizedPnl: parseFloat(position.unrealisedPnl),
      realizedPnl: parseFloat(position.cumRealisedPnl),
      leverage: parseInt(position.leverage),
      marginMode: position.riskLimit === '0' ? 'CROSSED' : 'ISOLATED',
      liquidationPrice: parseFloat(position.liqPrice) || undefined,
    };
  }

  async getPositions(): Promise<Position[]> {
    this.requireAuth();

    const timestamp = Date.now();
    const params = new URLSearchParams({ category: 'linear' });

    const signature = this.signRequest({ category: 'linear' }, timestamp);

    const response = await fetch(
      `${this.info.restUrl}/v5/position/list?${params}`,
      {
        headers: {
          'X-BAPI-API-KEY': this.apiKey!,
          'X-BAPI-SIGN': signature,
          'X-BAPI-SIGN-TYPE': '2',
          'X-BAPI-TIMESTAMP': timestamp.toString(),
          'X-BAPI-RECV-WINDOW': this.recvWindow.toString(),
        },
      }
    );

    const data = await response.json();
    return data.result.list
      .filter((p: any) => parseFloat(p.size) !== 0)
      .map((p: any): Position => ({
        symbol: this.denormalizeSymbol(p.symbol),
        exchange: 'bybit',
        side: p.side === 'Buy' ? 'BUY' : 'SELL',
        quantity: parseFloat(p.size),
        entryPrice: parseFloat(p.avgPrice),
        markPrice: parseFloat(p.markPrice),
        unrealizedPnl: parseFloat(p.unrealisedPnl),
        realizedPnl: parseFloat(p.cumRealisedPnl),
        leverage: parseInt(p.leverage),
        marginMode: p.riskLimit === '0' ? 'CROSSED' : 'ISOLATED',
        liquidationPrice: parseFloat(p.liqPrice) || undefined,
      }));
  }

  async getBalances(): Promise<Balance[]> {
    this.requireAuth();

    const timestamp = Date.now();
    const params = new URLSearchParams({ accountType: 'UNIFIED' });

    const signature = this.signRequest({ accountType: 'UNIFIED' }, timestamp);

    const response = await fetch(
      `${this.info.restUrl}/v5/account/wallet-balance?${params}`,
      {
        headers: {
          'X-BAPI-API-KEY': this.apiKey!,
          'X-BAPI-SIGN': signature,
          'X-BAPI-SIGN-TYPE': '2',
          'X-BAPI-TIMESTAMP': timestamp.toString(),
          'X-BAPI-RECV-WINDOW': this.recvWindow.toString(),
        },
      }
    );

    const data = await response.json();
    const coins = data.result.list[0]?.coin || [];

    return coins
      .filter((c: any) => parseFloat(c.walletBalance) > 0)
      .map((c: any): Balance => ({
        asset: c.coin,
        free: parseFloat(c.availableToWithdraw),
        locked: parseFloat(c.totalOrderIM),
        total: parseFloat(c.walletBalance),
        usdValue: parseFloat(c.usdValue) || 0,
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

      this.ws.onerror = (error) => reject(error);
      this.ws.onclose = () => {
        this.connected = false;
      };
    });
  }

  async disconnect(): Promise<void> {
    if (!this.ws) return;
    this.ws.close();
    this.connected = false;
  }

  async subscribeCandles(
    symbol: string,
    interval: string,
    callback: (candle: Candle) => void
  ): Promise<void> {
    await this.connect();

    const topic = `kline.${this.mapInterval(interval)}.${this.normalizeSymbol(symbol)}`;
    
    const subscribeMsg = {
      op: 'subscribe',
      args: [topic],
    };

    this.ws?.send(JSON.stringify(subscribeMsg));

    const messageHandler = (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      
      if (data.topic === topic && data.data) {
        data.data.forEach((k: any) => {
          callback({
            timestamp: k.start,
            open: parseFloat(k.open),
            high: parseFloat(k.high),
            low: parseFloat(k.low),
            close: parseFloat(k.close),
            volume: parseFloat(k.volume),
            symbol: this.denormalizeSymbol(k.symbol),
            interval,
          });
        });
      }
    };

    this.ws?.addEventListener('message', messageHandler);
  }

  async subscribeTrades(
    symbol: string,
    callback: (trade: unknown) => void
  ): Promise<void> {
    await this.connect();

    const topic = `publicTrade.${this.normalizeSymbol(symbol)}`;
    
    this.ws?.send(JSON.stringify({
      op: 'subscribe',
      args: [topic],
    }));

    this.ws?.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);
      if (data.topic === topic && data.data) {
        callback(data.data);
      }
    });
  }

  async subscribeOrderbook(
    symbol: string,
    callback: (orderbook: unknown) => void
  ): Promise<void> {
    await this.connect();

    const topic = `orderbook.50.${this.normalizeSymbol(symbol)}`;
    
    this.ws?.send(JSON.stringify({
      op: 'subscribe',
      args: [topic],
    }));

    this.ws?.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);
      if (data.topic === topic && data.data) {
        callback(data.data);
      }
    });
  }

  async subscribeOrders(callback: (order: Order) => void): Promise<void> {
    this.requireAuth();

    // Bybit требует отдельный private WebSocket
    this.wsPrivate = new WebSocket('wss://stream.bybit.com/v5/private');

    this.wsPrivate.onopen = async () => {
      const timestamp = Date.now();
      const signature = this.signRequest({ op: 'auth' }, timestamp);

      this.wsPrivate?.send(JSON.stringify({
        op: 'auth',
        args: [
          this.apiKey!,
          timestamp,
          signature,
        ],
      }));
    };

    this.wsPrivate?.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);
      if (data.topic === 'order' && data.data) {
        data.data.forEach((o: any) => callback(this.normalizeOrder(o)));
      }
    });
  }

  // === Утилиты ===

  normalizeSymbol(symbol: string): string {
    return symbol.replace('/', '').replace('-', '');
  }

  denormalizeSymbol(symbol: string): string {
    const match = symbol.match(/^([A-Z]+)([A-Z]+)$/);
    if (match) {
      return `${match[1]}/${match[2]}`;
    }
    return symbol;
  }

  private mapInterval(interval: string): string {
    const mapping: Record<string, string> = {
      '1m': '1',
      '3m': '3',
      '5m': '5',
      '15m': '15',
      '30m': '30',
      '1h': '60',
      '2h': '120',
      '4h': '240',
      '6h': '360',
      '12h': '720',
      '1d': 'D',
      '1w': 'W',
      '1M': 'M',
    };
    return mapping[interval] || interval;
  }

  private normalizeOrder(data: any): Order {
    return {
      id: data.orderId,
      symbol: this.denormalizeSymbol(data.symbol),
      exchange: 'bybit',
      side: data.side === 'Buy' ? 'BUY' : 'SELL',
      type: data.orderType.toUpperCase() as OrderType,
      quantity: parseFloat(data.qty),
      price: data.price ? parseFloat(data.price) : undefined,
      stopPrice: data.stopLoss ? parseFloat(data.stopLoss) : undefined,
      status: this.normalizeStatus(data.orderStatus),
      filledQty: parseFloat(data.cumExecQty),
      avgPrice: parseFloat(data.avgPrice || 0),
      createdAt: parseInt(data.createdTime),
      updatedAt: parseInt(data.updatedTime),
      clientOrderId: data.orderIv,
    };
  }

  private normalizeStatus(status: string): OrderStatus {
    const mapping: Record<string, OrderStatus> = {
      New: 'NEW',
      PartiallyFilled: 'PARTIALLY_FILLED',
      Filled: 'FILLED',
      Cancelled: 'CANCELED',
      Rejected: 'REJECTED',
    };
    return mapping[status] || 'NEW';
  }

  protected signRequest(params: Record<string, any>, timestamp: number): string {
    const queryString = `${timestamp}${this.apiKey}${this.recvWindow}${JSON.stringify(params)}`;
    return crypto
      .createHmac('sha256', this.apiSecret!)
      .update(queryString)
      .digest('hex');
  }
}
