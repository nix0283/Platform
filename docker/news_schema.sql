-- ============================================
-- NEWS & ANNOUNCEMENTS TABLE
-- Хранение новостей и анонсов (3 месяца)
-- ============================================

-- Таблица источников новостей
CREATE TABLE IF NOT EXISTS news_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    url VARCHAR(500) NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'exchange', 'crypto_news', 'regulatory', 'social'
    enabled BOOLEAN DEFAULT true,
    crawl_interval INTEGER DEFAULT 300, -- seconds between crawls
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица новостей/анонсов
CREATE TABLE IF NOT EXISTS news_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID REFERENCES news_sources(id) ON DELETE CASCADE,
    
    -- Content
    title VARCHAR(500) NOT NULL,
    summary TEXT,
    content TEXT,
    url VARCHAR(1000) NOT NULL,
    
    -- Metadata
    published_at TIMESTAMP WITH TIME ZONE,
    crawled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Classification
    category VARCHAR(50), -- 'listing', 'delisting', 'maintenance', 'partnership', 'regulation', 'other'
    sentiment VARCHAR(20), -- 'positive', 'negative', 'neutral'
    importance INTEGER DEFAULT 1, -- 1-5 scale (5 = most important)
    
    -- Related symbols
    related_symbols TEXT[], -- Array of symbol names mentioned
    
    -- Processing
    processed BOOLEAN DEFAULT false,
    language VARCHAR(10) DEFAULT 'en',
    
    -- Auto-delete after 3 months
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '3 months'),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS news_items_published_at_idx ON news_items (published_at DESC);
CREATE INDEX IF NOT EXISTS news_items_category_idx ON news_items (category);
CREATE INDEX IF NOT EXISTS news_items_importance_idx ON news_items (importance DESC);
CREATE INDEX IF NOT EXISTS news_items_expires_at_idx ON news_items (expires_at);
CREATE INDEX IF NOT EXISTS news_items_symbols_idx ON news_items USING GIN (related_symbols);
CREATE INDEX IF NOT EXISTS news_items_source_idx ON news_items (source_id);

-- Table for crawl logs
CREATE TABLE IF NOT EXISTS crawl_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID REFERENCES news_sources(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL, -- 'success', 'failed', 'partial'
    items_found INTEGER DEFAULT 0,
    items_new INTEGER DEFAULT 0,
    error_message TEXT,
    duration_ms INTEGER,
    crawled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default news sources
INSERT INTO news_sources (name, url, category, crawl_interval) VALUES
    ('Binance Announcements', 'https://www.binance.com/en/support/announcement', 'exchange', 300),
    ('Bybit Announcements', 'https://announcements.bybit.com/en-US/', 'exchange', 300),
    ('OKX Announcements', 'https://www.okx.com/support/hc/en-us/articles', 'exchange', 300),
    ('CoinDesk', 'https://www.coindesk.com/', 'crypto_news', 600),
    ('CoinTelegraph', 'https://cointelegraph.com/', 'crypto_news', 600),
    ('The Block', 'https://www.theblock.co/', 'crypto_news', 600),
    ('SEC Crypto', 'https://www.sec.gov/news/pressreleases', 'regulatory', 900),
    ('CFTC Press Releases', 'https://www.cftc.gov/PressRoom/PressReleases', 'regulatory', 900);

-- Function to auto-delete expired news (3 months)
CREATE OR REPLACE FUNCTION delete_expired_news()
RETURNS void AS $$
BEGIN
    DELETE FROM news_items WHERE expires_at < NOW();
    
    -- Log the cleanup
    INSERT INTO crawl_logs (source_id, status, items_found, duration_ms)
    SELECT NULL, 'cleanup', COUNT(*), 0
    FROM news_items WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup job (run daily)
-- In production, use pg_cron or external scheduler
-- SELECT cron.schedule('0 0 * * *', $$SELECT delete_expired_news()$$);

-- View for recent important news
CREATE OR REPLACE VIEW recent_important_news AS
SELECT 
    ni.*,
    ns.name as source_name,
    ns.category as source_category
FROM news_items ni
JOIN news_sources ns ON ni.source_id = ns.id
WHERE ni.expires_at > NOW()
  AND ni.importance >= 3
ORDER BY ni.published_at DESC
LIMIT 50;

-- View for news by symbol
CREATE OR REPLACE VIEW news_by_symbol AS
SELECT 
    unnest(related_symbols) as symbol,
    COUNT(*) as news_count,
    MAX(published_at) as latest_news,
    AVG(importance) as avg_importance
FROM news_items
WHERE related_symbols IS NOT NULL
  AND expires_at > NOW()
GROUP BY unnest(related_symbols);
