'use client';

// ============================================
// USE PAPER TRADING HOOK
// Хук для управления демо-трейдингом
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { PaperTradingEngine } from '@trading-platform/paper-trading';
import type { TradingMode, PaperOrder, PaperPosition, PaperTradingStats } from '@trading-platform/paper-trading';

export interface UsePaperTradingOptions {
  initialBalance?: number;
  autoStart?: boolean;
  syncWithJournal?: boolean;
  syncWithML?: boolean;
}

export function usePaperTrading(options: UsePaperTradingOptions = {}) {
  const [engine, setEngine] = useState<PaperTradingEngine | null>(null);
  const [mode, setMode] = useState<TradingMode>('PAPER');
  const [stats, setStats] = useState<PaperTradingStats | null>(null);
  const [positions, setPositions] = useState<PaperPosition[]>([]);
  const [orders, setOrders] = useState<PaperOrder[]>([]);
  const [ready, setReady] = useState(false);

  // Initialize engine
  useEffect(() => {
    if (options.autoStart !== false) {
      const paperEngine = new PaperTradingEngine('user_1', {
        initialBalance: options.initialBalance || 10000,
      });
      setEngine(paperEngine);
      setReady(true);

      // Initial stats
      updateStats(paperEngine);
    }
  }, [options.autoStart, options.initialBalance]);

  // Update stats periodically
  useEffect(() => {
    if (!engine) return;

    const interval = setInterval(() => {
      updateStats(engine);
      setPositions(engine.getPositions());
      setOrders(engine.getOrders());
    }, 5000); // Every 5 seconds

    return () => clearInterval(interval);
  }, [engine]);

  const updateStats = useCallback((eng: PaperTradingEngine) => {
    const newStats = eng.getStats();
    setStats(newStats);
  }, []);

  // Trading functions
  const placeOrder = useCallback(async (params: {
    symbol: string;
    side: 'BUY' | 'SELL';
    quantity: number;
    leverage?: number;
    stopLoss?: number;
    takeProfits?: Array<{ price: number; percentage: number }>;
  }) => {
    if (!engine) throw new Error('Engine not initialized');

    const order = await engine.placeOrder({
      ...params,
      type: 'MARKET',
    });

    setOrders(engine.getOrders());
    setPositions(engine.getPositions());
    updateStats(engine);

    return order;
  }, [engine, updateStats]);

  const closePosition = useCallback(async (symbol: string, side: 'LONG' | 'SHORT') => {
    if (!engine) throw new Error('Engine not initialized');

    await engine.closePositionManually(symbol, side);
    
    setPositions(engine.getPositions());
    updateStats(engine);
  }, [engine, updateStats]);

  const updatePrice = useCallback((symbol: string, price: number) => {
    if (!engine) return;
    engine.updatePrice(symbol, price);
    setPositions(engine.getPositions());
    updateStats(engine);
  }, [engine, updateStats]);

  const resetAccount = useCallback((newBalance?: number) => {
    if (!engine) return;
    engine.resetAccount(newBalance);
    setPositions(engine.getPositions());
    setOrders(engine.getOrders());
    updateStats(engine);
  }, [engine, updateStats]);

  const switchMode = useCallback((newMode: TradingMode) => {
    setMode(newMode);
    // In production, would switch between paper and real trading
  }, []);

  const exportData = useCallback(() => {
    if (!engine) return null;
    return engine.exportData();
  }, [engine]);

  return {
    ready,
    mode,
    stats,
    positions,
    orders,
    placeOrder,
    closePosition,
    updatePrice,
    resetAccount,
    switchMode,
    exportData,
  };
}

export default usePaperTrading;
