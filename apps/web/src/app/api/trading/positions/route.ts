// ============================================
// API ROUTE — GET/POST /api/trading/positions
// Управление позициями
// ============================================

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const exchange = searchParams.get('exchange');

    const response = await fetch(
      `${BACKEND_URL}/api/positions?exchange=${exchange || ''}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch positions');
    }

    const positions = await response.json();

    return NextResponse.json({ success: true, positions });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { exchange, symbol, positionId } = body;

    const response = await fetch(`${BACKEND_URL}/api/positions/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exchange, symbol, positionId }),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { success: false, error: error.message },
        { status: response.status }
      );
    }

    const result = await response.json();

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
