/**
 * Execution Engine
 * Управление ордерами: создание, модификация, отмена
 * Поддержка paper trading и реальных ордеров
 */

import {
  ExecutionOrder,
  ExecutionConfig,
  ExecutionReport,
  OrderStatus,
  OrderType,
  OrderSide,
} from '../types';

export class ExecutionEngine {
  private config: ExecutionConfig;
  private orders: Map<string, ExecutionOrder> = new Map();
  private orderCounter: number = 0;
  private dailyOrderCount: number = 0;
  private lastResetDate: string = new Date().toDateString();

  constructor(config: ExecutionConfig) {
    this.config = config;
  }

  /**
   * Создание ордера
   */
  createOrder(params: {
    strategyId: string;
    symbol: string;
    side: OrderSide;
    type: OrderType;
    quantity: number;
    price?: number;
    stopPrice?: number;
    stopLoss?: number;
    takeProfit?: number;
  }): ExecutionOrder {
    // Проверка лимитов
    this.checkOrderLimits();
    
    const orderId = this.generateOrderId();
    const now = Date.now();
    
    const order: ExecutionOrder = {
      orderId,
      strategyId: params.strategyId,
      symbol: params.symbol,
      side: params.side,
      type: params.type,
      quantity: params.quantity,
      price: params.price,
      stopPrice: params.stopPrice,
      stopLoss: params.stopLoss,
      takeProfit: params.takeProfit,
      status: 'PENDING',
      filledQuantity: 0,
      createdAt: now,
      updatedAt: now,
      exchange: 'binance',  // Заглушка
    };
    
    // Симуляция задержки
    setTimeout(() => {
      this.submitOrder(order);
    }, this.config.latencyMs);
    
    this.orders.set(orderId, order);
    return order;
  }

  /**
   * Отправка ордера (симуляция или реальный API)
   */
  private submitOrder(order: ExecutionOrder): void {
    if (this.config.paperTrading) {
      this.simulateOrderFill(order);
    } else {
      // В реальном режиме здесь будет вызов API биржи
      this.simulateOrderFill(order);  // Заглушка
    }
  }

  /**
   * Симуляция исполнения ордера
   */
  private simulateOrderFill(order: ExecutionOrder): void {
    const now = Date.now();
    
    // Расчет цены исполнения с учетом проскальзывания
    const slippage = this.calculateSlippage(order);
    let fillPrice: number;
    
    if (order.type === 'MARKET') {
      const basePrice = order.side === 'BUY' ? 50000 : 50000;  // Заглушка цены
      fillPrice = order.side === 'BUY' 
        ? basePrice * (1 + slippage)
        : basePrice * (1 - slippage);
    } else {
      fillPrice = order.price || 50000;
    }
    
    // Расчет комиссии
    const commission = this.calculateCommission(order, fillPrice);
    
    // Обновление ордера
    order.status = 'FILLED';
    order.filledQuantity = order.quantity;
    order.avgFillPrice = fillPrice;
    order.commission = commission;
    order.filledAt = now;
    order.updatedAt = now;
    
    this.orders.set(order.orderId, order);
  }

  /**
   * Расчет проскальзывания
   */
  private calculateSlippage(order: ExecutionOrder): number {
    switch (this.config.slippageModel) {
      case 'fixed':
        return this.config.slippageFixed || 0;
      case 'percentage':
        return (this.config.slippagePercent || 0) / 100;
      case 'volume':
        // Больше объем = больше проскальзывание
        const baseSlippage = this.config.slippagePercent || 0.05;
        return (baseSlippage / 100) * Math.sqrt(order.quantity);
      default:
        return 0.0005;  // 0.05% по умолчанию
    }
  }

  /**
   * Расчет комиссии
   */
  private calculateCommission(order: ExecutionOrder, fillPrice: number): number {
    const notional = order.quantity * fillPrice;
    
    switch (this.config.commissionModel) {
      case 'fixed':
        return this.config.commissionFixed || 0;
      case 'percentage':
        return notional * ((this.config.commissionPercent || 0.1) / 100);
      case 'tiered':
        // Упрощенная tiered модель
        if (notional > 100000) return notional * 0.0005;
        if (notional > 10000) return notional * 0.001;
        return notional * 0.002;
      default:
        return notional * 0.001;  // 0.1% по умолчанию
    }
  }

