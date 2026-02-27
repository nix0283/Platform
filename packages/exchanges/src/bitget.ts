// ============================================
// BITGET EXCHANGE CONNECTOR
// Специфика: v2 API, signature с timestamp в ms
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

@registerExchange('bitget')
export class BitgetAdapter extends ExchangeAdapter {
  readonly id: ExchangeId = 'bitget';

  readonly info: ExchangeInfo = {
    id: 'bitget',
    name: 'Bitget',
    wsUrl: 'wss://ws.bitget.com/v2/ws/public',
    restUrl: 'https://api.bitget.com',
    features: {
      spot: true,
      futures: true,
      options: false,
      wsTrades: true,
      wsCandles: true,
      wsOrderbook: true,
      placeOrder: true,
      cancelOrder: true,
    } as ExchangeFeatures,
  };

  private passphrase: string = '';

  constructor(apiKey?: string, apiSecret?: string, passphrase?: string) {
    super(apiKey, apiSecret);
    this.passphrase = passphrase || '';
  }

  async getSymbols(): Promise<Symbol[]> {
    const response = await fetch(`${this.info.restUrl}/api/v2/mix/v1/market/contracts?productType=umcbl`);
    const data = await response.json();

    return data.data.map((s: any): Symbol => ({
      symbol: s.symbol,
      baseAsset: s.baseCoin,
      quoteAsset: s.quoteCoin,
      exchange: 'bitget',
      status: s.symbolStatus === 'normal' ? 'TRADING' : 'DELISTED',
      minQty: parseFloat(s.minTradeNum),
      maxQty: parseFloat(s.maxTradeNum) || Infinity,
      stepSize: parseFloat(s.sizeMultiplier),
      minNotional: parseFloat(s.minTradeUSDT) || 0,
      tickSize: parseFloat(s.pricePlace ? `1e-${s.pricePlace}` : '0.01'),
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
      symbol: this.normalizeSymbol(symbol),
      productType: 'umcbl',
      granularity: this.mapInterval(interval),
      limit: limit.toString(),
    });

    if (startTime) params.append('startTime', startTime.toString());
    if (endTime) params.append('endTime', endTime.toString());

    const response = await fetch(
      `${this.info.restUrl}/api/v2/mix/market/candles?${params}`
    );
    const data = await response.json();

    return data.data.map((k: any[]): Candle => ({
      timestamp: parseInt(k[0]),
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
      symbol: symbol,
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

    const timestamp = Date.now().toString();
    const body = {
      symbol: this.normalizeSymbol(params.symbol),
      marginCoin: 'USDT',
      size: params.quantity.toString(),
      price: params.price?.toString() || '',
      side: params.side.toUpperCase(),
      orderType: params.type.toUpperCase(),
    };

    const signature = this.signRequest('POST', '/api/v2/mix/order/place-order', JSON.stringify(body), timestamp);

    const response = await fetch(`${this.info.restUrl}/api/v2/mix/order/place-order`, {
      method: 'POST',
      headers: {
        'ACCESS-KEY': this.apiKey!,
        'ACCESS-SIGN': signature,
        'ACCESS-TIMESTAMP': timestamp,
        'ACCESS-PASSPHRASE': this.passphrase,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return this.normalizeOrder(data.data);
  }

  async cancelOrder(symbol: string, orderId: string): Promise<Order> {
    this.requireAuth();

    const timestamp = Date.now().toString();
    const body = {
      symbol: this.normalizeSymbol(symbol),
      marginCoin: 'USDT',
      orderId,
    };

    const signature = this.signRequest('POST', '/api/v2/mix/order/cancel-order', JSON.stringify(body), timestamp);

    const response = await fetch(`${this.info.restUrl}/api/v2/mix/order/cancel-order`, {
      method: 'POST',
      headers: {
        'ACCESS-KEY': this.apiKey!,
        'ACCESS-SIGN': signature,
        'ACCESS-TIMESTAMP': timestamp,
        'ACCESS-PASSPHRASE': this.passphrase,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return this.normalizeOrder(data.data);
  }

  async getOpenOrders(symbol?: string): Promise<Order[]> {
    this.requireAuth();

    const timestamp = Date.now().toString();
    const body = {
      symbol: symbol ? this.normalizeSymbol(symbol) : '',
      marginCoin: 'USDT',
      productType: 'umcbl',
    };

    const signature = this.signRequest('POST', '/api/v2/mix/order/orders-pending', JSON.stringify(body), timestamp);

    const response = await fetch(`${this.info.restUrl}/api/v2/mix/order/orders-pending`, {
      method: 'POST',
      headers: {
        'ACCESS-KEY': this.apiKey!,
        'ACCESS-SIGN': signature,
        'ACCESS-TIMESTAMP': timestamp,
        'ACCESS-PASSPHRASE': this.passphrase,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return data.data.map((o: any) => this.normalizeOrder(o));
  }

  async getPosition(symbol: string): Promise<Position | null> {
    this.requireAuth();

    const timestamp = Date.now().toString();
    const body = {
      symbol: this.normalizeSymbol(symbol),
      marginCoin: 'USDT',
      productType: 'umcbl',
    };

    const signature = this.signRequest('POST', '/api/v2/mix/position/single-position', JSON.stringify(body), timestamp);

    const response = await fetch(`${this.info.restUrl}/api/v2/mix/position/single-position`, {
      method: 'POST',
      headers: {
        'ACCESS-KEY': this.apiKey!,
        'ACCESS-SIGN': signature,
        'ACCESS-TIMESTAMP': timestamp,
        'ACCESS-PASSPHRASE': this.passphrase,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    const position = data.data[0];

    if (!position || parseFloat(position.total) === 0) return null;

    return {
      symbol: position.symbol,
      exchange: 'bitget',
      side: position.holdMode === 'long' ? 'BUY' : 'SELL',
      quantity: Math.abs(parseFloat(position.total)),
      entryPrice: parseFloat(position.averageOpenPrice),
      markPrice: parseFloat(position.markPrice),
      unrealizedPnl: parseFloat(position.unrealizedPL),
      realizedPnl: parseFloat(position.realizedPL) || 0,
      leverage: parseInt(position.leverage),
      marginMode: position.marginMode === 'fixed' ? 'ISOLATED' : 'CROSSED',
      liquidationPrice: parseFloat(position.liquidationPrice) || undefined,
    };
  }

  async getPositions(): Promise<Position[]> {
    this.requireAuth();

    const timestamp = Date.now().toString();
    const body = {
      marginCoin: 'USDT',
      productType: 'umcbl',
    };

    const signature = this.signRequest('POST', '/api/v2/mix/position/all-position', JSON.stringify(body), timestamp);

    const response = await fetch(`${this.info.restUrl}/api/v2/mix/position/all-position`, {
      method: 'POST',
      headers: {
        'ACCESS-KEY': this.apiKey!,
        'ACCESS-SIGN': signature,
        'ACCESS-TIMESTAMP': timestamp,
        'ACCESS-PASSPHRASE': this.passphrase,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return data.data
      .filter((p: any) => parseFloat(p.total) !== 0)
      .map((p: any): Position => ({
        symbol: p.symbol,
        exchange: 'bitget',
        side: p.holdMode === 'long' ? 'BUY' : 'SELL',
        quantity: Math.abs(parseFloat(p.total)),
        entryPrice: parseFloat(p.averageOpenPrice),
        markPrice: parseFloat(p.markPrice),
        unrealizedPnl: parseFloat(p.unrealizedPL),
        realizedPnl: parseFloat(p.realizedPL) || 0,
        leverage: parseInt(p.leverage),
        marginMode: p.marginMode === 'fixed' ? 'ISOLATED' : 'CROSSED',
        liquidationPrice: parseFloat(p.liquidationPrice) || undefined,
      }));
  }

  async getBalances(): Promise<Balance[]> {
    this.requireAuth();

    const timestamp = Date.now().toString();
    const body = { marginCoin: 'USDT' };

    const signature = this.signRequest('POST', '/api/v2/mix/account/assets', JSON.stringify(body), timestamp);

    const response = await fetch(`${this.info.restUrl}/api/v2/mix/account/assets`, {
      method: 'POST',
      headers: {
        'ACCESS-KEY': this.apiKey!,
        'ACCESS-SIGN': signature,
        'ACCESS-TIMESTAMP': timestamp,
        'ACCESS-PASSPHRASE': this.passphrase,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return data.data.map((d: any): Balance => ({
      asset: d.coin,
      free: parseFloat(d.available),
      locked: parseFloat(d.frozen),
      total: parseFloat(d.total),
      usdValue: parseFloat(d.usdValue) || 0,
    }));
  }

  async connect(): Promise<void> {
    if (this.connected) return;

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.info.wsUrl);
      this.ws.onopen = () => { this.connected = true; resolve(); };
      this.ws.onerror = (error) => reject(error);
      this.ws.onclose = () => { this.connected = false; };
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

    const topic = `${this.normalizeSymbol(symbol)}@candle${this.mapInterval(interval)}`;
    
    this.ws?.send(JSON.stringify({
      op: 'subscribe',
      arg: { instType: 'mc', channel: 'candle', instId: this.normalizeSymbol(symbol) },
    }));

    this.ws?.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);
      if (data.action === 'update' && data.data) {
        data.data.forEach((k: any) => {
          callback({
            timestamp: parseInt(k[0]),
            open: parseFloat(k[1]),
            high: parseFloat(k[2]),
            low: parseFloat(k[3]),
            close: parseFloat(k[4]),
            volume: parseFloat(k[5]),
            symbol,
            interval,
          });
        });
      }
    });
  }

  async subscribeTrades(symbol: string, callback: (trade: unknown) => void): Promise<void> {
    await this.connect();
    // Реализация подписки на trades
  }

  async subscribeOrderbook(symbol: string, callback: (orderbook: unknown) => void): Promise<void> {
    await this.connect();
    // Реализация подписки на orderbook
  }

  async subscribeOrders(callback: (order: Order) => void): Promise<void> {
    this.requireAuth();
    // Реализация private WebSocket
  }

  normalizeSymbol(symbol: string): string {
    return symbol.replace('/', '').replace('-', '');
  }

  denormalizeSymbol(symbol: string): string {
    const match = symbol.match(/^([A-Z]+)([A-Z]+)$/);
    if (match) return `${match[1]}/${match[2]}`;
    return symbol;
  }

  private mapInterval(interval: string): string {
    const mapping: Record<string, string> = {
      '1m': '1m', '5m': '5m', '15m': '15m', '30m': '30m',
      '1h': '1H', '4h': '4H', '12h': '12H', '1d': '1D',
    };
    return mapping[interval] || '1m';
  }

  private normalizeOrder(data: any): Order {
    return {
      id: data.orderId,
      symbol: data.symbol,
      exchange: 'bitget',
      side: data.side.toUpperCase() as OrderSide,
      type: data.orderType.toUpperCase() as OrderType,
      quantity: parseFloat(data.size),
      price: data.price ? parseFloat(data.price) : undefined,
      status: this.normalizeStatus(data.status),
      filledQty: parseFloat(data.filledQty),
      avgPrice: parseFloat(data.avgPrice || 0),
      createdAt: parseInt(data.cTime),
      updatedAt: parseInt(data.uTime),
    };
  }

  private normalizeStatus(status: string): OrderStatus {
    const mapping: Record<string, OrderStatus> = {
      init: 'NEW', new: 'NEW', filled: 'FILLED',
      cancelled: 'CANCELED', partially_filled: 'PARTIALLY_FILLED',
    };
    return mapping[status] || 'NEW';
  }

  protected signRequest(method: string, path: string, body: string, timestamp: string): string {
    const message = timestamp + method + path + body;
    return crypto
      .createHmac('sha256', this.apiSecret!)
      .update(message)
      .digest('base64');
  }
}
