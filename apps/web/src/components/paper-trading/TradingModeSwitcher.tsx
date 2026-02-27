'use client';

// ============================================
// TRADING MODE SWITCHER
// Переключатель Real/Paper trading
// ============================================

import React from 'react';
import { usePaperTrading } from '@/hooks/usePaperTrading';

interface TradingModeSwitcherProps {
  onModeChange?: (mode: 'REAL' | 'PAPER') => void;
}

export const TradingModeSwitcher: React.FC<TradingModeSwitcherProps> = ({
  onModeChange,
}) => {
  const { mode, stats, switchMode, resetAccount } = usePaperTrading();

  const handleModeChange = (newMode: 'REAL' | 'PAPER') => {
    switchMode(newMode);
    onModeChange?.(newMode);
  };

  return (
    <div className="flex items-center gap-3">
      {/* Mode Toggle */}
      <div className="flex items-center bg-[#2a2e39] rounded-lg p-1">
        <button
          onClick={() => handleModeChange('PAPER')}
          className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
            mode === 'PAPER'
              ? 'bg-[#26a69a] text-white'
              : 'text-[#787b86] hover:text-[#d1d4dc]'
          }`}
        >
          📄 Paper Trading
        </button>
        <button
          onClick={() => handleModeChange('REAL')}
          className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
            mode === 'REAL'
              ? 'bg-[#2962ff] text-white'
              : 'text-[#787b86] hover:text-[#d1d4dc]'
          }`}
        >
          💰 Real Trading
        </button>
      </div>

      {/* Paper Trading Stats */}
      {mode === 'PAPER' && stats && (
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <span className="text-[#787b86]">Balance:</span>
            <span className="text-[#d1d4dc] font-medium">
              ${stats.currentBalance.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[#787b86]">PnL:</span>
            <span className={`font-medium ${
              stats.totalPnl >= 0 ? 'text-[#26a69a]' : 'text-[#ef5350]'
            }`}>
              ${stats.totalPnl.toFixed(2)} ({stats.totalPnlPercent.toFixed(2)}%)
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[#787b86]">Win Rate:</span>
            <span className={`font-medium ${
              stats.winRate >= 50 ? 'text-[#26a69a]' : 'text-[#ef5350]'
            }`}>
              {stats.winRate.toFixed(1)}%
            </span>
          </div>
          <button
            onClick={() => {
              if (confirm('Reset paper trading account?')) {
                resetAccount();
              }
            }}
            className="px-3 py-1 text-xs bg-[#2a2e39] hover:bg-[#363c4e] text-[#d1d4dc] rounded"
          >
            🔄 Reset
          </button>
        </div>
      )}

      {/* Real Trading Warning */}
      {mode === 'REAL' && (
        <div className="flex items-center gap-2 text-xs text-[#ef5350]">
          <span>⚠️</span>
          <span>Real money trading - Use caution</span>
        </div>
      )}
    </div>
  );
};

export default TradingModeSwitcher;
