// ============================================
// NEWS CRAWLER TYPES
// ============================================

export interface NewsSource {
  id: string;
  name: string;
  url: string;
  category: 'exchange' | 'crypto_news' | 'regulatory' | 'social';
  enabled: boolean;
  crawlInterval: number; // seconds
}

export interface NewsItem {
  id?: string;
  sourceId: string;
  title: string;
  summary?: string;
  content?: string;
  url: string;
  publishedAt?: Date;
  crawledAt: Date;
  category?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  importance: number; // 1-5
  relatedSymbols?: string[];
  processed: boolean;
  language: string;
  expiresAt: Date;
}

export interface CrawlResult {
  sourceId: string;
  status: 'success' | 'failed' | 'partial';
  itemsFound: number;
  itemsNew: number;
  errorMessage?: string;
  durationMs: number;
}

export interface CrawlerConfig {
  databaseUrl: string;
  crawlInterval: number; // default crawl interval in seconds
  maxRetries: number;
  userAgent: string;
  timeout: number; // request timeout in ms
}
