// ============================================
// TRADING JOURNAL MANAGER
// Автоматическое ведение торгового журнала
// ============================================

import {
  JournalEntry,
  JournalStats,
  JournalMonthlyStats,
  JournalSetupStats,
  JournalFilters,
  IndicatorSnapshot,
  TakeProfitLevel,
  TradeDirection,
  TradeStatus,
} from './types';

export interface JournalManagerConfig {
  databaseUrl: string;
  autoCapture: boolean;
  autoIndicators: boolean;
}

export class JournalManager {
  private config: JournalManagerConfig;
  private entries: Map<string, JournalEntry> = new Map();

  constructor(config: Partial<JournalManagerConfig> = {}) {
    this.config = {
      autoCapture: true,
      autoIndicators: true,
      databaseUrl: process.env.DATABASE_URL || '',
      ...config,
    };
  }

  // ============================================
  // AUTO-CAPTURE FROM TRADE
  // ============================================

  async captureTrade(
    trade: {
      orderId: string;
      symbol: string;
      exchange: string;
      direction: TradeDirection;
      entryPrice: number;
      entryTime: number;
      entryTimeframe: string;
      quantity: number;
      stopLoss?: number;
      stopLossTimeframe?: string;
      takeProfits?: TakeProfitLevel[];
      commission?: number;
    },
    indicators?: IndicatorSnapshot[]
  ): Promise<JournalEntry> {
    const entry: JournalEntry = {
      id: `journal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...trade,
      status: 'open',
      activeIndicators: indicators || [],
      indicatorValues: this.extractIndicatorValues(indicators || []),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Save to database
    await this.saveEntry(entry);
    this.entries.set(entry.id, entry);

    return entry;
  }

  // ============================================
  // UPDATE ENTRY
  // ============================================

  async updateEntry(
    id: string,
    updates: Partial<JournalEntry>
  ): Promise<JournalEntry | null> {
    const entry = this.entries.get(id);
    if (!entry) return null;

    const updated: JournalEntry = {
      ...entry,
      ...updates,
      updatedAt: Date.now(),
    };

    await this.saveEntry(updated);
    this.entries.set(id, updated);

    return updated;
  }

  async closeTrade(
    id: string,
    exitPrice: number,
    exitTime: number,
    exitTimeframe?: string
  ): Promise<JournalEntry | null> {
    const entry = this.entries.get(id);
    if (!entry) return null;

    const pnl = this.calculatePnL(
      entry.direction,
      entry.entryPrice,
      exitPrice,
      entry.quantity
    );

    const pnlPercent = ((exitPrice - entry.entryPrice) / entry.entryPrice) * 100 *
      (entry.direction === 'LONG' ? 1 : -1);

    const updated: JournalEntry = {
      ...entry,
      exitPrice,
      exitTime,
      exitTimeframe: exitTimeframe || entry.entryTimeframe,
      status: 'closed',
      pnl,
      pnlPercent,
      updatedAt: Date.now(),
    };

    // Update take profits status
    if (entry.takeProfits) {
      updated.takeProfits = entry.takeProfits.map(tp => ({
        ...tp,
        filled: tp.price <= exitPrice && entry.direction === 'LONG' ||
                tp.price >= exitPrice && entry.direction === 'SHORT',
        filledAt: (tp.price <= exitPrice && entry.direction === 'LONG' ||
                   tp.price >= exitPrice && entry.direction === 'SHORT')
          ? exitTime
          : undefined,
      }));
    }

    await this.saveEntry(updated);
    this.entries.set(id, updated);

    return updated;
  }

  // ============================================
  // ADD NOTES & RATINGS
  // ============================================

  async addNote(
    id: string,
    note: {
      description?: string;
      setupType?: string;
      tags?: string[];
      emotions?: string;
      mistakes?: string[];
      screenshotUrl?: string;
    }
  ): Promise<JournalEntry | null> {
    return this.updateEntry(id, note);
  }

  async addRating(
    id: string,
    executionRating: number,
    outcomeRating: number
  ): Promise<JournalEntry | null> {
    return this.updateEntry(id, { executionRating, outcomeRating });
  }

  // ============================================
  // QUERY ENTRIES
  // ============================================

  async getEntries(filters?: JournalFilters): Promise<JournalEntry[]> {
    let entries = Array.from(this.entries.values());

    if (filters) {
      if (filters.symbol) {
        entries = entries.filter(e => e.symbol === filters.symbol);
      }
      if (filters.exchange) {
        entries = entries.filter(e => e.exchange === filters.exchange);
      }
      if (filters.direction) {
        entries = entries.filter(e => e.direction === filters.direction);
      }
      if (filters.status) {
        entries = entries.filter(e => e.status === filters.status);
      }
      if (filters.setupType) {
        entries = entries.filter(e => e.setupType === filters.setupType);
      }
      if (filters.tags && filters.tags.length > 0) {
        entries = entries.filter(e =>
          e.tags?.some(tag => filters.tags!.includes(tag))
        );
      }
      if (filters.dateFrom) {
        entries = entries.filter(e => e.entryTime >= filters.dateFrom!);
      }
      if (filters.dateTo) {
        entries = entries.filter(e => e.entryTime <= filters.dateTo!);
      }
      if (filters.minPnl !== undefined) {
        entries = entries.filter(e => (e.pnl || 0) >= filters.minPnl!);
      }
      if (filters.maxPnl !== undefined) {
        entries = entries.filter(e => (e.pnl || 0) <= filters.maxPnl!);
      }
    }

    return entries.sort((a, b) => b.entryTime - a.entryTime);
  }

  async getEntry(id: string): Promise<JournalEntry | null> {
    return this.entries.get(id) || null;
  }

  async deleteEntry(id: string): Promise<boolean> {
    const deleted = this.entries.delete(id);
    if (deleted) {
      await this.deleteFromDatabase(id);
    }
    return deleted;
  }

  // ============================================
  // STATISTICS
  // ============================================

  async getStats(filters?: JournalFilters): Promise<JournalStats> {
    const entries = await this.getEntries(filters);
    const closed = entries.filter(e => e.status === 'closed');

    const winning = closed.filter(e => (e.pnl || 0) > 0);
    const losing = closed.filter(e => (e.pnl || 0) <= 0);

    const totalPnl = closed.reduce((sum, e) => sum + (e.pnl || 0), 0);
    const avgPnl = closed.length > 0 ? totalPnl / closed.length : 0;

    const grossProfit = winning.reduce((sum, e) => sum + (e.pnl || 0), 0);
    const grossLoss = Math.abs(losing.reduce((sum, e) => sum + (e.pnl || 0), 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

    const wins = winning.map(e => e.pnl || 0);
    const losses = losing.map(e => e.pnl || 0);

    const avgWin = wins.length > 0 ? wins.reduce((a, b) => a + b, 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / losses.length : 0;

    const executionRatings = closed.filter(e => e.executionRating).map(e => e.executionRating!);
    const outcomeRatings = closed.filter(e => e.outcomeRating).map(e => e.outcomeRating!);

    return {
      totalTrades: entries.length,
      closedTrades: closed.length,
      winningTrades: winning.length,
      losingTrades: losing.length,
      winRate: closed.length > 0 ? (winning.length / closed.length) * 100 : 0,
      totalPnl,
      avgPnl,
      maxWin: wins.length > 0 ? Math.max(...wins) : 0,
      maxLoss: losses.length > 0 ? Math.min(...losses) : 0,
      avgWin,
      avgLoss,
      avgExecutionRating: executionRatings.length > 0
        ? executionRatings.reduce((a, b) => a + b, 0) / executionRatings.length
        : 0,
      avgOutcomeRating: outcomeRatings.length > 0
        ? outcomeRatings.reduce((a, b) => a + b, 0) / outcomeRatings.length
        : 0,
      profitFactor,
    };
  }

  async getMonthlyStats(): Promise<JournalMonthlyStats[]> {
    const entries = await this.getEntries({ status: 'closed' });
    const monthly: Record<string, JournalMonthlyStats> = {};

    for (const entry of entries) {
      const month = new Date(entry.entryTime).toISOString().slice(0, 7); // YYYY-MM

      if (!monthly[month]) {
        monthly[month] = {
          month,
          trades: 0,
          pnl: 0,
          winRate: 0,
          avgPnl: 0,
          _wins: 0,
        } as any;
      }

      monthly[month].trades++;
      monthly[month].pnl += entry.pnl || 0;
      if ((entry.pnl || 0) > 0) {
        (monthly[month] as any)._wins++;
      }
    }

    return Object.values(monthly).map(m => ({
      month: m.month,
      trades: m.trades,
      pnl: m.pnl,
      winRate: m.trades > 0 ? ((m as any)._wins / m.trades) * 100 : 0,
      avgPnl: m.trades > 0 ? m.pnl / m.trades : 0,
    })).sort((a, b) => b.month.localeCompare(a.month));
  }

  async getSetupStats(): Promise<JournalSetupStats[]> {
    const entries = await this.getEntries({ status: 'closed' });
    const setups: Record<string, JournalSetupStats> = {};

    for (const entry of entries) {
      const setup = entry.setupType || 'Unknown';

      if (!setups[setup]) {
        setups[setup] = {
          setupType: setup,
          trades: 0,
          totalPnl: 0,
          winRate: 0,
          avgPnl: 0,
          avgExecution: 0,
          avgOutcome: 0,
          _wins: 0,
          _executionSum: 0,
          _outcomeSum: 0,
          _executionCount: 0,
          _outcomeCount: 0,
        } as any;
      }

      setups[setup].trades++;
      setups[setup].totalPnl += entry.pnl || 0;
      if ((entry.pnl || 0) > 0) {
        (setups[setup] as any)._wins++;
      }
      if (entry.executionRating) {
        (setups[setup] as any)._executionSum += entry.executionRating;
        (setups[setup] as any)._executionCount++;
      }
      if (entry.outcomeRating) {
        (setups[setup] as any)._outcomeSum += entry.outcomeRating;
        (setups[setup] as any)._outcomeCount++;
      }
    }

    return Object.values(setups).map(s => ({
      setupType: s.setupType,
      trades: s.trades,
      totalPnl: s.totalPnl,
      winRate: s.trades > 0 ? ((s as any)._wins / s.trades) * 100 : 0,
      avgPnl: s.trades > 0 ? s.totalPnl / s.trades : 0,
      avgExecution: (s as any)._executionCount > 0
        ? (s as any)._executionSum / (s as any)._executionCount
        : 0,
      avgOutcome: (s as any)._outcomeCount > 0
        ? (s as any)._outcomeSum / (s as any)._outcomeCount
        : 0,
    })).sort((a, b) => b.totalPnl - a.totalPnl);
  }

  // ============================================
  // EXPORT
  // ============================================

  async exportToCSV(filters?: JournalFilters): Promise<string> {
    const entries = await this.getEntries(filters);

    const headers = [
      'ID', 'Date', 'Time', 'Symbol', 'Exchange', 'Direction',
      'Timeframe', 'Entry Price', 'Exit Price', 'Quantity',
      'Stop Loss', 'Take Profits', 'PnL', 'PnL %',
      'Setup Type', 'Tags', 'Emotions', 'Mistakes',
      'Execution Rating', 'Outcome Rating', 'Description'
    ];

    const rows = entries.map(e => [
      e.id,
      new Date(e.entryTime).toISOString().split('T')[0],
      new Date(e.entryTime).toISOString().split('T')[1].slice(0, 8),
      e.symbol,
      e.exchange,
      e.direction,
      e.entryTimeframe,
      e.entryPrice,
      e.exitPrice || '-',
      e.quantity,
      e.stopLoss || '-',
      e.takeProfits?.map(tp => `${tp.price}(${tp.percentage}%)`).join(';') || '-',
      e.pnl?.toFixed(2) || '-',
      e.pnlPercent?.toFixed(2) || '-',
      e.setupType || '-',
      e.tags?.join(';') || '-',
      e.emotions || '-',
      e.mistakes?.join(';') || '-',
      e.executionRating || '-',
      e.outcomeRating || '-',
      e.description?.replace(/[\n\r]+/g, ' ') || '-',
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  async exportToJSON(filters?: JournalFilters): Promise<string> {
    const entries = await this.getEntries(filters);
    return JSON.stringify(entries, null, 2);
  }

  // ============================================
  // HELPERS
  // ============================================

  private calculatePnL(
    direction: TradeDirection,
    entryPrice: number,
    exitPrice: number,
    quantity: number
  ): number {
    if (direction === 'LONG') {
      return (exitPrice - entryPrice) * quantity;
    } else {
      return (entryPrice - exitPrice) * quantity;
    }
  }

  private extractIndicatorValues(
    indicators: IndicatorSnapshot[]
  ): Record<string, number | Record<string, number>> {
    const values: Record<string, number | Record<string, number>> = {};

    for (const indicator of indicators) {
      values[indicator.name] = indicator.value;
    }

    return values;
  }

  private async saveEntry(entry: JournalEntry): Promise<void> {
    // In production, save to database
    // For now, just log
    console.log('Saving journal entry:', entry.id);
  }

  private async deleteFromDatabase(id: string): Promise<void> {
    console.log('Deleting journal entry:', id);
  }

  private async loadFromDatabase(): Promise<void> {
    // Load entries from database on init
    console.log('Loading journal entries from database');
  }
}

// ============================================
// EXPORT
// ============================================

export default JournalManager;
