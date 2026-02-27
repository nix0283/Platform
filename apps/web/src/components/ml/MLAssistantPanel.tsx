'use client';

// ============================================
// ML ASSISTANT PANEL
// Панель ML ассистента с подсказками
// ============================================

import React, { useState, useEffect } from 'react';
import { useTradeTracker } from '@/hooks/useTradeTracker';
import { useSelfLearning } from '@/hooks/useSelfLearning';

interface MLAssistantPanelProps {
  compact?: boolean;
}

export const MLAssistantPanel: React.FC<MLAssistantPanelProps> = ({
  compact = false,
}) => {
  const { actions, stats, captureEntry, captureExit, getActions } = useTradeTracker();
  const { model, suggestions, isLearning, ready, learnFromTrades } = useSelfLearning();
  const [activeTab, setActiveTab] = useState<'suggestions' | 'patterns' | 'stats'>('suggestions');

  // Auto-learn when we have enough trades
  useEffect(() => {
    if (actions.length >= 20 && !model) {
      learnFromTrades(actions);
    }
  }, [actions.length, model, learnFromTrades]);

  // Periodic re-learning
  useEffect(() => {
    if (model && actions.length > model.totalTrades + 10) {
      learnFromTrades(actions);
    }
  }, [actions.length, model, learnFromTrades]);

  if (compact) {
    return (
      <div className="bg-[#1e222d] border-t border-[#242832] p-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#787b86]">🤖 ML Assistant</span>
          {ready && (
            <span className="text-[#26a69a]">{suggestions.length} suggestions</span>
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
          <span className="text-lg font-bold text-[#d1d4dc]">🤖 ML Assistant</span>
          {ready ? (
            <span className="text-xs px-2 py-0.5 bg-[#26a69a]/20 text-[#26a69a] rounded">
              Active
            </span>
          ) : (
            <span className="text-xs px-2 py-0.5 bg-[#787b86]/20 text-[#787b86] rounded">
              Learning... ({actions.length}/20)
            </span>
          )}
        </div>
        {isLearning && (
          <span className="text-xs text-[#787b86]">🧠 Learning...</span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#242832]">
        <button
          onClick={() => setActiveTab('suggestions')}
          className={`flex-1 py-2 text-xs font-medium transition-colors ${
            activeTab === 'suggestions'
              ? 'text-[#2962ff] border-b-2 border-[#2962ff]'
              : 'text-[#787b86] hover:text-[#d1d4dc]'
          }`}
        >
          💡 Suggestions ({suggestions.length})
        </button>
        <button
          onClick={() => setActiveTab('patterns')}
          className={`flex-1 py-2 text-xs font-medium transition-colors ${
            activeTab === 'patterns'
              ? 'text-[#2962ff] border-b-2 border-[#2962ff]'
              : 'text-[#787b86] hover:text-[#d1d4dc]'
          }`}
        >
          📊 Patterns
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex-1 py-2 text-xs font-medium transition-colors ${
            activeTab === 'stats'
              ? 'text-[#2962ff] border-b-2 border-[#2962ff]'
              : 'text-[#787b86] hover:text-[#d1d4dc]'
          }`}
        >
          📈 Stats
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === 'suggestions' && (
          <SuggestionsTab suggestions={suggestions} ready={ready} />
        )}
        {activeTab === 'patterns' && (
          <PatternsTab model={model} />
        )}
        {activeTab === 'stats' && (
          <StatsTab stats={stats} model={model} />
        )}
      </div>
    </div>
  );
};

// ============================================
// SUGGESTIONS TAB
// ============================================

const SuggestionsTab: React.FC<{
  suggestions: any[];
  ready: boolean;
}> = ({ suggestions, ready }) => {
  if (!ready) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="text-4xl mb-3">🧠</div>
        <div className="text-[#d1d4dc] font-medium mb-1">Learning Your Style</div>
        <div className="text-xs text-[#787b86]">
          Need 20+ trades to start providing suggestions
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="text-4xl mb-3">💡</div>
        <div className="text-[#d1d4dc] font-medium mb-1">No Suggestions Yet</div>
        <div className="text-xs text-[#787b86]">
          Keep trading to get personalized suggestions
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {suggestions.map((suggestion) => (
        <div
          key={suggestion.id}
          className={`p-3 rounded-lg border ${
            suggestion.priority === 'high'
              ? 'bg-[#ef5350]/10 border-[#ef5350]/30'
              : suggestion.priority === 'medium'
              ? 'bg-[#ff9800]/10 border-[#ff9800]/30'
              : 'bg-[#2196f3]/10 border-[#2196f3]/30'
          }`}
        >
          <div className="flex items-start justify-between mb-2">
            <div className="text-sm text-[#d1d4dc]">{suggestion.message}</div>
            <span
              className={`text-xs px-2 py-0.5 rounded ${
                suggestion.priority === 'high'
                  ? 'bg-[#ef5350] text-white'
                  : suggestion.priority === 'medium'
                  ? 'bg-[#ff9800] text-white'
                  : 'bg-[#2196f3] text-white'
              }`}
            >
              {suggestion.priority}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#787b86]">
            <span>Confidence: {(suggestion.confidence * 100).toFixed(0)}%</span>
            <span>•</span>
            <span>Based on {suggestion.basedOn} trades</span>
          </div>
        </div>
      ))}
    </div>
  );
};

// ============================================
// PATTERNS TAB
// ============================================

const PatternsTab: React.FC<{ model: any }> = ({ model }) => {
  if (!model) {
    return <div className="text-[#787b86] text-sm text-center py-8">No data yet</div>;
  }

  return (
    <div className="space-y-4">
      {/* Candlestick Patterns */}
      <div>
        <div className="text-sm font-medium text-[#d1d4dc] mb-2">
          Candlestick Patterns
        </div>
        <div className="space-y-2">
          {model.patterns?.slice(0, 5).map((pattern: any) => (
            <div
              key={pattern.name}
              className="bg-[#2a2e39] rounded p-3"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[#d1d4dc]">{pattern.name}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded ${
                    pattern.winRate > 60
                      ? 'bg-[#26a69a]/20 text-[#26a69a]'
                      : pattern.winRate > 40
                      ? 'bg-[#ff9800]/20 text-[#ff9800]'
                      : 'bg-[#ef5350]/20 text-[#ef5350]'
                  }`}
                >
                  {pattern.winRate.toFixed(1)}%
                </span>
              </div>
              <div className="text-xs text-[#787b86]">
                {pattern.occurrences} trades | Avg PnL: ${pattern.avgPnl.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Timeframes */}
      <div>
        <div className="text-sm font-medium text-[#d1d4dc] mb-2">
          Best Timeframes
        </div>
        <div className="space-y-2">
          {model.timeframes?.slice(0, 3).map((tf: any) => (
            <div
              key={tf.timeframe}
              className="bg-[#2a2e39] rounded p-3"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[#d1d4dc]">{tf.timeframe}</span>
                <span className="text-xs text-[#26a69a]">
                  {tf.winRate.toFixed(1)}%
                </span>
              </div>
              <div className="text-xs text-[#787b86]">
                {tf.occurrences} trades | Avg: ${tf.avgPnl.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================
// STATS TAB
// ============================================

const StatsTab: React.FC<{ stats: any; model: any }> = ({ stats, model }) => {
  return (
    <div className="space-y-4">
      {/* Overall Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatBox label="Total Trades" value={stats.totalTrades.toString()} />
        <StatBox
          label="Win Rate"
          value={`${stats.winRate.toFixed(1)}%`}
          color={stats.winRate >= 50 ? 'text-[#26a69a]' : 'text-[#ef5350]'}
        />
        <StatBox
          label="Total PnL"
          value={`$${stats.totalPnl.toFixed(0)}`}
          color={stats.totalPnl >= 0 ? 'text-[#26a69a]' : 'text-[#ef5350]'}
        />
        <StatBox
          label="Model Trades"
          value={model?.totalTrades?.toString() || '0'}
        />
      </div>

      {/* Model Info */}
      {model && (
        <div className="bg-[#2a2e39] rounded p-3">
          <div className="text-sm font-medium text-[#d1d4dc] mb-2">
            Model Statistics
          </div>
          <div className="space-y-2 text-xs text-[#787b86]">
            <div className="flex justify-between">
              <span>Winning Trades:</span>
              <span className="text-[#26a69a]">{model.winningTrades}</span>
            </div>
            <div className="flex justify-between">
              <span>Losing Trades:</span>
              <span className="text-[#ef5350]">{model.losingTrades}</span>
            </div>
            <div className="flex justify-between">
              <span>Patterns Analyzed:</span>
              <span>{model.patterns?.length || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Indicators Tracked:</span>
              <span>{model.indicators?.length || 0}</span>
            </div>
          </div>
        </div>
      )}
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

export default MLAssistantPanel;
