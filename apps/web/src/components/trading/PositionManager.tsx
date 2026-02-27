'use client';

// ============================================
// POSITION MANAGER — С поддержкой нескольких TP
// Управление открытыми позициями
// ============================================

import React, { useState, useEffect } from 'react';
import { Position } from '@trading-platform/core';
import { TakeProfitLevel } from './ChartTradingOverlay';

interface PositionManagerProps {
  positions: (Position & { takeProfits?: TakeProfitLevel[] })[];
  onClosePosition?: (symbol: string, tpLevel?: number) => void;
  onUpdatePosition?: (symbol: string, updates: Partial<Position>) => void;
}

export const PositionManager: React.FC<PositionManagerProps> = ({
  positions,
  onClosePosition,
  onUpdatePosition,
}) => {
  const [expandedPosition, setExpandedPosition] = useState<string | null>(null);

  if (positions.length === 0) {
    return (
      <div className="bg-[#1e222d] border border-[#242832] rounded-lg p-4">
        <div className="text-center text-[#787b86] py-8">
          No open positions
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <div className="font-bold text-[#d1d4dc]">Open Positions ({positions.length})</div>
        <button
          onClick={() => {}}
          className="text-xs text-[#2962ff] hover:underline"
        >
          Close All
        </button>
      </div>

      {positions.map((position) => {
        const pnl = position.unrealizedPnl;
        const pnlPercent = ((position.markPrice - position.entryPrice) / position.entryPrice) * 100 * (position.side === 'BUY' ? 1 : -1);
        const isProfit = pnl >= 0;

        // Calculate filled TPs
        const takeProfits = position.takeProfits || [];
        const filledTps = takeProfits.filter(tp => tp.filled);
        const pendingTps = takeProfits.filter(tp => !tp.filled);

        return (
          <div
            key={position.symbol}
            className="bg-[#2a2e39] border border-[#363c4e] rounded-lg overflow-hidden"
          >
            {/* Header */}
            <div
              className="p-3 cursor-pointer hover:bg-[#363c4e] transition-colors"
              onClick={() => setExpandedPosition(expandedPosition === position.symbol ? null : position.symbol)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${position.side === 'BUY' ? 'bg-[#26a69a]' : 'bg-[#ef5350]'}`} />
                  <div>
                    <div className="font-bold text-[#d1d4dc]">{position.symbol}</div>
                    <div className="text-xs text-[#787b86]">
                      {position.side} {position.quantity} @ ${position.entryPrice.toFixed(2)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-bold ${isProfit ? 'text-[#26a69a]' : 'text-[#ef5350]'}`}>
                    {isProfit ? '+' : ''}{pnl.toFixed(2)} USDT
                  </div>
                  <div className={`text-xs ${isProfit ? 'text-[#26a69a]' : 'text-[#ef5350]'}`}>
                    {isProfit ? '+' : ''}{pnlPercent.toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>

            {/* Expanded Details */}
            {expandedPosition === position.symbol && (
              <div className="px-3 pb-3 border-t border-[#363c4e] pt-3">
                <div className="grid grid-cols-2 gap-3 text-xs mb-4">
                  <div>
                    <div className="text-[#787b86] mb-1">Entry Price</div>
                    <div className="text-[#d1d4dc]">${position.entryPrice.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-[#787b86] mb-1">Mark Price</div>
                    <div className="text-[#d1d4dc]">${position.markPrice.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-[#787b86] mb-1">Leverage</div>
                    <div className="text-[#d1d4dc]">{position.leverage}x</div>
                  </div>
                  <div>
                    <div className="text-[#787b86] mb-1">Margin Mode</div>
                    <div className="text-[#d1d4dc]">{position.marginMode}</div>
                  </div>
                  {position.liquidationPrice && (
                    <div>
                      <div className="text-[#787b86] mb-1">Liq. Price</div>
                      <div className="text-[#ef5350]">${position.liquidationPrice.toFixed(2)}</div>
                    </div>
                  )}
                  <div>
                    <div className="text-[#787b86] mb-1">Exchange</div>
                    <div className="text-[#d1d4dc]">{position.exchange.toUpperCase()}</div>
                  </div>
                </div>

                {/* Take Profit Levels */}
                {takeProfits.length > 0 && (
                  <div className="mb-4">
                    <div className="text-xs text-[#787b86] mb-2">Take Profit Levels</div>
                    <div className="space-y-2">
                      {takeProfits.map((tp, index) => {
                        const isFilled = tp.filled;
                        const isNext = !isFilled && index === takeProfits.findIndex(t => !t.filled);
                        
                        return (
                          <div
                            key={tp.id}
                            className={`flex items-center justify-between p-2 rounded text-xs ${
                              isFilled
                                ? 'bg-[#26a69a]/20 border border-[#26a69a]/30'
                                : isNext
                                ? 'bg-[#2962ff]/20 border border-[#2962ff]/30'
                                : 'bg-[#2a2e39] border border-[#363c4e]'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div className={`font-medium ${
                                isFilled ? 'text-[#26a69a]' : isNext ? 'text-[#2962ff]' : 'text-[#787b86]'
                              }`}>
                                TP{index + 1}
                              </div>
                              <div className="text-[#d1d4dc]">
                                ${tp.price.toFixed(2)}
                              </div>
                              <div className="text-[#787b86]">
                                ({tp.percentage}%)
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {isFilled ? (
                                <span className="text-[#26a69a] text-xs">✓ Filled</span>
                              ) : isNext ? (
                                <span className="text-[#2962ff] text-xs">Next</span>
                              ) : (
                                <span className="text-[#787b86] text-xs">Pending</span>
                              )}
                              {!isFilled && (
                                <button
                                  onClick={() => onClosePosition?.(position.symbol, index + 1)}
                                  className="text-[#ef5350] hover:text-[#ff6b6b] text-xs"
                                >
                                  Close
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Progress */}
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs text-[#787b86] mb-1">
                        <span>TP Progress</span>
                        <span>{filledTps.length}/{takeProfits.length}</span>
                      </div>
                      <div className="w-full bg-[#363c4e] rounded-full h-2">
                        <div
                          className="bg-[#26a69a] h-2 rounded-full transition-all"
                          style={{ width: `${(filledTps.length / takeProfits.length) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Stop Loss */}
                {position.stopLoss && (
                  <div className="mb-4 p-2 bg-[#2a2e39] rounded border border-[#363c4e]">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#787b86]">Stop Loss</span>
                      <span className="text-[#ef5350] font-medium">${position.stopLoss.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => onClosePosition?.(position.symbol)}
                    className="flex-1 py-2 bg-[#ef5350] hover:bg-[#c62828] text-white text-xs font-bold rounded"
                  >
                    Close Position
                  </button>
                  <button
                    onClick={() => {}}
                    className="flex-1 py-2 bg-[#2a2e39] hover:bg-[#363c4e] text-[#d1d4dc] text-xs font-bold rounded border border-[#363c4e]"
                  >
                    Add Margin
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default PositionManager;
