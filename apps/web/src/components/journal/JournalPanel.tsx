'use client';

// ============================================
// JOURNAL PANEL COMPONENT
// Торговый журнал с авто-заполнением
// ============================================

import React, { useState, useEffect } from 'react';
import {
  JournalEntry,
  JournalStats,
  SETUP_TYPES,
  EMOTIONS,
  COMMON_MISTAKES,
} from '@trading-platform/journal';
import { ExchangeImport } from './import/ExchangeImport';
import { SyncSettings } from './sync/SyncSettings';

interface JournalPanelProps {
  compact?: boolean;
}

export const JournalPanel: React.FC<JournalPanelProps> = ({
  compact = false,
}) => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [stats, setStats] = useState<JournalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'closed' | 'win' | 'loss'>('all');
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showSync, setShowSync] = useState(false);

  // Load journal entries
  const loadEntries = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/journal');
      const data = await response.json();
      
      if (data.success) {
        setEntries(data.entries);
        calculateStats(data.entries);
      }
    } catch (error) {
      console.error('Failed to load journal:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntries();
  }, []);

  // Calculate stats
  const calculateStats = (entries: JournalEntry[]) => {
    const closed = entries.filter(e => e.status === 'closed');
    const winning = closed.filter(e => (e.pnl || 0) > 0);
    const losing = closed.filter(e => (e.pnl || 0) <= 0);

    const totalPnl = closed.reduce((sum, e) => sum + (e.pnl || 0), 0);
    const winRate = closed.length > 0 ? (winning.length / closed.length) * 100 : 0;

    setStats({
      totalTrades: entries.length,
      closedTrades: closed.length,
      winningTrades: winning.length,
      losingTrades: losing.length,
      winRate,
      totalPnl,
      avgPnl: closed.length > 0 ? totalPnl / closed.length : 0,
      maxWin: Math.max(0, ...winning.map(e => e.pnl || 0)),
      maxLoss: Math.min(0, ...losing.map(e => e.pnl || 0)),
      avgWin: winning.length > 0 ? winning.reduce((s, e) => s + (e.pnl || 0), 0) / winning.length : 0,
      avgLoss: losing.length > 0 ? losing.reduce((s, e) => s + (e.pnl || 0), 0) / losing.length : 0,
      avgExecutionRating: 0,
      avgOutcomeRating: 0,
      profitFactor: 0,
    });
  };

  // Filter entries
  const filteredEntries = entries.filter(entry => {
    switch (filter) {
      case 'open':
        return entry.status === 'open';
      case 'closed':
        return entry.status === 'closed';
      case 'win':
        return entry.status === 'closed' && (entry.pnl || 0) > 0;
      case 'loss':
        return entry.status === 'closed' && (entry.pnl || 0) <= 0;
      default:
        return true;
    }
  });

  if (compact) {
    return (
      <div className="bg-[#1e222d] border-t border-[#242832] p-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#787b86]">📊 Journal</span>
          <span className="text-[#d1d4dc]">{entries.length} trades</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#1e222d]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#242832]">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-[#d1d4dc]">📊 Trading Journal</span>
          <span className="text-xs text-[#787b86]">
            {entries.length} trades
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSync(true)}
            className="px-3 py-1.5 text-xs bg-[#9c27b0] hover:bg-[#7b1fa2] rounded text-white"
            title="Auto-sync settings"
          >
            🔄 Sync
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="px-3 py-1.5 text-xs bg-[#26a69a] hover:bg-[#1e8c7a] rounded text-white"
            title="Import from exchange"
          >
            📥 Import
          </button>
          <button
            onClick={loadEntries}
            className="px-3 py-1.5 text-xs bg-[#2a2e39] hover:bg-[#363c4e] rounded text-[#d1d4dc]"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-4 gap-2 p-3 border-b border-[#242832]">
          <StatBox label="Win Rate" value={`${stats.winRate.toFixed(1)}%`} color={stats.winRate >= 50 ? 'text-[#26a69a]' : 'text-[#ef5350]'} />
          <StatBox label="P&L" value={`$${stats.totalPnl.toFixed(0)}`} color={stats.totalPnl >= 0 ? 'text-[#26a69a]' : 'text-[#ef5350]'} />
          <StatBox label="Trades" value={stats.totalTrades.toString()} />
          <StatBox label="Avg R" value={(stats.avgWin / Math.abs(stats.avgLoss || 1)).toFixed(2)} />
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex border-b border-[#242832]">
        {(['all', 'open', 'closed', 'win', 'loss'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              filter === f
                ? 'text-[#2962ff] border-b-2 border-[#2962ff]'
                : 'text-[#787b86] hover:text-[#d1d4dc]'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Entries List */}
      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-[#787b86] text-sm">Loading...</div>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-[#787b86] text-sm">No entries</div>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredEntries.map(entry => (
              <JournalEntryCard
                key={entry.id}
                entry={entry}
                onClick={() => {
                  setSelectedEntry(entry);
                  setShowForm(true);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Sync Settings Modal */}
      {showSync && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="w-full max-w-lg">
            <SyncSettings
              onSuccess={() => {
                setShowSync(false);
                loadEntries();
              }}
              onCancel={() => setShowSync(false)}
            />
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="w-full max-w-lg">
            <ExchangeImport
              onSuccess={(result) => {
                setShowImport(false);
                loadEntries();
              }}
              onCancel={() => setShowImport(false)}
            />
          </div>
        </div>
      )}

      {/* Entry Detail Modal */}
      {showForm && selectedEntry && (
        <JournalEntryForm
          entry={selectedEntry}
          onClose={() => {
            setShowForm(false);
            setSelectedEntry(null);
            loadEntries();
          }}
        />
      )}
    </div>
  );
};

// ============================================
// STAT BOX COMPONENT
// ============================================

const StatBox: React.FC<{ label: string; value: string; color?: string }> = ({
  label,
  value,
  color = 'text-[#d1d4dc]',
}) => (
  <div className="bg-[#2a2e39] rounded p-2 text-center">
    <div className={`text-sm font-bold ${color}`}>{value}</div>
    <div className="text-[10px] text-[#787b86]">{label}</div>
  </div>
);

// ============================================
// JOURNAL ENTRY CARD
// ============================================

interface JournalEntryCardProps {
  entry: JournalEntry;
  onClick: () => void;
}

const JournalEntryCard: React.FC<JournalEntryCardProps> = ({ entry, onClick }) => {
  const isWin = (entry.pnl || 0) > 0;
  const isLong = entry.direction === 'LONG';

  return (
    <div
      onClick={onClick}
      className="bg-[#2a2e39] rounded-lg p-3 border border-[#363c4e] cursor-pointer hover:border-[#2962ff] transition-colors"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-2 py-0.5 rounded ${
            isLong ? 'bg-[#26a69a]/20 text-[#26a69a]' : 'bg-[#ef5350]/20 text-[#ef5350]'
          }`}>
            {entry.direction}
          </span>
          <span className="text-sm font-bold text-[#d1d4dc]">{entry.symbol}</span>
          <span className="text-xs text-[#787b86]">{entry.exchange}</span>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded ${
          entry.status === 'open' ? 'bg-[#2962ff]/20 text-[#2962ff]' :
          isWin ? 'bg-[#26a69a]/20 text-[#26a69a]' : 'bg-[#ef5350]/20 text-[#ef5350]'
        }`}>
          {entry.status === 'open' ? 'OPEN' : isWin ? 'WIN' : 'LOSS'}
        </span>
      </div>

      {/* Entry/Exit Info */}
      <div className="grid grid-cols-2 gap-2 text-xs mb-2">
        <div>
          <span className="text-[#787b86]">Entry: </span>
          <span className="text-[#d1d4dc]">${entry.entryPrice.toFixed(2)}</span>
        </div>
        <div>
          <span className="text-[#787b86]">Exit: </span>
          <span className="text-[#d1d4dc]">${entry.exitPrice?.toFixed(2) || '-'}</span>
        </div>
        <div>
          <span className="text-[#787b86]">TF: </span>
          <span className="text-[#d1d4dc]">{entry.entryTimeframe}</span>
        </div>
        <div>
          <span className="text-[#787b86]">SL: </span>
          <span className="text-[#d1d4dc]">${entry.stopLoss?.toFixed(2) || '-'}</span>
        </div>
      </div>

      {/* P&L */}
      {entry.status === 'closed' && (
        <div className={`text-sm font-bold text-right ${
          isWin ? 'text-[#26a69a]' : 'text-[#ef5350]'
        }`}>
          {isWin ? '+' : ''}${entry.pnl?.toFixed(2)} ({entry.pnlPercent?.toFixed(2)}%)
        </div>
      )}

      {/* Indicators Preview */}
      {entry.indicatorValues && (
        <div className="flex items-center gap-2 mt-2 text-[10px] text-[#787b86]">
          <span>📈</span>
          {Object.entries(entry.indicatorValues).slice(0, 3).map(([name, value]) => (
            <span key={name} className="bg-[#363c4e] px-1.5 py-0.5 rounded">
              {name}: {typeof value === 'number' ? value.toFixed(2) : '...'}
            </span>
          ))}
        </div>
      )}

      {/* Date */}
      <div className="text-[10px] text-[#787b86] text-right mt-2">
        {new Date(entry.entryTime).toLocaleDateString()}
      </div>
    </div>
  );
};

// ============================================
// JOURNAL ENTRY FORM
// ============================================

interface JournalEntryFormProps {
  entry: JournalEntry;
  onClose: () => void;
}

const JournalEntryForm: React.FC<JournalEntryFormProps> = ({ entry, onClose }) => {
  const [formData, setFormData] = useState<Partial<JournalEntry>>({
    setupType: entry.setupType,
    description: entry.description,
    tags: entry.tags,
    emotions: entry.emotions,
    mistakes: entry.mistakes,
    executionRating: entry.executionRating,
    outcomeRating: entry.outcomeRating,
  });

  const handleSubmit = async () => {
    try {
      await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          entry: { id: entry.id, ...formData },
        }),
      });
      onClose();
    } catch (error) {
      console.error('Failed to update entry:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#1e222d] border border-[#242832] rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#242832]">
          <h3 className="text-lg font-bold text-[#d1d4dc]">
            {entry.symbol} - {entry.direction}
          </h3>
          <button onClick={onClose} className="text-[#787b86] hover:text-[#d1d4dc]">✕</button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Trade Info */}
          <div className="grid grid-cols-3 gap-3 text-sm">
            <InfoField label="Entry Price" value={`$${entry.entryPrice.toFixed(2)}`} />
            <InfoField label="Exit Price" value={entry.exitPrice ? `$${entry.exitPrice.toFixed(2)}` : '-'} />
            <InfoField label="P&L" value={entry.pnl ? `$${entry.pnl.toFixed(2)}` : '-'} />
            <InfoField label="Timeframe" value={entry.entryTimeframe} />
            <InfoField label="Stop Loss" value={entry.stopLoss ? `$${entry.stopLoss.toFixed(2)}` : '-'} />
            <InfoField label="Take Profits" value={entry.takeProfits?.length || 0} />
          </div>

          {/* Indicators */}
          {entry.indicatorValues && (
            <div>
              <div className="text-sm text-[#787b86] mb-2">Indicators at Entry:</div>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(entry.indicatorValues).map(([name, value]) => (
                  <div key={name} className="bg-[#2a2e39] rounded p-2 text-xs">
                    <div className="text-[#787b86]">{name}</div>
                    <div className="text-[#d1d4dc]">
                      {typeof value === 'number' ? value.toFixed(2) : JSON.stringify(value)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Setup Type */}
          <div>
            <label className="text-sm text-[#787b86] block mb-2">Setup Type</label>
            <select
              value={formData.setupType || ''}
              onChange={(e) => setFormData({ ...formData, setupType: e.target.value })}
              className="w-full bg-[#2a2e39] border border-[#363c4e] rounded px-3 py-2 text-sm text-[#d1d4dc]"
            >
              <option value="">Select setup...</option>
              {SETUP_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="text-sm text-[#787b86] block mb-2">Trade Description</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-[#2a2e39] border border-[#363c4e] rounded px-3 py-2 text-sm text-[#d1d4dc] h-24"
              placeholder="Describe your trade setup, reasoning, etc."
            />
          </div>

          {/* Emotions */}
          <div>
            <label className="text-sm text-[#787b86] block mb-2">Emotions</label>
            <select
              value={formData.emotions || ''}
              onChange={(e) => setFormData({ ...formData, emotions: e.target.value })}
              className="w-full bg-[#2a2e39] border border-[#363c4e] rounded px-3 py-2 text-sm text-[#d1d4dc]"
            >
              <option value="">Select emotion...</option>
              {EMOTIONS.map(emotion => (
                <option key={emotion} value={emotion}>{emotion}</option>
              ))}
            </select>
          </div>

          {/* Mistakes */}
          <div>
            <label className="text-sm text-[#787b86] block mb-2">Mistakes / Lessons</label>
            <select
              multiple
              value={formData.mistakes || []}
              onChange={(e) => setFormData({ 
                ...formData, 
                mistakes: Array.from(e.target.selectedOptions, option => option.value)
              })}
              className="w-full bg-[#2a2e39] border border-[#363c4e] rounded px-3 py-2 text-sm text-[#d1d4dc] h-24"
            >
              {COMMON_MISTAKES.map(mistake => (
                <option key={mistake} value={mistake}>{mistake}</option>
              ))}
            </select>
          </div>

          {/* Ratings */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-[#787b86] block mb-2">Execution Rating</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(rating => (
                  <button
                    key={rating}
                    onClick={() => setFormData({ ...formData, executionRating: rating })}
                    className={`w-8 h-8 rounded font-bold ${
                      formData.executionRating === rating
                        ? 'bg-[#2962ff] text-white'
                        : 'bg-[#2a2e39] text-[#787b86]'
                    }`}
                  >
                    {rating}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm text-[#787b86] block mb-2">Outcome Rating</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(rating => (
                  <button
                    key={rating}
                    onClick={() => setFormData({ ...formData, outcomeRating: rating })}
                    className={`w-8 h-8 rounded font-bold ${
                      formData.outcomeRating === rating
                        ? 'bg-[#2962ff] text-white'
                        : 'bg-[#2a2e39] text-[#787b86]'
                    }`}
                  >
                    {rating}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-[#242832]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-[#2a2e39] hover:bg-[#363c4e] text-[#d1d4dc] rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-sm bg-[#2962ff] hover:bg-[#1e54e6] text-white rounded"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// INFO FIELD COMPONENT
// ============================================

const InfoField: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div>
    <div className="text-[#787b86] text-xs">{label}</div>
    <div className="text-[#d1d4dc] font-medium">{value}</div>
  </div>
);

export default JournalPanel;
