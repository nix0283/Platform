'use client';

// ============================================
// BOTTOM TOOLBAR — Навигация по времени, алёрты, скринер
// ============================================

import React, { useState } from 'react';
import { useAppStore } from '@/store';

interface BottomToolbarProps {
  onTimeRangeChange?: (range: { from: number; to: number }) => void;
  onAlertCreate?: () => void;
  onScreenerOpen?: () => void;
}

export const BottomToolbar: React.FC<BottomToolbarProps> = ({
  onTimeRangeChange,
  onAlertCreate,
  onScreenerOpen,
}) => {
  const { chartConfig, setChartConfig } = useAppStore();
  const [showDateRange, setShowDateRange] = useState(false);

  const timeRanges = [
    { label: '1D', value: '1D' },
    { label: '5D', value: '5D' },
    { label: '1M', value: '1M' },
    { label: '3M', value: '3M' },
    { label: '6M', value: '6M' },
    { label: '1Y', value: '1Y' },
    { label: 'YTD', value: 'YTD' },
    { label: 'ALL', value: 'ALL' },
  ];

  const navigationButtons = [
    { icon: '⏮️', label: 'First', action: 'first' },
    { icon: '◀️', label: 'Left', action: 'left' },
    { icon: '▶️', label: 'Right', action: 'right' },
    { icon: '⏭️', label: 'Last', action: 'last' },
    { icon: '🔍', label: 'Fit', action: 'fit' },
  ];

  return (
    <div className="h-10 bg-[#1e222d] border-t border-[#242832] flex items-center px-2 gap-2">
      {/* Time Range */}
      <div className="relative">
        <button
          onClick={() => setShowDateRange(!showDateRange)}
          className="flex items-center gap-2 px-3 py-1 bg-[#2a2e39] hover:bg-[#363c4e] rounded text-xs"
        >
          <span>📅</span>
          <span>{timeRanges[0].label}</span>
          <span className="text-[#787b86]">▼</span>
        </button>

        {showDateRange && (
          <div className="absolute bottom-full left-0 mb-1 flex gap-1 bg-[#1e222d] border border-[#242832] rounded-lg p-1 shadow-xl z-50">
            {timeRanges.map((range) => (
              <button
                key={range.value}
                onClick={() => {
                  onTimeRangeChange?.({ from: 0, to: Date.now() });
                  setShowDateRange(false);
                }}
                className="px-3 py-1.5 text-xs hover:bg-[#2a2e39] rounded"
              >
                {range.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-1 bg-[#2a2e39] rounded p-1">
        {navigationButtons.map((btn) => (
          <button
            key={btn.action}
            className="w-8 h-6 flex items-center justify-center hover:bg-[#363c4e] rounded text-xs"
            title={btn.label}
          >
            {btn.icon}
          </button>
        ))}
      </div>

      {/* Separator */}
      <div className="w-px h-6 bg-[#242832]" />

      {/* Zoom */}
      <div className="flex items-center gap-1">
        <button className="w-8 h-6 flex items-center justify-center hover:bg-[#2a2e39] rounded text-xs">
          ➖
        </button>
        <span className="text-xs text-[#787b86] w-12 text-center">100%</span>
        <button className="w-8 h-6 flex items-center justify-center hover:bg-[#2a2e39] rounded text-xs">
          ➕
        </button>
      </div>

      {/* Separator */}
      <div className="w-px h-6 bg-[#242832]" />

      {/* Alerts */}
      <button
        onClick={onAlertCreate}
        className="flex items-center gap-2 px-3 py-1 bg-[#2a2e39] hover:bg-[#363c4e] rounded text-xs"
      >
        <span>🔔</span>
        <span>Alert</span>
      </button>

      {/* Screener */}
      <button
        onClick={onScreenerOpen}
        className="flex items-center gap-2 px-3 py-1 bg-[#2a2e39] hover:bg-[#363c4e] rounded text-xs"
      >
        <span>📊</span>
        <span>Screener</span>
      </button>

      {/* Calendar */}
      <button className="flex items-center gap-2 px-3 py-1 bg-[#2a2e39] hover:bg-[#363c4e] rounded text-xs">
        <span>📆</span>
        <span>Calendar</span>
      </button>

      {/* Separator */}
      <div className="w-px h-6 bg-[#242832]" />

      {/* Compare */}
      <button className="flex items-center gap-2 px-3 py-1 bg-[#2a2e39] hover:bg-[#363c4e] rounded text-xs">
        <span>➕</span>
        <span>Compare</span>
      </button>

      {/* Preview */}
      <button className="flex items-center gap-2 px-3 py-1 bg-[#2a2e39] hover:bg-[#363c4e] rounded text-xs">
        <span>👁️</span>
        <span>Preview</span>
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Status Bar */}
      <div className="flex items-center gap-4 text-xs text-[#787b86]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-[#26a69a] rounded-full animate-pulse" />
          <span>Connected</span>
        </div>
        <div>
          <span>O: </span>
          <span className="text-[#d1d4dc]">0.00</span>
        </div>
        <div>
          <span>H: </span>
          <span className="text-[#d1d4dc]">0.00</span>
        </div>
        <div>
          <span>L: </span>
          <span className="text-[#d1d4dc]">0.00</span>
        </div>
        <div>
          <span>C: </span>
          <span className="text-[#d1d4dc]">0.00</span>
        </div>
        <div>
          <span>Vol: </span>
          <span className="text-[#d1d4dc]">0</span>
        </div>
      </div>

      {/* Scale Options */}
      <div className="flex items-center gap-1 ml-4">
        <button
          onClick={() => setChartConfig({ /* logScale: false */ } as any)}
          className="px-2 py-1 text-xs hover:bg-[#2a2e39] rounded"
          title="Normal Scale"
        >
          1:1
        </button>
        <button
          onClick={() => setChartConfig({ /* logScale: true */ } as any)}
          className="px-2 py-1 text-xs hover:bg-[#2a2e39] rounded"
          title="Logarithmic Scale"
        >
          Log
        </button>
        <button
          className="px-2 py-1 text-xs hover:bg-[#2a2e39] rounded"
          title="Percentage Scale"
        >
          %
        </button>
      </div>
    </div>
  );
};

export default BottomToolbar;