  /**
   * Отмена ордера
   */
  cancelOrder(orderId: string): boolean {
    const order = this.orders.get(orderId);
    if (!order) return false;
    
    if (order.status === 'FILLED' || order.status === 'CANCELLED') {
      return false;
    }
    
    order.status = 'CANCELLED';
    order.updatedAt = Date.now();
    this.orders.set(orderId, order);
    
    return true;
  }

  /**
   * Модификация ордера
   */
  modifyOrder(
    orderId: string,
    modifications: {
      quantity?: number;
      price?: number;
      stopLoss?: number;
      takeProfit?: number;
    }
  ): boolean {
    const order = this.orders.get(orderId);
    if (!order) return false;
    
    if (order.status === 'FILLED' || order.status === 'CANCELLED') {
      return false;
    }
    
    if (modifications.quantity !== undefined) {
      order.quantity = modifications.quantity;
    }
    if (modifications.price !== undefined) {
      order.price = modifications.price;
    }
    if (modifications.stopLoss !== undefined) {
      order.stopLoss = modifications.stopLoss;
    }
    if (modifications.takeProfit !== undefined) {
      order.takeProfit = modifications.takeProfit;
    }
    
    order.updatedAt = Date.now();
    this.orders.set(orderId, order);
    
    return true;
  }

  /**
   * Получение ордера
   */
  getOrder(orderId: string): ExecutionOrder | undefined {
    return this.orders.get(orderId);
  }

  /**
   * Получение всех ордеров
   */
  getOrders(filters?: {
    status?: OrderStatus;
    strategyId?: string;
    symbol?: string;
  }): ExecutionOrder[] {
    let orders = Array.from(this.orders.values());
    
    if (filters) {
      if (filters.status) {
        orders = orders.filter(o => o.status === filters.status);
      }
      if (filters.strategyId) {
        orders = orders.filter(o => o.strategyId === filters.strategyId);
      }
      if (filters.symbol) {
        orders = orders.filter(o => o.symbol === filters.symbol);
      }
    }
    
    return orders;
  }

  /**
   * Проверка лимитов ордеров
   */
  private checkOrderLimits(): void {
    // Сброс дневного счетчика
    const today = new Date().toDateString();
    if (today !== this.lastResetDate) {
      this.dailyOrderCount = 0;
      this.lastResetDate = today;
    }
    
    // Проверка максимального количества ордеров в день
    if (this.config.maxDailyOrders && this.dailyOrderCount >= this.config.maxDailyOrders) {
      throw new Error(`Daily order limit reached: ${this.config.maxDailyOrders}`);
    }
    
    this.dailyOrderCount++;
  }

  /**
   * Генерация ID ордера
   */
  private generateOrderId(): string {
    this.orderCounter++;
    return `order_${Date.now()}_${this.orderCounter}`;
  }

  /**
   * Отчет по исполнениям
   */
  getExecutionReport(): ExecutionReport {
    const orders = Array.from(this.orders.values());
    
    const filledOrders = orders.filter(o => o.status === 'FILLED');
    const cancelledOrders = orders.filter(o => o.status === 'CANCELLED');
    const rejectedOrders = orders.filter(o => o.status === 'REJECTED');
    
    const totalVolume = filledOrders.reduce((sum, o) => sum + o.quantity * (o.avgFillPrice || 0), 0);
    const totalCommission = filledOrders.reduce((sum, o) => sum + (o.commission || 0), 0);
    
    return {
      totalOrders: orders.length,
      filledOrders: filledOrders.length,
      cancelledOrders: cancelledOrders.length,
      rejectedOrders: rejectedOrders.length,
      totalVolume,
      totalCommission,
      totalSlippage: 0,  // Нужно рассчитывать отдельно
      avgFillTime: 0,    // Нужно рассчитывать отдельно
      fillRate: orders.length > 0 ? filledOrders.length / orders.length : 0,
    };
  }

  /**
   * Сброс состояния
   */
  reset(): void {
    this.orders.clear();
    this.orderCounter = 0;
    this.dailyOrderCount = 0;
  }
}

/**
 * Factory для создания Execution Engine
 */
export function createExecutionEngine(
  paperTrading: boolean = true,
  overrides?: Partial<ExecutionConfig>
): ExecutionEngine {
  return new ExecutionEngine({
    paperTrading,
    slippageModel: 'percentage',
    slippagePercent: 0.05,
    commissionModel: 'percentage',
    commissionPercent: 0.1,
    latencyMs: 100,
    maxOrderSize: 1000,
    minOrderSize: 0.001,
    maxDailyOrders: 1000,
    ...overrides,
  });
}
