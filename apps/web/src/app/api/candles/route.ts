import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const exchange = searchParams.get('exchange') || 'binance';
    const symbol = searchParams.get('symbol') || 'BTC/USDT';
    const interval = searchParams.get('interval') || '1h';
    const limit = searchParams.get('limit') || '1000';

    // Конвертируем символ в формат Binance (BTC/USDT -> BTCUSDT)
    const binanceSymbol = symbol.replace('/', '').toUpperCase();
    
    // Конвертируем интервал в формат Binance
    const intervalMap: Record<string, string> = {
      '1m': '1m', '3m': '3m', '5m': '5m', '15m': '15m',
      '30m': '30m', '1h': '1h', '2h': '2h', '4h': '4h',
      '6h': '6h', '12h': '12h', '1d': '1d', '1w': '1w', '1M': '1M'
    };
    const binanceInterval = intervalMap[interval] || '1h';

    // Запрос к Binance API
    const response = await fetch(
      `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${binanceInterval}&limit=${limit}`,
      { 
        headers: { 'User-Agent': 'TradingPlatform/1.0' },
        next: { revalidate: 1 }
      }
    );

    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`);
    }

    const data = await response.json();

    // Форматируем данные
    const candles = data.map((k: any[]) => ({
      time: k[0] / 1000,
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
    }));

    return NextResponse.json({ 
      success: true, 
      data: candles,
      symbol: binanceSymbol,
      interval: binanceInterval,
      count: candles.length
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        data: []
      },
      { status: 500 }
    );
  }
}
