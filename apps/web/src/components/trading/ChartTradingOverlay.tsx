'use client';

// ============================================
// CHART TRADING OVERLAY — С поддержкой нескольких TP
// Торговля прямо на графике (как в TradingView)
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/store';
import { OrderSide, OrderType } from '@trading-platform/core';

interface ChartTradingOverlayProps {
  chartContainerRef: React.RefObject<HTMLDivElement>;
  onOrderPlaced?: (order: TradingOrder) => void;
  enabled?: boolean;
}

export interface TradingOrder {
  id: string;
  symbol: string;
  exchange: string;
  side: OrderSide;
  type: OrderType;
  entryPrice: number;
  quantity: number;
  stopLoss?: number;
  takeProfits: TakeProfitLevel[]; // ← Несколько TP
  timestamp: number;
  status: 'pending' | 'active' | 'filled' | 'cancelled';
}

export interface TakeProfitLevel {
  id: string;
  price: number;
  percentage: number; // % от позиции для закрытия
  filled: boolean;
}

export interface PositionLine {
  id: string;
  type: 'entry' | 'stopLoss' | 'takeProfit';
  price: number;
  side: OrderSide;
  color: string;
  tpLevel?: number; // Номер TP (1, 2, 3...)
  percentage?: number; // % позиции
}

