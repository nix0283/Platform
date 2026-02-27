-- ============================================
-- TRADING JOURNAL TABLES
-- Автоматический торговый журнал
-- ============================================

-- Journal entries table
CREATE TABLE IF NOT EXISTS journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Trade info
    symbol VARCHAR(50) NOT NULL,
    exchange VARCHAR(50) NOT NULL,
    direction VARCHAR(10) NOT NULL, -- LONG/SHORT
    status VARCHAR(20) DEFAULT 'open', -- open, closed, cancelled
    
    -- Entry details
    entry_price DECIMAL(20, 8) NOT NULL,
    entry_time TIMESTAMP WITH TIME ZONE NOT NULL,
    entry_timeframe VARCHAR(10) NOT NULL,
    quantity DECIMAL(20, 8) NOT NULL,
    
    -- Risk management
    stop_loss DECIMAL(20, 8),
    stop_loss_timeframe VARCHAR(10),
    take_profits JSONB, -- Array of {price, percentage, filled}
    
    -- Exit details
    exit_price DECIMAL(20, 8),
    exit_time TIMESTAMP WITH TIME ZONE,
    exit_timeframe VARCHAR(10),
    
    -- P&L
    pnl DECIMAL(20, 8),
    pnl_percent DECIMAL(10, 4),
    commission DECIMAL(20, 8) DEFAULT 0,
    
    -- Indicators at entry
    active_indicators JSONB, -- Array of {name, params}
    indicator_values JSONB, -- Object with indicator values at entry
    
    -- Trade description
    setup_type VARCHAR(100), -- e.g., "Breakout", "Pullback", "Reversal"
    description TEXT,
    tags TEXT[], -- User-defined tags
    emotions TEXT, -- Emotional state during trade
    mistakes TEXT[], -- Lessons learned
    screenshot_url VARCHAR(500),
    
    -- Rating
    execution_rating INTEGER CHECK (execution_rating >= 1 AND execution_rating <= 5),
    outcome_rating INTEGER CHECK (outcome_rating >= 1 AND outcome_rating <= 5),
    
    -- Metadata
    order_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS journal_entries_symbol_idx ON journal_entries (symbol);
CREATE INDEX IF NOT EXISTS journal_entries_entry_time_idx ON journal_entries (entry_time DESC);
CREATE INDEX IF NOT EXISTS journal_entries_status_idx ON journal_entries (status);
CREATE INDEX IF NOT EXISTS journal_entries_direction_idx ON journal_entries (direction);
CREATE INDEX IF NOT EXISTS journal_entries_tags_idx ON journal_entries USING GIN (tags);

-- Journal statistics view
CREATE OR REPLACE VIEW journal_stats AS
SELECT 
    COUNT(*) as total_trades,
    COUNT(*) FILTER (WHERE status = 'closed') as closed_trades,
    COUNT(*) FILTER (WHERE pnl > 0) as winning_trades,
    COUNT(*) FILTER (WHERE pnl <= 0) as losing_trades,
    ROUND(COUNT(*) FILTER (WHERE pnl > 0)::NUMERIC / NULLIF(COUNT(*) FILTER (WHERE status = 'closed'), 0) * 100, 2) as win_rate,
    SUM(pnl) as total_pnl,
    AVG(pnl) as avg_pnl,
    MAX(pnl) as max_win,
    MIN(pnl) as max_loss,
    AVG(CASE WHEN pnl > 0 THEN pnl END) as avg_win,
    AVG(CASE WHEN pnl <= 0 THEN pnl END) as avg_loss,
    ROUND(AVG(execution_rating), 2) as avg_execution_rating,
    ROUND(AVG(outcome_rating), 2) as avg_outcome_rating
FROM journal_entries
WHERE status = 'closed';

-- Monthly performance view
CREATE OR REPLACE VIEW journal_monthly_stats AS
SELECT 
    DATE_TRUNC('month', entry_time) as month,
    COUNT(*) as trades,
    SUM(pnl) as pnl,
    ROUND(COUNT(*) FILTER (WHERE pnl > 0)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 2) as win_rate,
    AVG(pnl) as avg_pnl
FROM journal_entries
WHERE status = 'closed'
GROUP BY DATE_TRUNC('month', entry_time)
ORDER BY month DESC;

-- Setup type performance view
CREATE OR REPLACE VIEW journal_setup_stats AS
SELECT 
    setup_type,
    COUNT(*) as trades,
    SUM(pnl) as total_pnl,
    ROUND(COUNT(*) FILTER (WHERE pnl > 0)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 2) as win_rate,
    AVG(pnl) as avg_pnl,
    AVG(execution_rating) as avg_execution,
    AVG(outcome_rating) as avg_outcome
FROM journal_entries
WHERE status = 'closed' AND setup_type IS NOT NULL
GROUP BY setup_type
ORDER BY total_pnl DESC;

-- Function to auto-update updated_at
CREATE TRIGGER update_journal_entries_updated_at
    BEFORE UPDATE ON journal_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
