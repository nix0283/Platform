// ============================================
// NEWS SOURCE PARSERS
// Парсеры для различных источников новостей
// ============================================

import * as cheerio from 'cheerio';
import Parser from 'rss-parser';
import { NewsItem, NewsSource } from './types';

const rssParser = new Parser();

// ============================================
// EXCHANGE ANNOUNCEMENTS PARSERS
// ============================================

export async function parseBinanceAnnouncements(source: NewsSource): Promise<NewsItem[]> {
  try {
    // Binance has RSS feed
    const feed = await rssParser.parseURL('https://www.binance.com/bapi/composite/v1/public/cms/article/list/query?type=1&pageNo=1&pageSize=20');
    
    return feed.items.map((item: any) => ({
      sourceId: source.id,
      title: item.title || 'No title',
      summary: item.contentSnippet?.substring(0, 500),
      url: item.link || item.guid,
      publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
      crawledAt: new Date(),
      category: classifyBinanceCategory(item.title || ''),
      sentiment: 'neutral',
      importance: calculateImportance(item.title || ''),
      relatedSymbols: extractSymbols(item.title || ''),
      processed: false,
      language: 'en',
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 3 months
    }));
  } catch (error: any) {
    console.error('Binance parser error:', error.message);
    return [];
  }
}

