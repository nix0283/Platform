'use client';

// ============================================
// QUICK ORDER PANEL — С поддержкой нескольких TP
// Быстрая торговля с панели
// ============================================

import React, { useState } from 'react';
import { useAppStore } from '@/store';
import { OrderType } from '@trading-platform/core';
import { TakeProfitLevel } from './ChartTradingOverlay';

interface QuickOrderPanelProps {
  onOrderPlaced?: (order: any) => void;
  compact?: boolean;
}

interface TPLevel {
  percent: string;
  enabled: boolean;
}

export const QuickOrderPanel: React.FC<QuickOrderPanelProps> = ({
  onOrderPlaced,
  compact = false,
}) => {
  const { chartConfig } = useAppStore();
  const [orderType, setOrderType] = useState<OrderType>('MARKET');
  const [quantity, setQuantity] = useState<string>('1');
  const [leverage, setLeverage] = useState<number>(10);
  
  // Stop Loss
  const [stopLossEnabled, setStopLossEnabled] = useState(false);
  const [stopLossPercent, setStopLossPercent] = useState<string>('2');
  
  // Multiple Take Profits
  const [takeProfitEnabled, setTakeProfitEnabled] = useState(false);
  const [takeProfitLevels, setTakeProfitLevels] = useState<TPLevel[]>([
    { percent: '30', enabled: true },
    { percent: '30', enabled: true },
    { percent: '40', enabled: true },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addTakeProfitLevel = () => {
    if (takeProfitLevels.length >= 5) return;
    setTakeProfitLevels([...takeProfitLevels, { percent: '20', enabled: true }]);
  };

  const removeTakeProfitLevel = (index: number) => {
    if (takeProfitLevels.length <= 1) return;
    setTakeProfitLevels(takeProfitLevels.filter((_, i) => i !== index));
  };

  const updateTakeProfitLevel = (index: number, value: string) => {
    const updated = [...takeProfitLevels];
    updated[index].percent = value;
    setTakeProfitLevels(updated);
  };

  const handleSubmit = async (side: 'BUY' | 'SELL') => {
    setIsSubmitting(true);

    try {
      const currentPrice = 50000; // В продакшене получать из графика
      
      // Calculate Stop Loss
      const stopLoss = stopLossEnabled
        ? side === 'BUY'
          ? currentPrice * (1 - parseFloat(stopLossPercent) / 100)
          : currentPrice * (1 + parseFloat(stopLossPercent) / 100)
        : undefined;

      // Calculate Multiple Take Profits
      const takeProfits: TakeProfitLevel[] = [];
      let remainingPercent = 100;

      takeProfitLevels.forEach((level, index) => {
        if (!level.enabled) return;
        
        const percent = parseFloat(level.percent) || 0;
        const isLast = index === takeProfitLevels.length - 1;
        const actualPercent = isLast ? remainingPercent : percent;
        
        const tpPrice = side === 'BUY'
          ? currentPrice * (1 + actualPercent / 100)
          : currentPrice * (1 - actualPercent / 100);

        takeProfits.push({
          id: `tp_${index + 1}`,
          price: tpPrice,
          percentage: actualPercent,
          filled: false,
        });

        remainingPercent -= actualPercent;
      });

      const order = {
        symbol: chartConfig.symbol,
        exchange: chartConfig.exchange,
        side,
        type: orderType,
        quantity: parseFloat(quantity),
        leverage,
        stopLoss,
        takeProfits,
        timestamp: Date.now(),
      };

      const response = await fetch('/api/trading/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order),
      });

      const result = await response.json();

      if (result.success) {
        onOrderPlaced?.(result.order);
        setQuantity('1');
      }
    } catch (error) {
      console.error('Order failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalTPPercent = takeProfitLevels
    .filter(l => l.enabled)
    .reduce((sum, l) => sum + (parseFloat(l.percent) || 0), 0);

  if (compact) {
    return (
      <div className="flex gap-2">
        <button
          onClick={() => handleSubmit('BUY')}
          disabled={isSubmitting}
          className="flex-1 py-2 bg-[#26a69a] hover:bg-[#1e8c7a] disabled:opacity-50 text-white font-bold rounded text-sm"
        >
          BUY
        </button>
        <button
          onClick={() => handleSubmit('SELL')}
          disabled={isSubmitting}
          className="flex-1 py-2 bg-[#ef5350] hover:bg-[#c62828] disabled:opacity-50 text-white font-bold rounded text-sm"
        >
          SELL
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#1e222d] border border-[#242832] rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="font-bold text-[#d1d4dc]">Quick Order</div>
        <div className="text-xs text-[#787b86]">{chartConfig.symbol}</div>
      </div>

      {/* Order Type */}
      <div>
        <label className="text-xs text-[#787b86] block mb-2">Order Type</label>
        <div className="grid grid-cols-3 gap-1">
          {(['MARKET', 'LIMIT', 'STOP'] as OrderType[]).map(type => (
            <button
              key={type}
              onClick={() => setOrderType(type)}
              className={`py-1.5 text-xs rounded ${
                orderType === type
                  ? 'bg-[#2962ff] text-white'
                  : 'bg-[#2a2e39] text-[#d1d4dc] hover:bg-[#363c4e]'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Quantity */}
      <div>
        <label className="text-xs text-[#787b86] block mb-1">Quantity</label>
        <div className="flex gap-2">
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="flex-1 bg-[#2a2e39] border border-[#363c4e] rounded px-3 py-2 text-[#d1d4dc] text-sm focus:outline-none focus:border-[#2962ff]"
            step="0.01"
          />
          <select
            value={chartConfig.symbol.split('/')[0]}
            className="bg-[#2a2e39] border border-[#363c4e] rounded px-2 py-2 text-[#d1d4dc] text-sm"
          >
            <option>{chartConfig.symbol.split('/')[0]}</option>
          </select>
        </div>
      </div>

      {/* Leverage */}
      <div>
        <label className="text-xs text-[#787b86] block mb-2">
          Leverage: <span className="text-[#2962ff]">{leverage}x</span>
        </label>
        <input
          type="range"
          min="1"
          max="100"
          value={leverage}
          onChange={(e) => setLeverage(parseInt(e.target.value))}
          className="w-full accent-[#2962ff]"
        />
        <div className="flex justify-between text-xs text-[#787b86] mt-1">
          <span>1x</span>
          <span>50x</span>
          <span>100x</span>
        </div>
      </div>

      {/* Stop Loss */}
      <div className="p-3 bg-[#2a2e39] rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <input
            type="checkbox"
            checked={stopLossEnabled}
            onChange={(e) => setStopLossEnabled(e.target.checked)}
            className="rounded bg-[#363c4e] border-[#363c4e]"
          />
          <label className="text-sm text-[#ef5350] font-medium">Stop Loss</label>
        </div>
        {stopLossEnabled && (
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={stopLossPercent}
              onChange={(e) => setStopLossPercent(e.target.value)}
              className="flex-1 bg-[#363c4e] border border-[#363c4e] rounded px-3 py-2 text-[#d1d4dc] text-sm"
              placeholder="2"
              step="0.1"
            />
            <span className="text-[#787b86] text-sm">%</span>
          </div>
        )}
      </div>

      {/* Take Profits */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={takeProfitEnabled}
              onChange={(e) => setTakeProfitEnabled(e.target.checked)}
              className="rounded bg-[#363c4e] border-[#363c4e]"
            />
            <label className="text-sm text-[#26a69a] font-medium">Take Profits</label>
          </div>
          <button
            onClick={addTakeProfitLevel}
            disabled={!takeProfitEnabled || takeProfitLevels.length >= 5}
            className="text-xs text-[#2962ff] hover:underline disabled:opacity-50"
          >
            + Add TP
          </button>
        </div>

        {takeProfitEnabled && (
          <div className="space-y-2">
            {takeProfitLevels.map((level, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="text-xs text-[#26a69a] font-medium w-8">
                  TP{index + 1}
                </div>
                <input
                  type="checkbox"
                  checked={level.enabled}
                  onChange={(e) => {
                    const updated = [...takeProfitLevels];
                    updated[index].enabled = e.target.checked;
                    setTakeProfitLevels(updated);
                  }}
                  className="rounded bg-[#363c4e] border-[#363c4e]"
                />
                <input
                  type="number"
                  value={level.percent}
                  onChange={(e) => updateTakeProfitLevel(index, e.target.value)}
                  disabled={!level.enabled}
                  className="flex-1 bg-[#363c4e] border border-[#363c4e] rounded px-2 py-1 text-[#d1d4dc] text-xs disabled:opacity-50"
                  placeholder="%"
                  step="1"
                  min="1"
                  max="100"
                />
                <span className="text-[#787b86] text-xs">%</span>
                {takeProfitLevels.length > 1 && (
                  <button
                    onClick={() => removeTakeProfitLevel(index)}
                    className="text-[#ef5350] hover:text-[#ff6b6b]"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            
            {/* Total Percentage */}
            <div className={`text-xs text-right ${totalTPPercent === 100 ? 'text-[#26a69a]' : 'text-[#ef5350]'}`}>
              Total: {totalTPPercent}% {totalTPPercent !== 100 && '(Should be 100%)'}
            </div>
          </div>
        )}
      </div>

      {/* Buy/Sell Buttons */}
      <div className="grid grid-cols-2 gap-2 pt-2">
        <button
          onClick={() => handleSubmit('BUY')}
          disabled={isSubmitting}
          className="py-3 bg-[#26a69a] hover:bg-[#1e8c7a] disabled:opacity-50 text-white font-bold rounded"
        >
          BUY / LONG
        </button>
        <button
          onClick={() => handleSubmit('SELL')}
          disabled={isSubmitting}
          className="py-3 bg-[#ef5350] hover:bg-[#c62828] disabled:opacity-50 text-white font-bold rounded"
        >
          SELL / SHORT
        </button>
      </div>

      {/* Quick Amounts */}
      <div className="grid grid-cols-4 gap-1">
        {['25%', '50%', '75%', '100%'].map(pct => (
          <button
            key={pct}
            onClick={() => {}}
            className="py-1 text-xs bg-[#2a2e39] hover:bg-[#363c4e] text-[#d1d4dc] rounded"
          >
            {pct}
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickOrderPanel;
