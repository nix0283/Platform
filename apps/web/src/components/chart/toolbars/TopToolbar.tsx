'use client';

// ============================================
// TOP TOOLBAR — Символ, таймфрейм, индикаторы
// ============================================

import React, { useState } from 'react';
import { useAppStore } from '@/store';
import { EXCHANGES, INTERVALS } from '@trading-platform/core';

interface TopToolbarProps {
  onIndicatorAdd?: (indicator: string) => void;
  onChartTypeChange?: (type: string) => void;
}

export const TopToolbar: React.FC<TopToolbarProps> = ({
  onIndicatorAdd,
  onChartTypeChange,
}) => {
  const { chartConfig, setChartConfig } = useAppStore();
  const [showSymbolSearch, setShowSymbolSearch] = useState(false);
  const [showIndicators, setShowIndicators] = useState(false);

  const chartTypes = [
    { id: 'candle', icon: '🕯️', label: 'Candles' },
    { id: 'bar', icon: '📊', label: 'Bars' },
    { id: 'line', icon: '📈', label: 'Line' },
    { id: 'area', icon: '⛰️', label: 'Area' },
    { id: 'heikinashi', icon: '🔲', label: 'Heikin Ashi' },
  ];

  const indicators = [
    { id: 'sma', name: 'SMA', group: 'Trend' },
    { id: 'ema', name: 'EMA', group: 'Trend' },
    { id: 'wma', name: 'WMA', group: 'Trend' },
    { id: 'rsi', name: 'RSI', group: 'Momentum' },
    { id: 'macd', name: 'MACD', group: 'Momentum' },
    { id: 'stoch', name: 'Stochastic', group: 'Momentum' },
    { id: 'bb', name: 'Bollinger Bands', group: 'Volatility' },
    { id: 'atr', name: 'ATR', group: 'Volatility' },
    { id: 'obv', name: 'OBV', group: 'Volume' },
    { id: 'vwap', name: 'VWAP', group: 'Volume' },
  ];

  return (
    <div className="h-12 bg-[#1e222d] border-b border-[#242832] flex items-center px-2 gap-2">
      {/* Symbol Search */}
      <div className="relative">
        <button
          onClick={() => setShowSymbolSearch(!showSymbolSearch)}
          className="flex items-center gap-2 px-3 py-1.5 bg-[#2a2e39] hover:bg-[#363c4e] rounded text-sm font-medium"
        >
          <span className="text-lg">🔍</span>
          <span>{chartConfig.exchange.toUpperCase()}:{chartConfig.symbol}</span>
          <span className="text-[#787b86]">▼</span>
        </button>

        {showSymbolSearch && (
          <div className="absolute top-full left-0 mt-1 w-80 bg-[#1e222d] border border-[#242832] rounded-lg shadow-xl z-50">
            <div className="p-3 border-b border-[#242832]">
              <input
                type="text"
                placeholder="Search symbol..."
                className="w-full bg-[#2a2e39] border border-[#363c4e] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#2962ff]"
                onChange={(e) => setChartConfig({ symbol: e.target.value.toUpperCase() })}
                value={chartConfig.symbol}
              />
            </div>
            <div className="max-h-64 overflow-y-auto p-2">
              {EXCHANGES.filter(e => e.supported).map((ex) => (
                <div key={ex.id} className="mb-2">
                  <div className="text-xs text-[#787b86] px-2 py-1">{ex.name}</div>
                  <button
                    onClick={() => {
                      setChartConfig({ exchange: ex.id as any });
                      setShowSymbolSearch(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-[#2a2e39] ${
                      chartConfig.exchange === ex.id ? 'bg-[#2962ff]/20' : ''
                    }`}
                  >
                    {ex.name}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Timeframe */}
      <div className="flex items-center gap-1 bg-[#2a2e39] rounded p-1">
        {INTERVALS.slice(0, 8).map((interval) => (
          <button
            key={interval}
            onClick={() => setChartConfig({ interval })}
            className={`px-2 py-1 text-xs rounded ${
              chartConfig.interval === interval
                ? 'bg-[#2962ff] text-white'
                : 'hover:bg-[#363c4e]'
            }`}
          >
            {interval}
          </button>
        ))}
        <button className="px-2 py-1 text-xs hover:bg-[#363c4e] rounded">
          ⋯
        </button>
      </div>

      {/* Chart Type */}
      <div className="flex items-center gap-1 bg-[#2a2e39] rounded p-1">
        {chartTypes.map((type) => (
          <button
            key={type.id}
            onClick={() => {
              setChartConfig({ chartType: type.id as any });
              onChartTypeChange?.(type.id);
            }}
            className={`p-1.5 rounded ${
              chartConfig.chartType === type.id
                ? 'bg-[#2962ff] text-white'
                : 'hover:bg-[#363c4e]'
            }`}
            title={type.label}
          >
            {type.icon}
          </button>
        ))}
      </div>

      {/* Indicators */}
      <div className="relative">
        <button
          onClick={() => setShowIndicators(!showIndicators)}
          className="flex items-center gap-2 px-3 py-1.5 bg-[#2a2e39] hover:bg-[#363c4e] rounded text-sm"
        >
          <span>📊</span>
          <span>Indicators</span>
        </button>

        {showIndicators && (
          <div className="absolute top-full left-0 mt-1 w-64 bg-[#1e222d] border border-[#242832] rounded-lg shadow-xl z-50">
            <div className="p-3 border-b border-[#242832]">
              <input
                type="text"
                placeholder="Search indicators..."
                className="w-full bg-[#2a2e39] border border-[#363c4e] rounded px-3 py-2 text-sm focus:outline-none"
              />
            </div>
            <div className="max-h-80 overflow-y-auto p-2">
              {indicators.map((ind) => (
                <button
                  key={ind.id}
                  onClick={() => {
                    onIndicatorAdd?.(ind.id);
                    setShowIndicators(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded text-sm hover:bg-[#2a2e39] flex items-center justify-between"
                >
                  <span>{ind.name}</span>
                  <span className="text-xs text-[#787b86]">{ind.group}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Log Scale Toggle */}
      <button
        onClick={() => setChartConfig({ /* logScale: !chartConfig.logScale */ } as any)}
        className="px-3 py-1.5 bg-[#2a2e39] hover:bg-[#363c4e] rounded text-sm"
        title="Logarithmic Scale"
      >
        📐 Log
      </button>

      {/* Fullscreen */}
      <button
        onClick={() => document.documentElement.requestFullscreen?.()}
        className="ml-auto px-3 py-1.5 bg-[#2a2e39] hover:bg-[#363c4e] rounded text-sm"
        title="Fullscreen"
      >
        ⛶
      </button>

      {/* Settings */}
      <button
        className="px-3 py-1.5 bg-[#2a2e39] hover:bg-[#363c4e] rounded text-sm"
        title="Settings"
      >
        ⚙️
      </button>
    </div>
  );
};

export default TopToolbar;
