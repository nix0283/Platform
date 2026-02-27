// ============================================
// API ROUTE — GET /api/ml/graph
// Получение данных графа корреляций
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';
const RESULTS_DIR = join(process.cwd(), '..', 'results');

export async function GET(request: NextRequest) {
  try {
    // Проверяем есть ли сохраненные результаты
    const graphAnalysisPath = join(RESULTS_DIR, 'graph-analysis.json');
    
    if (existsSync(graphAnalysisPath)) {
      // Читаем из файла (кэш)
      const cachedData = JSON.parse(readFileSync(graphAnalysisPath, 'utf-8'));
      
      return NextResponse.json({
        success: true,
        source: 'cache',
        timestamp: cachedData.timestamp,
        data: cachedData,
      });
    }

    // Если нет кэша - запрашиваем с backend
    const response = await fetch(`${BACKEND_URL}/api/ml/graph`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      source: 'live',
      timestamp: Date.now(),
      data,
    });
  } catch (error: any) {
    console.error('ML Graph API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        fallback: getFallbackData()
      },
      { status: 500 }
    );
  }
}

// Fallback данные если backend недоступен
function getFallbackData() {
  return {
    graph: { nodes: 0, edges: 0 },
    signals: [],
    anomalies: [],
    message: 'Using fallback data - backend unavailable'
  };
}
