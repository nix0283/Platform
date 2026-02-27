'use client';

// ============================================
// RIGHT TOOLBAR — Панель ордеров и позиций
// ============================================

import React, { useState } from 'react';
import { useAppStore } from '@/store';
import { OrderSide, OrderType } from '@trading-platform/core';

interface RightToolbarProps {
  onOrderSubmit?: (order: {
    side: OrderSide;
    type: OrderType;
    quantity: number;
    price?: number;
  }) => void;
}

export const RightToolbar: React.FC<RightToolbarProps> = ({ onOrderSubmit }) => {
  const { chartConfig, positions, orders } = useAppStore();
  const [activeTab, setActiveTab] = useState<'order' | 'positions' | 'orders' | 'account'>('order');
  const [orderType, setOrderType] = useState<OrderType>('MARKET');
  const [orderSide, setOrderSide] = useState<OrderSide>('BUY');
  const [quantity, setQuantity] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [leverage, setLeverage] = useState<number>(10);

  const handleSubmit = () => {
    onOrderSubmit?.({
      side: orderSide,
      type: orderType,
      quantity: parseFloat(quantity) || 0,
      price: price ? parseFloat(price) : undefined,
    });
  };

  const tabs = [
    { id: 'order', label: 'Order', icon: '📝' },
    { id: 'positions', label: 'Positions', icon: '📊', badge: positions.length },
    { id: 'orders', label: 'Orders', icon: '📋', badge: orders.length },
    { id: 'account', label: 'Account', icon: '💰' },
  ];

  return (
    <div className="w-72 bg-[#1e222d] border-l border-[#242832] flex flex-col">
      {/* Tabs */}
      <div className="flex border-b border-[#242832]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-3 text-xs font-medium relative ${
              activeTab === tab.id
                ? 'text-[#2962ff] border-b-2 border-[#2962ff]'
                : 'text-[#787b86] hover:text-[#d1d4dc]'
            }`}
          >
            <span>{tab.icon}</span>
            <span className="ml-1">{tab.label}</span>
            {tab.badge ? (
              <span className="absolute -top-1 -right-1 bg-[#2962ff] text-white text-[10px] px-1.5 rounded-full">
                {tab.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'order' && (
          <div className="space-y-4">
            {/* Symbol Info */}
            <div className="text-center pb-4 border-b border-[#242832]">
              <div className="text-lg font-bold">{chartConfig.symbol}</div>
              <div className="text-sm text-[#787b86]">{chartConfig.exchange.toUpperCase()}</div>
            </div>

            {/* Order Type */}
            <div>
              <label className="text-xs text-[#787b86] mb-2 block">Order Type</label>
              <div className="grid grid-cols-3 gap-1">
                {(['MARKET', 'LIMIT', 'STOP'] as OrderType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setOrderType(type)}
                    className={`py-2 text-xs rounded ${
                      orderType === type
                        ? 'bg-[#2962ff] text-white'
                        : 'bg-[#2a2e39] hover:bg-[#363c4e]'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Side */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setOrderSide('BUY')}
                className={`py-3 rounded font-medium ${
                  orderSide === 'BUY'
                    ? 'bg-[#26a69a] text-white'
                    : 'bg-[#2a2e39] hover:bg-[#363c4e]'
                }`}
              >
                Buy / Long
              </button>
              <button
                onClick={() => setOrderSide('SELL')}
                className={`py-3 rounded font-medium ${
                  orderSide === 'SELL'
                    ? 'bg-[#ef5350] text-white'
                    : 'bg-[#2a2e39] hover:bg-[#363c4e]'
                }`}
              >
                Sell / Short
              </button>
            </div>

            {/* Quantity */}
            <div>
              <label className="text-xs text-[#787b86] mb-2 block">Quantity</label>
              <div className="relative">
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full bg-[#2a2e39] border border-[#363c4e] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#2962ff]"
                  placeholder="0.00"
                  step="0.01"
                />
                <span className="absolute right-3 top-2 text-xs text-[#787b86]">
                  {chartConfig.symbol.split('/')[0]}
                </span>
              </div>
              {/* Quick amounts */}
              <div className="grid grid-cols-4 gap-1 mt-2">
                {['25%', '50%', '75%', '100%'].map((pct) => (
                  <button
                    key={pct}
                    className="py-1 text-xs bg-[#2a2e39] hover:bg-[#363c4e] rounded"
                  >
                    {pct}
                  </button>
                ))}
              </div>
            </div>

            {/* Price (for limit orders) */}
            {orderType === 'LIMIT' && (
              <div>
                <label className="text-xs text-[#787b86] mb-2 block">Price</label>
                <div className="relative">
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full bg-[#2a2e39] border border-[#363c4e] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#2962ff]"
                    placeholder="0.00"
                    step="0.01"
                  />
                  <span className="absolute right-3 top-2 text-xs text-[#787b86]">
                    {chartConfig.symbol.split('/')[1]}
                  </span>
                </div>
              </div>
            )}

            {/* Leverage */}
            <div>
              <label className="text-xs text-[#787b86] mb-2 block">
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

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              className={`w-full py-3 rounded font-bold ${
                orderSide === 'BUY'
                  ? 'bg-[#26a69a] hover:bg-[#1e8c7a]'
                  : 'bg-[#ef5350] hover:bg-[#c62828]'
              } text-white`}
            >
              {orderSide === 'BUY' ? 'BUY' : 'SELL'} {chartConfig.symbol.split('/')[0]}
            </button>

            {/* Order info */}
            <div className="text-xs text-[#787b86] space-y-1 pt-4 border-t border-[#242832]">
              <div className="flex justify-between">
                <span>Cost</span>
                <span>≈ {(parseFloat(quantity) || 0) * (parseFloat(price) || 0)} {chartConfig.symbol.split('/')[1]}</span>
              </div>
              <div className="flex justify-between">
                <span>Max Loss</span>
                <span className="text-[#ef5350]">≈ {(parseFloat(quantity) || 0) * (parseFloat(price) || 0)} {chartConfig.symbol.split('/')[1]}</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'positions' && (
          <div className="space-y-2">
            {positions.length === 0 ? (
              <div className="text-center text-[#787b86] py-8">
                No active positions
              </div>
            ) : (
              positions.map((pos, i) => (
                <div key={i} className="bg-[#2a2e39] rounded p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">{pos.symbol}</span>
                    <span className={`text-sm ${pos.unrealizedPnl >= 0 ? 'text-[#26a69a]' : 'text-[#ef5350]'}`}>
                      {pos.unrealizedPnl >= 0 ? '+' : ''}{pos.unrealizedPnl.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-xs text-[#787b86] space-y-1">
                    <div className="flex justify-between">
                      <span>Size</span>
                      <span>{pos.quantity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Entry</span>
                      <span>{pos.entryPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Mark</span>
                      <span>{pos.markPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Liq</span>
                      <span className="text-[#ef5350]">{pos.liquidationPrice?.toFixed(2) || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="space-y-2">
            {orders.length === 0 ? (
              <div className="text-center text-[#787b86] py-8">
                No active orders
              </div>
            ) : (
              orders.map((order, i) => (
                <div key={i} className="bg-[#2a2e39] rounded p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">{order.symbol}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      order.side === 'BUY' ? 'bg-[#26a69a]/20 text-[#26a69a]' : 'bg-[#ef5350]/20 text-[#ef5350]'
                    }`}>
                      {order.side}
                    </span>
                  </div>
                  <div className="text-xs text-[#787b86] space-y-1">
                    <div className="flex justify-between">
                      <span>Type</span>
                      <span>{order.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Qty</span>
                      <span>{order.quantity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Price</span>
                      <span>{order.price?.toFixed(2) || 'Market'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Filled</span>
                      <span>{order.filledQty} / {order.quantity}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'account' && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <div className="text-2xl font-bold">$0.00</div>
              <div className="text-xs text-[#787b86]">Total Balance</div>
            </div>
            
            <div className="bg-[#2a2e39] rounded p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Equity</span>
                <span>$0.00</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Margin</span>
                <span>$0.00</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Free</span>
                <span>$0.00</span>
              </div>
            </div>

            <div className="bg-[#2a2e39] rounded p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Unrealized P&L</span>
                <span>$0.00</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Realized P&L</span>
                <span>$0.00</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RightToolbar;
