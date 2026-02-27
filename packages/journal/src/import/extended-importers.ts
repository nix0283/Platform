// ============================================
// EXTENDED EXCHANGE IMPORTERS
// Импорт фьючерсных сделок + авто-синхронизация
// ============================================

import { ExchangeTrade, ImportResult } from './exchange-importers';

// ============================================
// OKX FUTURES IMPORTER
// ============================================

export class OKXFuturesImporter {
  private apiKey: string;
  private apiSecret: string;
  private passphrase: string;

  constructor(apiKey: string, apiSecret: string, passphrase: string) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.passphrase = passphrase;
  }

  async fetchFuturesTrades(
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
        instType: 'SWAP', // SWAP = perpetual futures
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
        throw new Error(`OKX Futures API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.code !== '0') {
        throw new Error(data.msg || 'OKX Futures API error');
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

  async fetchPositions(): Promise<any[]> {
    const timestamp = new Date().toISOString();
    const path = '/api/v5/account/positions';
    const params = { instType: 'SWAP' };

    const signature = this.signRequest('GET', path, timestamp, JSON.stringify(params));

    const response = await fetch(`${path}?${new URLSearchParams(params)}`, {
      headers: {
        'OK-ACCESS-KEY': this.apiKey,
        'OK-ACCESS-SIGN': signature,
        'OK-ACCESS-TIMESTAMP': timestamp,
        'OK-ACCESS-PASSPHRASE': this.passphrase,
      },
    });

    if (!response.ok) {
      throw new Error(`OKX Positions API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.code !== '0') {
      throw new Error(data.msg || 'OKX Positions API error');
    }

    return data.data.filter((pos: any) => parseFloat(pos.pos) !== 0);
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
// BITGET IMPORTER
// ============================================

export class BitgetImporter {
  private apiKey: string;
  private apiSecret: string;
  private passphrase: string;

  constructor(apiKey: string, apiSecret: string, passphrase: string) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.passphrase = passphrase;
  }

  async fetchSpotTrades(
    symbol?: string,
    startTime?: number,
    endTime?: number,
    limit: number = 1000
  ): Promise<ExchangeTrade[]> {
    return this.fetchTrades('spot', symbol, startTime, endTime, limit);
  }

  async fetchFuturesTrades(
    symbol?: string,
    startTime?: number,
    endTime?: number,
    limit: number = 1000
  ): Promise<ExchangeTrade[]> {
    return this.fetchTrades('swap', symbol, startTime, endTime, limit);
  }

  private async fetchTrades(
    productType: 'spot' | 'swap',
    symbol?: string,
    startTime?: number,
    endTime?: number,
    limit: number = 1000
  ): Promise<ExchangeTrade[]> {
    const trades: ExchangeTrade[] = [];
    let endTimeCursor = endTime || Date.now();

    while (endTimeCursor > (startTime || 0)) {
      const timestamp = Date.now().toString();
      const path = '/api/v2/spot/trade/fills';
      const params: any = {
        productType: productType.toUpperCase(),
        limit: limit.toString(),
        endTime: endTimeCursor.toString(),
      };

      if (symbol) params.symbol = symbol.replace('/', '');

      const signature = this.signRequest('GET', path, timestamp, JSON.stringify(params));

      const response = await fetch(`https://api.bitget.com${path}?${new URLSearchParams(params)}`, {
        headers: {
          'ACCESS-KEY': this.apiKey,
          'ACCESS-SIGN': signature,
          'ACCESS-TIMESTAMP': timestamp,
          'ACCESS-PASSPHRASE': this.passphrase,
        },
      });

      if (!response.ok) {
        throw new Error(`Bitget API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.code !== '00000') {
        throw new Error(data.msg || 'Bitget API error');
      }

      for (const trade of data.data) {
        trades.push({
          id: trade.tradeId,
          symbol: this.normalizeSymbol(trade.symbol),
          side: trade.side.toUpperCase() as 'BUY' | 'SELL',
          price: parseFloat(trade.price),
          quantity: parseFloat(trade.quantity),
          timestamp: parseInt(trade.cTime),
          fee: parseFloat(trade.fee || '0'),
          orderId: trade.orderId,
        });
      }

      if (data.data.length < limit) break;
      endTimeCursor = Math.min(...data.data.map((t: any) => parseInt(t.cTime))) - 1;
    }

    return trades;
  }

  async fetchPositions(): Promise<any[]> {
    const timestamp = Date.now().toString();
    const path = '/api/v2/swap/position/allPosition';
    const params = { productType: 'UMCBL' };

    const signature = this.signRequest('GET', path, timestamp, JSON.stringify(params));

    const response = await fetch(`https://api.bitget.com${path}?${new URLSearchParams(params)}`, {
      headers: {
        'ACCESS-KEY': this.apiKey,
        'ACCESS-SIGN': signature,
        'ACCESS-TIMESTAMP': timestamp,
        'ACCESS-PASSPHRASE': this.passphrase,
      },
    });

    if (!response.ok) {
      throw new Error(`Bitget Positions API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.code !== '00000') {
      throw new Error(data.msg || 'Bitget Positions API error');
    }

    return data.data.filter((pos: any) => parseFloat(pos.total) !== 0);
  }

  private normalizeSymbol(symbol: string): string {
    const match = symbol.match(/^([A-Z]+)([A-Z]+)$/);
    if (match) {
      return `${match[1]}/${match[2]}`;
    }
    return symbol;
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
// BINGX IMPORTER
// ============================================

export class BingXImporter {
  private apiKey: string;
  private apiSecret: string;

  constructor(apiKey: string, apiSecret: string) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
  }

  async fetchSpotTrades(
    symbol?: string,
    startTime?: number,
    endTime?: number,
    limit: number = 1000
  ): Promise<ExchangeTrade[]> {
    return this.fetchTrades('spot', symbol, startTime, endTime, limit);
  }

  async fetchFuturesTrades(
    symbol?: string,
    startTime?: number,
    endTime?: number,
    limit: number = 1000
  ): Promise<ExchangeTrade[]> {
    return this.fetchTrades('swap', symbol, startTime, endTime, limit);
  }

  private async fetchTrades(
    category: 'spot' | 'swap',
    symbol?: string,
    startTime?: number,
    endTime?: number,
    limit: number = 1000
  ): Promise<ExchangeTrade[]> {
    const trades: ExchangeTrade[] = [];
    let offset = 0;

    do {
      const timestamp = Date.now();
      const params: any = {
        limit: limit.toString(),
        offset: offset.toString(),
      };

      if (symbol) params.symbol = symbol.replace('/', '-');
      if (startTime) params.startTime = startTime.toString();
      if (endTime) params.endTime = endTime.toString();

      const signature = this.signRequest(params, timestamp);

      const response = await fetch(
        `https://open-api.bingx.com/open-api/${category}/v1/trades/myTrades?${new URLSearchParams(params)}&signature=${signature}`,
        {
          headers: {
            'X-BX-APIKEY': this.apiKey,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`BingX API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'BingX API error');
      }

      for (const trade of data.results) {
        trades.push({
          id: trade.id.toString(),
          symbol: this.normalizeSymbol(trade.symbol),
          side: trade.side.toUpperCase() as 'BUY' | 'SELL',
          price: parseFloat(trade.price),
          quantity: parseFloat(trade.qty),
          timestamp: trade.timestamp,
          fee: parseFloat(trade.commission || '0'),
          orderId: trade.orderId,
        });
      }

      offset += limit;
    } while (trades.length < 10000);

    return trades;
  }

  async fetchPositions(): Promise<any[]> {
    const timestamp = Date.now();
    const params = {};
    const signature = this.signRequest(params, timestamp);

    const response = await fetch(
      `https://open-api.bingx.com/open-api/swap/v2/position/openPositions?signature=${signature}`,
      {
        headers: {
          'X-BX-APIKEY': this.apiKey,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`BingX Positions API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'BingX Positions API error');
    }

    return data.data.positions.filter((pos: any) => parseFloat(pos.positionAmt) !== 0);
  }

  private normalizeSymbol(symbol: string): string {
    return symbol.replace('-', '/');
  }

  private signRequest(params: any, timestamp: number): string {
    const crypto = require('crypto');
    const queryString = new URLSearchParams(params).toString();
    return crypto
      .createHmac('sha256', this.apiSecret)
      .update(queryString)
      .digest('hex');
  }
}

// ============================================
// AUTO-SYNC SERVICE
// ============================================

import { JournalManager } from '../manager';
import { JournalEntry } from '../types';

export interface SyncConfig {
  enabled: boolean;
  interval: number; // seconds
  exchanges: Array<{
    id: string;
    apiKey: string;
    apiSecret: string;
    passphrase?: string;
    autoImport: boolean;
    autoSyncPositions: boolean;
  }>;
}

export class TradeSyncService {
  private journal: JournalManager;
  private config: SyncConfig;
  private syncInterval?: NodeJS.Timeout;
  private importers: Map<string, any> = new Map();
  private lastSyncTime: Map<string, number> = new Map();

  constructor(journal: JournalManager, config: SyncConfig) {
    this.journal = journal;
    this.config = config;
    this.initializeImporters();
  }

  private initializeImporters() {
    for (const exchange of this.config.exchanges) {
      switch (exchange.id) {
        case 'okx':
          this.importers.set(exchange.id, {
            spot: null, // Would need OKX spot importer
            futures: new OKXFuturesImporter(
              exchange.apiKey,
              exchange.apiSecret,
              exchange.passphrase || ''
            ),
          });
          break;
        case 'bitget':
          this.importers.set(exchange.id, new BitgetImporter(
            exchange.apiKey,
            exchange.apiSecret,
            exchange.passphrase || ''
          ));
          break;
        case 'bingx':
          this.importers.set(exchange.id, new BingXImporter(
            exchange.apiKey,
            exchange.apiSecret
          ));
          break;
      }
    }
  }

  startAutoSync() {
    if (!this.config.enabled) return;

    this.syncInterval = setInterval(() => {
      this.syncAllExchanges();
    }, this.config.interval * 1000);

    console.log(`🔄 Auto-sync started (interval: ${this.config.interval}s)`);
  }

  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = undefined;
    }
    console.log('⏹️ Auto-sync stopped');
  }

  async syncAllExchanges() {
    const results: Array<{ exchange: string; imported: number; errors: string[] }> = [];

    for (const exchange of this.config.exchanges) {
      if (!exchange.autoImport) continue;

      try {
        const result = await this.syncExchange(exchange.id);
        results.push({
          exchange: exchange.id,
          imported: result.imported,
          errors: result.errors,
        });
      } catch (error: any) {
        results.push({
          exchange: exchange.id,
          imported: 0,
          errors: [error.message],
        });
      }
    }

    return results;
  }

  async syncExchange(exchangeId: string): Promise<ImportResult> {
    const result: ImportResult = {
      imported: 0,
      skipped: 0,
      errors: [],
      entries: [],
    };

    const lastSync = this.lastSyncTime.get(exchangeId) || (Date.now() - 3600000); // Default 1 hour ago
    const importer = this.importers.get(exchangeId);

    if (!importer) {
      result.errors.push(`No importer for ${exchangeId}`);
      return result;
    }

    try {
      let trades: ExchangeTrade[] = [];

      // Fetch futures trades if available
      if (importer.futures) {
        const futuresTrades = await importer.futures.fetchFuturesTrades(
          undefined,
          lastSync,
          Date.now()
        );
        trades = [...trades, ...futuresTrades];
      }

      // Fetch spot trades if available
      if (importer.spot) {
        const spotTrades = await importer.spot.fetchSpotTrades?.(
          undefined,
          lastSync,
          Date.now()
        );
        trades = [...trades, ...spotTrades];
      }

      // Convert and save trades
      for (const trade of trades) {
        try {
          const entry = await this.convertTradeToEntry(exchangeId, trade);
          
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

      this.lastSyncTime.set(exchangeId, Date.now());
    } catch (error: any) {
      result.errors.push(`Sync failed: ${error.message}`);
    }

    return result;
  }

  async syncPositions() {
    const positions: Array<{
      exchange: string;
      symbol: string;
      side: 'LONG' | 'SHORT';
      quantity: number;
      entryPrice: number;
      markPrice: number;
      unrealizedPnl: number;
    }> = [];

    for (const exchange of this.config.exchanges) {
      if (!exchange.autoSyncPositions) continue;

      try {
        const importer = this.importers.get(exchange.id);
        if (!importer) continue;

        const rawPositions = await importer.fetchPositions?.();
        if (!rawPositions) continue;

        for (const pos of rawPositions) {
          positions.push({
            exchange: exchange.id,
            symbol: this.normalizeSymbol(pos.symbol || pos.instId),
            side: pos.posSide === 'long' || parseFloat(pos.positionAmt || pos.pos) > 0 ? 'LONG' : 'SHORT',
            quantity: Math.abs(parseFloat(pos.positionAmt || pos.pos || '0')),
            entryPrice: parseFloat(pos.avgPrice || pos.entryPrice || '0'),
            markPrice: parseFloat(pos.markPrice || '0'),
            unrealizedPnl: parseFloat(pos.unrealizedPnl || pos.upl || '0'),
          });
        }
      } catch (error: any) {
        console.error(`Failed to sync positions for ${exchange.id}:`, error.message);
      }
    }

    return positions;
  }

  private async convertTradeToEntry(
    exchange: string,
    trade: ExchangeTrade
  ): Promise<JournalEntry> {
    return {
      id: `sync_${exchange}_${trade.id}`,
      symbol: trade.symbol,
      exchange,
      direction: trade.side === 'BUY' ? 'LONG' : 'SHORT',
      status: 'closed',
      entryPrice: trade.price,
      entryTime: trade.timestamp,
      entryTimeframe: 'unknown',
      quantity: trade.quantity,
      exitPrice: trade.price,
      exitTime: trade.timestamp,
      exitTimeframe: 'unknown',
      pnl: 0,
      commission: trade.fee || 0,
      orderId: trade.orderId,
      activeIndicators: [],
      indicatorValues: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  private normalizeSymbol(symbol: string): string {
    const match = symbol.match(/^([A-Z]+)([A-Z]+)$/);
    if (match) {
      return `${match[1]}/${match[2]}`;
    }
    return symbol;
  }
}

// ============================================
// EXPORTS
// ============================================

export default {
  OKXFuturesImporter,
  BitgetImporter,
  BingXImporter,
  TradeSyncService,
};
