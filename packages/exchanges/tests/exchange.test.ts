// ============================================
// EXCHANGE CONNECTION TESTS
// Тестирование подключения ко всем биржам
// ============================================

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  BinanceAdapter,
  BybitAdapter,
  OKXAdapter,
  BitgetAdapter,
  BingXAdapter,
} from '../src';

// Тестовые конфигурации (использовать testnet ключи!)
const TEST_CONFIG = {
  binance: {
    apiKey: process.env.BINANCE_TEST_API_KEY || '',
    apiSecret: process.env.BINANCE_TEST_API_SECRET || '',
  },
  bybit: {
    apiKey: process.env.BYBIT_TEST_API_KEY || '',
    apiSecret: process.env.BYBIT_TEST_API_SECRET || '',
  },
  okx: {
    apiKey: process.env.OKX_TEST_API_KEY || '',
    apiSecret: process.env.OKX_TEST_API_SECRET || '',
    passphrase: process.env.OKX_TEST_PASSPHRASE || '',
  },
  bitget: {
    apiKey: process.env.BITGET_TEST_API_KEY || '',
    apiSecret: process.env.BITGET_TEST_API_SECRET || '',
    passphrase: process.env.BITGET_TEST_PASSPHRASE || '',
  },
  bingx: {
    apiKey: process.env.BINGX_TEST_API_KEY || '',
    apiSecret: process.env.BINGX_TEST_API_SECRET || '',
  },
};

const TEST_SYMBOL = 'BTC/USDT';
const TEST_INTERVAL = '1h';