export async function parseBybitAnnouncements(source: NewsSource): Promise<NewsItem[]> {
  try {
    const response = await fetch(source.url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const html = await response.text();
    const $ = cheerio.load(html);
    
    const items: NewsItem[] = [];
    
    $('.article-list .article-item').each((i, elem) => {
      const title = $(elem).find('.article-title').text().trim();
      const link = $(elem).find('a').attr('href');
      const date = $(elem).find('.article-date').text().trim();
      
      if (title && link) {
        items.push({
          sourceId: source.id,
          title,
          url: link.startsWith('http') ? link : `https://announcements.bybit.com${link}`,
          publishedAt: parseDate(date),
          crawledAt: new Date(),
          category: classifyBybitCategory(title),
          sentiment: 'neutral',
          importance: calculateImportance(title),
          relatedSymbols: extractSymbols(title),
          processed: false,
          language: 'en',
          expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        });
      }
    });
    
    return items;
  } catch (error: any) {
    console.error('Bybit parser error:', error.message);
    return [];
  }
}

export async function parseOKXAnnouncements(source: NewsSource): Promise<NewsItem[]> {
  try {
    const response = await fetch(source.url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const html = await response.text();
    const $ = cheerio.load(html);
    
    const items: NewsItem[] = [];
    
    $('article, .news-item, .announcement-item').each((i, elem) => {
      const title = $(elem).find('h1, h2, h3, .title').first().text().trim();
      const link = $(elem).find('a').first().attr('href');
      
      if (title && link && title.length > 10) {
        items.push({
          sourceId: source.id,
          title,
          url: link.startsWith('http') ? link : `https://www.okx.com${link}`,
          crawledAt: new Date(),
          category: 'other',
          sentiment: 'neutral',
          importance: calculateImportance(title),
          relatedSymbols: extractSymbols(title),
          processed: false,
          language: 'en',
          expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        });
      }
    });
    
    return items;
  } catch (error: any) {
    console.error('OKX parser error:', error.message);
    return [];
  }
}

// ============================================
// CRYPTO NEWS PARSERS
// ============================================

export async function parseCoinDesk(source: NewsSource): Promise<NewsItem[]> {
  try {
    const feed = await rssParser.parseURL('https://www.coindesk.com/arc/outboundfeeds/rss/');
    
    return feed.items.map((item: any) => ({
      sourceId: source.id,
      title: item.title || 'No title',
      summary: item.contentSnippet?.substring(0, 500),
      url: item.link || item.guid,
      publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
      crawledAt: new Date(),
      category: 'crypto_news',
      sentiment: analyzeSentiment(item.title || ''),
      importance: 2, // News sites have lower importance than exchange announcements
      relatedSymbols: extractSymbols(item.title || ''),
      processed: false,
      language: 'en',
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    }));
  } catch (error: any) {
    console.error('CoinDesk parser error:', error.message);
    return [];
  }
}

export async function parseCoinTelegraph(source: NewsSource): Promise<NewsItem[]> {
  try {
    const feed = await rssParser.parseURL('https://cointelegraph.com/rss');
    
    return feed.items.map((item: any) => ({
      sourceId: source.id,
      title: item.title || 'No title',
      summary: item.contentSnippet?.substring(0, 500),
      url: item.link || item.guid,
      publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
      crawledAt: new Date(),
      category: 'crypto_news',
      sentiment: analyzeSentiment(item.title || ''),
      importance: 2,
      relatedSymbols: extractSymbols(item.title || ''),
      processed: false,
      language: 'en',
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    }));
  } catch (error: any) {
    console.error('CoinTelegraph parser error:', error.message);
    return [];
  }
}

export async function parseTheBlock(source: NewsSource): Promise<NewsItem[]> {
  try {
    const feed = await rssParser.parseURL('https://www.theblock.co/rss.xml');
    
    return feed.items.map((item: any) => ({
      sourceId: source.id,
      title: item.title || 'No title',
      summary: item.contentSnippet?.substring(0, 500),
      url: item.link || item.guid,
      publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
      crawledAt: new Date(),
      category: 'crypto_news',
      sentiment: analyzeSentiment(item.title || ''),
      importance: 2,
      relatedSymbols: extractSymbols(item.title || ''),
      processed: false,
      language: 'en',
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    }));
  } catch (error: any) {
    console.error('The Block parser error:', error.message);
    return [];
  }
}

// ============================================
// REGULATORY NEWS PARSERS
// ============================================

export async function parseSECNews(source: NewsSource): Promise<NewsItem[]> {
  try {
    const feed = await rssParser.parseURL('https://www.sec.gov/news/pressreleases/rss.xml');
    
    return feed.items.map((item: any) => ({
      sourceId: source.id,
      title: item.title || 'No title',
      summary: item.contentSnippet?.substring(0, 500),
      url: item.link || item.guid,
      publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
      crawledAt: new Date(),
      category: 'regulation',
      sentiment: 'neutral',
      importance: 4, // Regulatory news is important
      relatedSymbols: extractSymbols(item.title || ''),
      processed: false,
      language: 'en',
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    }));
  } catch (error: any) {
    console.error('SEC parser error:', error.message);
    return [];
  }
}

export async function parseCFTCNews(source: NewsSource): Promise<NewsItem[]> {
  try {
    const feed = await rssParser.parseURL('https://www.cftc.gov/PressRoom/PressReleases/rss.xml');
    
    return feed.items.map((item: any) => ({
      sourceId: source.id,
      title: item.title || 'No title',
      summary: item.contentSnippet?.substring(0, 500),
      url: item.link || item.guid,
      publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
      crawledAt: new Date(),
      category: 'regulation',
      sentiment: 'neutral',
      importance: 4,
      relatedSymbols: extractSymbols(item.title || ''),
      processed: false,
      language: 'en',
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    }));
  } catch (error: any) {
    console.error('CFTC parser error:', error.message);
    return [];
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function classifyBinanceCategory(title: string): string {
  const titleLower = title.toLowerCase();
  
  if (titleLower.includes('listing')) return 'listing';
  if (titleLower.includes('delist')) return 'delisting';
  if (titleLower.includes('maintenance') || titleLower.includes('upgrade')) return 'maintenance';
  if (titleLower.includes('partner')) return 'partnership';
  if (titleLower.includes('fee') || titleLower.includes('trading')) return 'trading';
  
  return 'other';
}

function classifyBybitCategory(title: string): string {
  const titleLower = title.toLowerCase();
  
  if (titleLower.includes('listing')) return 'listing';
  if (titleLower.includes('delist')) return 'delisting';
  if (titleLower.includes('maintenance')) return 'maintenance';
  
  return 'other';
}

function calculateImportance(title: string): number {
  const titleLower = title.toLowerCase();
  
  // High importance keywords
  const highImportance = ['listing', 'delist', 'suspend', 'hack', 'security', 'urgent', 'important'];
  for (const keyword of highImportance) {
    if (titleLower.includes(keyword)) return 5;
  }
  
  // Medium-high importance
  const mediumHigh = ['upgrade', 'maintenance', 'fee', 'trading', 'new'];
  for (const keyword of mediumHigh) {
    if (titleLower.includes(keyword)) return 4;
  }
  
  // Medium importance
  const medium = ['partner', 'launch', 'add'];
  for (const keyword of medium) {
    if (titleLower.includes(keyword)) return 3;
  }
  
  return 2;
}

function extractSymbols(title: string): string[] {
  const symbols: string[] = [];
  const commonSymbols = [
    'BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'AVAX', 'DOGE', 'DOT', 'MATIC',
    'LTC', 'LINK', 'UNI', 'ATOM', 'ETC', 'XLM', 'ALGO', 'VET', 'ICP', 'FIL',
    'USDT', 'USDC', 'BUSD'
  ];
  
  for (const symbol of commonSymbols) {
    if (title.toUpperCase().includes(symbol)) {
      symbols.push(symbol);
    }
  }
  
  return symbols;
}

function analyzeSentiment(title: string): 'positive' | 'negative' | 'neutral' {
  const titleLower = title.toLowerCase();
  
  const positiveWords = ['launch', 'partner', 'growth', 'success', 'new', 'add', 'list'];
  const negativeWords = ['suspend', 'delist', 'hack', 'attack', 'loss', 'crash', 'ban'];
  
  let score = 0;
  
  for (const word of positiveWords) {
    if (titleLower.includes(word)) score++;
  }
  
  for (const word of negativeWords) {
    if (titleLower.includes(word)) score--;
  }
  
  if (score > 0) return 'positive';
  if (score < 0) return 'negative';
  return 'neutral';
}

function parseDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  
  // Try various date formats
  const formats = [
    /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD
    /^(\d{2})\/(\d{2})\/(\d{4})$/, // MM/DD/YYYY
    /^(\w+)\s+(\d{1,2}),\s+(\d{4})$/, // Month DD, YYYY
  ];
  
  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) return date;
    }
  }
  
  return new Date();
}

