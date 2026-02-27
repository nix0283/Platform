'use client';

// ============================================
// PAPER TRADING PANEL
// Панель демо-трейдинга
// ============================================

import React, { useState } from 'react';
import { usePaperTrading } from '@/hooks/usePaperTrading';

interface PaperTradingPanelProps {
  compact?: boolean;
}

export const PaperTradingPanel: React.FC<PaperTradingPanelProps> = ({
  compact = false,
}) => {
  const {
    ready,
    mode,
    stats,
    positions,
    orders,
    placeOrder,
    closePosition,
    resetAccount,
  } = usePaperTrading();

  const [activeTab, setActiveTab] = useState<'positions' | 'orders' | 'stats'>('positions');
  const [orderForm, setOrderForm] = useState({
    symbol: 'BTC/USDT',
    quantity: '0.1',
    leverage: '10',
  });

  if (!ready) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-[#787b86]">Loading...</div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="bg-[#1e222d] border-t border-[#242832] p-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#787b86]">📄 Paper Trading</span>
          {stats && (
            <span className="text-[#d1d4dc]">
              ${stats.currentBalance.toFixed(0)} | {stats.winRate.toFixed(1)}% WR
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
          <span className="text-lg font-bold text-[#d1d4dc]">📄 Paper Trading</span>
          <span className="text-xs px-2 py-0.5 bg-[#26a69a]/20 text-[#26a69a] rounded">
            Demo Mode
          </span>
        </div>
        <button
          onClick={() => {
            if (confirm('Reset paper trading account?')) {
              resetAccount();
            }
          }}
          className="px-3 py-1.5 text-xs bg-[#2a2e39] hover:bg-[#363c4e] rounded text-[#d1d4dc]"
        >
          🔄 Reset
        </button>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-4 gap-2 p-3 border-b border-[#242832]">
          <StatBox label="Balance" value={`$${stats.currentBalance.toFixed(0)}`} />
          <StatBox
            label="PnL"
            value={`$${stats.totalPnl.toFixed(0)}`}
            color={stats.totalPnl >= 0 ? 'text-[#26a69a]' : 'text-[#ef5350]'}
          />
          <StatBox
            label="Win Rate"
            value={`${stats.winRate.toFixed(1)}%`}
            color={stats.winRate >= 50 ? 'text-[#26a69a]' : 'text-[#ef5350]'}
          />
          <StatBox label="Trades" value={stats.totalTrades.toString()} />
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-[#242832]">
        <button
          onClick={() => setActiveTab('positions')}
          className={`flex-1 py-2 text-xs font-medium transition-colors ${
            activeTab === 'positions'
              ? 'text-[#2962ff] border-b-2 border-[#2962ff]'
              : 'text-[#787b86] hover:text-[#d1d4dc]'
          }`}
        >
          Positions ({positions.length})
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex-1 py-2 text-xs font-medium transition-colors ${
            activeTab === 'orders'
              ? 'text-[#2962ff] border-b-2 border-[#2962ff]'
              : 'text-[#787b86] hover:text-[#d1d4dc]'
          }`}
        >
          Orders ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex-1 py-2 text-xs font-medium transition-colors ${
            activeTab === 'stats'
              ? 'text-[#2962ff] border-b-2 border-[#2962ff]'
              : 'text-[#787b86] hover:text-[#d1d4dc]'
          }`}
        >
          Statistics
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2">
        {activeTab === 'positions' && (
          <PositionsTab
            positions={positions}
            onClose={closePosition}
          />
        )}
        {activeTab === 'orders' && (
          <OrdersTab orders={orders} />
        )}
        {activeTab === 'stats' && (
          <StatsTab stats={stats} />
        )}
      </div>

      {/* Quick Order Form */}
      <div className="p-3 border-t border-[#242832]">
        <div className="text-xs text-[#787b86] mb-2">Quick Paper Order</div>
        <div className="grid grid-cols-3 gap-2 mb-2">
          <input
            type="text"
            value={orderForm.symbol}
            onChange={(e) => setOrderForm({ ...orderForm, symbol: e.target.value })}
            className="bg-[#2a2e39] border border-[#363c4e] rounded px-2 py-1 text-xs text-[#d1d4dc]"
            placeholder="Symbol"
          />
          <input
            type="number"
            value={orderForm.quantity}
            onChange={(e) => setOrderForm({ ...orderForm, quantity: e.target.value })}
            className="bg-[#2a2e39] border border-[#363c4e] rounded px-2 py-1 text-xs text-[#d1d4dc]"
            placeholder="Qty"
          />
          <input
            type="number"
            value={orderForm.leverage}
            onChange={(e) => setOrderForm({ ...orderForm, leverage: e.target.value })}
            className="bg-[#2a2e39] border border-[#363c4e] rounded px-2 py-1 text-xs text-[#d1d4dc]"
            placeholder="Leverage"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => placeOrder({
              symbol: orderForm.symbol,
              side: 'BUY',
              quantity: parseFloat(orderForm.quantity),
              leverage: parseInt(orderForm.leverage),
            })}
            className="py-2 bg-[#26a69a] hover:bg-[#1e8c7a] text-white text-xs font-bold rounded"
          >
            BUY / LONG
          </button>
          <button
            onClick={() => placeOrder({
              symbol: orderForm.symbol,
              side: 'SELL',
              quantity: parseFloat(orderForm.quantity),
              leverage: parseInt(orderForm.leverage),
            })}
            className="py-2 bg-[#ef5350] hover:bg-[#c62828] text-white text-xs font-bold rounded"
          >
            SELL / SHORT
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// POSITIONS TAB
// ============================================

const PositionsTab: React.FC<{
  positions: any[];
  onClose: (symbol: string, side: 'LONG' | 'SHORT') => void;
}> = ({ positions, onClose }) => {
  if (positions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-[#787b86] text-sm">No open positions</div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {positions.map((pos) => (
        <div
          key={pos.id}
          className="bg-[#2a2e39] rounded p-3 border border-[#363c4e]"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                pos.side === 'LONG'
                  ? 'bg-[#26a69a]/20 text-[#26a69a]'
                  : 'bg-[#ef5350]/20 text-[#ef5350]'
              }`}>
                {pos.side}
              </span>
              <span className="text-sm font-bold text-[#d1d4dc]">{pos.symbol}</span>
              <span className="text-xs text-[#787b86]">{pos.leverage}x</span>
            </div>
            <button
              onClick={() => onClose(pos.symbol, pos.side)}
              className="px-2 py-1 text-xs bg-[#ef5350] hover:bg-[#c62828] text-white rounded"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs mb-2">
            <div>
              <span className="text-[#787b86]">Qty: </span>
              <span className="text-[#d1d4dc]">{pos.quantity.toFixed(4)}</span>
            </div>
            <div>
              <span className="text-[#787b86]">Entry: </span>
              <span className="text-[#d1d4dc]">${pos.entryPrice.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-[#787b86]">Mark: </span>
              <span className="text-[#d1d4dc]">${pos.currentPrice.toFixed(2)}</span>
            </div>
          </div>

          <div className={`text-sm font-bold text-right ${
            pos.unrealizedPnl >= 0 ? 'text-[#26a69a]' : 'text-[#ef5350]'
          }`}>
            {pos.unrealizedPnl >= 0 ? '+' : ''}${pos.unrealizedPnl.toFixed(2)} ({pos.unrealizedPnlPercent.toFixed(2)}%)
          </div>
        </div>
      ))}
    </div>
  );
};

// ============================================
// ORDERS TAB
// ============================================

const OrdersTab: React.FC<{ orders: any[] }> = ({ orders }) => {
  if (orders.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-[#787b86] text-sm">No orders</div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {orders.map((order) => (
        <div
          key={order.id}
          className="bg-[#2a2e39] rounded p-3 border border-[#363c4e]"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                order.side === 'BUY'
                  ? 'bg-[#26a69a]/20 text-[#26a69a]'
                  : 'bg-[#ef5350]/20 text-[#ef5350]'
              }`}>
                {order.side}
              </span>
              <span className="text-sm font-bold text-[#d1d4dc]">{order.symbol}</span>
              <span className={`text-xs px-2 py-0.5 rounded ${
                order.status === 'FILLED'
                  ? 'bg-[#26a69a]/20 text-[#26a69a]'
                  : 'bg-[#787b86]/20 text-[#787b86]'
              }`}>
                {order.status}
              </span>
            </div>
            <span className="text-xs text-[#787b86]">
              {new Date(order.createdAt).toLocaleTimeString()}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <span className="text-[#787b86]">Qty: </span>
              <span className="text-[#d1d4dc]">{order.quantity.toFixed(4)}</span>
            </div>
            <div>
              <span className="text-[#787b86]">Price: </span>
              <span className="text-[#d1d4dc]">${order.averagePrice.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-[#787b86]">Leverage: </span>
              <span className="text-[#d1d4dc]">{order.leverage}x</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ============================================
// STATS TAB
// ============================================

const StatsTab: React.FC<{ stats: any }> = ({ stats }) => {
  if (!stats) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatBox label="Initial Balance" value={`$${stats.initialBalance.toFixed(0)}`} />
        <StatBox label="Current Balance" value={`$${stats.currentBalance.toFixed(0)}`} />
        <StatBox
          label="Total PnL"
          value={`$${stats.totalPnl.toFixed(0)}`}
          color={stats.totalPnl >= 0 ? 'text-[#26a69a]' : 'text-[#ef5350]'}
        />
        <StatBox
          label="PnL %"
          value={`${stats.totalPnlPercent.toFixed(2)}%`}
          color={stats.totalPnlPercent >= 0 ? 'text-[#26a69a]' : 'text-[#ef5350]'}
        />
        <StatBox label="Total Trades" value={stats.totalTrades.toString()} />
        <StatBox
          label="Win Rate"
          value={`${stats.winRate.toFixed(1)}%`}
          color={stats.winRate >= 50 ? 'text-[#26a69a]' : 'text-[#ef5350]'}
        />
        <StatBox label="Winning" value={stats.winningTrades.toString()} color="text-[#26a69a]" />
        <StatBox label="Losing" value={stats.losingTrades.toString()} color="text-[#ef5350]" />
      </div>

      <div className="bg-[#2a2e39] rounded p-3">
        <div className="text-sm font-medium text-[#d1d4dc] mb-2">Performance Metrics</div>
        <div className="space-y-2 text-xs text-[#787b86]">
          <div className="flex justify-between">
            <span>Realized PnL:</span>
            <span className="text-[#d1d4dc]">${stats.realizedPnl.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Unrealized PnL:</span>
            <span className="text-[#d1d4dc]">${stats.unrealizedPnl.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Avg Leverage:</span>
            <span className="text-[#d1d4dc]">{stats.avgLeverage}x</span>
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

export default PaperTradingPanel;
