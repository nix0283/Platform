// ============================================
// NEWS CRAWLER — Главный экспорт
// ============================================

export { NewsCrawlerService } from './crawler';
export { parsers, getParserForSource } from './parsers';
export * from './types';

// ============================================
// STANDALONE RUNNER
// Запуск краулера как отдельного сервиса
// ============================================

import { NewsCrawlerService } from './crawler';
import { CrawlerConfig } from './types';

export async function startNewsCrawler(config?: Partial<CrawlerConfig>): Promise<NewsCrawlerService> {
  const defaultConfig: CrawlerConfig = {
    databaseUrl: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/trading',
    crawlInterval: 300, // 5 minutes
    maxRetries: 3,
    userAgent: 'TradingPlatform-NewsCrawler/1.0',
    timeout: 10000, // 10 seconds
  };

  const finalConfig = { ...defaultConfig, ...config };

  const crawler = new NewsCrawlerService(finalConfig);
  await crawler.initialize();

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n📰 Received SIGINT, shutting down...');
    await crawler.shutdown();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n📰 Received SIGTERM, shutting down...');
    await crawler.shutdown();
    process.exit(0);
  });

  return crawler;
}

// CLI runner
if (require.main === module) {
  startNewsCrawler().catch(console.error);
}
