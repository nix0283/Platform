// ============================================
// API ROUTE — GET /api/news
// Получение новостей и анонсов
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/trading';

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: DATABASE_URL,
    });
  }
  return pool;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const category = searchParams.get('category');
    const symbol = searchParams.get('symbol');
    const important = searchParams.get('important') === 'true';

    const pool = getPool();
    let query: string;
    let params: any[] = [];

    if (symbol) {
      // News by symbol
      query = `
        SELECT ni.*, ns.name as source_name, ns.category as source_category
        FROM news_items ni
        JOIN news_sources ns ON ni.source_id = ns.id
        WHERE ni.expires_at > NOW()
          AND $1 = ANY(ni.related_symbols)
        ORDER BY ni.published_at DESC
        LIMIT $2
      `;
      params = [symbol.toUpperCase(), limit];
    } else if (important) {
      // Important news only
      query = `
        SELECT ni.*, ns.name as source_name, ns.category as source_category
        FROM news_items ni
        JOIN news_sources ns ON ni.source_id = ns.id
        WHERE ni.expires_at > NOW()
          AND ni.importance >= 3
        ORDER BY ni.published_at DESC
        LIMIT $1
      `;
      params = [limit];
    } else {
      // Recent news with optional category filter
      query = `
        SELECT ni.*, ns.name as source_name, ns.category as source_category
        FROM news_items ni
        JOIN news_sources ns ON ni.source_id = ns.id
        WHERE ni.expires_at > NOW()
      `;

      if (category) {
        query += ` AND ni.category = $${params.length + 1}`;
        params.push(category);
      }

      query += ` ORDER BY ni.published_at DESC LIMIT $${params.length + 1}`;
      params.push(limit);
    }

    const result = await pool.query(query, params);

    const news = result.rows.map((row: any) => ({
      id: row.id,
      sourceId: row.source_id,
      sourceName: row.source_name,
      sourceCategory: row.source_category,
      title: row.title,
      summary: row.summary,
      url: row.url,
      publishedAt: row.published_at,
      crawledAt: row.crawled_at,
      category: row.category,
      sentiment: row.sentiment,
      importance: row.importance,
      relatedSymbols: row.related_symbols,
      expiresAt: row.expires_at,
    }));

    return NextResponse.json({
      success: true,
      count: news.length,
      news,
    });
  } catch (error: any) {
    console.error('News API error:', error.message);
    return NextResponse.json(
      { success: false, error: error.message, news: [] },
      { status: 500 }
    );
  }
}
