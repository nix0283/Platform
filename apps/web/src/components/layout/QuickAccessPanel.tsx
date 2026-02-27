'use client';

// ============================================
// QUICK ACCESS PANEL
// Плавающая панель быстрого доступа
// ============================================

import React from 'react';

interface QuickAccessPanelProps {
  onClose: () => void;
  onToggleML: () => void;
  showML: boolean;
}

export const QuickAccessPanel: React.FC<QuickAccessPanelProps> = ({
  onClose,
  onToggleML,
  showML,
}) => {
  return (
    <div className="absolute top-4 left-4 z-50 flex flex-col gap-2">
      {/* Main Panel */}
      <div className="bg-[#1e222d] border border-[#242832] rounded-lg shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#242832]">
          <span className="text-xs font-bold text-[#d1d4dc]">⚡ Quick Access</span>
          <button
            onClick={onClose}
            className="text-[#787b86] hover:text-[#d1d4dc] text-xs"
          >
            ✕
          </button>
        </div>

        {/* Buttons */}
        <div className="p-2 space-y-1">
          {/* Journal */}
          <button
            onClick={() => {}}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs bg-[#2a2e39] hover:bg-[#363c4e] rounded text-[#d1d4dc] transition-colors"
          >
            <span>📊</span>
            <span>Journal</span>
          </button>

          {/* ML Assistant */}
          <button
            onClick={() => {}}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs bg-[#2a2e39] hover:bg-[#363c4e] rounded text-[#d1d4dc] transition-colors"
          >
            <span>🤖</span>
            <span>ML Assistant</span>
          </button>

          {/* ML Overlay Toggle */}
          <button
            onClick={onToggleML}
            className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded transition-colors ${
              showML
                ? 'bg-[#9c27b0]/20 text-[#9c27b0] border border-[#9c27b0]/30'
                : 'bg-[#2a2e39] text-[#d1d4dc]'
            }`}
          >
            <span>{showML ? '🔮' : '🔮'}</span>
            <span>{showML ? 'ML on Chart' : 'ML off Chart'}</span>
          </button>

          {/* Import */}
          <button
            onClick={() => {}}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs bg-[#2a2e39] hover:bg-[#363c4e] rounded text-[#d1d4dc] transition-colors"
          >
            <span>📥</span>
            <span>Import Trades</span>
          </button>

          {/* Export */}
          <button
            onClick={() => {}}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs bg-[#2a2e39] hover:bg-[#363c4e] rounded text-[#d1d4dc] transition-colors"
          >
            <span>💾</span>
            <span>Export Data</span>
          </button>
        </div>
      </div>

      {/* Stats Mini Panel */}
      <div className="bg-[#1e222d] border border-[#242832] rounded-lg shadow-xl p-3">
        <div className="text-[10px] text-[#787b86] mb-2">Quick Stats</div>
        <div className="grid grid-cols-2 gap-2">
          <div className="text-center">
            <div className="text-lg font-bold text-[#26a69a]">62%</div>
            <div className="text-[9px] text-[#787b86]">Win Rate</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-[#d1d4dc]">$1.2K</div>
            <div className="text-[9px] text-[#787b86]">Total PnL</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-[#9c27b0]">3</div>
            <div className="text-[9px] text-[#787b86]">ML Hints</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-[#ff9800]">2.1</div>
            <div className="text-[9px] text-[#787b86]">Profit Factor</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickAccessPanel;