describe('Exchange Adapters', () => {
  describe('BinanceAdapter', () => {
    let adapter: BinanceAdapter;

    beforeAll(() => {
      adapter = new BinanceAdapter(
        TEST_CONFIG.binance.apiKey,
        TEST_CONFIG.binance.apiSecret
      );
    });

    it('should fetch symbols', async () => {
      const symbols = await adapter.getSymbols();
      expect(symbols).toBeInstanceOf(Array);
      expect(symbols.length).toBeGreaterThan(0);
      expect(symbols[0]).toHaveProperty('symbol');
      expect(symbols[0]).toHaveProperty('baseAsset');
      expect(symbols[0]).toHaveProperty('quoteAsset');
    });

    it('should fetch candles', async () => {
      const candles = await adapter.getCandles(TEST_SYMBOL, TEST_INTERVAL, 100);
      expect(candles).toBeInstanceOf(Array);
      expect(candles.length).toBeGreaterThan(0);
      expect(candles[0]).toHaveProperty('timestamp');
      expect(candles[0]).toHaveProperty('open');
      expect(candles[0]).toHaveProperty('high');
      expect(candles[0]).toHaveProperty('low');
      expect(candles[0]).toHaveProperty('close');
      expect(candles[0]).toHaveProperty('volume');
    });

    it('should connect to WebSocket', async () => {
      await adapter.connect();
      expect(adapter.connected).toBe(true);
      await adapter.disconnect();
    });

    it('should subscribe to candles via WebSocket', async () => {
      await adapter.connect();
      
      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('WebSocket subscription timeout'));
        }, 10000);

        adapter.subscribeCandles(TEST_SYMBOL, TEST_INTERVAL, (candle) => {
          clearTimeout(timeout);
          expect(candle).toHaveProperty('timestamp');
          expect(candle).toHaveProperty('close');
          adapter.disconnect().then(() => resolve());
        });
      });
    });

    it('should normalize symbols correctly', () => {
      expect(adapter.normalizeSymbol('BTC/USDT')).toBe('BTCUSDT');
      expect(adapter.normalizeSymbol('ETH/USDT')).toBe('ETHUSDT');
    });

    it('should denormalize symbols correctly', () => {
      expect(adapter.denormalizeSymbol('BTCUSDT')).toBe('BTC/USDT');
      expect(adapter.denormalizeSymbol('ETHUSDT')).toBe('ETH/USDT');
    });
  });

  describe('BybitAdapter', () => {
    let adapter: BybitAdapter;

    beforeAll(() => {
      adapter = new BybitAdapter(
        TEST_CONFIG.bybit.apiKey,
        TEST_CONFIG.bybit.apiSecret
      );
    });

    it('should fetch symbols', async () => {
      const symbols = await adapter.getSymbols();
      expect(symbols.length).toBeGreaterThan(0);
    });

    it('should fetch candles', async () => {
      const candles = await adapter.getCandles(TEST_SYMBOL, TEST_INTERVAL, 100);
      expect(candles.length).toBeGreaterThan(0);
    });

    it('should map intervals correctly', () => {
      expect((adapter as any).mapInterval('1h')).toBe('60');
      expect((adapter as any).mapInterval('4h')).toBe('240');
      expect((adapter as any).mapInterval('1d')).toBe('D');
    });
  });

  describe('OKXAdapter', () => {
    let adapter: OKXAdapter;

    beforeAll(() => {
      adapter = new OKXAdapter(
        TEST_CONFIG.okx.apiKey,
        TEST_CONFIG.okx.apiSecret,
        TEST_CONFIG.okx.passphrase
      );
    });

    it('should fetch symbols', async () => {
      const symbols = await adapter.getSymbols();
      expect(symbols.length).toBeGreaterThan(0);
    });

    it('should fetch candles', async () => {
      const candles = await adapter.getCandles(TEST_SYMBOL, TEST_INTERVAL, 100);
      expect(candles.length).toBeGreaterThan(0);
    });

    it('should map intervals correctly', () => {
      expect((adapter as any).mapInterval('1h')).toBe('1H');
      expect((adapter as any).mapInterval('4h')).toBe('4H');
    });
  });

  describe('BitgetAdapter', () => {
    let adapter: BitgetAdapter;

    beforeAll(() => {
      adapter = new BitgetAdapter(
        TEST_CONFIG.bitget.apiKey,
        TEST_CONFIG.bitget.apiSecret,
        TEST_CONFIG.bitget.passphrase
      );
    });

    it('should fetch symbols', async () => {
      const symbols = await adapter.getSymbols();
      expect(symbols.length).toBeGreaterThan(0);
    });

    it('should fetch candles', async () => {
      const candles = await adapter.getCandles(TEST_SYMBOL, TEST_INTERVAL, 100);
      expect(candles.length).toBeGreaterThan(0);
    });
  });

  describe('BingXAdapter', () => {
    let adapter: BingXAdapter;

    beforeAll(() => {
      adapter = new BingXAdapter(
        TEST_CONFIG.bingx.apiKey,
        TEST_CONFIG.bingx.apiSecret
      );
    });

    it('should fetch symbols', async () => {
      const symbols = await adapter.getSymbols();
      expect(symbols.length).toBeGreaterThan(0);
    });

    it('should fetch candles', async () => {
      const candles = await adapter.getCandles(TEST_SYMBOL, TEST_INTERVAL, 100);
      expect(candles.length).toBeGreaterThan(0);
    });
  });
});

// ============================================
// INTEGRATION TESTS — Public API (без ключей)
// ============================================

describe('Exchange Public API (No Auth)', () => {
  it('Binance: should fetch public candles without auth', async () => {
    const adapter = new BinanceAdapter();
    const candles = await adapter.getCandles('BTC/USDT', '1h', 10);
    expect(candles.length).toBe(10);
  });

  it('Bybit: should fetch public candles without auth', async () => {
    const adapter = new BybitAdapter();
    const candles = await adapter.getCandles('BTC/USDT', '60', 10);
    expect(candles.length).toBeGreaterThan(0);
  });

  it('OKX: should fetch public candles without auth', async () => {
    const adapter = new OKXAdapter();
    const candles = await adapter.getCandles('BTC-USDT', '1H', 10);
    expect(candles.length).toBeGreaterThan(0);
  });
});

// ============================================
// PERFORMANCE TESTS
// ============================================

describe('Exchange Performance', () => {
  it('Binance: should fetch 1000 candles in under 2 seconds', async () => {
    const adapter = new BinanceAdapter();
    const start = Date.now();
    await adapter.getCandles('BTC/USDT', '1m', 1000);
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(2000);
  });

  it('should handle multiple concurrent requests', async () => {
    const adapter = new BinanceAdapter();
    const symbols = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT'];
    
    const start = Date.now();
    await Promise.all(
      symbols.map(symbol => adapter.getCandles(symbol, '1h', 100))
    );
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(3000);
  });
});
