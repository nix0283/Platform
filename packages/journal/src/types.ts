// ============================================
// TRADING JOURNAL TYPES
// ============================================

export type TradeDirection = 'LONG' | 'SHORT';
export type TradeStatus = 'open' | 'closed' | 'cancelled';

export interface TakeProfitLevel {
  price: number;
  percentage: number;
  filled: boolean;
  filledAt?: number;
  filledPrice?: number;
}

export interface IndicatorSnapshot {
  name: string;
  params: Record<string, number | string | boolean>;
  value: number | Record<string, number>;
}

export interface JournalEntry {
  id: string;
  
  // Trade info
  symbol: string;
  exchange: string;
  direction: TradeDirection;
  status: TradeStatus;
  
  // Entry details
  entryPrice: number;
  entryTime: number;
  entryTimeframe: string;
  quantity: number;
  
  // Risk management
  stopLoss?: number;
  stopLossTimeframe?: string;
  takeProfits?: TakeProfitLevel[];
  
  // Exit details
  exitPrice?: number;
  exitTime?: number;
  exitTimeframe?: string;
  
  // P&L
  pnl?: number;
  pnlPercent?: number;
  commission?: number;
  
  // Indicators at entry
  activeIndicators?: IndicatorSnapshot[];
  indicatorValues?: Record<string, number | Record<string, number>>;
  
  // Trade description
  setupType?: string;
  description?: string;
  tags?: string[];
  emotions?: string;
  mistakes?: string[];
  screenshotUrl?: string;
  
  // Rating
  executionRating?: number; // 1-5
  outcomeRating?: number; // 1-5
  
  // Metadata
  orderId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface JournalStats {
  totalTrades: number;
  closedTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
  maxWin: number;
  maxLoss: number;
  avgWin: number;
  avgLoss: number;
  avgExecutionRating: number;
  avgOutcomeRating: number;
  profitFactor: number;
}

export interface JournalMonthlyStats {
  month: string;
  trades: number;
  pnl: number;
  winRate: number;
  avgPnl: number;
}

export interface JournalSetupStats {
  setupType: string;
  trades: number;
  totalPnl: number;
  winRate: number;
  avgPnl: number;
  avgExecution: number;
  avgOutcome: number;
}

export interface JournalFilters {
  symbol?: string;
  exchange?: string;
  direction?: TradeDirection;
  status?: TradeStatus;
  setupType?: string;
  tags?: string[];
  dateFrom?: number;
  dateTo?: number;
  minPnl?: number;
  maxPnl?: number;
}

export interface JournalExport {
  format: 'csv' | 'json' | 'pdf';
  filters?: JournalFilters;
  includeCharts?: boolean;
  includeScreenshots?: boolean;
}

// ============================================
// SETUP TYPES (Common trading setups)
// ============================================

export const SETUP_TYPES = [
  'Breakout',
  'Pullback',
  'Reversal',
  'Trend Following',
  'Range Trading',
  'Support/Resistance',
  'Fibonacci',
  'Pattern',
  'News Event',
  'Scalp',
  'Swing',
  'Position',
  'Other',
] as const;

export type SetupType = typeof SETUP_TYPES[number];

// ============================================
// EMOTIONS (Common trading emotions)
// ============================================

export const EMOTIONS = [
  'Confident',
  'Hesitant',
  'FOMO',
  'Fearful',
  'Greedy',
  'Calm',
  'Anxious',
  'Excited',
  'Frustrated',
  'Neutral',
] as const;

export type EmotionType = typeof EMOTIONS[number];

// ============================================
// COMMON MISTAKES
// ============================================

export const COMMON_MISTAKES = [
  'Entered too early',
  'Entered too late',
  'Stop loss too tight',
  'Stop loss too wide',
  'Took profit too early',
  'Held too long',
  'Position too large',
  'Position too small',
  'Ignored stop loss',
  'Moved stop loss',
  'Revenge trading',
  'Overtrading',
  'No plan',
  'Ignored trend',
  'Chased price',
  'None',
] as const;

export type MistakeType = typeof COMMON_MISTAKES[number];

// ============================================
// EXPORT
// ============================================

export default {
  SETUP_TYPES,
  EMOTIONS,
  COMMON_MISTAKES,
};
