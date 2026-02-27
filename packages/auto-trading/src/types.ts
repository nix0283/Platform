/**
 * Типы для системы алгоритмической торговли
 * Основано на: awesome-systematic-trading, jesse, barter-rs
 */

// ============================================
// STRATEGY TYPES
// ============================================

export type StrategyType =
  | 'momentum'
  | 'mean_reversion'
  | 'breakout'
  | 'pairs_trading'
  | 'trend_following'
  | 'volatility'
  | 'market_making'
  | 'scalping'
  | 'swing'
  | 'position';

export interface StrategySignal {
  strategyId: string;
  strategyName: string;
  strategyType: StrategyType;
  symbol: string;
  side: 'LONG' | 'SHORT' | 'FLAT';
  strength: number;           // 0-1 (уверенность сигнала)
  timestamp: number;
  
  // Входные параметры
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  takeProfits?: TakeProfitLevel[];
  
  // Метаданные
  timeframe: string;
  indicators: Record<string, number>;
  metadata: Record<string, any>;
}

export interface TakeProfitLevel {
  percentage: number;         // % позиции для закрытия
  price: number;              // Цена TP
  filled?: boolean;           // Статус заполнения
}

export interface StrategyConfig {
  id: string;
  name: string;
  type: StrategyType;
  enabled: boolean;
  
  // Параметры стратегии
  parameters: Record<string, number | boolean | string>;
  
  // Таймфреймы
  timeframes: string[];
  
  // Символы
  symbols: string[];
  
  // Ограничения
  maxPositions: number;
  maxPositionSize: number;    // % от капитала
  
  // Risk management
  stopLossPercent: number;
  takeProfitPercent: number;
  trailingStop?: boolean;
  trailingStopPercent?: number;
}

export interface StrategyPerformance {
  strategyId: string;
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  totalReturn: number;
  avgReturn: number;
  avgWin: number;
  avgLoss: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  profitableDays: number;
  losingDays: number;
}

// ============================================
// EXECUTION TYPES
// ============================================

export type OrderType = 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_LIMIT';
export type OrderSide = 'BUY' | 'SELL';
export type OrderStatus = 'PENDING' | 'OPEN' | 'FILLED' | 'CANCELLED' | 'REJECTED';

export interface ExecutionOrder {
  orderId: string;
  strategyId: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  
  // Цены и количество
  quantity: number;
  price?: number;             // Для LIMIT/STOP
  stopPrice?: number;         // Для STOP/STOP_LIMIT
  
  // Risk management
  stopLoss?: number;
  takeProfit?: number;
  takeProfits?: TakeProfitLevel[];
  
  // Статус
  status: OrderStatus;
  filledQuantity: number;
  avgFillPrice?: number;
  
  // Временные метки
  createdAt: number;
  updatedAt: number;
  filledAt?: number;
  
  // Метаданные
  exchange: string;
  commission?: number;
  metadata?: Record<string, any>;
}

export interface ExecutionConfig {
  // Симуляция vs реальные ордера
  paperTrading: boolean;
  
  // Проскальзывание
  slippageModel: 'fixed' | 'percentage' | 'volume';
  slippagePercent?: number;
  slippageFixed?: number;
  
  // Комиссии
  commissionModel: 'fixed' | 'percentage' | 'tiered';
  commissionPercent?: number;
  commissionFixed?: number;
  
  // Задержки
  latencyMs: number;
  
  // Лимиты
  maxOrderSize: number;
  minOrderSize: number;
  maxDailyOrders: number;
}

export interface ExecutionReport {
  totalOrders: number;
  filledOrders: number;
  cancelledOrders: number;
  rejectedOrders: number;
  totalVolume: number;
  totalCommission: number;
  totalSlippage: number;
  avgFillTime: number;
  fillRate: number;
}

// ============================================
// RISK MANAGEMENT TYPES
// ============================================

export interface RiskLimits {
  // Лимиты на позицию
  maxPositionSize: number;      // % от капитала
  maxPositionValue: number;     // Абсолютное значение
  
  // Лимиты на стратегию
  maxStrategyExposure: number;  // % на стратегию
  maxStrategies: number;        // Макс. количество стратегий
  
  // Лимиты на символ
  maxSymbolExposure: number;    // % на символ
  maxCorrelatedExposure: number; // % на коррелирующие символы
  
  // Лимиты убытков
  maxDailyLoss: number;         // % за день
  maxWeeklyLoss: number;        // % за неделю
  maxMonthlyLoss: number;       // % за месяц
  maxDrawdown: number;          // Макс. просадка
  
  // Лимиты волатильности
  maxVolatility: number;        // Макс. волатильность для торговли
  minVolume: number;            // Мин. объем для торговли
}

export interface RiskMetrics {
  // Текущая экспозиция
  totalExposure: number;
  longExposure: number;
  shortExposure: number;
  netExposure: number;
  
