// ============================================
// CENTRAL SYNC SERVICE
// Синхронизация между Web, Mobile, Desktop
// ============================================

import { JournalEntry } from '@trading-platform/journal';
import { LearningModel } from '@trading-platform/ml';
import { UserSettings } from '@trading-platform/core';

export interface SyncData {
  journal: JournalEntry[];
  mlModel: LearningModel | null;
  mlTracker: any;
  settings: UserSettings;
  paperTrading: {
    balance: number;
    positions: any[];
    orders: any[];
    stats: any;
  };
  lastSyncTime: number;
}

export interface SyncResult {
  success: boolean;
  synced: string[];
  failed: string[];
  conflicts: Conflict[];
}

export interface Conflict {
  type: 'journal' | 'ml' | 'settings' | 'trades';
  local: any;
  remote: any;
  resolution: 'local' | 'remote' | 'merge';
}

export class CentralSyncService {
  private backendUrl: string;
  private userId: string;
  private syncInterval?: NodeJS.Timeout;
  private isSyncing: boolean = false;

  constructor(backendUrl: string, userId: string) {
    this.backendUrl = backendUrl;
    this.userId = userId;
  }

  // ============================================
  // SYNC OPERATIONS
  // ============================================

  async syncAll(): Promise<SyncResult> {
    if (this.isSyncing) {
      console.log('⏳ Sync already in progress');
      return { success: false, synced: [], failed: [], conflicts: [] };
    }

    this.isSyncing = true;
    const result: SyncResult = {
      success: true,
      synced: [],
      failed: [],
      conflicts: [],
    };

    try {
      // Sync journal
      const journalResult = await this.syncJournal();
      if (journalResult.success) {
        result.synced.push('journal');
      } else {
        result.failed.push('journal');
        result.conflicts.push(...journalResult.conflicts);
      }

      // Sync ML model
      const mlResult = await this.syncMLModel();
      if (mlResult.success) {
        result.synced.push('ml');
      } else {
        result.failed.push('ml');
        result.conflicts.push(...mlResult.conflicts);
      }

      // Sync settings
      const settingsResult = await this.syncSettings();
      if (settingsResult.success) {
        result.synced.push('settings');
      } else {
        result.failed.push('settings');
        result.conflicts.push(...settingsResult.conflicts);
      }

      // Sync paper trading
      const paperResult = await this.syncPaperTrading();
      if (paperResult.success) {
        result.synced.push('paper_trading');
      } else {
        result.failed.push('paper_trading');
      }

      // Update last sync time
      await this.updateLastSyncTime();

      result.success = result.failed.length === 0;
      console.log(`✅ Sync complete: ${result.synced.join(', ')}`);
      if (result.conflicts.length > 0) {
        console.log(`⚠️ ${result.conflicts.length} conflicts detected`);
      }
    } catch (error: any) {
      console.error('❌ Sync failed:', error.message);
      result.success = false;
      result.failed.push('unknown');
    } finally {
      this.isSyncing = false;
    }

    return result;
  }

  // ============================================
  // JOURNAL SYNC
  // ============================================

  async syncJournal(): Promise<SyncResult> {
    const result: SyncResult = { success: true, synced: [], failed: [], conflicts: [] };

    try {
      // Get local journal
      const localJournal = this.getLocalJournal();

      // Get remote journal
      const remoteJournal = await this.fetchRemoteJournal();

      // Merge journals
      const merged = this.mergeJournals(localJournal, remoteJournal);

      // Check for conflicts
      const conflicts = this.detectJournalConflicts(localJournal, remoteJournal);
      if (conflicts.length > 0) {
        result.conflicts.push(...conflicts);
        // Auto-resolve conflicts
        for (const conflict of conflicts) {
          if (conflict.resolution === 'remote') {
            // Use remote version
          } else if (conflict.resolution === 'merge') {
            // Merge both versions
          }
        }
      }

      // Save merged journal locally
      this.saveLocalJournal(merged);

      // Push to remote
      await this.pushJournalToRemote(merged);

      result.synced.push('journal');
    } catch (error: any) {
      result.success = false;
      result.failed.push('journal');
      console.error('Journal sync failed:', error.message);
    }

    return result;
  }

  // ============================================
  // ML MODEL SYNC
  // ============================================

