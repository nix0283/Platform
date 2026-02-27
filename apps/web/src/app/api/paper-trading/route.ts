// ============================================
// API ROUTE — GET /api/paper-trading
// Paper trading endpoints
// ============================================

import { NextRequest, NextResponse } from 'next/server';

// In-memory store (in production, use database)
const paperAccounts: Map<string, any> = new Map();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');

    switch (action) {
      case 'stats':
        return NextResponse.json({
          success: true,
          stats: {
            initialBalance: 10000,
            currentBalance: 10000,
            totalPnl: 0,
            winRate: 0,
            totalTrades: 0,
          },
        });

      case 'positions':
        return NextResponse.json({
          success: true,
          positions: [],
        });

      case 'orders':
        return NextResponse.json({
          success: true,
          orders: [],
        });

      default:
        return NextResponse.json({
          success: true,
          message: 'Paper trading API ready',
        });
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case 'place_order':
        // Simulate order placement
        return NextResponse.json({
          success: true,
          order: {
            id: `paper_order_${Date.now()}`,
            ...data,
            status: 'FILLED',
            isPaper: true,
          },
        });

      case 'close_position':
        return NextResponse.json({
          success: true,
          message: 'Position closed',
        });

      case 'reset':
        return NextResponse.json({
          success: true,
          message: 'Account reset',
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
