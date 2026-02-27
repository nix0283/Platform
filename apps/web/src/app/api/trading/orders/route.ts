// ============================================
// API ROUTE — POST /api/trading/orders
// Выставление ордеров с несколькими TP
// ============================================

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Валидация
    const { exchange, symbol, side, type, quantity, stopLoss, takeProfits } = body;
    
    if (!exchange || !symbol || !side || !quantity) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Валидация Take Profits
    if (takeProfits && Array.isArray(takeProfits)) {
      const totalPercent = takeProfits.reduce((sum: number, tp: any) => 
        sum + (tp.percentage || 0), 0
      );
      
      if (Math.abs(totalPercent - 100) > 1) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Take Profit percentages must total 100% (currently ${totalPercent}%)` 
          },
          { status: 400 }
        );
      }
    }

    // Отправка на backend
    const response = await fetch(`${BACKEND_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { success: false, error: error.message },
        { status: response.status }
      );
    }

    const order = await response.json();

    return NextResponse.json({
      success: true,
      order: {
        ...order,
        stopLoss,
        takeProfits,
        timestamp: Date.now(),
      },
    });
  } catch (error: any) {
    console.error('Trading order error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const exchange = searchParams.get('exchange');
    const symbol = searchParams.get('symbol');

    const response = await fetch(
      `${BACKEND_URL}/api/orders?exchange=${exchange}&symbol=${symbol}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch orders');
    }

    const orders = await response.json();

    return NextResponse.json({ success: true, orders });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
