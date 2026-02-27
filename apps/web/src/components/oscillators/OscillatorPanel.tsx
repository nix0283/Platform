"use client";

import React, { useEffect, useRef } from 'react';
import { createChart, ColorType } from 'lightweight-charts';

export default function OscillatorPanel({ activeOscillator = 'RSI', chartData = [], mainChart }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);

  // ??????: ???? chartData ?? ?????? - ???????
  if (!chartData || !Array.isArray(chartData) || chartData.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-[#787b86] text-sm">
        Waiting for chart data...
      </div>
    );
  }

  const calculateRSI = (prices, period = 14) => {
    const rsi = [];
    let gains = 0, losses = 0;
    for (let i = 1; i < prices.length; i++) {
      const change = prices[i].close - prices[i - 1].close;
      if (change > 0) gains += change;
      else losses -= change;
      if (i >= period) {
        const avgGain = gains / period;
        const avgLoss = losses / period;
        const rs = avgGain / (avgLoss || 1);
        rsi.push({ time: prices[i].time, value: 100 - (100 / (1 + rs)) });
        gains = avgGain * (period - 1);
        losses = avgLoss * (period - 1);
      }
    }
    return rsi;
  };

  const calculateMACD = (prices, fast = 12, slow = 26) => {
    const macd = [];
    for (let i = slow; i < prices.length; i++) {
      const fastEMA = prices.slice(i - fast, i).reduce((a, b) => a + b.close, 0) / fast;
      const slowEMA = prices.slice(i - slow, i).reduce((a, b) => a + b.close, 0) / slow;
      macd.push({ time: prices[i].time, value: (fastEMA - slowEMA) * 100 });
    }
    return macd;
  };

  useEffect(() => {
    if (!containerRef.current || !chartData || chartData.length === 0) return;

    let data = [];
    if (activeOscillator === 'RSI') {
      const closes = chartData.map(c => ({ time: c.time, close: c.close }));
      data = calculateRSI(closes);
    } else if (activeOscillator === 'MACD') {
      data = calculateMACD(chartData);
    } else if (activeOscillator === 'Volume') {
      data = chartData.map(c => ({ time: c.time, value: c.volume / 1000 }));
    }

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      layout: { background: { type: ColorType.Solid, color: '#131722' }, textColor: '#d1d4dc' },
      grid: { vertLines: { color: '#1f2943' }, horzLines: { color: '#1f2943' } },
      crosshair: { mode: 1 },
      timeScale: { borderColor: '#242832', timeVisible: true, secondsVisible: false },
      rightPriceScale: { borderColor: '#242832' },
    });

    chartRef.current = chart;

    let series;
    if (activeOscillator === 'RSI') {
      series = chart.addLineSeries({ color: '#2962ff', lineWidth: 2, priceLineVisible: false });
      chart.addLineSeries({ color: '#ef5350', lineWidth: 1, lineStyle: 2 }).setData(data.map(d => ({ time: d.time, value: 70 })));
      chart.addLineSeries({ color: '#26a69a', lineWidth: 1, lineStyle: 2 }).setData(data.map(d => ({ time: d.time, value: 30 })));
    } else if (activeOscillator === 'MACD') {
      series = chart.addLineSeries({ color: '#2962ff', lineWidth: 2, priceLineVisible: false });
    } else {
      series = chart.addHistogramSeries({ color: '#26a69a' });
    }
    if (series && data.length > 0) series.setData(data);

    // ?????????????
    if (mainChart && chartRef.current) {
      console.log('?? Setting up chart sync...');
      
      const syncToOscillator = (range) => {
        if (range && chartRef.current) {
          chartRef.current.timeScale().setVisibleLogicalRange(range);
        }
      };
      
      const syncToMain = (range) => {
        if (range && mainChart) {
          mainChart.timeScale().setVisibleLogicalRange(range);
        }
      };

      mainChart.timeScale().subscribeVisibleLogicalRangeChange(syncToOscillator);
      chartRef.current.timeScale().subscribeVisibleLogicalRangeChange(syncToMain);

      console.log('? Sync enabled!');

      return () => {
        mainChart.timeScale().unsubscribeVisibleLogicalRangeChange(syncToOscillator);
        if(chartRef.current) chartRef.current.timeScale().unsubscribeVisibleLogicalRangeChange(syncToMain);
        if(chartRef.current) chartRef.current.remove();
      };
    }

    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth, height: containerRef.current.clientHeight });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) chartRef.current.remove();
    };
  }, [activeOscillator, chartData, mainChart]);

  return (
    <div className="w-full h-full relative">
      <div ref={containerRef} className="w-full h-full" />
      <div className="absolute top-2 left-2 text-xs text-[#787b86] bg-[#1e222d]/90 px-2 py-1 rounded">{activeOscillator}</div>
    </div>
  );
}