  async syncMLModel(): Promise<SyncResult> {
    const result: SyncResult = { success: true, synced: [], failed: [], conflicts: [] };

    try {
      // Get local ML model
      const localModel = this.getLocalMLModel();

      // Get remote ML model
      const remoteModel = await this.fetchRemoteMLModel();

      // Determine which model to use (newest wins)
      let finalModel = localModel;
      if (remoteModel && (!localModel || remoteModel.updatedAt > localModel.updatedAt)) {
        finalModel = remoteModel;
      }

      // Save locally
      this.saveLocalMLModel(finalModel);

      // Push to remote if local was newer
      if (localModel && (!remoteModel || localModel.updatedAt > remoteModel.updatedAt)) {
        await this.pushMLModelToRemote(localModel);
      }

      result.synced.push('ml_model');
    } catch (error: any) {
      result.success = false;
      result.failed.push('ml_model');
      console.error('ML model sync failed:', error.message);
    }

    return result;
  }

  // ============================================
  // SETTINGS SYNC
  // ============================================

  async syncSettings(): Promise<SyncResult> {
    const result: SyncResult = { success: true, synced: [], failed: [], conflicts: [] };

    try {
      // Get local settings
      const localSettings = this.getLocalSettings();

      // Get remote settings
      const remoteSettings = await this.fetchRemoteSettings();

      // Merge settings (remote wins for conflicts)
      const merged = {
        ...localSettings,
        ...remoteSettings,
        updatedAt: Date.now(),
      };

      // Save locally
      this.saveLocalSettings(merged);

      // Push to remote
      await this.pushSettingsToRemote(merged);

      result.synced.push('settings');
    } catch (error: any) {
      result.success = false;
      result.failed.push('settings');
      console.error('Settings sync failed:', error.message);
    }

    return result;
  }

  // ============================================
  // PAPER TRADING SYNC
  // ============================================

  async syncPaperTrading(): Promise<SyncResult> {
    const result: SyncResult = { success: true, synced: [], failed: [], conflicts: [] };

    try {
      // Get local paper trading data
      const localPaper = this.getLocalPaperTrading();

      // Get remote paper trading data
      const remotePaper = await this.fetchRemotePaperTrading();

      // Merge (remote wins for balance, local for positions)
      const merged = {
        balance: remotePaper?.balance || localPaper.balance,
        positions: localPaper.positions,
        orders: localPaper.orders,
        stats: remotePaper?.stats || localPaper.stats,
      };

      // Save locally
      this.saveLocalPaperTrading(merged);

      // Push to remote
      await this.pushPaperTradingToRemote(merged);

      result.synced.push('paper_trading');
    } catch (error: any) {
      result.success = false;
      result.failed.push('paper_trading');
      console.error('Paper trading sync failed:', error.message);
    }

    return result;
  }

  // ============================================
  // CONFLICT DETECTION
  // ============================================

  private detectJournalConflicts(local: JournalEntry[], remote: JournalEntry[]): Conflict[] {
    const conflicts: Conflict[] = [];
    const remoteMap = new Map(remote.map(e => [e.id, e]));

    for (const localEntry of local) {
      const remoteEntry = remoteMap.get(localEntry.id);
      if (remoteEntry && remoteEntry.updatedAt !== localEntry.updatedAt) {
        // Conflict detected
        conflicts.push({
          type: 'journal',
          local: localEntry,
          remote: remoteEntry,
          resolution: remoteEntry.updatedAt > localEntry.updatedAt ? 'remote' : 'local',
        });
      }
    }

    return conflicts;
  }

  private mergeJournals(local: JournalEntry[], remote: JournalEntry[]): JournalEntry[] {
    const merged = new Map<string, JournalEntry>();

    // Add all remote entries
    for (const entry of remote) {
      merged.set(entry.id, entry);
    }

    // Add local entries (newer wins)
    for (const entry of local) {
      const existing = merged.get(entry.id);
      if (!existing || entry.updatedAt > existing.updatedAt) {
        merged.set(entry.id, entry);
      }
    }

    return Array.from(merged.values());
  }

  // ============================================
  // LOCAL STORAGE HELPERS
  // ============================================

  private getLocalJournal(): JournalEntry[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem('journal_entries');
    return data ? JSON.parse(data) : [];
  }

