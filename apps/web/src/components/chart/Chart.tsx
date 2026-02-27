"use client";

import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType } from 'lightweight-charts';
import { useChartStore } from '@/store/chartStore';

const TF = [{l:'1m',v:'1m'},{l:'3m',v:'3m'},{l:'5m',v:'5m'},{l:'15m',v:'15m'},{l:'30m',v:'30m'},{l:'1h',v:'1h'},{l:'2h',v:'2h'},{l:'4h',v:'4h'},{l:'6h',v:'6h'},{l:'12h',v:'12h'},{l:'1D',v:'1d'},{l:'1W',v:'1w'}];

export default function Chart() {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const pollIntervalRef = useRef(null);
  
  const setChartData = useChartStore((state) => state.setChartData);
  const setMainChart = useChartStore((state) => state.setMainChart);
  
  const [price,setPrice] = useState(0);
  const [prevPrice,setPrevPrice] = useState(0);
  const [status,setStatus] = useState('loading');
  const [tf,setTf] = useState('1h');
  const [updates,setUpdates] = useState(0);
  const [lastUpdate,setLastUpdate] = useState('');
  const [mounted,setMounted] = useState(false);

  const loadCandles = (t)=>{
    if(!containerRef.current||!seriesRef.current)return;
    setStatus('loading');
    fetch('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval='+t+'&limit=500')
      .then(r=>r.json())
      .then(d=>{
        const c=d.map(k=>({time:k[0]/1000,open:+k[1],high:+k[2],low:+k[3],close:+k[4],volume:+k[5]}));
        seriesRef.current.setData(c);
        setPrice(c[c.length-1].close);
        setPrevPrice(c[c.length-1].close);
        
        setTimeout(() => {
          setChartData(c);
          if(chartRef.current) setMainChart(chartRef.current);
        }, 100);
        
        setStatus('connected');
        console.log('✅ Loaded:',c.length,'candles');
        startPolling(t);
      })
      .catch(e=>{console.error('Error:',e);setStatus('error');});
  };

  const startPolling = (timeframe)=>{
    if(pollIntervalRef.current)clearInterval(pollIntervalRef.current);
    pollIntervalRef.current = setInterval(()=>{
      fetch('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval='+timeframe+'&limit=1')
        .then(r=>r.json())
        .then(d=>{
          if(d && d[0]){
            const candle={time:d[0][0]/1000,open:+d[0][1],high:+d[0][2],low:+d[0][3],close:+d[0][4],volume:+d[0][5]};
            if(seriesRef.current)seriesRef.current.update(candle);
            setPrevPrice(price);
            setPrice(candle.close);
            setChartData(prev => {
              const updated = [...prev];
              const lastIdx = updated.length - 1;
              if(updated[lastIdx] && updated[lastIdx].time === candle.time) {
                updated[lastIdx] = candle;
              } else { updated.push(candle); }
              return updated;
            });
            setUpdates(u=>u+1);
            setLastUpdate(new Date().toLocaleTimeString());
          }
        })
        .catch(e=>console.error('Poll error:',e));
    },1000);
  };

  useEffect(()=>{
    setMounted(true);
    if(!containerRef.current)return;
    const chart=createChart(containerRef.current,{
      width:containerRef.current.clientWidth,height:containerRef.current.clientHeight,
      layout:{background:{type:ColorType.Solid,color:'#131722'},textColor:'#d1d4dc'},
      grid:{vertLines:{color:'#1f2943'},horzLines:{color:'#1f2943'}},
      crosshair:{mode:1},timeScale:{borderColor:'#242832',timeVisible:true,secondsVisible:false},
      rightPriceScale:{borderColor:'#242832'},
    });
    chartRef.current=chart;
    const series=chart.addCandlestickSeries({upColor:'#26a69a',downColor:'#ef5350',borderDownColor:'#ef5350',borderUpColor:'#26a69a',wickDownColor:'#ef5350',wickUpColor:'#26a69a'});
    seriesRef.current=series;
    loadCandles(tf);
    
    setTimeout(() => {
      if(chartRef.current) setMainChart(chartRef.current);
    }, 100);
    
    const onResize=()=>{if(containerRef.current&&chartRef.current){chartRef.current.applyOptions({width:containerRef.current.clientWidth,height:containerRef.current.clientHeight});}};
    window.addEventListener('resize',onResize);
    return ()=>{window.removeEventListener('resize',onResize);if(pollIntervalRef.current){clearInterval(pollIntervalRef.current);}if(chartRef.current)chartRef.current.remove();};
  },[]);

  const priceChange = price - prevPrice;
  const priceColor = priceChange >= 0 ? '#26a69a' : '#ef5350';

  return (
    <div className="relative w-full h-full">
      <div className="absolute top-4 left-4 z-20 flex flex-wrap gap-1 bg-[#1e222d]/95 px-2 py-1.5 rounded-lg">
        {TF.map(x=>(<button key={x.v} onClick={()=>{setTf(x.v);loadCandles(x.v);}} className={tf===x.v?'bg-[#2962ff] text-white px-2 py-1 text-xs rounded':'text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39] px-2 py-1 text-xs rounded'}>{x.l}</button>))}
      </div>
      <div className="absolute top-4 right-[80px] z-20 bg-[#1e222d]/95 px-3 py-2 rounded-lg min-w-[180px]">
        <div className="flex items-center gap-2 mb-1">
          <div className={status==='connected'?'w-2 h-2 rounded-full bg-[#26a69a] animate-pulse':status==='loading'?'w-2 h-2 rounded-full bg-[#ff9800]':'w-2 h-2 rounded-full bg-[#ef5350]'} />
          <span className="text-xs text-[#787b86]">{status==='connected'?'LIVE':'Loading...'}</span>
        </div>
        <div className="text-[10px] text-[#787b86]">BTC/USDT</div>
        <div className="text-lg font-bold" style={{color:priceColor}}>${price>0?price.toLocaleString('en-US',{minimumFractionDigits:2}):'---'}</div>
        <div className="text-xs" style={{color:priceColor}}>{priceChange>=0?'+':''}{priceChange.toFixed(2)}</div>
        {mounted && <div className="text-[9px] text-[#787b86] mt-1">Updates: {updates}</div>}
      </div>
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
