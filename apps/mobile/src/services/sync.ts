// ============================================
// SYNC SERVICE — Офлайн-первый подход с синхронизацией
// ============================================

import * as SecureStore from 'expo-secure-store';
import { Candle, Order, Position, Drawing, Alert } from '@trading-platform/core';

const STORAGE_KEYS = {
  CANDLES_CACHE: 'candles_cache',
  POSITIONS: 'positions',
  ORDERS: 'orders',
  DRAWINGS: 'drawings',
  ALERTS: 'alerts',
  USER_ID: 'user_id',
  API_KEYS: 'api_keys',
  LAST_SYNC: 'last_sync',
  PENDING_ACTIONS: 'pending_actions',
};

export interface SyncAction {
  id: string;
  type: 'CREATE_ORDER' | 'CANCEL_ORDER' | 'UPDATE_POSITION' | 'CREATE_DRAWING' | 'CREATE_ALERT';
  payload: any;
  timestamp: number;
  retryCount: number;
}

class SyncService {
  private baseUrl: string;
  private syncInterval: number = 5000; // 5 секунд
  private isSyncing: boolean = false;
  private listeners: Set<() => void> = new Set();

  constructor(baseUrl: string = 'http://localhost:8080') {
    this.baseUrl = baseUrl;
    this.startAutoSync();
  }

  // === Local Storage ===

  async saveCandles(key: string, candles: Candle[]): Promise<void> {
    const cache = await this.getCandlesCache();
    cache[key] = { data: candles, timestamp: Date.now() };
    await SecureStore.setItemAsync(STORAGE_KEYS.CANDLES_CACHE, JSON.stringify(cache));
  }

  async getCandlesCache(): Promise<Record<string, { data: Candle[]; timestamp: number }>> {
    const data = await SecureStore.getItemAsync(STORAGE_KEYS.CANDLES_CACHE);
    return data ? JSON.parse(data) : {};
  }

  async getCandles(key: string, maxAge: number = 60000): Promise<Candle[] | null> {
    const cache = await this.getCandlesCache();
    const entry = cache[key];
    
    if (!entry) return null;
    if (Date.now() - entry.timestamp > maxAge) return null;
    
    return entry.data;
  }

  async savePositions(positions: Position[]): Promise<void> {
    await SecureStore.setItemAsync(STORAGE_KEYS.POSITIONS, JSON.stringify(positions));
  }

  async getPositions(): Promise<Position[]> {
    const data = await SecureStore.getItemAsync(STORAGE_KEYS.POSITIONS);
    return data ? JSON.parse(data) : [];
  }

  async saveOrders(orders: Order[]): Promise<void> {
    await SecureStore.setItemAsync(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
  }

  async getOrders(): Promise<Order[]> {
    const data = await SecureStore.getItemAsync(STORAGE_KEYS.ORDERS);
    return data ? JSON.parse(data) : [];
  }

  async saveDrawings(drawings: Drawing[]): Promise<void> {
    await SecureStore.setItemAsync(STORAGE_KEYS.DRAWINGS, JSON.stringify(drawings));
  }

  async getDrawings(): Promise<Drawing[]> {
    const data = await SecureStore.getItemAsync(STORAGE_KEYS.DRAWINGS);
    return data ? JSON.parse(data) : [];
  }

  async saveAlerts(alerts: Alert[]): Promise<void> {
    await SecureStore.setItemAsync(STORAGE_KEYS.ALERTS, JSON.stringify(alerts));
  }

  async getAlerts(): Promise<Alert[]> {
    const data = await SecureStore.getItemAsync(STORAGE_KEYS.ALERTS);
    return data ? JSON.parse(data) : [];
  }

  // === Pending Actions ===

  async addPendingAction(action: Omit<SyncAction, 'id' | 'timestamp' | 'retryCount'>): Promise<string> {
    const id = `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullAction: SyncAction = {
      ...action,
      id,
      timestamp: Date.now(),
      retryCount: 0,
    };

    const actions = await this.getPendingActions();
    actions.push(fullAction);
    await SecureStore.setItemAsync(STORAGE_KEYS.PENDING_ACTIONS, JSON.stringify(actions));
    
    this.notifyListeners();
    return id;
  }

  async getPendingActions(): Promise<SyncAction[]> {
    const data = await SecureStore.getItemAsync(STORAGE_KEYS.PENDING_ACTIONS);
    return data ? JSON.parse(data) : [];
  }

  async removePendingAction(actionId: string): Promise<void> {
    const actions = await this.getPendingActions();
    const filtered = actions.filter((a) => a.id !== actionId);
    await SecureStore.setItemAsync(STORAGE_KEYS.PENDING_ACTIONS, JSON.stringify(filtered));
  }

  // === Sync ===

  async syncWithServer(): Promise<void> {
    if (this.isSyncing) return;
    this.isSyncing = true;

    try {
      const actions = await this.getPendingActions();
      
      for (const action of actions) {
        if (action.retryCount >= 3) {
          await this.removePendingAction(action.id);
          continue;
        }

        try {
          const response = await fetch(`${this.baseUrl}/api/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(action),
          });

          if (response.ok) {
            await this.removePendingAction(action.id);
          } else {
            action.retryCount++;
            await this.updatePendingAction(action);
          }
        } catch (error) {
          action.retryCount++;
          await this.updatePendingAction(action);
        }
      }

      await SecureStore.setItemAsync(STORAGE_KEYS.LAST_SYNC, Date.now().toString());
      this.notifyListeners();
    } finally {
      this.isSyncing = false;
    }
  }

  private async updatePendingAction(action: SyncAction): Promise<void> {
    const actions = await this.getPendingActions();
    const index = actions.findIndex((a) => a.id === action.id);
    if (index !== -1) {
      actions[index] = action;
      await SecureStore.setItemAsync(STORAGE_KEYS.PENDING_ACTIONS, JSON.stringify(actions));
    }
  }

  private startAutoSync(): void {
    setInterval(() => {
      this.syncWithServer();
    }, this.syncInterval);
  }

  // === Listeners ===

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener());
  }

  // === Network Status ===

  async checkConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        timeout: 5000,
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const syncService = new SyncService();
export default syncService;
