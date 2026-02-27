// ============================================
// API ROUTE — GET /api/ml/anomalies
// Получение обнаруженных аномалий
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
        error: 'No ML data available',
        anomalies: []
      });
    }

    const data = JSON.parse(readFileSync(graphAnalysisPath, 'utf-8'));
    
    return NextResponse.json({
      success: true,
      timestamp: data.timestamp,
      anomalies: data.anomalies || [],
      summary: {
        total: data.anomalies?.length || 0,
        critical: data.anomalies?.filter((a: any) => a.severity > 0.7).length || 0,
        warning: data.anomalies?.filter((a: any) => a.severity > 0.4 && a.severity <= 0.7).length || 0,
        low: data.anomalies?.filter((a: any) => a.severity <= 0.4).length || 0,
      }
    });
  } catch (error: any) {
    console.error('ML Anomalies API error:', error);
    return NextResponse.json(
      { success: false, error: error.message, anomalies: [] },
      { status: 500 }
    );
  }
}
