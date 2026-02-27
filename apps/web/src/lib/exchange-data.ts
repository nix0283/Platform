// ============================================
// EXCHANGE DATA SERVICE
// Подключение к реальным биржам для ML анализа
// ============================================

import { Candle } from '@trading-platform/core';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

export interface ExchangeConfig {
  id: string;
  name: string;
  restUrl: string;
  wsUrl: string;
}

const EXCHANGES: Record<string, ExchangeConfig> = {
  binance: {
    id: 'binance',
    name: 'Binance',
    restUrl: 'https://api.binance.com',
    wsUrl: 'wss://stream.binance.com:9443/ws',
  },
  bybit: {
    id: 'bybit',
    name: 'Bybit',
    restUrl: 'https://api.bybit.com',
    wsUrl: 'wss://stream.bybit.com/v5/public/linear',
  },
  okx: {
    id: 'okx',
    name: 'OKX',
    restUrl: 'https://www.okx.com',
    wsUrl: 'wss://ws.okx.com:8443/ws/v5/public',
  },
};

/**
 * Получить свечи с реальной биржи
 */
export async function fetchCandlesFromExchange(
  exchange: string,
  symbol: string,
  interval: string,
  limit: number = 100
): Promise<Candle[]> {
  try {
    // Попытка получить через backend
    const response = await fetch(
      `${BACKEND_URL}/api/candles?exchange=${exchange}&symbol=${symbol}&interval=${interval}&limit=${limit}`
    );

    if (response.ok) {
      const data = await response.json();
      return data;
    }

    // Fallback: прямой запрос к бирже (публичное API)
    return await fetchCandlesDirect(exchange, symbol, interval, limit);
  } catch (error) {
    console.error('Failed to fetch candles:', error);
    return [];
  }
}

/**
 * Прямой запрос к бирже (без авторизации)
 */
async function fetchCandlesDirect(
  exchange: string,
  symbol: string,
  interval: string,
  limit: number
): Promise<Candle[]> {
  const config = EXCHANGES[exchange.toLowerCase()];
  if (!config) {
    throw new Error(`Exchange ${exchange} not supported`);
  }

  const normalizedSymbol = symbol.replace('/', '').replace('-', '');

  try {
    let url: string;

    switch (exchange.toLowerCase()) {
      case 'binance':
        url = `${config.restUrl}/api/v3/klines?symbol=${normalizedSymbol}&interval=${interval}&limit=${limit}`;
        break;
      case 'bybit':
        url = `${config.restUrl}/v5/market/kline?category=linear&symbol=${normalizedSymbol}&interval=${mapIntervalBybit(interval)}&limit=${limit}`;
        break;
      case 'okx':
        url = `${config.restUrl}/api/v5/market/candles?instId=${normalizedSymbol.replace('-', '-')}&bar=${mapIntervalOkx(interval)}&limit=${limit}`;
        break;
      default:
        throw new Error(`Exchange ${exchange} not supported`);
    }

    const response = await fetch(url);
    const data = await response.json();

    return parseExchangeResponse(data, exchange, symbol, interval);
  } catch (error) {
    console.error('Direct exchange fetch failed:', error);
    return [];
  }
}

/**
 * Парсинг ответа от биржи
 */
function parseExchangeResponse(data: any, exchange: string, symbol: string, interval: string): Candle[] {
  try {
    switch (exchange.toLowerCase()) {
      case 'binance':
        return data.map((k: any[]): Candle => ({
          timestamp: k[0],
          open: parseFloat(k[1]),
          high: parseFloat(k[2]),
          low: parseFloat(k[3]),
          close: parseFloat(k[4]),
          volume: parseFloat(k[5]),
          symbol,
          interval,
        }));

      case 'bybit':
        return data.result?.list?.map((k: any[]): Candle => ({
          timestamp: parseInt(k[0]),
          open: parseFloat(k[1]),
          high: parseFloat(k[2]),
          low: parseFloat(k[3]),
          close: parseFloat(k[4]),
          volume: parseFloat(k[5]),
          symbol,
          interval,
        })) || [];

      case 'okx':
        return data.data?.map((k: any[]): Candle => ({
          timestamp: parseInt(k[0]),
          open: parseFloat(k[1]),
          high: parseFloat(k[2]),
          low: parseFloat(k[3]),
          close: parseFloat(k[4]),
          volume: parseFloat(k[5]),
          symbol,
          interval,
        })) || [];

      default:
        return [];
    }
  } catch (error) {
    console.error('Failed to parse exchange response:', error);
    return [];
  }
}

/**
 * Получить топ символов по объему
 */
export async function fetchTopSymbols(
  exchange: string,
  limit: number = 20
): Promise<string[]> {
  const config = EXCHANGES[exchange.toLowerCase()];
  if (!config) return [];

  try {
    let url: string;

    switch (exchange.toLowerCase()) {
      case 'binance':
        url = `${config.restUrl}/api/v3/ticker/24hr`;
        break;
      case 'bybit':
        url = `${config.restUrl}/v5/market/tickers?category=linear`;
        break;
      case 'okx':
        url = `${config.restUrl}/api/v5/market/tickers?instType=SWAP`;
        break;
      default:
        return [];
    }

    const response = await fetch(url);
    const data = await response.json();

    let tickers: any[] = [];

    switch (exchange.toLowerCase()) {
      case 'binance':
        tickers = data;
        break;
      case 'bybit':
        tickers = data.result?.list || [];
        break;
      case 'okx':
        tickers = data.data || [];
        break;
    }

    // Сортировка по объему и фильтрация USDT пар
    const usdtPairs = tickers
      .filter((t: any) => {
        const symbol = t.symbol || t.instId || '';
        return symbol.includes('USDT') || symbol.includes('USD');
      })
      .sort((a: any, b: any) => {
        const volA = parseFloat(a.volume || a.vol24h || '0');
        const volB = parseFloat(b.volume || b.vol24h || '0');
        return volB - volA;
      })
      .slice(0, limit);

    return usdtPairs.map((t: any) => {
      const symbol = t.symbol || t.instId || '';
      // Нормализация формата
      if (symbol.includes('USDT')) {
        const base = symbol.replace('USDT', '');
        return `${base}/USDT`;
      }
      return symbol;
    });
  } catch (error) {
    console.error('Failed to fetch top symbols:', error);
    return [];
  }
}

/**
 * Маппинг интервалов для Bybit
 */
function mapIntervalBybit(interval: string): string {
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
  return mapping[interval] || '60';
}

/**
 * Маппинг интервалов для OKX
 */
function mapIntervalOkx(interval: string): string {
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
  return mapping[interval] || '1H';
}

/**
 * Получить текущие цены для списка символов
 */
export async function fetchCurrentPrices(
  exchange: string,
  symbols: string[]
): Promise<Record<string, number>> {
  const prices: Record<string, number> = {};

  try {
    const config = EXCHANGES[exchange.toLowerCase()];
    if (!config) return prices;

    // Запрос для каждого символа (можно оптимизировать)
    for (const symbol of symbols.slice(0, 10)) {
      try {
        const normalizedSymbol = symbol.replace('/', '').replace('-', '');
        const url = `${config.restUrl}/api/v3/ticker/price?symbol=${normalizedSymbol}`;
        const response = await fetch(url);
        const data = await response.json();
        prices[symbol] = parseFloat(data.price || '0');
      } catch (error) {
        console.error(`Failed to fetch price for ${symbol}:`, error);
      }
    }
  } catch (error) {
    console.error('Failed to fetch current prices:', error);
  }

  return prices;
}
