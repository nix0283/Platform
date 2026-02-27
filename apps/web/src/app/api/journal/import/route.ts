// ============================================
// API ROUTE — POST /api/journal/import
// Импорт сделок с биржи
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { JournalManager, TradeImportManager } from '@trading-platform/journal';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      exchange,
      apiKey,
      apiSecret,
      passphrase,
      symbol,
      startTime,
      endTime,
      includeFutures,
    } = body;

    if (!exchange || !apiKey || !apiSecret) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create import manager
    const journal = new JournalManager();
    const importManager = new TradeImportManager(journal);

    // Set credentials
    importManager.setCredentials(exchange as any, {
      apiKey,
      apiSecret,
      passphrase,
    });

    // Import trades
    const result = await importManager.importFromExchange(exchange as any, {
      symbol,
      startTime,
      endTime,
      includeFutures: includeFutures || false,
    });

    return NextResponse.json({
      success: true,
      result: {
        imported: result.imported,
        skipped: result.skipped,
        errors: result.errors,
        total: result.imported + result.skipped,
      },
    });
  } catch (error: any) {
    console.error('Import error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// API ROUTE — GET /api/journal/import/status
// Статус импорта
// ============================================

export async function GET() {
  try {
    // Return supported exchanges and required fields
    return NextResponse.json({
      success: true,
      exchanges: [
        {
          id: 'binance',
          name: 'Binance',
          fields: ['apiKey', 'apiSecret'],
          supportsFutures: true,
        },
        {
          id: 'bybit',
          name: 'Bybit',
          fields: ['apiKey', 'apiSecret'],
          supportsFutures: true,
        },
        {
          id: 'okx',
          name: 'OKX',
          fields: ['apiKey', 'apiSecret', 'passphrase'],
          supportsFutures: false,
        },
        {
          id: 'bitget',
          name: 'Bitget',
          fields: ['apiKey', 'apiSecret', 'passphrase'],
          supportsFutures: false,
        },
        {
          id: 'bingx',
          name: 'BingX',
          fields: ['apiKey', 'apiSecret'],
          supportsFutures: false,
        },
      ],
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
