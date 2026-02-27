// ============================================
// CORE TYPES — Общая типизация платформы
// ============================================

// --- Свечи / Бары ---
export interface Candle {
  timestamp: number;      // Unix timestamp (ms)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  symbol: string;
  interval: string;       // '1m', '5m', '1h', '1d'
}

export interface OHLCV {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// --- Символы ---
export interface Symbol {
  symbol: string;         // 'BTCUSDT'
  baseAsset: string;      // 'BTC'
  quoteAsset: string;     // 'USDT'
  exchange: ExchangeId;
  status: 'TRADING' | 'DELISTED' | 'BREAK';
  minQty: number;
  maxQty: number;
  stepSize: number;
  minNotional: number;
  tickSize: number;
}

// --- Биржи ---
export type ExchangeId = 'binance' | 'bybit' | 'okx' | 'bitget' | 'bingx';

export interface ExchangeInfo {
  id: ExchangeId;
  name: string;
  wsUrl: string;
  restUrl: string;
  features: ExchangeFeatures;
}

export interface ExchangeFeatures {
  spot: boolean;
  futures: boolean;
  options: boolean;
  wsTrades: boolean;
  wsCandles: boolean;
  wsOrderbook: boolean;
  placeOrder: boolean;
  cancelOrder: boolean;
}

// --- Ордера ---
export type OrderSide = 'BUY' | 'SELL';
export type OrderType = 'MARKET' | 'LIMIT' | 'STOP_MARKET' | 'STOP_LIMIT';
export type OrderStatus = 'NEW' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELED' | 'REJECTED';

export interface Order {
  id: string;
  symbol: string;
  exchange: ExchangeId;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  price?: number;
  stopPrice?: number;
  status: OrderStatus;
  filledQty: number;
  avgPrice: number;
  createdAt: number;
  updatedAt: number;
  clientOrderId?: string;
}

// --- Позиции ---
export interface Position {
  symbol: string;
  exchange: ExchangeId;
  side: OrderSide;
  quantity: number;
  entryPrice: number;
  markPrice: number;
  unrealizedPnl: number;
  realizedPnl: number;
  leverage: number;
  marginMode: 'ISOLATED' | 'CROSSED';
  liquidationPrice?: number;
}

// --- Портфель ---
export interface Balance {
  asset: string;
  free: number;
  locked: number;
  total: number;
  usdValue: number;
}

export interface Portfolio {
  exchange: ExchangeId;
  balances: Balance[];
  totalUsdValue: number;
  timestamp: number;
}

// --- Индикаторы ---
export interface Indicator {
  id: string;
  name: string;
  type: 'overlay' | 'pane';
  params: Record<string, number | string | boolean>;
  data?: number[];
}

export interface IndicatorResult {
  indicatorId: string;
  timestamp: number;
  values: Record<string, number>;
}

// --- Рисования ---
export type DrawingType = 
  | 'trendline' 
  | 'horizontal' 
  | 'vertical'
  | 'fibonacci'
  | 'rectangle'
  | 'text';

export interface Drawing {
  id: string;
  type: DrawingType;
  symbol: string;
  points: { time: number; price: number }[];
  style: DrawingStyle;
  createdAt: number;
}

export interface DrawingStyle {
  color: string;
  width: number;
  lineStyle: 'solid' | 'dashed' | 'dotted';
  fill?: string;
  text?: string;
}

// --- Алёрты ---
export interface Alert {
  id: string;
  symbol: string;
  condition: AlertCondition;
  message: string;
  triggerOnce: boolean;
  enabled: boolean;
  createdAt: number;
  triggeredAt?: number;
}

export interface AlertCondition {
  type: 'price_above' | 'price_below' | 'cross_above' | 'cross_below';
  value: number;
  indicatorId?: string;
}

// --- WebSocket сообщения ---
export interface WSMessage {
  type: 'candle' | 'trade' | 'orderbook' | 'ticker' | 'error';
  exchange: ExchangeId;
  symbol: string;
  data: unknown;
  timestamp: number;
}

// --- Конфигурация ---
export interface ChartConfig {
  symbol: string;
  interval: string;
  exchange: ExchangeId;
  indicators: Indicator[];
  drawings: Drawing[];
  theme: 'light' | 'dark';
  chartType: 'candle' | 'bar' | 'line' | 'area' | 'heikinashi';
}

export interface UserSettings {
  defaultExchange: ExchangeId;
  defaultInterval: string;
  theme: 'light' | 'dark';
  timezone: string;
  language: 'en' | 'ru';
  riskPerTrade: number;  // % от депозита
  maxPositions: number;
}

// --- API Responses ---
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  timestamp: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
