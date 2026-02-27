'use client';
import { useState, useEffect, useCallback } from 'react';

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export function useBinanceData(symbol: string = 'BTC/USDT', interval: string = '1h') {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/candles?exchange=binance&symbol=${symbol}&interval=${interval}&limit=1000`
      );
      
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to fetch');
      }
      
      const result = await response.json();
      
      if (result.success && result.data) {
        setCandles(result.data);
        if (result.data.length > 0) {
          setCurrentPrice(result.data[result.data.length - 1].close);
        }
        setError(null);
      } else {
        throw new Error(result.error || 'No data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Fetch error:', err);
      
      // Fallback - прямой запрос к Binance если API не работает
      try {
        const binanceSymbol = symbol.replace('/', '').toUpperCase();
        const directResponse = await fetch(
          `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=1000`
        );
        const data = await directResponse.json();
        const formattedCandles: Candle[] = data.map((k: any[]) => ({
          time: k[0] / 1000,
          open: parseFloat(k[1]),
          high: parseFloat(k[2]),
          low: parseFloat(k[3]),
          close: parseFloat(k[4]),
          volume: parseFloat(k[5]),
        }));
        setCandles(formattedCandles);
        if (formattedCandles.length > 0) {
          setCurrentPrice(formattedCandles[formattedCandles.length - 1].close);
        }
        setError(null);
      } catch (fallbackErr) {
        console.error('Fallback also failed:', fallbackErr);
      }
    } finally {
      setIsLoading(false);
    }
  }, [symbol, interval]);

  useEffect(() => {
    fetchData();
    
    // WebSocket для реального времени
    const binanceSymbol = symbol.replace('/', '').toLowerCase();
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${binanceSymbol}@kline_${interval}`);
    
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      const k = message.k;
      
      const newCandle: Candle = {
        time: k.t / 1000,
        open: parseFloat(k.o),
        high: parseFloat(k.h),
        low: parseFloat(k.l),
        close: parseFloat(k.c),
        volume: parseFloat(k.v),
      };
      
      setCurrentPrice(newCandle.close);
      
      setCandles(prev => {
        const last = prev[prev.length - 1];
        if (last && last.time === newCandle.time) {
          const updated = [...prev];
          updated[updated.length - 1] = newCandle;
          return updated;
        }
        return [...prev, newCandle];
      });
    };
    
    ws.onerror = (err) => console.error('WS error:', err);
    
    return () => { ws.close(); };
  }, [symbol, interval, fetchData]);

  return { candles, currentPrice, isLoading, error };
}
