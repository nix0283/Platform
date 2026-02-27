// ============================================
// API ROUTE — GET /api/journal
// Получение записей журнала
// ============================================

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const filters = {
      symbol: searchParams.get('symbol') || undefined,
      exchange: searchParams.get('exchange') || undefined,
      direction: searchParams.get('direction') as 'LONG' | 'SHORT' | undefined,
      status: searchParams.get('status') as 'open' | 'closed' | 'cancelled' | undefined,
      setupType: searchParams.get('setupType') || undefined,
      tags: searchParams.getAll('tags'),
      dateFrom: searchParams.get('dateFrom') ? parseInt(searchParams.get('dateFrom')!) : undefined,
      dateTo: searchParams.get('dateTo') ? parseInt(searchParams.get('dateTo')!) : undefined,
      minPnl: searchParams.get('minPnl') ? parseFloat(searchParams.get('minPnl')!) : undefined,
      maxPnl: searchParams.get('maxPnl') ? parseFloat(searchParams.get('maxPnl')!) : undefined,
    };

    // In production, query from database
    // For now, return mock data
    const entries = getMockJournalEntries(filters);

    return NextResponse.json({
      success: true,
      count: entries.length,
      entries,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message, entries: [] },
      { status: 500 }
    );
  }
}

// ============================================
// API ROUTE — POST /api/journal
// Создание/обновление записи
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, entry } = body;

    if (action === 'create') {
      // Create new entry
      const newEntry = {
        ...entry,
        id: `journal_${Date.now()}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      return NextResponse.json({
        success: true,
        entry: newEntry,
      });
    } else if (action === 'update') {
      // Update existing entry
      return NextResponse.json({
        success: true,
        entry: {
          ...entry,
          updatedAt: Date.now(),
        },
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// API ROUTE — DELETE /api/journal
// Удаление записи
// ============================================

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID required' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Entry deleted',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// MOCK DATA (for development)
// ============================================

function getMockJournalEntries(filters: any) {
  const mockEntries = [
    {
      id: 'journal_1',
      symbol: 'BTC/USDT',
      exchange: 'binance',
      direction: 'LONG' as const,
      status: 'closed' as const,
      entryPrice: 42500,
      entryTime: Date.now() - 86400000 * 2,
      entryTimeframe: '1h',
      quantity: 0.1,
      stopLoss: 42000,
      stopLossTimeframe: '1h',
      takeProfits: [
        { price: 43500, percentage: 50, filled: true, filledAt: Date.now() - 43200000 },
        { price: 44500, percentage: 50, filled: true, filledAt: Date.now() - 21600000 },
      ],
      exitPrice: 44500,
      exitTime: Date.now() - 21600000,
      exitTimeframe: '1h',
      pnl: 200,
      pnlPercent: 4.71,
      commission: 2.5,
      activeIndicators: [
        { name: 'RSI', params: { period: 14 }, value: 45 },
        { name: 'EMA', params: { period: 20 }, value: 42300 },
        { name: 'MACD', params: { fast: 12, slow: 26, signal: 9 }, value: { macd: 150, signal: 120, histogram: 30 } },
      ],
      indicatorValues: {
        RSI: 45,
        EMA: 42300,
        MACD: { macd: 150, signal: 120, histogram: 30 },
      },
      setupType: 'Breakout',
      description: 'Clean breakout above resistance with strong volume',
      tags: ['breakout', 'volume', 'resistance'],
      emotions: 'Confident',
      mistakes: [],
      executionRating: 5,
      outcomeRating: 5,
      orderId: 'order_123',
      createdAt: Date.now() - 86400000 * 2,
      updatedAt: Date.now() - 21600000,
    },
    {
      id: 'journal_2',
      symbol: 'ETH/USDT',
      exchange: 'binance',
      direction: 'SHORT' as const,
      status: 'closed' as const,
      entryPrice: 2250,
      entryTime: Date.now() - 86400000,
      entryTimeframe: '4h',
      quantity: 1,
      stopLoss: 2280,
      takeProfits: [
        { price: 2200, percentage: 100, filled: true },
      ],
      exitPrice: 2200,
      exitTime: Date.now() - 43200000,
      pnl: 50,
      pnlPercent: 2.22,
      setupType: 'Reversal',
      description: 'Rejection at key resistance level',
      tags: ['reversal', 'resistance'],
      emotions: 'Calm',
      mistakes: ['Took profit too early'],
      executionRating: 4,
      outcomeRating: 4,
      createdAt: Date.now() - 86400000,
      updatedAt: Date.now() - 43200000,
    },
    {
      id: 'journal_3',
      symbol: 'SOL/USDT',
      exchange: 'bybit',
      direction: 'LONG' as const,
      status: 'open' as const,
      entryPrice: 95.5,
      entryTime: Date.now() - 21600000,
      entryTimeframe: '1h',
      quantity: 10,
      stopLoss: 93,
      takeProfits: [
        { price: 100, percentage: 50, filled: false },
        { price: 105, percentage: 50, filled: false },
      ],
      pnl: 15,
      pnlPercent: 1.57,
      setupType: 'Pullback',
      description: 'Pullback to EMA20 support',
      tags: ['pullback', 'ema'],
      emotions: 'Confident',
      mistakes: [],
      createdAt: Date.now() - 21600000,
      updatedAt: Date.now() - 21600000,
    },
  ];

  let entries = mockEntries;

  // Apply filters
  if (filters.symbol) {
    entries = entries.filter(e => e.symbol === filters.symbol);
  }
  if (filters.status) {
    entries = entries.filter(e => e.status === filters.status);
  }
  if (filters.direction) {
    entries = entries.filter(e => e.direction === filters.direction);
  }

  return entries;
}
