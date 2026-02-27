// ============================================
// EXCHANGE TRADE IMPORTERS
// Импорт истории сделок с бирж
// ============================================

import { JournalEntry, TakeProfitLevel } from '../types';

export interface ExchangeTrade {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  price: number;
  quantity: number;
  timestamp: number;
  fee?: number;
  feeCurrency?: string;
  orderId?: string;
  // Additional fields per exchange
  [key: string]: any;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
  entries: JournalEntry[];
}

// ============================================
// BINANCE IMPORTER
// ============================================

export class BinanceImporter {
  private apiKey: string;
  private apiSecret: string;

  constructor(apiKey: string, apiSecret: string) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
  }

  async fetchTrades(
    symbol?: string,
    startTime?: number,
    endTime?: number,
    limit: number = 1000
  ): Promise<ExchangeTrade[]> {
    const trades: ExchangeTrade[] = [];
    let fromId = 0;

    do {
      const params = new URLSearchParams({
        timestamp: Date.now().toString(),
        limit: limit.toString(),
      });

      if (symbol) params.append('symbol', symbol.replace('/', ''));
      if (startTime) params.append('startTime', startTime.toString());
      if (endTime) params.append('endTime', endTime.toString());
      if (fromId > 0) params.append('fromId', fromId.toString());

      const signature = this.signRequest(params.toString());
      params.append('signature', signature);

      const response = await fetch(
        `https://api.binance.com/sapi/v1/myTrades?${params}`,
        {
          headers: {
            'X-MBX-APIKEY': this.apiKey,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Binance API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.code) {
        throw new Error(data.msg || 'Binance API error');
      }

      for (const trade of data) {
        trades.push({
          id: trade.id.toString(),
          symbol: this.normalizeSymbol(trade.symbol),
          side: trade.isBuyer ? 'BUY' : 'SELL',
          price: parseFloat(trade.price),
          quantity: parseFloat(trade.qty),
          timestamp: trade.time,
          fee: parseFloat(trade.commission),
          feeCurrency: trade.commissionAsset,
          orderId: trade.orderId.toString(),
        });
      }

      if (data.length < limit) break;
      fromId = parseInt(data[data.length - 1].id);
    } while (trades.length < 10000); // Max 10k trades

    return trades;
  }

  async fetchFuturesTrades(
    symbol?: string,
    startTime?: number,
    endTime?: number,
    limit: number = 1000
  ): Promise<ExchangeTrade[]> {
    const trades: ExchangeTrade[] = [];
    let startTimeCursor = startTime || Date.now() - 30 * 24 * 60 * 60 * 1000;

    while (startTimeCursor < Date.now()) {
      const params = new URLSearchParams({
        timestamp: Date.now().toString(),
        startTime: startTimeCursor.toString(),
        endTime: Math.min(startTimeCursor + 7 * 24 * 60 * 60 * 1000, Date.now()).toString(),
        limit: limit.toString(),
      });

      if (symbol) params.append('symbol', symbol.replace('/', ''));

      const signature = this.signRequest(params.toString());
      params.append('signature', signature);

      const response = await fetch(
        `https://fapi.binance.com/fapi/v1/userTrades?${params}`,
        {
          headers: {
            'X-MBX-APIKEY': this.apiKey,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Binance Futures API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.code) {
        throw new Error(data.msg || 'Binance Futures API error');
      }

      for (const trade of data) {
        trades.push({
          id: trade.id.toString(),
          symbol: this.normalizeSymbol(trade.symbol),
          side: trade.buyer ? 'BUY' : 'SELL',
          price: parseFloat(trade.price),
          quantity: parseFloat(trade.qty),
          timestamp: trade.time,
          fee: parseFloat(trade.commission),
          feeCurrency: trade.commissionAsset,
          orderId: trade.orderId.toString(),
        });
      }

      if (data.length < limit) break;
      startTimeCursor = Math.min(...data.map((t: any) => t.time)) - 1;
    }

    return trades;
  }

  private normalizeSymbol(symbol: string): string {
    // BTCUSDT -> BTC/USDT
    const match = symbol.match(/^([A-Z]+)([A-Z]+)$/);
    if (match) {
      return `${match[1]}/${match[2]}`;
    }
    return symbol;
  }

  private signRequest(queryString: string): string {
    const crypto = require('crypto');
    return crypto
      .createHmac('sha256', this.apiSecret)
      .update(queryString)
      .digest('hex');
  }
}

// ============================================
// BYBIT IMPORTER
// ============================================

export class BybitImporter {
  private apiKey: string;
  private apiSecret: string;

  constructor(apiKey: string, apiSecret: string) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
  }

  async fetchTrades(
    symbol?: string,
    startTime?: number,
    endTime?: number,
    limit: number = 1000
  ): Promise<ExchangeTrade[]> {
    const trades: ExchangeTrade[] = [];
    let cursor = '';

    do {
      const timestamp = Date.now();
      const params: any = {
        category: 'spot',
        limit: limit.toString(),
      };

      if (symbol) params.symbol = symbol.replace('/', '');
      if (startTime) params.startTime = startTime.toString();
      if (endTime) params.endTime = endTime.toString();
      if (cursor) params.cursor = cursor;

      const signature = this.signRequest('GET', '/v5/execution/list', timestamp, params);

      const response = await fetch(
        `https://api.bybit.com/v5/execution/list?${new URLSearchParams(params).toString()}`,
        {
          headers: {
            'X-BAPI-API-KEY': this.apiKey,
            'X-BAPI-SIGN': signature,
            'X-BAPI-SIGN-TYPE': '2',
            'X-BAPI-TIMESTAMP': timestamp.toString(),
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Bybit API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.retCode !== 0) {
        throw new Error(data.retMsg || 'Bybit API error');
      }

      for (const trade of data.result.list) {
        trades.push({
          id: trade.execId,
          symbol: this.normalizeSymbol(trade.symbol),
          side: trade.side === 'Buy' ? 'BUY' : 'SELL',
          price: parseFloat(trade.execPrice),
          quantity: parseFloat(trade.execQty),
          timestamp: parseInt(trade.execTime),
          fee: parseFloat(trade.feeRate || '0'),
          orderId: trade.orderId,
        });
      }

      cursor = data.result.nextPageCursor || '';
    } while (cursor && trades.length < 10000);

    return trades;
  }

  async fetchFuturesTrades(
    symbol?: string,
    startTime?: number,
    endTime?: number,
    limit: number = 1000
  ): Promise<ExchangeTrade[]> {
    const trades: ExchangeTrade[] = [];
    let cursor = '';

    do {
      const timestamp = Date.now();
      const params: any = {
        category: 'linear',
        limit: limit.toString(),
      };

      if (symbol) params.symbol = symbol.replace('/', '');
      if (startTime) params.startTime = startTime.toString();
      if (endTime) params.endTime = endTime.toString();
      if (cursor) params.cursor = cursor;

      const signature = this.signRequest('GET', '/v5/execution/list', timestamp, params);

      const response = await fetch(
        `https://api.bybit.com/v5/execution/list?${new URLSearchParams(params).toString()}`,
        {
          headers: {
            'X-BAPI-API-KEY': this.apiKey,
            'X-BAPI-SIGN': signature,
            'X-BAPI-SIGN-TYPE': '2',
            'X-BAPI-TIMESTAMP': timestamp.toString(),
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Bybit Futures API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.retCode !== 0) {
        throw new Error(data.retMsg || 'Bybit Futures API error');
      }

      for (const trade of data.result.list) {
        trades.push({
          id: trade.execId,
          symbol: this.normalizeSymbol(trade.symbol),
          side: trade.side === 'Buy' ? 'BUY' : 'SELL',
          price: parseFloat(trade.execPrice),
          quantity: parseFloat(trade.execQty),
          timestamp: parseInt(trade.execTime),
          fee: parseFloat(trade.feeRate || '0'),
          orderId: trade.orderId,
        });
      }

      cursor = data.result.nextPageCursor || '';
    } while (cursor && trades.length < 10000);

    return trades;
  }

  private normalizeSymbol(symbol: string): string {
    const match = symbol.match(/^([A-Z]+)([A-Z]+)$/);
    if (match) {
      return `${match[1]}/${match[2]}`;
    }
    return symbol;
  }

  private signRequest(method: string, path: string, timestamp: number, params: any): string {
    const crypto = require('crypto');
    const queryString = Object.entries(params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('&');
    const message = timestamp + this.apiKey + queryString;
    return crypto
      .createHmac('sha256', this.apiSecret)
      .update(message)
      .digest('hex');
  }
}

// ============================================
// OKX IMPORTER
// ============================================

export class OKXImporter {
  private apiKey: string;
  private apiSecret: string;
  private passphrase: string;

  constructor(apiKey: string, apiSecret: string, passphrase: string) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.passphrase = passphrase;
  }

  async fetchTrades(
    symbol?: string,
    startTime?: number,
    endTime?: number,
    limit: number = 1000
  ): Promise<ExchangeTrade[]> {
    const trades: ExchangeTrade[] = [];
    let after = '';

    do {
      const timestamp = new Date().toISOString();
      const path = '/api/v5/trades/history';
      const params: any = {
        instType: 'SPOT',
        limit: limit.toString(),
      };

      if (symbol) params.instId = symbol.replace('/', '-');
      if (after) params.after = after;

      const signature = this.signRequest('GET', path, timestamp, JSON.stringify(params));

      const response = await fetch(`https://www.okx.com${path}`, {
        headers: {
          'OK-ACCESS-KEY': this.apiKey,
          'OK-ACCESS-SIGN': signature,
          'OK-ACCESS-TIMESTAMP': timestamp,
          'OK-ACCESS-PASSPHRASE': this.passphrase,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`OKX API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.code !== '0') {
        throw new Error(data.msg || 'OKX API error');
      }

      for (const trade of data.data) {
        trades.push({
          id: trade.tradeId,
          symbol: this.normalizeSymbol(trade.instId),
          side: trade.side.toUpperCase() as 'BUY' | 'SELL',
          price: parseFloat(trade.px),
          quantity: parseFloat(trade.sz),
          timestamp: parseInt(trade.uTime),
          fee: parseFloat(trade.fee || '0'),
          orderId: trade.ordId,
        });
      }

      after = data.data[data.length - 1]?.tradeId || '';
    } while (after && trades.length < 10000);

    return trades;
  }

  private normalizeSymbol(symbol: string): string {
    return symbol.replace('-', '/');
  }

  private signRequest(method: string, path: string, timestamp: string, body: string): string {
    const crypto = require('crypto');
    const message = timestamp + method + path + body;
    return crypto
      .createHmac('sha256', this.apiSecret)
      .update(message)
      .digest('base64');
  }
}

// ============================================
// IMPORT MANAGER
// ============================================

import { JournalManager } from '../manager';
import { JournalEntry, IndicatorSnapshot } from '../types';

export class TradeImportManager {
  private journal: JournalManager;
  private binance?: BinanceImporter;
  private bybit?: BybitImporter;
  private okx?: OKXImporter;

  constructor(journal: JournalManager) {
    this.journal = journal;
  }

  setCredentials(
    exchange: 'binance' | 'bybit' | 'okx',
    credentials: {
      apiKey: string;
      apiSecret: string;
      passphrase?: string;
    }
  ) {
    switch (exchange) {
      case 'binance':
        this.binance = new BinanceImporter(credentials.apiKey, credentials.apiSecret);
        break;
      case 'bybit':
        this.bybit = new BybitImporter(credentials.apiKey, credentials.apiSecret);
        break;
      case 'okx':
        this.okx = new OKXImporter(
          credentials.apiKey,
          credentials.apiSecret,
          credentials.passphrase || ''
        );
        break;
    }
  }

  async importFromExchange(
    exchange: 'binance' | 'bybit' | 'okx',
    options: {
      symbol?: string;
      startTime?: number;
      endTime?: number;
      includeFutures?: boolean;
    } = {}
  ): Promise<ImportResult> {
    const result: ImportResult = {
      imported: 0,
      skipped: 0,
      errors: [],
      entries: [],
    };

    let trades: ExchangeTrade[] = [];

    try {
      switch (exchange) {
        case 'binance':
          if (!this.binance) {
            throw new Error('Binance credentials not set');
          }
          trades = await this.binance.fetchTrades(
            options.symbol,
            options.startTime,
            options.endTime
          );
          if (options.includeFutures) {
            const futures = await this.binance.fetchFuturesTrades(
              options.symbol,
              options.startTime,
              options.endTime
            );
            trades = [...trades, ...futures];
          }
          break;

        case 'bybit':
          if (!this.bybit) {
            throw new Error('Bybit credentials not set');
          }
          trades = await this.bybit.fetchTrades(
            options.symbol,
            options.startTime,
            options.endTime
          );
          if (options.includeFutures) {
            const futures = await this.bybit.fetchFuturesTrades(
              options.symbol,
              options.startTime,
              options.endTime
            );
            trades = [...trades, ...futures];
          }
          break;

        case 'okx':
          if (!this.okx) {
            throw new Error('OKX credentials not set');
          }
          trades = await this.okx.fetchTrades(
            options.symbol,
            options.startTime,
            options.endTime
          );
          break;
      }
    } catch (error: any) {
      result.errors.push(`Failed to fetch trades: ${error.message}`);
      return result;
    }

    // Convert trades to journal entries
    for (const trade of trades) {
      try {
        const entry = await this.convertTradeToEntry(exchange, trade);
        
        // Check for duplicates
        const existing = await this.journal.getEntries({
          symbol: entry.symbol,
          dateFrom: entry.entryTime - 60000,
          dateTo: entry.entryTime + 60000,
        });

        const isDuplicate = existing.some(
          e => e.orderId === entry.orderId || 
               (Math.abs(e.entryTime - entry.entryTime) < 60000 && 
                e.entryPrice === entry.entryPrice &&
                e.quantity === entry.quantity)
        );

        if (isDuplicate) {
          result.skipped++;
        } else {
          await this.journal.captureTrade(entry, []);
          result.imported++;
          result.entries.push(entry);
        }
      } catch (error: any) {
        result.errors.push(`Failed to import trade ${trade.id}: ${error.message}`);
      }
    }

    return result;
  }

  private async convertTradeToEntry(
    exchange: string,
    trade: ExchangeTrade
  ): Promise<JournalEntry> {
    // Note: This creates a basic entry. In production, you'd want to:
    // 1. Fetch the corresponding order to get SL/TP
    // 2. Fetch indicator values at the time of entry
    // 3. Group multiple fills into single entry if needed

    return {
      id: `import_${exchange}_${trade.id}`,
      symbol: trade.symbol,
      exchange,
      direction: trade.side === 'BUY' ? 'LONG' : 'SHORT',
      status: 'closed', // Imported trades are already closed
      entryPrice: trade.price,
      entryTime: trade.timestamp,
      entryTimeframe: 'unknown', // Would need to fetch from order
      quantity: trade.quantity,
      exitPrice: trade.price, // For imported trades, entry = exit (single fill)
      exitTime: trade.timestamp,
      exitTimeframe: 'unknown',
      pnl: 0, // Would need to calculate from order
      commission: trade.fee || 0,
      orderId: trade.orderId,
      activeIndicators: [],
      indicatorValues: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }
}

// ============================================
// EXPORTS
// ============================================

export default {
  BinanceImporter,
  BybitImporter,
  OKXImporter,
  TradeImportManager,
};
