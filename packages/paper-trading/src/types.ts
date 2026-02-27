// ============================================
// PAPER TRADING TYPES
// Типы для демо-трейдинга
// ============================================

export type TradingMode = 'REAL' | 'PAPER';

export interface PaperTradingAccount {
  id: string;
  userId: string;
  mode: TradingMode;
  
  // Balance
  initialBalance: number;
  currentBalance: number;
  availableBalance: number;
  unrealizedPnl: number;
  realizedPnl: number;
  
  // Statistics
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalPnl: number;
  totalPnlPercent: number;
  
  // Settings
  defaultLeverage: number;
  defaultQuantity: number;
  autoCloseEnabled: boolean;
  
  // Metadata
  createdAt: number;
  updatedAt: number;
  lastTradeAt?: number;
}

export interface PaperOrder {
  id: string;
  accountId: string;
  symbol: string;
  exchange: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT' | 'STOP_MARKET' | 'STOP_LIMIT';
  quantity: number;
  price?: number;
  stopPrice?: number;
  leverage: number;
  
  // Status
  status: 'PENDING' | 'OPEN' | 'FILLED' | 'CANCELLED' | 'REJECTED';
  filledQuantity: number;
  averagePrice: number;
  
  // Timestamps
  createdAt: number;
  updatedAt: number;
  filledAt?: number;
  
  // Paper trading specific
  isPaper: true;
  simulatedSlippage: number;
  simulatedFee: number;
}

export interface PaperPosition {
  id: string;
  accountId: string;
  symbol: string;
  exchange: string;
  side: 'LONG' | 'SHORT';
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  leverage: number;
  
  // P&L
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  liquidationPrice?: number;
  
  // Risk management
  stopLoss?: number;
  takeProfits?: Array<{
    price: number;
    percentage: number;
    filled: boolean;
  }>;
  
  // Metadata
  openedAt: number;
  updatedAt: number;
  
  // Paper trading specific
  isPaper: true;
}

export interface PaperTrade {
  id: string;
  accountId: string;
  orderId: string;
  symbol: string;
  exchange: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  fee: number;
  
  // Timestamp
  timestamp: number;
  
  // Paper trading specific
  isPaper: true;
}

export interface PaperTradingStats {
  accountId: string;
  mode: TradingMode;
  
  // Balance
  initialBalance: number;
  currentBalance: number;
  totalDeposit: number;
  totalWithdrawal: number;
  
  // Performance
  totalPnl: number;
  totalPnlPercent: number;
  realizedPnl: number;
  unrealizedPnl: number;
  
  // Trade stats
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  
  // Risk metrics
  maxDrawdown: number;
  maxDrawdownPercent: number;
  sharpeRatio: number;
  avgLeverage: number;
  
  // Time-based
  bestTrade: number;
  worstTrade: number;
  avgTradeDuration: number;
  consecutiveWins: number;
  consecutiveLosses: number;
}

export interface PaperTradingConfig {
  initialBalance: number;
  defaultLeverage: number;
  defaultQuantity: number;
  slippagePercent: number;
  feePercent: number;
  enableAutoClose: boolean;
  enableLiquidation: boolean;
}

// ============================================
// DEFAULT CONFIGS
// ============================================

export const DEFAULT_PAPER_CONFIG: PaperTradingConfig = {
  initialBalance: 10000,
  defaultLeverage: 10,
  defaultQuantity: 0.1,
  slippagePercent: 0.05,
  feePercent: 0.1,
  enableAutoClose: true,
  enableLiquidation: true,
};

export const TESTNET_EXCHANGES = {
  binance: {
    name: 'Binance Testnet',
    restUrl: 'https://testnet.binance.vision',
    wsUrl: 'wss://testnet.binance.vision/ws',
    supportsFutures: true,
    futuresUrl: 'https://testnet.binancefuture.com',
  },
  bybit: {
    name: 'Bybit Testnet',
    restUrl: 'https://api-testnet.bybit.com',
    wsUrl: 'wss://stream-testnet.bybit.com',
    supportsFutures: true,
  },
  okx: {
    name: 'OKX Demo',
    restUrl: 'https://www.okx.com',
    wsUrl: 'wss://ws.okx.com:8443/ws',
    supportsFutures: false,
    // OKX uses demo trading mode with real API
  },
};

export default {
  DEFAULT_PAPER_CONFIG,
  TESTNET_EXCHANGES,
};
