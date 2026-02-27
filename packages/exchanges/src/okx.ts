// ============================================
// OKX EXCHANGE CONNECTOR
// Специфика: v5 API, passphrase требуется, WebSocket каналы
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

@registerExchange('okx')
export class OKXAdapter extends ExchangeAdapter {
  readonly id: ExchangeId = 'okx';

  readonly info: ExchangeInfo = {
    id: 'okx',
    name: 'OKX',
    wsUrl: 'wss://ws.okx.com:8443/ws/v5/public',
    restUrl: 'https://www.okx.com',
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

  private passphrase: string = '';
  private wsPrivate?: WebSocket;

  constructor(apiKey?: string, apiSecret?: string, passphrase?: string) {
    super(apiKey, apiSecret);
    this.passphrase = passphrase || '';
  }

  // === REST API ===

  async getSymbols(): Promise<Symbol[]> {
    const response = await fetch(`${this.info.restUrl}/api/v5/public/instruments?instType=SWAP`);
    const data = await response.json();

    return data.data.map((s: any): Symbol => ({
      symbol: s.instId,
      baseAsset: s.baseCcy,
      quoteAsset: s.quoteCcy,
      exchange: 'okx',
      status: s.state === 'live' ? 'TRADING' : 'DELISTED',
      minQty: parseFloat(s.minSz),
      maxQty: parseFloat(s.maxSz) || Infinity,
      stepSize: parseFloat(s.lotSz),
      minNotional: parseFloat(s.minSz),
      tickSize: parseFloat(s.tickSz),
    }));
  }

  async getCandles(
    symbol: string,
    interval: string,
    limit: number = 100,
    startTime?: number,
    endTime?: number
  ): Promise<Candle[]> {
    const params = new URLSearchParams({
      instId: this.normalizeSymbol(symbol),
      bar: this.mapInterval(interval),
      limit: Math.min(limit, 300).toString(),
    });

    if (startTime) params.append('after', startTime.toString());
    if (endTime) params.append('before', endTime.toString());

    const response = await fetch(
      `${this.info.restUrl}/api/v5/market/candles?${params}`
    );
    const data = await response.json();

    return data.data.map((k: any[]): Candle => ({
      timestamp: parseInt(k[0]),
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
      symbol: k[0].instId || symbol,
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

    const timestamp = this.getTimestamp();
    const body = {
      instId: this.normalizeSymbol(params.symbol),
      tdMode: 'cross',
      side: params.side.toLowerCase(),
      ordType: this.mapOrderType(params.type),
      sz: params.quantity.toString(),
    };

    if (params.price) {
      (body as any).px = params.price.toString();
    }

    const signature = this.signRequest('POST', '/api/v5/trade/order', JSON.stringify(body), timestamp);

    const response = await fetch(`${this.info.restUrl}/api/v5/trade/order`, {
      method: 'POST',
      headers: {
        'OK-ACCESS-KEY': this.apiKey!,
        'OK-ACCESS-SIGN': signature,
        'OK-ACCESS-TIMESTAMP': timestamp,
        'OK-ACCESS-PASSPHRASE': this.passphrase,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return this.normalizeOrder(data.data[0]);
  }

  async cancelOrder(symbol: string, orderId: string): Promise<Order> {
    this.requireAuth();

    const timestamp = this.getTimestamp();
    const body = {
      instId: this.normalizeSymbol(symbol),
      ordId: orderId,
    };

    const signature = this.signRequest('POST', '/api/v5/trade/cancel-order', JSON.stringify(body), timestamp);

    const response = await fetch(`${this.info.restUrl}/api/v5/trade/cancel-order`, {
      method: 'POST',
      headers: {
        'OK-ACCESS-KEY': this.apiKey!,
        'OK-ACCESS-SIGN': signature,
        'OK-ACCESS-TIMESTAMP': timestamp,
        'OK-ACCESS-PASSPHRASE': this.passphrase,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return this.normalizeOrder(data.data[0]);
  }

  async getOpenOrders(symbol?: string): Promise<Order[]> {
    this.requireAuth();

    const timestamp = this.getTimestamp();
    const params = new URLSearchParams({ instType: 'SWAP' });
    if (symbol) params.append('instId', this.normalizeSymbol(symbol));

    const signature = this.signRequest('GET', `/api/v5/trade/orders-pending?${params}`, '', timestamp);

    const response = await fetch(
      `${this.info.restUrl}/api/v5/trade/orders-pending?${params}`,
      {
        headers: {
          'OK-ACCESS-KEY': this.apiKey!,
          'OK-ACCESS-SIGN': signature,
          'OK-ACCESS-TIMESTAMP': timestamp,
          'OK-ACCESS-PASSPHRASE': this.passphrase,
        },
      }
    );

    const data = await response.json();
    return data.data.map((o: any) => this.normalizeOrder(o));
  }

  async getPosition(symbol: string): Promise<Position | null> {
    this.requireAuth();

    const timestamp = this.getTimestamp();
    const params = new URLSearchParams({
      instType: 'SWAP',
      instId: this.normalizeSymbol(symbol),
    });

    const signature = this.signRequest('GET', `/api/v5/account/positions?${params}`, '', timestamp);

    const response = await fetch(
      `${this.info.restUrl}/api/v5/account/positions?${params}`,
      {
        headers: {
          'OK-ACCESS-KEY': this.apiKey!,
          'OK-ACCESS-SIGN': signature,
          'OK-ACCESS-TIMESTAMP': timestamp,
          'OK-ACCESS-PASSPHRASE': this.passphrase,
        },
      }
    );

    const data = await response.json();
    const position = data.data[0];

    if (!position || parseFloat(position.pos) === 0) return null;

    return {
      symbol: position.instId,
      exchange: 'okx',
      side: position.posSide === 'long' ? 'BUY' : 'SELL',
      quantity: Math.abs(parseFloat(position.pos)),
      entryPrice: parseFloat(position.avgPx) || 0,
      markPrice: parseFloat(position.markPx),
      unrealizedPnl: parseFloat(position.upl),
      realizedPnl: parseFloat(position.realizedPnl),
      leverage: parseInt(position.lever),
      marginMode: position.mgnMode === 'isolated' ? 'ISOLATED' : 'CROSSED',
      liquidationPrice: parseFloat(position.liqPx) || undefined,
    };
  }

  async getPositions(): Promise<Position[]> {
    this.requireAuth();

    const timestamp = this.getTimestamp();
    const params = new URLSearchParams({ instType: 'SWAP' });

    const signature = this.signRequest('GET', `/api/v5/account/positions?${params}`, '', timestamp);

    const response = await fetch(
      `${this.info.restUrl}/api/v5/account/positions?${params}`,
      {
        headers: {
          'OK-ACCESS-KEY': this.apiKey!,
          'OK-ACCESS-SIGN': signature,
          'OK-ACCESS-TIMESTAMP': timestamp,
          'OK-ACCESS-PASSPHRASE': this.passphrase,
        },
      }
    );

    const data = await response.json();
    return data.data
      .filter((p: any) => parseFloat(p.pos) !== 0)
      .map((p: any): Position => ({
        symbol: p.instId,
        exchange: 'okx',
        side: p.posSide === 'long' ? 'BUY' : 'SELL',
        quantity: Math.abs(parseFloat(p.pos)),
        entryPrice: parseFloat(p.avgPx) || 0,
        markPrice: parseFloat(p.markPx),
        unrealizedPnl: parseFloat(p.upl),
        realizedPnl: parseFloat(p.realizedPnl),
        leverage: parseInt(p.lever),
        marginMode: p.mgnMode === 'isolated' ? 'ISOLATED' : 'CROSSED',
        liquidationPrice: parseFloat(p.liqPx) || undefined,
      }));
  }

  async getBalances(): Promise<Balance[]> {
    this.requireAuth();

    const timestamp = this.getTimestamp();
    const params = new URLSearchParams({ acctLv: '3' });

    const signature = this.signRequest('GET', `/api/v5/account/balance?${params}`, '', timestamp);

    const response = await fetch(
      `${this.info.restUrl}/api/v5/account/balance?${params}`,
      {
        headers: {
          'OK-ACCESS-KEY': this.apiKey!,
          'OK-ACCESS-SIGN': signature,
          'OK-ACCESS-TIMESTAMP': timestamp,
          'OK-ACCESS-PASSPHRASE': this.passphrase,
        },
      }
    );

    const data = await response.json();
    const details = data.data[0]?.details || [];

    return details
      .filter((d: any) => parseFloat(d.cashBal) > 0)
      .map((d: any): Balance => ({
        asset: d.ccy,
        free: parseFloat(d.availEq),
        locked: parseFloat(d.frozenBal),
        total: parseFloat(d.cashBal),
        usdValue: parseFloat(d.eqUsd) || 0,
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

    const channel = `candle${this.mapInterval(interval)}:${this.normalizeSymbol(symbol)}`;
    
    const subscribeMsg = {
      op: 'subscribe',
      args: [{ channel }],
    };

    this.ws?.send(JSON.stringify(subscribeMsg));

    this.ws?.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);
      
      if (data.arg?.channel === channel && data.data) {
        data.data.forEach((k: any) => {
          callback({
            timestamp: parseInt(k[0]),
            open: parseFloat(k[1]),
            high: parseFloat(k[2]),
            low: parseFloat(k[3]),
            close: parseFloat(k[4]),
            volume: parseFloat(k[5]),
            symbol: k[0].instId || symbol,
            interval,
          });
        });
      }
    });
  }

  async subscribeTrades(
    symbol: string,
    callback: (trade: unknown) => void
  ): Promise<void> {
    await this.connect();

    const channel = `trades:${this.normalizeSymbol(symbol)}`;
    
    this.ws?.send(JSON.stringify({
      op: 'subscribe',
      args: [{ channel }],
    }));

    this.ws?.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);
      if (data.arg?.channel === channel && data.data) {
        callback(data.data);
      }
    });
  }

  async subscribeOrderbook(
    symbol: string,
    callback: (orderbook: unknown) => void
  ): Promise<void> {
    await this.connect();

    const channel = `books5:${this.normalizeSymbol(symbol)}`;
    
    this.ws?.send(JSON.stringify({
      op: 'subscribe',
      args: [{ channel }],
    }));

    this.ws?.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);
      if (data.arg?.channel === channel && data.data) {
        callback(data.data);
      }
    });
  }

  async subscribeOrders(callback: (order: Order) => void): Promise<void> {
    this.requireAuth();

    this.wsPrivate = new WebSocket('wss://ws.okx.com:8443/ws/v5/private');

    this.wsPrivate.onopen = async () => {
      const timestamp = this.getTimestamp();
      const signature = this.signRequest('GET', '/users/self/verify', '', timestamp);

      this.wsPrivate?.send(JSON.stringify({
        op: 'login',
        args: [
          {
            apiKey: this.apiKey,
            passphrase: this.passphrase,
            timestamp,
            sign: signature,
          },
        ],
      }));
    };

    this.wsPrivate?.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);
      if (data.arg?.channel === 'orders' && data.data) {
        data.data.forEach((o: any) => callback(this.normalizeOrder(o)));
      }
    });

    // Подписка на канал ордеров
    this.wsPrivate?.send(JSON.stringify({
      op: 'subscribe',
      args: [{ channel: 'orders' }],
    }));
  }

  // === Утилиты ===

  normalizeSymbol(symbol: string): string {
    return symbol.replace('/', '-').replace('-', '-SWAP');
  }

  denormalizeSymbol(symbol: string): string {
    return symbol.replace('-SWAP', '').replace('-', '/');
  }

  private mapInterval(interval: string): string {
    const mapping: Record<string, string> = {
      '1m': '1m',
      '3m': '3m',
      '5m': '5m',
      '15m': '15m',
      '30m': '30m',
      '1h': '1H',
      '2h': '2H',
      '4h': '4H',
      '6h': '6H',
      '12h': '12H',
      '1d': '1D',
      '1w': '1W',
      '1M': '1M',
    };
    return mapping[interval] || interval;
  }

  private mapOrderType(type: OrderType): string {
    const mapping: Record<OrderType, string> = {
      MARKET: 'market',
      LIMIT: 'limit',
      STOP_MARKET: 'conditional',
      STOP_LIMIT: 'conditional',
    };
    return mapping[type];
  }

  private normalizeOrder(data: any): Order {
    return {
      id: data.ordId,
      symbol: data.instId,
      exchange: 'okx',
      side: data.side.toUpperCase() as OrderSide,
      type: this.denormalizeOrderType(data.ordType),
      quantity: parseFloat(data.sz),
      price: data.px ? parseFloat(data.px) : undefined,
      stopPrice: data.slTriggerPx ? parseFloat(data.slTriggerPx) : undefined,
      status: this.normalizeStatus(data.state),
      filledQty: parseFloat(data.accFillSz),
      avgPrice: parseFloat(data.avgPx || 0),
      createdAt: parseInt(data.cTime),
      updatedAt: parseInt(data.uTime),
      clientOrderId: data.clOrdId,
    };
  }

  private denormalizeOrderType(type: string): OrderType {
    const mapping: Record<string, OrderType> = {
      market: 'MARKET',
      limit: 'LIMIT',
      conditional: 'STOP_MARKET',
    };
    return mapping[type] || 'MARKET';
  }

  private normalizeStatus(status: string): OrderStatus {
    const mapping: Record<string, OrderStatus> = {
      live: 'NEW',
      partially_filled: 'PARTIALLY_FILLED',
      filled: 'FILLED',
      cancelling: 'CANCELED',
      canceled: 'CANCELED',
    };
    return mapping[status] || 'NEW';
  }

  private getTimestamp(): string {
    return new Date().toISOString();
  }

  protected signRequest(method: string, path: string, body: string, timestamp: string): string {
    const message = timestamp + method + path + body;
    return crypto
      .createHmac('sha256', this.apiSecret!)
      .update(message)
      .digest('base64');
  }
}
