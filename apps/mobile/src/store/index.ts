// ============================================
// MOBILE APP STORE — Zustand store с офлайн-синхронизацией
// ============================================

import { create } from 'zustand';
import { ChartConfig, ExchangeId, Order, Position, UserSettings, Candle } from '@trading-platform/core';

// Офлайн очередь действий
interface PendingAction {
  id: string;
  type: 'order' | 'cancel' | 'drawing' | 'alert';
  payload: any;
  timestamp: number;
  synced: boolean;
}

interface MobileAppState {
  // Настройки графика
  chartConfig: ChartConfig;
  
  // Кэшированные данные (для офлайн работы)
  cachedCandles: Record<string, Candle[]>;
  cachedSymbols: Record<string, any[]>;
  
  // Активные позиции и ордера
  positions: Position[];
  orders: Order[];
  
  // Пользовательские настройки
  settings: UserSettings;
  
  // Синхронизация
  isConnected: boolean;
  lastSyncTime: number | null;
  pendingActions: PendingAction[];
  
  // Auth
  userId: string | null;
  apiKeys: Record<ExchangeId, { apiKey: string; apiSecret: string } | null>;
  
  // Actions
  setChartConfig: (config: Partial<ChartConfig>) => void;
  cacheCandles: (key: string, candles: Candle[]) => void;
  addPosition: (position: Position) => void;
  updatePosition: (symbol: string, updates: Partial<Position>) => void;
  addOrder: (order: Order) => void;
  updateOrder: (orderId: string, updates: Partial<Order>) => void;
  setSettings: (settings: Partial<UserSettings>) => void;
  setConnected: (connected: boolean) => void;
  addPendingAction: (action: Omit<PendingAction, 'id' | 'timestamp' | 'synced'>) => void;
  markActionSynced: (actionId: string) => void;
  setUserId: (userId: string | null) => void;
  setApiKey: (exchange: ExchangeId, keys: { apiKey: string; apiSecret: string } | null) => void;
  
  // Синхронизация с сервером
  syncWithServer: () => Promise<void>;
  pushPendingActions: () => Promise<void>;
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

export const useMobileStore = create<MobileAppState>()((set, get) => ({
  // Initial state
  chartConfig: defaultChartConfig,
  cachedCandles: {},
  cachedSymbols: {},
  positions: [],
  orders: [],
  settings: defaultSettings,
  isConnected: false,
  lastSyncTime: null,
  pendingActions: [],
  userId: null,
  apiKeys: {
    binance: null,
    bybit: null,
    okx: null,
    bitget: null,
    bingx: null,
  },

  // Actions
  setChartConfig: (config) =>
    set((state) => ({
      chartConfig: { ...state.chartConfig, ...config },
    })),

  cacheCandles: (key, candles) =>
    set((state) => ({
      cachedCandles: { ...state.cachedCandles, [key]: candles },
    })),

  addPosition: (position) =>
    set((state) => ({
      positions: [...state.positions, position],
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

  setConnected: (connected) =>
    set({ isConnected: connected, lastSyncTime: connected ? Date.now() : null }),

  addPendingAction: (action) =>
    set((state) => ({
      pendingActions: [
        ...state.pendingActions,
        {
          ...action,
          id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          synced: false,
        },
      ],
    })),

  markActionSynced: (actionId) =>
    set((state) => ({
      pendingActions: state.pendingActions.filter((a) => a.id !== actionId),
    })),

  setUserId: (userId) => set({ userId }),

  setApiKey: (exchange, keys) =>
    set((state) => ({
      apiKeys: { ...state.apiKeys, [exchange]: keys },
    })),

  // Синхронизация с сервером
  syncWithServer: async () => {
    const { userId, apiKeys } = get();
    if (!userId) return;

    try {
      // Загрузка позиций и ордеров
      const [positionsRes, ordersRes] = await Promise.all([
        fetch(`${get().settings.defaultExchange === 'binance' ? 'https://api.binance.com' : ''}/api/v3/account`, {
          headers: {
            'X-MBX-APIKEY': apiKeys.binance?.apiKey || '',
          },
        }).catch(() => null),
      ]);

      set({ lastSyncTime: Date.now(), isConnected: true });
    } catch (error) {
      set({ isConnected: false });
    }
  },

  pushPendingActions: async () => {
    const { pendingActions, markActionSynced } = get();
    
    for (const action of pendingActions) {
      if (action.synced) continue;

      try {
        // Отправка действия на сервер
        await fetch('http://localhost:8080/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action),
        });
        markActionSynced(action.id);
      } catch (error) {
        console.error('Failed to sync action:', action.id, error);
      }
    }
  },
}));

// Хуки для удобного доступа
export const useMobileChartConfig = () => useMobileStore((state) => state.chartConfig);
export const useMobilePositions = () => useMobileStore((state) => state.positions);
export const useMobileOrders = () => useMobileStore((state) => state.orders);
export const useMobileConnected = () => useMobileStore((state) => state.isConnected);
export const useMobileApiKeys = () => useMobileStore((state) => state.apiKeys);
