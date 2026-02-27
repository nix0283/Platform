// ============================================
// JOURNAL-ML INTEGRATION
// Интеграция торгового журнала с ML трекером
// ============================================

import { JournalManager, JournalEntry } from '@trading-platform/journal';
import { TradeActionTracker, SelfLearningEngine } from '@trading-platform/ml';

export interface IntegrationConfig {
  autoSyncJournalToML: boolean;
  autoSyncMLToJournal: boolean;
  autoCaptureChartContext: boolean;
  minTradesForML: number;
}

export class JournalMLIntegration {
  private journal: JournalManager;
  private mlTracker: TradeActionTracker;
  private mlEngine: SelfLearningEngine;
  private config: IntegrationConfig;
  private unsubscribeJournal?: () => void;
  private unsubscribeML?: () => void;

  constructor(
    journal: JournalManager,
    mlTracker: TradeActionTracker,
    mlEngine: SelfLearningEngine,
    config: Partial<IntegrationConfig> = {}
  ) {
    this.journal = journal;
    this.mlTracker = mlTracker;
    this.mlEngine = mlEngine;
    this.config = {
      autoSyncJournalToML: true,
      autoSyncMLToJournal: true,
      autoCaptureChartContext: true,
      minTradesForML: 20,
      ...config,
    };

    this.initialize();
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  private initialize() {
    console.log('🔗 Initializing Journal-ML Integration...');

    // Sync Journal → ML
    if (this.config.autoSyncJournalToML) {
      this.setupJournalToMLSync();
    }

    // Sync ML → Journal
    if (this.config.autoSyncMLToJournal) {
      this.setupMLToJournalSync();
    }

    // Auto-capture chart context
    if (this.config.autoCaptureChartContext) {
      this.startChartContextCapture();
    }

    // Auto-learn when enough trades
    this.checkAndLearn();

    console.log('✅ Journal-ML Integration initialized');
  }

  // ============================================
  // JOURNAL → ML SYNC
  // ============================================

  private setupJournalToMLSync() {
    console.log('📰 → 🤖 Setting up Journal to ML sync...');

    // Get existing journal entries and sync to ML
    this.journal.getEntries().forEach(entry => {
      this.syncJournalEntryToML(entry);
    });

    // Subscribe to new journal entries
    this.unsubscribeJournal = this.journal.subscribe((entry) => {
      this.syncJournalEntryToML(entry);
    });
  }

  private syncJournalEntryToML(entry: JournalEntry) {
    if (entry.status !== 'closed') return; // Only sync completed trades

    // Convert JournalEntry to TradeAction
    const action = {
      id: entry.id,
      type: entry.exitTime ? 'exit' : 'entry',
      timestamp: entry.entryTime,
      symbol: entry.symbol,
      exchange: entry.exchange,
      direction: entry.direction,
      price: entry.entryPrice,
      quantity: entry.quantity,
      stopLoss: entry.stopLoss,
      takeProfits: entry.takeProfits,
      outcome: entry.exitTime ? {
        exitPrice: entry.exitPrice!,
        exitTime: entry.exitTime,
        pnl: entry.pnl || 0,
        pnlPercent: entry.pnlPercent || 0,
        duration: entry.exitTime - entry.entryTime,
        maxProfit: 0,
        maxLoss: 0,
      } : undefined,
      chartState: {
        timestamp: entry.entryTime,
        symbol: entry.symbol,
        exchange: entry.exchange,
        timeframe: entry.entryTimeframe || 'unknown',
        chartType: 'candle',
        scale: 'linear' as const,
        indicators: entry.activeIndicators || [],
        drawings: [],
        visibleRange: {
          from: entry.entryTime - 3600000,
          to: entry.entryTime,
        },
      },
      candlePattern: entry.setupType || undefined,
      supportLevels: [],
      resistanceLevels: [],
      peaks: [],
      valleys: [],
    };

    // Add to ML tracker
    this.mlTracker.captureEntry(action);

    console.log(`📰 → 🤖 Synced journal entry to ML: ${entry.symbol}`);
  }

  // ============================================
  // ML → JOURNAL SYNC
  // ============================================

  private setupMLToJournalSync() {
    console.log('🤖 → 📰 Setting up ML to Journal sync...');

    // Subscribe to ML actions
    this.unsubscribeML = this.mlTracker.subscribe((action) => {
      if (action.outcome) {
        this.syncMLActionToJournal(action);
      }
    });
  }

  private syncMLActionToJournal(action: any) {
    // Check if already exists in journal
    const existing = this.journal.getEntries({
      dateFrom: action.timestamp - 60000,
      dateTo: action.timestamp + 60000,
    }).find(e => e.orderId === action.orderId);

    if (existing) return; // Skip duplicates

    // Create journal entry from ML action
    const journalEntry = {
      id: action.id,
      symbol: action.symbol,
      exchange: action.exchange,
      direction: action.direction,
      status: 'closed' as const,
      entryPrice: action.price,
      entryTime: action.timestamp,
      entryTimeframe: action.chartState?.timeframe || 'unknown',
      quantity: action.quantity,
      exitPrice: action.outcome?.exitPrice,
      exitTime: action.outcome?.exitTime,
      exitTimeframe: action.chartState?.timeframe || 'unknown',
      pnl: action.outcome?.pnl,
      pnlPercent: action.outcome?.pnlPercent,
      commission: 0,
      activeIndicators: action.chartState?.indicators || [],
      indicatorValues: action.chartState?.indicatorValues || {},
      setupType: action.candlePattern,
      description: `Auto-captured from ML tracker. Pattern: ${action.candlePattern || 'N/A'}`,
      tags: action.candlePattern ? [action.candlePattern] : [],
      emotions: '',
      mistakes: [],
      executionRating: undefined,
      outcomeRating: undefined,
      orderId: action.orderId,
      createdAt: action.timestamp,
      updatedAt: Date.now(),
    };

    // Save to journal
    this.journal.captureTrade(journalEntry, journalEntry.activeIndicators);

    console.log(`🤖 → 📰 Synced ML action to journal: ${action.symbol}`);
  }

  // ============================================
  // CHART CONTEXT CAPTURE
  // ============================================

  private startChartContextCapture() {
    console.log('📊 Starting chart context capture...');

    // Capture chart state every 5 seconds
    const interval = setInterval(() => {
      this.captureCurrentChartContext();
    }, 5000);

    // Store interval for cleanup
    (this as any).chartCaptureInterval = interval;
  }

  private captureCurrentChartContext() {
    // In production, this would read from the actual chart component
    // For now, it's a placeholder
    const chartState = this.mlTracker.captureChartState();
    console.log('📊 Chart context captured:', chartState.timeframe);
  }

  // ============================================
  // AUTO-LEARNING
  // ============================================

  private async checkAndLearn() {
    const actions = this.mlTracker.getActions();
    const completedActions = actions.filter(a => a.outcome);

    if (completedActions.length >= this.config.minTradesForML) {
      console.log(`🧠 Starting auto-learn with ${completedActions.length} trades...`);
      
      try {
        await this.mlEngine.learnFromActions(completedActions);
        console.log('✅ Auto-learn completed');
      } catch (error) {
        console.error('❌ Auto-learn failed:', error);
      }
    } else {
      console.log(`⏳ Waiting for ${this.config.minTradesForML - completedActions.length} more trades for ML...`);
    }
  }

  // ============================================
  // UNIFIED STATISTICS
  // ============================================

  getUnifiedStats() {
    const journalEntries = this.journal.getEntries();
    const mlActions = this.mlTracker.getActions();

    const allTrades = [
      ...journalEntries.filter(e => e.status === 'closed'),
      ...mlActions.filter(a => a.outcome).map(a => ({
        ...a,
        pnl: a.outcome?.pnl,
        pnlPercent: a.outcome?.pnlPercent,
      })),
    ];

    const winning = allTrades.filter(t => t.pnl > 0);
    const losing = allTrades.filter(t => t.pnl <= 0);
    const totalPnl = allTrades.reduce((sum, t) => sum + t.pnl, 0);

    // Get ML model stats
    const model = this.mlEngine.getModel();

    return {
      totalTrades: allTrades.length,
      winningTrades: winning.length,
      losingTrades: losing.length,
      winRate: allTrades.length > 0 ? (winning.length / allTrades.length) * 100 : 0,
      totalPnl,
      avgPnl: allTrades.length > 0 ? totalPnl / allTrades.length : 0,
      avgWin: winning.length > 0 ? winning.reduce((s, t) => s + t.pnl, 0) / winning.length : 0,
      avgLoss: losing.length > 0 ? Math.abs(losing.reduce((s, t) => s + t.pnl, 0) / losing.length) : 0,
      profitFactor: losing.length > 0 
        ? Math.abs(winning.reduce((s, t) => s + t.pnl, 0) / losing.reduce((s, t) => s + t.pnl, 0))
        : 0,
      mlModel: model ? {
        totalTrades: model.totalTrades,
        patterns: model.patterns.length,
        indicators: model.indicators.length,
        suggestions: model.suggestions.length,
      } : null,
      journalEntries: journalEntries.length,
      mlActions: mlActions.length,
    };
  }

  // ============================================
  // UNIFIED EXPORT
  // ============================================

  exportUnifiedData(format: 'json' | 'csv' = 'json') {
    const stats = this.getUnifiedStats();
    const journalEntries = this.journal.getEntries();
    const mlActions = this.mlTracker.getActions();
    const model = this.mlEngine.getModel();

    if (format === 'json') {
      return JSON.stringify({
        exportedAt: new Date().toISOString(),
        stats,
        journal: journalEntries,
        mlActions,
        model,
      }, null, 2);
    }

    // CSV export
    const headers = [
      'ID', 'Timestamp', 'Symbol', 'Exchange', 'Direction',
      'Price', 'Quantity', 'PnL', 'PnL %', 'Timeframe', 'Pattern', 'Source'
    ];

    const rows = [
      ...journalEntries.map(e => [
        e.id,
        new Date(e.entryTime).toISOString(),
        e.symbol,
        e.exchange,
        e.direction,
        e.entryPrice,
        e.quantity,
        e.pnl?.toFixed(2) || '-',
        e.pnlPercent?.toFixed(2) || '-',
        e.entryTimeframe,
        e.setupType || '-',
        'Journal',
      ]),
      ...mlActions.map(a => [
        a.id,
        new Date(a.timestamp).toISOString(),
        a.symbol,
        a.exchange,
        a.direction,
        a.price,
        a.quantity,
        a.outcome?.pnl?.toFixed(2) || '-',
        a.outcome?.pnlPercent?.toFixed(2) || '-',
        a.chartState?.timeframe || '-',
        a.candlePattern || '-',
        'ML Tracker',
      ]),
    ];

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  // ============================================
  // CLEANUP
  // ============================================

  destroy() {
    console.log('🔗 Destroying Journal-ML Integration...');

    if (this.unsubscribeJournal) {
      this.unsubscribeJournal();
    }

    if (this.unsubscribeML) {
      this.unsubscribeML();
    }

    if ((this as any).chartCaptureInterval) {
      clearInterval((this as any).chartCaptureInterval);
    }

    console.log('✅ Journal-ML Integration destroyed');
  }
}

export default JournalMLIntegration;