export const ChartTradingOverlay: React.FC<ChartTradingOverlayProps> = ({
  chartContainerRef,
  onOrderPlaced,
  enabled = true,
}) => {
  const { chartConfig } = useAppStore();
  const [showOrderPanel, setShowOrderPanel] = useState(false);
  const [clickPosition, setClickPosition] = useState<{ x: number; y: number; price: number } | null>(null);
  const [orderType, setOrderType] = useState<OrderType>('MARKET');
  const [quantity, setQuantity] = useState<string>('0.1');
  
  // Stop Loss
  const [stopLossEnabled, setStopLossEnabled] = useState(true);
  const [stopLossPercent, setStopLossPercent] = useState<string>('2');
  
  // Multiple Take Profits
  const [takeProfitEnabled, setTakeProfitEnabled] = useState(true);
  const [takeProfitLevels, setTakeProfitLevels] = useState<Array<{ percent: string; price: string }>>([
    { percent: '30', price: '' }, // TP1: 30% позиции
    { percent: '30', price: '' }, // TP2: 30% позиции
    { percent: '40', price: '' }, // TP3: 40% позиции
  ]);

  const [positionLines, setPositionLines] = useState<PositionLine[]>([]);

  // Обработка клика по графику
  const handleChartClick = useCallback((event: React.MouseEvent) => {
    if (!enabled || !chartContainerRef.current) return;

    const rect = chartContainerRef.current.getBoundingClientRect();
    const y = event.clientY - rect.top;
    const height = rect.height;
    
    const priceRange = 100;
    const pricePercent = 1 - (y / height);
    const estimatedPrice = 50000 + (pricePercent - 0.5) * priceRange;

    setClickPosition({
      x: event.clientX,
      y: event.clientY,
      price: estimatedPrice,
    });
    setShowOrderPanel(true);
  }, [enabled, chartContainerRef]);

  // Добавление уровня TP
  const addTakeProfitLevel = () => {
    if (takeProfitLevels.length >= 5) return; // Максимум 5 TP
    setTakeProfitLevels([...takeProfitLevels, { percent: '20', price: '' }]);
  };

  // Удаление уровня TP
  const removeTakeProfitLevel = (index: number) => {
    if (takeProfitLevels.length <= 1) return;
    setTakeProfitLevels(takeProfitLevels.filter((_, i) => i !== index));
  };

  // Обновление уровня TP
  const updateTakeProfitLevel = (index: number, field: 'percent' | 'price', value: string) => {
    const updated = [...takeProfitLevels];
    updated[index] = { ...updated[index], [field]: value };
    setTakeProfitLevels(updated);
  };

  // Размещение ордера
  const placeOrder = async (side: OrderSide) => {
    if (!clickPosition) return;

    // Calculate Stop Loss
    const stopLoss = stopLossEnabled 
      ? side === 'BUY' 
        ? clickPosition.price * (1 - parseFloat(stopLossPercent) / 100)
        : clickPosition.price * (1 + parseFloat(stopLossPercent) / 100)
      : undefined;

    // Calculate Multiple Take Profits
    const takeProfits: TakeProfitLevel[] = [];
    let remainingPercent = 100;

    takeProfitLevels.forEach((level, index) => {
      const percent = parseFloat(level.percent) || 0;
      const isLast = index === takeProfitLevels.length - 1;
      const actualPercent = isLast ? remainingPercent : percent;
      
      const tpPrice = side === 'BUY'
        ? clickPosition.price * (1 + actualPercent / 100)
        : clickPosition.price * (1 - actualPercent / 100);

      takeProfits.push({
        id: `tp_${index + 1}`,
        price: level.price ? parseFloat(level.price) : tpPrice,
        percentage: actualPercent,
        filled: false,
      });

      remainingPercent -= actualPercent;
    });

    const order: TradingOrder = {
      id: `order_${Date.now()}`,
      symbol: chartConfig.symbol,
      exchange: chartConfig.exchange,
      side,
      type: orderType,
      entryPrice: clickPosition.price,
      quantity: parseFloat(quantity),
      stopLoss,
      takeProfits,
      timestamp: Date.now(),
      status: 'active',
    };

    try {
      const response = await fetch('/api/trading/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order),
      });

      const result = await response.json();

      if (result.success) {
        onOrderPlaced?.(order);
        
        // Добавить линии на график
        const newLines: PositionLine[] = [
          {
            id: `${order.id}_entry`,
            type: 'entry',
            price: order.entryPrice,
            side,
            color: side === 'BUY' ? '#26a69a' : '#ef5350',
          },
        ];

        if (stopLoss) {
          newLines.push({
            id: `${order.id}_sl`,
            type: 'stopLoss',
            price: stopLoss,
            side,
            color: '#ff9800',
          });
        }

        // Добавить линии для каждого TP
        takeProfits.forEach((tp, index) => {
          newLines.push({
            id: `${order.id}_${tp.id}`,
            type: 'takeProfit',
            price: tp.price,
            side,
            color: '#2196f3',
            tpLevel: index + 1,
            percentage: tp.percentage,
          });
        });

        setPositionLines(prev => [...prev, ...newLines]);
        setShowOrderPanel(false);
        setClickPosition(null);
      }
    } catch (error: any) {
      console.error('Failed to place order:', error);
    }
  };

  // Закрытие позиции
  const closePosition = async (lineId: string) => {
    setPositionLines(prev => prev.filter(line => line.id !== lineId));
  };

  if (!enabled) return null;

  return (
    <>
      {/* Order Panel */}
      {showOrderPanel && clickPosition && (
        <div
          className="absolute z-50 bg-[#1e222d] border border-[#242832] rounded-lg shadow-xl p-4 w-96 max-h-[80vh] overflow-y-auto"
          style={{
            left: Math.min(clickPosition.x + 20, window.innerWidth - 400),
            top: Math.min(clickPosition.y + 20, window.innerHeight - 600),
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="text-[#d1d4dc] font-bold">
              {chartConfig.symbol}
            </div>
            <button
              onClick={() => {
                setShowOrderPanel(false);
                setClickPosition(null);
              }}
              className="text-[#787b86] hover:text-[#d1d4dc]"
            >
              ✕
            </button>
          </div>

          {/* Price */}
          <div className="mb-4">
            <label className="text-xs text-[#787b86] block mb-1">Entry Price</label>
            <div className="text-2xl font-bold text-[#d1d4dc]">
              ${clickPosition.price.toFixed(2)}
            </div>
          </div>

          {/* Order Type */}
          <div className="mb-4">
            <label className="text-xs text-[#787b86] block mb-2">Order Type</label>
            <div className="grid grid-cols-3 gap-1">
              {(['MARKET', 'LIMIT', 'STOP'] as OrderType[]).map(type => (
                <button
                  key={type}
                  onClick={() => setOrderType(type)}
                  className={`py-2 text-xs rounded ${
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
          <div className="mb-4">
            <label className="text-xs text-[#787b86] block mb-1">Quantity</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full bg-[#2a2e39] border border-[#363c4e] rounded px-3 py-2 text-[#d1d4dc] text-sm focus:outline-none focus:border-[#2962ff]"
              step="0.01"
            />
          </div>

          {/* Stop Loss */}
          <div className="mb-4 p-3 bg-[#2a2e39] rounded-lg">
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
          <div className="mb-4">
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
                  <div key={index} className="flex items-center gap-2 bg-[#2a2e39] p-2 rounded">
                    <div className="text-xs text-[#26a69a] font-medium w-8">
                      TP{index + 1}
                    </div>
                    <input
                      type="number"
                      value={level.percent}
                      onChange={(e) => updateTakeProfitLevel(index, 'percent', e.target.value)}
                      className="flex-1 bg-[#363c4e] border border-[#363c4e] rounded px-2 py-1 text-[#d1d4dc] text-xs"
                      placeholder="%"
                      step="1"
                      min="1"
                      max="100"
                    />
                    <span className="text-[#787b86] text-xs">%</span>
                    <input
                      type="number"
                      value={level.price}
                      onChange={(e) => updateTakeProfitLevel(index, 'price', e.target.value)}
                      className="flex-1 bg-[#363c4e] border border-[#363c4e] rounded px-2 py-1 text-[#d1d4dc] text-xs"
                      placeholder="Price"
                      step="0.01"
                    />
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
                <div className="text-xs text-[#787b86] text-right">
                  Total: {takeProfitLevels.reduce((sum, l) => sum + (parseFloat(l.percent) || 0), 0)}%
                </div>
              </div>
            )}
          </div>

          {/* Buy/Sell Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => placeOrder('BUY')}
              className="py-3 bg-[#26a69a] hover:bg-[#1e8c7a] text-white font-bold rounded"
            >
              BUY / LONG
            </button>
            <button
              onClick={() => placeOrder('SELL')}
              className="py-3 bg-[#ef5350] hover:bg-[#c62828] text-white font-bold rounded"
            >
              SELL / SHORT
            </button>
          </div>

          {/* Quick Amounts */}
          <div className="grid grid-cols-4 gap-1 mt-3">
            {['0.1', '0.5', '1', '5'].map(amt => (
              <button
                key={amt}
                onClick={() => setQuantity(amt)}
                className="py-1 text-xs bg-[#2a2e39] hover:bg-[#363c4e] text-[#d1d4dc] rounded"
              >
                {amt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Position Lines on Chart */}
      {positionLines.map(line => (
        <div
          key={line.id}
          className="absolute left-0 right-0 h-px cursor-pointer group"
          style={{
            top: `${((line.price - 40000) / 20000) * 100}%`,
            backgroundColor: line.color,
          }}
          onClick={() => closePosition(line.id)}
          title={`${line.type}${line.tpLevel ? ` ${line.tpLevel}` : ''}: $${line.price.toFixed(2)} (${line.percentage}% position)`}
        >
          <div
            className="absolute right-2 -top-3 px-2 py-0.5 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap"
            style={{ backgroundColor: line.color, color: '#fff' }}
          >
            {line.type === 'takeProfit' && line.tpLevel ? `TP${line.tpLevel}` : line.type === 'stopLoss' ? 'SL' : 'Entry'}: ${line.price.toFixed(2)}
            {line.percentage && ` (${line.percentage}%)`}
            <span className="ml-1">✕</span>
          </div>
        </div>
      ))}

      {/* Trading Mode Toggle */}
      <div className="absolute top-20 right-4 z-40">
        <button
          onClick={() => {}}
          className={`px-4 py-2 rounded-lg font-medium text-sm shadow-lg ${
            enabled
              ? 'bg-[#2962ff] text-white'
              : 'bg-[#1e222d] text-[#787b86] border border-[#242832]'
          }`}
          title="Click on chart to place orders"
        >
          📈 Trade Mode: {enabled ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* Instructions */}
      {enabled && (
        <div className="absolute top-28 right-4 z-40 bg-[#1e222d]/90 border border-[#242832] rounded-lg p-3 text-xs text-[#787b86] max-w-xs">
          <div className="font-bold text-[#d1d4dc] mb-2">📌 Как торговать:</div>
          <ol className="space-y-1">
            <li>1. Кликните на график для ордера</li>
            <li>2. Выберите BUY или SELL</li>
            <li>3. Настройте Stop Loss</li>
            <li>4. Добавьте несколько Take Profit (до 5)</li>
            <li>5. Укажите % позиции для каждого TP</li>
            <li>6. Кликните на линию для закрытия</li>
          </ol>
        </div>
      )}
    </>
  );
};

export default ChartTradingOverlay;