// ============================================
// PARSER REGISTRY
// ============================================

export const parsers: Record<string, (source: NewsSource) => Promise<NewsItem[]>> = {
  'binance.com': parseBinanceAnnouncements,
  'bybit.com': parseBybitAnnouncements,
  'okx.com': parseOKXAnnouncements,
  'coindesk.com': parseCoinDesk,
  'cointelegraph.com': parseCoinTelegraph,
  'theblock.co': parseTheBlock,
  'sec.gov': parseSECNews,
  'cftc.gov': parseCFTCNews,
};

export function getParserForSource(source: NewsSource): (source: NewsSource) => Promise<NewsItem[]> {
  const domain = new URL(source.url).hostname;
  
  for (const [key, parser] of Object.entries(parsers)) {
    if (domain.includes(key)) {
      return parser;
    }
  }
  
  // Default RSS parser for unknown sources
  return async (s: NewsSource) => {
    try {
      const feed = await rssParser.parseURL(s.url);
      return feed.items.map((item: any) => ({
        sourceId: s.id,
        title: item.title || 'No title',
        summary: item.contentSnippet?.substring(0, 500),
        url: item.link || item.guid,
        publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
        crawledAt: new Date(),
        category: s.category,
        sentiment: 'neutral',
        importance: 2,
        relatedSymbols: extractSymbols(item.title || ''),
        processed: false,
        language: 'en',
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      }));
    } catch (error: any) {
      console.error(`Default parser error for ${s.name}:`, error.message);
      return [];
    }
  };
}