  // По стратегиям
  strategyExposure: Record<string, number>;
  
  // По символам
  symbolExposure: Record<string, number>;
  
  // P&L
  unrealizedPnL: number;
  realizedPnL: number;
  totalPnL: number;
  
  // Drawdown
  currentDrawdown: number;
  maxDrawdown: number;
  drawdownDuration: number;    // Дней в просадке
  
  // Risk ratios
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  var95: number;               // Value at Risk 95%
  cvar95: number;              // Conditional VaR 95%
  
  // Лимиты
  limitsBreached: RiskLimitBreached[];
}

export interface RiskLimitBreached {
  limit: string;
  currentValue: number;
  limitValue: number;
  severity: 'warning' | 'critical';
  timestamp: number;
}

export interface RiskConfig {
  limits: RiskLimits;
  checkFrequency: 'every_trade' | 'every_minute' | 'every_hour' | 'daily';
  autoReduce: boolean;         // Авто-уменьшение позиций при breach
  alertThreshold: number;      // % от лимита для алерта
}

// ============================================
// POSITION SIZING TYPES
// ============================================

export type PositionSizingMethod =
  | 'fixed_fractional'
  | 'fixed_ratio'
  | 'kelly'
  | 'optimal_f'
  | 'volatility_adjusted'
  | 'risk_parity'
  | 'equal_weight';

export interface PositionSizingConfig {
  method: PositionSizingMethod;
  
  // Параметры для разных методов
  riskPerTrade?: number;      // % для fixed fractional
  kellyMultiplier?: number;   // Для Kelly (обычно 0.25-0.5)
  volatilityTarget?: number;  // Для volatility adjusted
  maxPositionSize?: number;   // Макс. % позиции
  
  // Ограничения
  minPositionSize: number;
  maxPositionSize: number;
  
  // Учет корреляций
  considerCorrelation: boolean;
  maxCorrelatedExposure: number;
}

export interface PositionSizingResult {
  symbol: string;
  side: 'LONG' | 'SHORT';
  quantity: number;
  value: number;
  percentOfCapital: number;
  
  // Метод и параметры
  method: PositionSizingMethod;
  riskUsed: number;
  
  // Ограничения
  constraints: {
    minSizeRespected: boolean;
    maxSizeRespected: boolean;
    correlationRespected: boolean;
  };
}

// ============================================
// AUTO-TRADING MANAGER TYPES
// ============================================

export interface AutoTradingConfig {
  // Общие настройки
  enabled: boolean;
  paperTrading: boolean;
  
  // Стратегии
  strategies: StrategyConfig[];
  
  // Execution
  execution: ExecutionConfig;
  
  // Risk management
  risk: RiskConfig;
  
  // Position sizing
  positionSizing: PositionSizingConfig;
  
  // Интеграция с self-learning
  selfLearningEnabled: boolean;
  minConfidence: number;      // Мин. уверенность от self-learning
  
  // Мониторинг
  monitoringInterval: number; // мс
  reportInterval: number;     // мс
}

export interface AutoTradingState {
  enabled: boolean;
  paperTrading: boolean;
  
  // Активные позиции
  activePositions: number;
  pendingOrders: number;
  
  // P&L
  todayPnL: number;
  totalPnL: number;
  
  // Risk
  currentDrawdown: number;
  exposure: number;
  
  // Статистика
  totalTrades: number;
  winRate: number;
  
  // Стратегии
  activeStrategies: number;
  bestStrategy: string;
  worstStrategy: string;
  
  // Последнее обновление
  lastUpdate: number;
}

export interface AutoTradingReport {
  period: 'daily' | 'weekly' | 'monthly';
  startDate: number;
  endDate: number;
  
  // Performance
  totalReturn: number;
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  
  // По стратегиям
  strategyPerformance: StrategyPerformance[];
  
  // Risk
  avgExposure: number;
  maxExposure: number;
  var95: number;
  limitBreaches: number;
  
  // Execution
  fillRate: number;
  avgSlippage: number;
  totalCommission: number;
  
  // Recommendations
  recommendations: string[];
}

// ============================================
// EVENTS
// ============================================

export type AutoTradingEvent =
  | { type: 'signal_generated'; signal: StrategySignal }
  | { type: 'order_created'; order: ExecutionOrder }
  | { type: 'order_filled'; order: ExecutionOrder; fillPrice: number }
  | { type: 'order_cancelled'; orderId: string }
  | { type: 'risk_limit_breached'; breach: RiskLimitBreached }
  | { type: 'position_opened'; orderId: string; position: any }
  | { type: 'position_closed'; position: any; pnl: number }
  | { type: 'daily_report'; report: AutoTradingReport }
  | { type: 'strategy_enabled'; strategyId: string }
  | { type: 'strategy_disabled'; strategyId: string; reason: string };