  private saveLocalJournal(entries: JournalEntry[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('journal_entries', JSON.stringify(entries));
  }

  private getLocalMLModel(): LearningModel | null {
    if (typeof window === 'undefined') return null;
    const data = localStorage.getItem('ml_model');
    return data ? JSON.parse(data) : null;
  }

  private saveLocalMLModel(model: LearningModel | null): void {
    if (typeof window === 'undefined') return;
    if (model) {
      localStorage.setItem('ml_model', JSON.stringify(model));
    }
  }

  private getLocalSettings(): UserSettings {
    if (typeof window === 'undefined') {
      return {} as UserSettings;
    }
    const data = localStorage.getItem('user_settings');
    return data ? JSON.parse(data) : ({} as UserSettings);
  }

  private saveLocalSettings(settings: UserSettings): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('user_settings', JSON.stringify(settings));
  }

  private getLocalPaperTrading(): any {
    if (typeof window === 'undefined') {
      return { balance: 10000, positions: [], orders: [], stats: {} };
    }
    const data = localStorage.getItem('paper_trading');
    return data ? JSON.parse(data) : { balance: 10000, positions: [], orders: [], stats: {} };
  }

  private saveLocalPaperTrading(data: any): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('paper_trading', JSON.stringify(data));
  }

  // ============================================
  // REMOTE API HELPERS
  // ============================================

  private async fetchRemoteJournal(): Promise<JournalEntry[]> {
    const response = await fetch(`${this.backendUrl}/api/journal?userId=${this.userId}`);
    const data = await response.json();
    return data.success ? data.entries : [];
  }

  private async pushJournalToRemote(entries: JournalEntry[]): Promise<void> {
    await fetch(`${this.backendUrl}/api/journal/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: this.userId, entries }),
    });
  }

  private async fetchRemoteMLModel(): Promise<LearningModel | null> {
    const response = await fetch(`${this.backendUrl}/api/ml/model?userId=${this.userId}`);
    const data = await response.json();
    return data.success ? data.model : null;
  }

  private async pushMLModelToRemote(model: LearningModel): Promise<void> {
    await fetch(`${this.backendUrl}/api/ml/model`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: this.userId, model }),
    });
  }

  private async fetchRemoteSettings(): Promise<UserSettings> {
    const response = await fetch(`${this.backendUrl}/api/settings?userId=${this.userId}`);
    const data = await response.json();
    return data.success ? data.settings : ({} as UserSettings);
  }

  private async pushSettingsToRemote(settings: UserSettings): Promise<void> {
    await fetch(`${this.backendUrl}/api/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: this.userId, settings }),
    });
  }

  private async fetchRemotePaperTrading(): Promise<any> {
    const response = await fetch(`${this.backendUrl}/api/paper-trading?userId=${this.userId}`);
    const data = await response.json();
    return data.success ? data : null;
  }

  private async pushPaperTradingToRemote(data: any): Promise<void> {
    await fetch(`${this.backendUrl}/api/paper-trading`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: this.userId, ...data }),
    });
  }

  private async updateLastSyncTime(): Promise<void> {
    if (typeof window === 'undefined') return;
    localStorage.setItem('last_sync_time', Date.now().toString());
  }

  // ============================================
  // AUTO-SYNC
  // ============================================

  startAutoSync(intervalMs: number = 60000) {
    console.log(`🔄 Starting auto-sync every ${intervalMs / 1000}s`);
    this.syncAll(); // Initial sync
    this.syncInterval = setInterval(() => {
      this.syncAll();
    }, intervalMs);
  }

  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = undefined;
    }
    console.log('⏹️ Auto-sync stopped');
  }

  // ============================================
  // EXPORT/IMPORT
  // ============================================

  exportAllData(): string {
    const data: SyncData = {
      journal: this.getLocalJournal(),
      mlModel: this.getLocalMLModel(),
      mlTracker: {},
      settings: this.getLocalSettings(),
      paperTrading: this.getLocalPaperTrading(),
      lastSyncTime: parseInt(localStorage.getItem('last_sync_time') || '0'),
    };
    return JSON.stringify(data, null, 2);
  }

  importAllData(json: string): SyncResult {
    try {
      const data: SyncData = JSON.parse(json);
      
      if (data.journal) this.saveLocalJournal(data.journal);
      if (data.mlModel) this.saveLocalMLModel(data.mlModel);
      if (data.settings) this.saveLocalSettings(data.settings);
      if (data.paperTrading) this.saveLocalPaperTrading(data.paperTrading);
      
      return { success: true, synced: ['journal', 'ml', 'settings', 'paper'], failed: [], conflicts: [] };
    } catch (error: any) {
      return { success: false, synced: [], failed: ['import'], conflicts: [] };
    }
  }
}

export default CentralSyncService;
