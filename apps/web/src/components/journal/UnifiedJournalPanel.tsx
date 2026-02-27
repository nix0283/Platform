'use client';

// ============================================
// UNIFIED JOURNAL PANEL
// Интегрированный журнал с ML подсказками
// ============================================

import React, { useState, useEffect } from 'react';
import { useJournalMLIntegration } from '@/hooks/useJournalMLIntegration';
import { ExchangeImport } from './import/ExchangeImport';
import { SyncSettings } from './sync/SyncSettings';

interface UnifiedJournalPanelProps {
  compact?: boolean;
}

export const UnifiedJournalPanel: React.FC<UnifiedJournalPanelProps> = ({
  compact = false,
}) => {
  const {
    ready,
    stats,
    captureJournalTrade,
    getJournalEntries,
    getMLSuggestions,
    getMLPatterns,
    exportData,
    resetAll,
  } = useJournalMLIntegration(true);

  const [entries, setEntries] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'open' | 'closed' | 'win' | 'loss'>('all');
  const [activeTab, setActiveTab] = useState<'trades' | 'ml' | 'stats'>('trades');
  const [showImport, setShowImport] = useState(false);
  const [showSync, setShowSync] = useState(false);

  // Load entries
  useEffect(() => {
    if (ready) {
      const loaded = getJournalEntries();
      setEntries(loaded);
      setSuggestions(getMLSuggestions());
    }
  }, [ready, getJournalEntries, getMLSuggestions]);

  // Filter entries
  const filteredEntries = entries.filter(entry => {
    switch (filter) {
      case 'open': return entry.status === 'open';
      case 'closed': return entry.status === 'closed';
      case 'win': return entry.status === 'closed' && (entry.pnl || 0) > 0;
      case 'loss': return entry.status === 'closed' && (entry.pnl || 0) <= 0;
      default: return true;
    }
  });

  if (compact) {
    return (
      <div className="bg-[#1e222d] border-t border-[#242832] p-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#787b86]">📊 Journal + ML</span>
          {stats && (
            <span className="text-[#d1d4dc]">
              {stats.totalTrades} trades | {(stats.winRate || 0).toFixed(1)}% WR
            </span>
          )}
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
          {ready ? (
            <span className="text-xs px-2 py-0.5 bg-[#26a69a]/20 text-[#26a69a] rounded">
              {stats?.totalTrades || 0} trades
            </span>
          ) : (
            <span className="text-xs px-2 py-0.5 bg-[#787b86]/20 text-[#787b86] rounded">
              Loading...
            </span>
          )}
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
            onClick={() => {
              const data = exportData('csv');
              const blob = new Blob([data], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `journal_${new Date().toISOString().split('T')[0]}.csv`;
              a.click();
            }}
            className="px-3 py-1.5 text-xs bg-[#2a2e39] hover:bg-[#363c4e] rounded text-[#d1d4dc]"
            title="Export"
          >
            💾 Export
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-5 gap-2 p-3 border-b border-[#242832]">
          <StatBox label="Total Trades" value={stats.totalTrades.toString()} />
          <StatBox
            label="Win Rate"
            value={`${(stats.winRate || 0).toFixed(1)}%`}
            color={stats.winRate >= 50 ? 'text-[#26a69a]' : 'text-[#ef5350]'}
          />
          <StatBox
            label="Total PnL"
            value={`$${(stats.totalPnl || 0).toFixed(0)}`}
            color={stats.totalPnl >= 0 ? 'text-[#26a69a]' : 'text-[#ef5350]'}
          />
          <StatBox
            label="Profit Factor"
            value={(stats.profitFactor || 0).toFixed(2)}
            color={stats.profitFactor >= 2 ? 'text-[#26a69a]' : 'text-[#ff9800]'}
          />
          <StatBox
            label="ML Suggestions"
            value={suggestions.length.toString()}
            color="text-[#9c27b0]"
          />
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-[#242832]">
        <button
          onClick={() => setActiveTab('trades')}
          className={`flex-1 py-2 text-xs font-medium transition-colors ${
            activeTab === 'trades'
              ? 'text-[#2962ff] border-b-2 border-[#2962ff]'
              : 'text-[#787b86] hover:text-[#d1d4dc]'
          }`}
        >
          📈 Trades ({filteredEntries.length})
        </button>
        <button
          onClick={() => setActiveTab('ml')}
          className={`flex-1 py-2 text-xs font-medium transition-colors ${
            activeTab === 'ml'
              ? 'text-[#2962ff] border-b-2 border-[#2962ff]'
              : 'text-[#787b86] hover:text-[#d1d4dc]'
          }`}
        >
          🤖 ML Insights ({suggestions.length})
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex-1 py-2 text-xs font-medium transition-colors ${
            activeTab === 'stats'
              ? 'text-[#2962ff] border-b-2 border-[#2962ff]'
              : 'text-[#787b86] hover:text-[#d1d4dc]'
          }`}
        >
          📊 Statistics
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2">
        {activeTab === 'trades' && (
          <TradesTab
            entries={filteredEntries}
            filter={filter}
            onFilterChange={setFilter}
          />
        )}
        {activeTab === 'ml' && (
          <MLTab suggestions={suggestions} patterns={getMLPatterns()} />
        )}
        {activeTab === 'stats' && (
          <StatsTab stats={stats} />
        )}
      </div>

      {/* Modals */}
      {showImport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="w-full max-w-lg">
            <ExchangeImport
              onSuccess={() => {
                setShowImport(false);
                const loaded = getJournalEntries();
                setEntries(loaded);
              }}
              onCancel={() => setShowImport(false)}
            />
          </div>
        </div>
      )}

      {showSync && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="w-full max-w-lg">
            <SyncSettings
              onSuccess={() => setShowSync(false)}
              onCancel={() => setShowSync(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// TRADES TAB
// ============================================

const TradesTab: React.FC<{
  entries: any[];
  filter: string;
  onFilterChange: (f: any) => void;
}> = ({ entries, filter, onFilterChange }) => {
  return (
    <div className="space-y-2">
      {/* Filter */}
      <div className="flex gap-1 mb-2">
        {(['all', 'open', 'closed', 'win', 'loss'] as const).map(f => (
          <button
            key={f}
            onClick={() => onFilterChange(f)}
            className={`flex-1 py-1 text-xs rounded ${
              filter === f
                ? 'bg-[#2962ff] text-white'
                : 'bg-[#2a2e39] text-[#d1d4dc] hover:bg-[#363c4e]'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Entries */}
      {entries.length === 0 ? (
        <div className="text-center text-[#787b86] py-8">No trades</div>
      ) : (
        entries.map(entry => (
          <div
            key={entry.id}
            className="bg-[#2a2e39] rounded p-3 border border-[#363c4e]"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                  entry.direction === 'LONG'
                    ? 'bg-[#26a69a]/20 text-[#26a69a]'
                    : 'bg-[#ef5350]/20 text-[#ef5350]'
                }`}>
                  {entry.direction}
                </span>
                <span className="text-sm font-bold text-[#d1d4dc]">{entry.symbol}</span>
                <span className="text-xs text-[#787b86]">{entry.exchange}</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded ${
                entry.status === 'open'
                  ? 'bg-[#2962ff]/20 text-[#2962ff]'
                  : (entry.pnl || 0) > 0
                  ? 'bg-[#26a69a]/20 text-[#26a69a]'
                  : 'bg-[#ef5350]/20 text-[#ef5350]'
              }`}>
                {entry.status.toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs mb-2">
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
            </div>

            {entry.status === 'closed' && (
              <div className={`text-sm font-bold text-right ${
                (entry.pnl || 0) > 0 ? 'text-[#26a69a]' : 'text-[#ef5350]'
              }`}>
                {(entry.pnl || 0) > 0 ? '+' : ''}${entry.pnl?.toFixed(2)} ({entry.pnlPercent?.toFixed(2)}%)
              </div>
            )}

            {entry.setupType && (
              <div className="mt-2 text-xs text-[#787b86]">
                Pattern: <span className="text-[#d1d4dc]">{entry.setupType}</span>
              </div>
            )}

            <div className="text-[10px] text-[#787b86] text-right mt-2">
              {new Date(entry.entryTime).toLocaleDateString()}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

// ============================================
// ML TAB
// ============================================

const MLTab: React.FC<{
  suggestions: any[];
  patterns: any[];
}> = ({ suggestions, patterns }) => {
  return (
    <div className="space-y-4">
      {/* Suggestions */}
      <div>
        <div className="text-sm font-medium text-[#d1d4dc] mb-2">💡 ML Suggestions</div>
        {suggestions.length === 0 ? (
          <div className="text-[#787b86] text-sm text-center py-4">
            Need 20+ trades for ML suggestions
          </div>
        ) : (
          <div className="space-y-2">
            {suggestions.map(s => (
              <div
                key={s.id}
                className={`p-3 rounded border ${
                  s.priority === 'high'
                    ? 'bg-[#ef5350]/10 border-[#ef5350]/30'
                    : s.priority === 'medium'
                    ? 'bg-[#ff9800]/10 border-[#ff9800]/30'
                    : 'bg-[#2196f3]/10 border-[#2196f3]/30'
                }`}
              >
                <div className="text-sm text-[#d1d4dc]">{s.message}</div>
                <div className="text-xs text-[#787b86] mt-1">
                  Confidence: {(s.confidence * 100).toFixed(0)}% | Based on {s.basedOn} trades
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Patterns */}
      <div>
        <div className="text-sm font-medium text-[#d1d4dc] mb-2">📊 Best Patterns</div>
        {patterns.length === 0 ? (
          <div className="text-[#787b86] text-sm text-center py-4">No pattern data yet</div>
        ) : (
          <div className="space-y-2">
            {patterns.slice(0, 5).map((p: any) => (
              <div key={p.name} className="bg-[#2a2e39] rounded p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[#d1d4dc]">{p.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    p.winRate > 60
                      ? 'bg-[#26a69a]/20 text-[#26a69a]'
                      : p.winRate > 40
                      ? 'bg-[#ff9800]/20 text-[#ff9800]'
                      : 'bg-[#ef5350]/20 text-[#ef5350]'
                  }`}>
                    {p.winRate.toFixed(1)}%
                  </span>
                </div>
                <div className="text-xs text-[#787b86]">
                  {p.occurrences} trades | Avg PnL: ${p.avgPnl.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// STATS TAB
// ============================================

const StatsTab: React.FC<{ stats: any }> = ({ stats }) => {
  if (!stats) {
    return <div className="text-[#787b86] text-sm text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Overall Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatBox label="Total Trades" value={stats.totalTrades.toString()} />
        <StatBox
          label="Win Rate"
          value={`${(stats.winRate || 0).toFixed(1)}%`}
          color={stats.winRate >= 50 ? 'text-[#26a69a]' : 'text-[#ef5350]'}
        />
        <StatBox
          label="Total PnL"
          value={`$${(stats.totalPnl || 0).toFixed(0)}`}
          color={stats.totalPnl >= 0 ? 'text-[#26a69a]' : 'text-[#ef5350]'}
        />
        <StatBox
          label="Profit Factor"
          value={(stats.profitFactor || 0).toFixed(2)}
          color={stats.profitFactor >= 2 ? 'text-[#26a69a]' : 'text-[#ff9800]'}
        />
        <StatBox label="Avg Win" value={`$${(stats.avgWin || 0).toFixed(0)}`} color="text-[#26a69a]" />
        <StatBox label="Avg Loss" value={`$${(stats.avgLoss || 0).toFixed(0)}`} color="text-[#ef5350]" />
      </div>

      {/* ML Model Stats */}
      {stats.mlModel && (
        <div className="bg-[#2a2e39] rounded p-3">
          <div className="text-sm font-medium text-[#d1d4dc] mb-2">🤖 ML Model</div>
          <div className="space-y-2 text-xs text-[#787b86]">
            <div className="flex justify-between">
              <span>Trades Analyzed:</span>
              <span className="text-[#d1d4dc]">{stats.mlModel.totalTrades}</span>
            </div>
            <div className="flex justify-between">
              <span>Patterns:</span>
              <span className="text-[#d1d4dc]">{stats.mlModel.patterns}</span>
            </div>
            <div className="flex justify-between">
              <span>Indicators:</span>
              <span className="text-[#d1d4dc]">{stats.mlModel.indicators}</span>
            </div>
            <div className="flex justify-between">
              <span>Suggestions:</span>
              <span className="text-[#9c27b0]">{stats.mlModel.suggestions}</span>
            </div>
          </div>
        </div>
      )}

      {/* Data Sources */}
      <div className="bg-[#2a2e39] rounded p-3">
        <div className="text-sm font-medium text-[#d1d4dc] mb-2">📊 Data Sources</div>
        <div className="space-y-2 text-xs text-[#787b86]">
          <div className="flex justify-between">
            <span>Journal Entries:</span>
            <span className="text-[#d1d4dc]">{stats.journalEntries}</span>
          </div>
          <div className="flex justify-between">
            <span>ML Actions:</span>
            <span className="text-[#d1d4dc]">{stats.mlActions}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// STAT BOX COMPONENT
// ============================================

const StatBox: React.FC<{
  label: string;
  value: string;
  color?: string;
}> = ({ label, value, color = 'text-[#d1d4dc]' }) => (
  <div className="bg-[#2a2e39] rounded p-3 text-center">
    <div className={`text-lg font-bold ${color}`}>{value}</div>
    <div className="text-[10px] text-[#787b86]">{label}</div>
  </div>
);

export default UnifiedJournalPanel;
