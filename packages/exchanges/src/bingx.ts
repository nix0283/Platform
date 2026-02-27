// ============================================
// BINGX EXCHANGE CONNECTOR
// Специфика: v2 API, signature аналогична Binance
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

@registerExchange('bingx')
export class BingXAdapter extends ExchangeAdapter {
  readonly id: ExchangeId = 'bingx';

  readonly info: ExchangeInfo = {
    id: 'bingx',
    name: 'BingX',
    wsUrl: 'wss://open-api-v2.bingx.com/open-api/v1/quote/ws',
    restUrl: 'https://open-api.bingx.com',
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

  async getSymbols(): Promise<Symbol[]> {
    const response = await fetch(`${this.info.restUrl}/open-api/swap/v2/common/symbols`);
    const data = await response.json();

    return data.data.symbols.map((s: any): Symbol => ({
      symbol: s.symbol,
      baseAsset: s.baseCurrency,
      quoteAsset: s.quoteCurrency,
      exchange: 'bingx',
      status: s.status === 'ONLINE' ? 'TRADING' : 'DELISTED',
      minQty: parseFloat(s.minOrderSize),
      maxQty: parseFloat(s.maxOrderSize) || Infinity,
      stepSize: parseFloat(s.sizePrecision),
      minNotional: parseFloat(s.minOrderAmount) || 0,
      tickSize: parseFloat(s.pricePrecision),
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
      interval: this.mapInterval(interval),
      limit: limit.toString(),
    });

    if (startTime) params.append('startTime', startTime.toString());
    if (endTime) params.append('endTime', endTime.toString());

    const response = await fetch(
      `${this.info.restUrl}/open-api/swap/v2/quote/kline?${params}`
    );
    const data = await response.json();

    return data.data.klines.map((k: any): Candle => ({
      timestamp: k.timestamp,
      open: parseFloat(k.open),
      high: parseFloat(k.high),
      low: parseFloat(k.low),
      close: parseFloat(k.close),
      volume: parseFloat(k.volume),
      symbol,
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
    const queryParams = new URLSearchParams({
      symbol: this.normalizeSymbol(params.symbol),
      side: params.side.toUpperCase(),
      type: params.type.toUpperCase(),
      quantity: params.quantity.toString(),
      timestamp: timestamp.toString(),
    });

    if (params.price) queryParams.append('price', params.price.toString());

    const signature = this.signRequest(queryParams.toString(), timestamp);

    const response = await fetch(
      `${this.info.restUrl}/open-api/swap/v2/trade/order?${queryParams}&signature=${signature}`,
      {
        method: 'POST',
        headers: {
          'X-BX-APIKEY': this.apiKey!,
        },
      }
    );

    const data = await response.json();
    return this.normalizeOrder(data.data);
  }

  async cancelOrder(symbol: string, orderId: string): Promise<Order> {
    this.requireAuth();

    const timestamp = Date.now();
    const params = new URLSearchParams({
      symbol: this.normalizeSymbol(symbol),
      orderId,
      timestamp: timestamp.toString(),
    });

    const signature = this.signRequest(params.toString(), timestamp);

    const response = await fetch(
      `${this.info.restUrl}/open-api/swap/v2/trade/cancelOrder?${params}&signature=${signature}`,
      {
        method: 'DELETE',
        headers: {
          'X-BX-APIKEY': this.apiKey!,
        },
      }
    );

    const data = await response.json();
    return this.normalizeOrder(data.data);
  }

  async getOpenOrders(symbol?: string): Promise<Order[]> {
    this.requireAuth();

    const timestamp = Date.now();
    const params = new URLSearchParams({
      timestamp: timestamp.toString(),
    });

    if (symbol) params.append('symbol', this.normalizeSymbol(symbol));

    const signature = this.signRequest(params.toString(), timestamp);

    const response = await fetch(
      `${this.info.restUrl}/open-api/swap/v2/trade/openOrders?${params}&signature=${signature}`,
      {
        headers: {
          'X-BX-APIKEY': this.apiKey!,
        },
      }
    );

    const data = await response.json();
    return data.data.orders.map((o: any) => this.normalizeOrder(o));
  }

  async getPosition(symbol: string): Promise<Position | null> {
    this.requireAuth();

    const timestamp = Date.now();
    const params = new URLSearchParams({
      symbol: this.normalizeSymbol(symbol),
      timestamp: timestamp.toString(),
    });

    const signature = this.signRequest(params.toString(), timestamp);

    const response = await fetch(
      `${this.info.restUrl}/open-api/swap/v2/position/openPositions?${params}&signature=${signature}`,
      {
        headers: {
          'X-BX-APIKEY': this.apiKey!,
        },
      }
    );

    const data = await response.json();
    const position = data.data.positions[0];

    if (!position || parseFloat(position.positionAmt) === 0) return null;

    return {
      symbol: position.symbol,
      exchange: 'bingx',
      side: position.positionAmt > 0 ? 'BUY' : 'SELL',
      quantity: Math.abs(parseFloat(position.positionAmt)),
      entryPrice: parseFloat(position.entryPrice),
      markPrice: parseFloat(position.markPrice),
      unrealizedPnl: parseFloat(position.unRealizedProfit),
      realizedPnl: parseFloat(position.realizedProfit) || 0,
      leverage: parseInt(position.leverage),
      marginMode: position.marginMode === 'ISOLATED' ? 'ISOLATED' : 'CROSSED',
      liquidationPrice: parseFloat(position.liquidationPrice) || undefined,
    };
  }

  async getPositions(): Promise<Position[]> {
    this.requireAuth();

    const timestamp = Date.now();
    const params = new URLSearchParams({
      timestamp: timestamp.toString(),
    });

    const signature = this.signRequest(params.toString(), timestamp);

    const response = await fetch(
      `${this.info.restUrl}/open-api/swap/v2/position/openPositions?${params}&signature=${signature}`,
      {
        headers: {
          'X-BX-APIKEY': this.apiKey!,
        },
      }
    );

    const data = await response.json();
    return data.data.positions
      .filter((p: any) => parseFloat(p.positionAmt) !== 0)
      .map((p: any): Position => ({
        symbol: p.symbol,
        exchange: 'bingx',
        side: p.positionAmt > 0 ? 'BUY' : 'SELL',
        quantity: Math.abs(parseFloat(p.positionAmt)),
        entryPrice: parseFloat(p.entryPrice),
        markPrice: parseFloat(p.markPrice),
        unrealizedPnl: parseFloat(p.unRealizedProfit),
        realizedPnl: parseFloat(p.realizedProfit) || 0,
        leverage: parseInt(p.leverage),
        marginMode: p.marginMode === 'ISOLATED' ? 'ISOLATED' : 'CROSSED',
        liquidationPrice: parseFloat(p.liquidationPrice) || undefined,
      }));
  }

  async getBalances(): Promise<Balance[]> {
    this.requireAuth();

    const timestamp = Date.now();
    const params = new URLSearchParams({
      timestamp: timestamp.toString(),
    });

    const signature = this.signRequest(params.toString(), timestamp);

    const response = await fetch(
      `${this.info.restUrl}/open-api/swap/v2/user/balance?${params}&signature=${signature}`,
      {
        headers: {
          'X-BX-APIKEY': this.apiKey!,
        },
      }
    );

    const data = await response.json();
    return data.data.assets
      .filter((a: any) => parseFloat(a.available) > 0)
      .map((a: any): Balance => ({
        asset: a.asset,
        free: parseFloat(a.available),
        locked: parseFloat(a.frozen),
        total: parseFloat(a.balance),
        usdValue: 0,
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

    const message = {
      reqId: Date.now().toString(),
      op: 'sub',
      args: [{
        reqType: 'kline',
        symbol: this.normalizeSymbol(symbol),
        klineType: this.mapInterval(interval),
      }],
    };

    this.ws?.send(JSON.stringify(message));

    this.ws?.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);
      if (data.data && data.data.kline) {
        const k = data.data.kline;
        callback({
          timestamp: k.t,
          open: parseFloat(k.o),
          high: parseFloat(k.h),
          low: parseFloat(k.l),
          close: parseFloat(k.c),
          volume: parseFloat(k.v),
          symbol,
          interval,
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
    return symbol.replace('/', '-');
  }

  denormalizeSymbol(symbol: string): string {
    return symbol.replace('-', '/');
  }

  private mapInterval(interval: string): string {
    const mapping: Record<string, string> = {
      '1m': '1m', '5m': '5m', '15m': '15m', '30m': '30m',
      '1h': '1h', '4h': '4h', '12h': '12h', '1d': '1d',
    };
    return mapping[interval] || '1m';
  }

  private normalizeOrder(data: any): Order {
    return {
      id: data.orderId,
      symbol: data.symbol,
      exchange: 'bingx',
      side: data.side.toUpperCase() as OrderSide,
      type: data.type.toUpperCase() as OrderType,
      quantity: parseFloat(data.qty),
      price: data.price ? parseFloat(data.price) : undefined,
      status: this.normalizeStatus(data.status),
      filledQty: parseFloat(data.execQty),
      avgPrice: parseFloat(data.avgPrice || 0),
      createdAt: data.timestamp,
      updatedAt: data.updateTime,
    };
  }

  private normalizeStatus(status: string): OrderStatus {
    const mapping: Record<string, OrderStatus> = {
      NEW: 'NEW', PARTIALLY_FILLED: 'PARTIALLY_FILLED',
      FILLED: 'FILLED', CANCELED: 'CANCELED', REJECTED: 'REJECTED',
    };
    return mapping[status] || 'NEW';
  }

  protected signRequest(queryString: string, timestamp: number): string {
    return crypto
      .createHmac('sha256', this.apiSecret!)
      .update(queryString)
      .digest('hex');
  }
}
