// ============================================
// API ROUTE — GET /api/ml/signals
// Получение торговых сигналов от ML
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const RESULTS_DIR = join(process.cwd(), '..', 'results');

export async function GET(request: NextRequest) {
  try {
    const graphAnalysisPath = join(RESULTS_DIR, 'graph-analysis.json');
    
    if (!existsSync(graphAnalysisPath)) {
      return NextResponse.json({
        success: false,
        error: 'No ML data available. Run Stage 3 first.',
        signals: []
      });
    }

    const data = JSON.parse(readFileSync(graphAnalysisPath, 'utf-8'));
    
    // Фильтрация только сильных сигналов
    const strongSignals = data.signals?.filter((s: any) => s.confidence > 0.5) || [];
    
    return NextResponse.json({
      success: true,
      timestamp: data.timestamp,
      signals: strongSignals,
      summary: {
        buy: strongSignals.filter((s: any) => s.signal === 'BUY').length,
        sell: strongSignals.filter((s: any) => s.signal === 'SELL').length,
        hold: strongSignals.filter((s: any) => s.signal === 'HOLD').length,
      }
    });
  } catch (error: any) {
    console.error('ML Signals API error:', error);
    return NextResponse.json(
      { success: false, error: error.message, signals: [] },
      { status: 500 }
    );
  }
}
