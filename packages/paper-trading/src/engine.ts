// ============================================
// PAPER TRADING ENGINE
// Движок симуляции торговли
// ============================================

import {
  PaperTradingAccount,
  PaperOrder,
  PaperPosition,
  PaperTrade,
  PaperTradingConfig,
  PaperTradingStats,
  TradingMode,
  DEFAULT_PAPER_CONFIG,
} from './types';

export class PaperTradingEngine {
  private account: PaperTradingAccount;
  private orders: Map<string, PaperOrder> = new Map();
  private positions: Map<string, PaperPosition> = new Map();
  private trades: Map<string, PaperTrade> = new Map();
  private config: PaperTradingConfig;
  private priceFeed: Map<string, number> = new Map();

  constructor(
    userId: string,
    config: Partial<PaperTradingConfig> = {}
  ) {
    this.config = { ...DEFAULT_PAPER_CONFIG, ...config };
    this.account = this.createAccount(userId);
  }

  // ============================================
  // ACCOUNT MANAGEMENT
  // ============================================

  private createAccount(userId: string): PaperTradingAccount {
    return {
      id: `paper_${userId}_${Date.now()}`,
      userId,
      mode: 'PAPER',
      initialBalance: this.config.initialBalance,
      currentBalance: this.config.initialBalance,
      availableBalance: this.config.initialBalance,
      unrealizedPnl: 0,
      realizedPnl: 0,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      totalPnl: 0,
      totalPnlPercent: 0,
      defaultLeverage: this.config.defaultLeverage,
      defaultQuantity: this.config.defaultQuantity,
      autoCloseEnabled: this.config.enableAutoClose,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  getAccount(): PaperTradingAccount {
    return { ...this.account };
  }

  resetAccount(newBalance?: number) {
    const balance = newBalance || this.config.initialBalance;
    this.account = {
      ...this.account,
      currentBalance: balance,
      availableBalance: balance,
      unrealizedPnl: 0,
      realizedPnl: 0,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      totalPnl: 0,
      totalPnlPercent: 0,
      updatedAt: Date.now(),
    };
    this.orders.clear();
    this.positions.clear();
    this.trades.clear();
  }

  // ============================================
  // ORDER EXECUTION
  // ============================================

  async placeOrder(orderParams: {
    symbol: string;
    side: 'BUY' | 'SELL';
    type: 'MARKET' | 'LIMIT' | 'STOP_MARKET' | 'STOP_LIMIT';
    quantity: number;
    price?: number;
    stopPrice?: number;
    leverage?: number;
    stopLoss?: number;
    takeProfits?: Array<{ price: number; percentage: number }>;
  }): Promise<PaperOrder> {
    const leverage = orderParams.leverage || this.account.defaultLeverage;
    
    // Calculate required margin
    const notionalValue = orderParams.quantity * (orderParams.price || this.getCurrentPrice(orderParams.symbol));
    const requiredMargin = notionalValue / leverage;

    // Check available balance
    if (requiredMargin > this.account.availableBalance) {
      throw new Error('Insufficient balance');
    }

    // Create order
    const order: PaperOrder = {
      id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      accountId: this.account.id,
      symbol: orderParams.symbol,
      exchange: 'paper',
      side: orderParams.side,
      type: orderParams.type,
      quantity: orderParams.quantity,
      price: orderParams.price,
      stopPrice: orderParams.stopPrice,
      leverage,
      status: 'PENDING',
      filledQuantity: 0,
      averagePrice: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isPaper: true,
      simulatedSlippage: 0,
      simulatedFee: 0,
    };

    this.orders.set(order.id, order);

    // Execute market orders immediately
    if (order.type === 'MARKET' || order.type === 'STOP_MARKET') {
      await this.executeOrder(order);
    }

    return order;
  }

  private async executeOrder(order: PaperOrder) {
    const currentPrice = this.getCurrentPrice(order.symbol);
    
    // Simulate slippage
    const slippage = currentPrice * (this.config.slippagePercent / 100);
    const fillPrice = order.side === 'BUY' 
      ? currentPrice + slippage 
      : currentPrice - slippage;

    // Calculate fee
    const notionalValue = order.quantity * fillPrice;
    const fee = notionalValue * (this.config.feePercent / 100);

    // Update order
    order.status = 'FILLED';
    order.filledQuantity = order.quantity;
    order.averagePrice = fillPrice;
    order.simulatedSlippage = slippage;
    order.simulatedFee = fee;
    order.filledAt = Date.now();
    order.updatedAt = Date.now();

    this.orders.set(order.id, order);

    // Create or update position
    await this.updatePosition(order);

    // Create trade record
    this.createTrade(order, fillPrice, fee);

    // Update account
    this.updateAccountAfterTrade(fee);
  }

  private async updatePosition(order: PaperOrder) {
    const positionId = `${order.symbol}_${order.side === 'BUY' ? 'LONG' : 'SHORT'}`;
    const existingPosition = this.positions.get(positionId);

    if (existingPosition) {
      // Update existing position
      if (
        (existingPosition.side === 'LONG' && order.side === 'BUY') ||
        (existingPosition.side === 'SHORT' && order.side === 'SELL')
      ) {
        // Add to position (averaging)
        const totalQuantity = existingPosition.quantity + order.quantity;
        const totalValue = (existingPosition.quantity * existingPosition.entryPrice) + 
                          (order.quantity * order.averagePrice);
        
        existingPosition.quantity = totalQuantity;
        existingPosition.entryPrice = totalValue / totalQuantity;
        existingPosition.updatedAt = Date.now();
      } else {
        // Reduce or close position
        if (order.quantity >= existingPosition.quantity) {
          // Close position
          await this.closePosition(existingPosition, order.averagePrice);
          return;
        } else {
          // Partial close
          existingPosition.quantity -= order.quantity;
          existingPosition.updatedAt = Date.now();
        }
      }
    } else {
      // Open new position
      const position: PaperPosition = {
        id: positionId,
        accountId: this.account.id,
        symbol: order.symbol,
        exchange: order.exchange,
        side: order.side === 'BUY' ? 'LONG' : 'SHORT',
        quantity: order.quantity,
        entryPrice: order.averagePrice,
        currentPrice: order.averagePrice,
        leverage: order.leverage,
        unrealizedPnl: 0,
        unrealizedPnlPercent: 0,
        stopLoss: undefined,
        takeProfits: [],
        openedAt: Date.now(),
        updatedAt: Date.now(),
        isPaper: true,
      };

      this.positions.set(positionId, position);
    }
  }

  private async closePosition(position: PaperPosition, exitPrice: number) {
    // Calculate P&L
    const pnl = position.side === 'LONG'
      ? (exitPrice - position.entryPrice) * position.quantity
      : (position.entryPrice - exitPrice) * position.quantity;

    const pnlPercent = ((exitPrice - position.entryPrice) / position.entryPrice) * 100 *
      (position.side === 'LONG' ? 1 : -1);

    // Update account
    this.account.realizedPnl += pnl;
    this.account.currentBalance += pnl;
    this.account.availableBalance += pnl;
    this.account.totalPnl += pnl;

    // Update stats
    this.account.totalTrades++;
    if (pnl > 0) {
      this.account.winningTrades++;
    } else {
      this.account.losingTrades++;
    }
    this.account.winRate = (this.account.winningTrades / this.account.totalTrades) * 100;
    this.account.totalPnlPercent = (this.account.totalPnl / this.account.initialBalance) * 100;

    this.account.lastTradeAt = Date.now();
    this.account.updatedAt = Date.now();

    // Remove position
    this.positions.delete(`${position.symbol}_${position.side}`);
  }

  private createTrade(order: PaperOrder, price: number, fee: number) {
    const trade: PaperTrade = {
      id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      accountId: this.account.id,
      orderId: order.id,
      symbol: order.symbol,
      exchange: order.exchange,
      side: order.side,
      quantity: order.quantity,
      price,
      fee,
      timestamp: Date.now(),
      isPaper: true,
    };

    this.trades.set(trade.id, trade);
  }

  private updateAccountAfterTrade(fee: number) {
    this.account.availableBalance -= fee;
    this.account.updatedAt = Date.now();
  }

  // ============================================
  // POSITION MANAGEMENT
  // ============================================

  async closePositionManually(symbol: string, side: 'LONG' | 'SHORT') {
    const positionId = `${symbol}_${side}`;
    const position = this.positions.get(positionId);

    if (!position) {
      throw new Error('Position not found');
    }

    const currentPrice = this.getCurrentPrice(symbol);
    await this.closePosition(position, currentPrice);
  }

  async updatePositionRisk(positionId: string, updates: {
    stopLoss?: number;
    takeProfits?: Array<{ price: number; percentage: number }>;
  }) {
    const position = this.positions.get(positionId);
    if (!position) throw new Error('Position not found');

    if (updates.stopLoss !== undefined) {
      position.stopLoss = updates.stopLoss;
    }
    if (updates.takeProfits) {
      position.takeProfits = updates.takeProfits.map(tp => ({
        ...tp,
        filled: false,
      }));
    }

    position.updatedAt = Date.now();
    this.positions.set(positionId, position);
  }

  // ============================================
  // PRICE FEED
  // ============================================

  updatePrice(symbol: string, price: number) {
    this.priceFeed.set(symbol, price);

    // Update all positions with new price
    for (const position of this.positions.values()) {
      if (position.symbol === symbol) {
        this.updatePositionPnL(position, price);
      }
    }

    // Update account unrealized PnL
    this.updateAccountUnrealizedPnL();
  }

  private updatePositionPnL(position: PaperPosition, currentPrice: number) {
    position.currentPrice = currentPrice;
    
    position.unrealizedPnl = position.side === 'LONG'
      ? (currentPrice - position.entryPrice) * position.quantity
      : (position.entryPrice - currentPrice) * position.quantity;

    position.unrealizedPnlPercent = ((currentPrice - position.entryPrice) / position.entryPrice) * 100 *
      (position.side === 'LONG' ? 1 : -1);

    // Check stop loss
    if (position.stopLoss) {
      if (
        (position.side === 'LONG' && currentPrice <= position.stopLoss) ||
        (position.side === 'SHORT' && currentPrice >= position.stopLoss)
      ) {
        this.closePosition(position, currentPrice);
      }
    }

    // Check take profits
    if (position.takeProfits) {
      for (const tp of position.takeProfits) {
        if (!tp.filled) {
          if (
            (position.side === 'LONG' && currentPrice >= tp.price) ||
            (position.side === 'SHORT' && currentPrice <= tp.price)
          ) {
            tp.filled = true;
            // Partial close logic would go here
          }
        }
      }
    }

    position.updatedAt = Date.now();
    this.positions.set(`${position.symbol}_${position.side}`, position);
  }

  private updateAccountUnrealizedPnL() {
    let totalUnrealizedPnl = 0;
    for (const position of this.positions.values()) {
      totalUnrealizedPnl += position.unrealizedPnl;
    }
    this.account.unrealizedPnl = totalUnrealizedPnl;
  }

  getCurrentPrice(symbol: string): number {
    return this.priceFeed.get(symbol) || 0;
  }

  // ============================================
  // QUERIES
  // ============================================

  getOrders(filters?: { status?: string; symbol?: string }): PaperOrder[] {
    let orders = Array.from(this.orders.values());
    
    if (filters) {
      if (filters.status) {
        orders = orders.filter(o => o.status === filters.status);
      }
      if (filters.symbol) {
        orders = orders.filter(o => o.symbol === filters.symbol);
      }
    }

    return orders.sort((a, b) => b.createdAt - a.createdAt);
  }

  getPositions(): PaperPosition[] {
    return Array.from(this.positions.values());
  }

  getTrades(filters?: { symbol?: string; dateFrom?: number; dateTo?: number }): PaperTrade[] {
    let trades = Array.from(this.trades.values());
    
    if (filters) {
      if (filters.symbol) {
        trades = trades.filter(t => t.symbol === filters.symbol);
      }
      if (filters.dateFrom) {
        trades = trades.filter(t => t.timestamp >= filters.dateFrom!);
      }
      if (filters.dateTo) {
        trades = trades.filter(t => t.timestamp <= filters.dateTo!);
      }
    }

    return trades.sort((a, b) => b.timestamp - a.timestamp);
  }

  getStats(): PaperTradingStats {
    const trades = this.getTrades();
    const winningTrades = trades.filter(t => {
      // Simplified - in production would calculate from position closes
      return true;
    });

    const totalPnl = this.account.realizedPnl + this.account.unrealizedPnl;

    return {
      accountId: this.account.id,
      mode: this.account.mode,
      initialBalance: this.account.initialBalance,
      currentBalance: this.account.currentBalance,
      totalDeposit: 0,
      totalWithdrawal: 0,
      totalPnl,
      totalPnlPercent: this.account.totalPnlPercent,
      realizedPnl: this.account.realizedPnl,
      unrealizedPnl: this.account.unrealizedPnl,
      totalTrades: this.account.totalTrades,
      winningTrades: this.account.winningTrades,
      losingTrades: this.account.losingTrades,
      winRate: this.account.winRate,
      avgWin: 0,
      avgLoss: 0,
      profitFactor: 0,
      maxDrawdown: 0,
      maxDrawdownPercent: 0,
      sharpeRatio: 0,
      avgLeverage: this.account.defaultLeverage,
      bestTrade: 0,
      worstTrade: 0,
      avgTradeDuration: 0,
      consecutiveWins: 0,
      consecutiveLosses: 0,
    };
  }

  // ============================================
  // EXPORT
  // ============================================

  exportData(): {
    account: PaperTradingAccount;
    orders: PaperOrder[];
    positions: PaperPosition[];
    trades: PaperTrade[];
    stats: PaperTradingStats;
  } {
    return {
      account: this.getAccount(),
      orders: this.getOrders(),
      positions: this.getPositions(),
      trades: this.getTrades(),
      stats: this.getStats(),
    };
  }
}

export default PaperTradingEngine;
