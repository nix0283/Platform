'use client';

// ============================================
// CHART COMPONENT — С интеграцией торговли
// ============================================

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ExtendedChart, IndicatorFactory } from '@trading-platform/charting';
import { Candle, ChartConfig, Indicator } from '@trading-platform/core';
import { ChartTradingOverlay, QuickOrderPanel, PositionManager, TradingOrder } from '@/components/trading';
import { useAppStore } from '@/store';

interface ChartProps {
  config: ChartConfig;
  onCandleUpdate?: (candle: Candle) => void;
  onRangeChange?: (from: number, to: number) => void;
  className?: string;
  enableTrading?: boolean;
}

export const Chart: React.FC<ChartProps> = ({
  config,
  onCandleUpdate,
  onRangeChange,
  className = '',
  enableTrading = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ExtendedChart | null>(null);
  const { chartConfig, positions, addOrder } = useAppStore();
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tradingEnabled, setTradingEnabled] = useState(enableTrading);
  const [currentPrice, setCurrentPrice] = useState<number>(0);

  // Инициализация графика
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = new ExtendedChart(containerRef.current, {
      drawingsEnabled: true,
      indicatorsEnabled: true,
      tradingEnabled,
      watermark: {
        text: `${config.exchange}:${config.symbol}`,
        color: 'rgba(255, 255, 255, 0.1)',
        fontSize: 48,
      },
    });

    chart.setTheme(config.theme);
    chartRef.current = chart;

    // Подписка на crosshair для получения цены
    chart.onCrosshairMove((param) => {
      if (param && param.point) {
        // Получение цены из точки графика
        // В продакшене использовать chart.priceToCoordinate()
      }
    });

    // Подписка на клик для торговли
    if (tradingEnabled) {
      chart.onClick((param) => {
        // Обработка клика будет в ChartTradingOverlay
      });
    }

    return () => {
      chart.destroy();
      chartRef.current = null;
    };
  }, [tradingEnabled]);

  // Загрузка исторических данных
  useEffect(() => {
    const loadCandles = async () => {
      if (!chartRef.current) return;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/candles?exchange=${config.exchange}&symbol=${config.symbol}&interval=${config.interval}&limit=1000`
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data: Candle[] = await response.json();
        setCandles(data);
        chartRef.current.setCandles(data);
        
        if (data.length > 0) {
          setCurrentPrice(data[data.length - 1].close);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadCandles();
  }, [config.exchange, config.symbol, config.interval]);

  // Обновление индикаторов
  useEffect(() => {
    if (!chartRef.current || candles.length === 0) return;

    chartRef.current.clearIndicators();

    config.indicators.forEach((indicator) => {
      let data;

      switch (indicator.name.toLowerCase()) {
        case 'sma':
          data = IndicatorFactory.calculateSMA(candles, indicator.params.period as number || 20);
          break;
        case 'ema':
          data = IndicatorFactory.calculateEMA(candles, indicator.params.period as number || 20);
          break;
        case 'rsi':
          data = IndicatorFactory.calculateRSI(candles, indicator.params.period as number || 14);
          break;
        default:
          return;
      }

      if (data) {
        chartRef.current?.addIndicator(indicator, data);
      }
    });
  }, [config.indicators, candles]);

  // Применение темы
  useEffect(() => {
    chartRef.current?.setTheme(config.theme);
  }, [config.theme]);

  // Обработка real-time обновлений
  const handleCandleUpdate = useCallback((candle: Candle) => {
    chartRef.current?.updateCandle(candle);
    setCurrentPrice(candle.close);
    onCandleUpdate?.(candle);
  }, [onCandleUpdate]);

  // Обработка размещения ордера
  const handleOrderPlaced = useCallback((order: TradingOrder) => {
    addOrder({
      id: order.id,
      symbol: order.symbol,
      exchange: order.exchange as any,
      side: order.side,
      type: order.type,
      quantity: order.quantity,
      price: order.entryPrice,
      status: order.status,
      filledQty: 0,
      avgPrice: order.entryPrice,
      createdAt: order.timestamp,
      updatedAt: order.timestamp,
    });
  }, [addOrder]);

  // Ресайз при изменении размера окна
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        chartRef.current.resize(width, height);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* Chart Container */}
      <div
        ref={containerRef}
        className="w-full h-full min-h-[400px]"
      />
      
      {/* Trading Overlay */}
      {tradingEnabled && (
        <ChartTradingOverlay
          chartContainerRef={containerRef}
          onOrderPlaced={handleOrderPlaced}
          enabled={tradingEnabled}
        />
      )}

      {/* Current Price Display */}
      <div className="absolute top-4 left-4 z-40 bg-[#1e222d]/90 border border-[#242832] rounded-lg px-4 py-2">
        <div className="text-xs text-[#787b86]">Current Price</div>
        <div className="text-2xl font-bold text-[#d1d4dc]">
          ${currentPrice.toFixed(2)}
        </div>
      </div>

      {/* Trading Toggle */}
      <div className="absolute top-4 right-4 z-40">
        <button
          onClick={() => setTradingEnabled(!tradingEnabled)}
          className={`px-4 py-2 rounded-lg font-medium text-sm shadow-lg ${
            tradingEnabled
              ? 'bg-[#2962ff] text-white'
              : 'bg-[#1e222d] text-[#787b86] border border-[#242832]'
          }`}
        >
          📈 {tradingEnabled ? 'Trading ON' : 'Trading OFF'}
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-white">Loading...</div>
        </div>
      )}
      
      {/* Error State */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-red-500">Error: {error}</div>
        </div>
      )}
    </div>
  );
};

export default Chart;
