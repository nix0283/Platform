// ============================================
// NEWS CRAWLER SERVICE
// Основной сервис для сбора новостей
// ============================================

import { Pool } from 'pg';
import { CronJob } from 'cron';
import { NewsSource, NewsItem, CrawlResult, CrawlerConfig } from './types';
import { getParserForSource } from './parsers';

export class NewsCrawlerService {
  private pool: Pool;
  private config: CrawlerConfig;
  private cronJobs: Map<string, CronJob> = new Map();
  private isRunning: boolean = false;

  constructor(config: CrawlerConfig) {
    this.config = config;
    this.pool = new Pool({
      connectionString: config.databaseUrl,
    });
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  async initialize(): Promise<void> {
    console.log('📰 Initializing News Crawler Service...');
    
    // Test database connection
    try {
      await this.pool.query('SELECT NOW()');
      console.log('✅ Database connected');
    } catch (error: any) {
      console.error('❌ Database connection failed:', error.message);
      throw error;
    }

    // Load news sources
    const sources = await this.getNewsSources();
    console.log(`📋 Loaded ${sources.length} news sources`);

    // Schedule crawls for each source
    for (const source of sources) {
      if (source.enabled) {
        this.scheduleCrawl(source);
      }
    }

    // Schedule cleanup job (daily at midnight)
    this.scheduleCleanup();

    console.log('✅ News Crawler Service initialized');
  }

  // ============================================
  // NEWS SOURCES MANAGEMENT
  // ============================================

  async getNewsSources(): Promise<NewsSource[]> {
    const result = await this.pool.query(`
      SELECT id, name, url, category, enabled, crawl_interval
      FROM news_sources
      WHERE enabled = true
      ORDER BY category, name
    `);

    return result.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      url: row.url,
      category: row.category,
      enabled: row.enabled,
      crawlInterval: row.crawl_interval,
    }));
  }

  async addNewsSource(source: Omit<NewsSource, 'id'>): Promise<NewsSource> {
    const result = await this.pool.query(`
      INSERT INTO news_sources (name, url, category, enabled, crawl_interval)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, url, category, enabled, crawl_interval
    `, [source.name, source.url, source.category, source.enabled, source.crawlInterval]);

    const newSource = result.rows[0] as unknown as NewsSource;
    this.scheduleCrawl(newSource);
    return newSource;
  }

  async removeNewsSource(sourceId: string): Promise<void> {
    await this.pool.query('DELETE FROM news_sources WHERE id = $1', [sourceId]);
    
    // Remove scheduled job
    const job = this.cronJobs.get(sourceId);
    if (job) {
      job.stop();
      this.cronJobs.delete(sourceId);
    }
  }

  // ============================================
  // CRAWLING
  // ============================================

  private scheduleCrawl(source: NewsSource): void {
    // Remove existing job if any
    const existingJob = this.cronJobs.get(source.id);
    if (existingJob) {
      existingJob.stop();
    }

    // Create cron job
    const intervalSeconds = source.crawlInterval || this.config.crawlInterval;
    const cronPattern = `*/${Math.floor(intervalSeconds / 60)} * * * *`; // Convert to minutes

    const job = new CronJob(cronPattern, async () => {
      await this.crawlSource(source);
    });

    job.start();
    this.cronJobs.set(source.id, job);

    console.log(`⏰ Scheduled crawl for ${source.name} every ${intervalSeconds}s`);
  }

  private scheduleCleanup(): void {
    // Run cleanup daily at midnight
    const cleanupJob = new CronJob('0 0 * * *', async () => {
      await this.cleanupExpiredNews();
    });

    cleanupJob.start();
    console.log('⏰ Scheduled daily cleanup job');
  }

  async crawlSource(source: NewsSource): Promise<CrawlResult> {
    const startTime = Date.now();
    console.log(`🕷️ Crawling ${source.name}...`);

    try {
      // Get parser for this source
      const parser = getParserForSource(source);
      
      // Fetch news items
      const items = await parser(source);
      
      if (items.length === 0) {
        return {
          sourceId: source.id,
          status: 'partial',
          itemsFound: 0,
          itemsNew: 0,
          durationMs: Date.now() - startTime,
        };
      }

      // Filter out already existing items
      const newItems = await this.filterNewItems(items);
      
      // Save new items
      if (newItems.length > 0) {
        await this.saveNewsItems(newItems);
      }

      // Log crawl result
      await this.logCrawlResult({
        sourceId: source.id,
        status: 'success',
        itemsFound: items.length,
        itemsNew: newItems.length,
        durationMs: Date.now() - startTime,
      });

      console.log(`✅ ${source.name}: ${items.length} found, ${newItems.length} new`);

      return {
        sourceId: source.id,
        status: 'success',
        itemsFound: items.length,
        itemsNew: newItems.length,
        durationMs: Date.now() - startTime,
      };
    } catch (error: any) {
      console.error(`❌ ${source.name} crawl failed:`, error.message);

      await this.logCrawlResult({
        sourceId: source.id,
        status: 'failed',
        itemsFound: 0,
        itemsNew: 0,
        errorMessage: error.message,
        durationMs: Date.now() - startTime,
      });

      return {
        sourceId: source.id,
        status: 'failed',
        itemsFound: 0,
        itemsNew: 0,
        errorMessage: error.message,
        durationMs: Date.now() - startTime,
      };
    }
  }

  private async filterNewItems(items: NewsItem[]): Promise<NewsItem[]> {
    const urls = items.map(i => i.url);
    
    const result = await this.pool.query(`
      SELECT url FROM news_items WHERE url = ANY($1)
    `, [urls]);

    const existingUrls = new Set(result.rows.map((r: any) => r.url));
    
    return items.filter(item => !existingUrls.has(item.url));
  }

  private async saveNewsItems(items: NewsItem[]): Promise<void> {
    if (items.length === 0) return;

    for (const item of items) {
      await this.pool.query(`
        INSERT INTO news_items (
          source_id, title, summary, content, url,
          published_at, crawled_at, category, sentiment, importance,
          related_symbols, processed, language, expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `, [
        item.sourceId,
        item.title,
        item.summary,
        item.content,
        item.url,
        item.publishedAt,
        item.crawledAt,
        item.category,
        item.sentiment,
        item.importance,
        item.relatedSymbols,
        item.processed,
        item.language,
        item.expiresAt,
      ]);
    }
  }

  private async logCrawlResult(result: CrawlResult): Promise<void> {
    await this.pool.query(`
      INSERT INTO crawl_logs (source_id, status, items_found, items_new, error_message, duration_ms)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      result.sourceId,
      result.status,
      result.itemsFound,
      result.itemsNew,
      result.errorMessage,
      result.durationMs,
    ]);
  }

  // ============================================
  // CLEANUP
  // ============================================

  async cleanupExpiredNews(): Promise<number> {
    console.log('🧹 Cleaning up expired news...');

    const result = await this.pool.query(`
      DELETE FROM news_items
      WHERE expires_at < NOW()
      RETURNING id
    `);

    const deletedCount = result.rowCount || 0;
    console.log(`✅ Deleted ${deletedCount} expired news items`);

    return deletedCount;
  }

  // ============================================
  // QUERY METHODS
  // ============================================

  async getRecentNews(limit: number = 50, category?: string): Promise<NewsItem[]> {
    let query = `
      SELECT ni.*, ns.name as source_name, ns.category as source_category
      FROM news_items ni
      JOIN news_sources ns ON ni.source_id = ns.id
      WHERE ni.expires_at > NOW()
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (category) {
      query += ` AND ni.category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    query += ` ORDER BY ni.published_at DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await this.pool.query(query, params);

    return result.rows.map((row: any) => this.mapRowToNewsItem(row));
  }

  async getNewsBySymbol(symbol: string, limit: number = 50): Promise<NewsItem[]> {
    const result = await this.pool.query(`
      SELECT ni.*, ns.name as source_name
      FROM news_items ni
      JOIN news_sources ns ON ni.source_id = ns.id
      WHERE ni.expires_at > NOW()
        AND $1 = ANY(ni.related_symbols)
      ORDER BY ni.published_at DESC
      LIMIT $2
    `, [symbol.toUpperCase(), limit]);

    return result.rows.map((row: any) => this.mapRowToNewsItem(row));
  }

  async getImportantNews(limit: number = 20): Promise<NewsItem[]> {
    const result = await this.pool.query(`
      SELECT ni.*, ns.name as source_name
      FROM news_items ni
      JOIN news_sources ns ON ni.source_id = ns.id
      WHERE ni.expires_at > NOW()
        AND ni.importance >= 3
      ORDER BY ni.published_at DESC
      LIMIT $1
    `, [limit]);

    return result.rows.map((row: any) => this.mapRowToNewsItem(row));
  }

  async getNewsCount(): Promise<{ total: number; today: number; thisWeek: number }> {
    const result = await this.pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE published_at >= NOW() - INTERVAL '1 day') as today,
        COUNT(*) FILTER (WHERE published_at >= NOW() - INTERVAL '7 days') as this_week
      FROM news_items
      WHERE expires_at > NOW()
    `);

    const row = result.rows[0];
    return {
      total: parseInt(row.total),
      today: parseInt(row.today),
      thisWeek: parseInt(row.this_week),
    };
  }

  private mapRowToNewsItem(row: any): NewsItem {
    return {
      id: row.id,
      sourceId: row.source_id,
      title: row.title,
      summary: row.summary,
      content: row.content,
      url: row.url,
      publishedAt: row.published_at,
      crawledAt: row.crawled_at,
      category: row.category,
      sentiment: row.sentiment,
      importance: row.importance,
      relatedSymbols: row.related_symbols,
      processed: row.processed,
      language: row.language,
      expiresAt: row.expires_at,
    };
  }

  // ============================================
  // SHUTDOWN
  // ============================================

  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down News Crawler Service...');

    // Stop all cron jobs
    for (const job of this.cronJobs.values()) {
      job.stop();
    }
    this.cronJobs.clear();

    // Close database pool
    await this.pool.end();

    console.log('✅ News Crawler Service stopped');
  }
}

// ============================================
// EXPORT
// ============================================

export default NewsCrawlerService;
