// ============================================
// APP STORE — Zustand store для состояния
// ============================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ChartConfig, ExchangeId, Order, Position, UserSettings } from '@trading-platform/core';

interface AppState {
  // Настройки графика
  chartConfig: ChartConfig;
  
  // Активные позиции
  positions: Position[];
  
  // Активные ордера
  orders: Order[];
  
  // Пользовательские настройки
  settings: UserSettings;
  
  // WebSocket подключение
  wsConnected: boolean;
  
  // Actions
  setChartConfig: (config: Partial<ChartConfig>) => void;
  addPosition: (position: Position) => void;
  removePosition: (symbol: string) => void;
  updatePosition: (symbol: string, updates: Partial<Position>) => void;
  addOrder: (order: Order) => void;
  updateOrder: (orderId: string, updates: Partial<Order>) => void;
  setSettings: (settings: Partial<UserSettings>) => void;
  setWsConnected: (connected: boolean) => void;
}

const defaultChartConfig: ChartConfig = {
  symbol: 'BTC/USDT',
  interval: '1h',
  exchange: 'binance',
  indicators: [],
  drawings: [],
  theme: 'dark',
  chartType: 'candle',
};

const defaultSettings: UserSettings = {
  defaultExchange: 'binance',
  defaultInterval: '1h',
  theme: 'dark',
  timezone: 'UTC',
  language: 'ru',
  riskPerTrade: 1,
  maxPositions: 5,
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      chartConfig: defaultChartConfig,
      positions: [],
      orders: [],
      settings: defaultSettings,
      wsConnected: false,

      // Actions
      setChartConfig: (config) =>
        set((state) => ({
          chartConfig: { ...state.chartConfig, ...config },
        })),

      addPosition: (position) =>
        set((state) => ({
          positions: [...state.positions, position],
        })),

      removePosition: (symbol) =>
        set((state) => ({
          positions: state.positions.filter((p) => p.symbol !== symbol),
        })),

      updatePosition: (symbol, updates) =>
        set((state) => ({
          positions: state.positions.map((p) =>
            p.symbol === symbol ? { ...p, ...updates } : p
          ),
        })),

      addOrder: (order) =>
        set((state) => ({
          orders: [...state.orders, order],
        })),

      updateOrder: (orderId, updates) =>
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === orderId ? { ...o, ...updates } : o
          ),
        })),

      setSettings: (settings) =>
        set((state) => ({
          settings: { ...state.settings, ...settings },
        })),

      setWsConnected: (connected) =>
        set({ wsConnected: connected }),
    }),
    {
      name: 'trading-platform-storage',
      partialize: (state) => ({
        settings: state.settings,
        chartConfig: state.chartConfig,
      }),
    }
  )
);

// Hook для удобного доступа
export const useChartConfig = () => useAppStore((state) => state.chartConfig);
export const usePositions = () => useAppStore((state) => state.positions);
export const useOrders = () => useAppStore((state) => state.orders);
export const useSettings = () => useAppStore((state) => state.settings);
export const useWsConnected = () => useAppStore((state) => state.wsConnected);
