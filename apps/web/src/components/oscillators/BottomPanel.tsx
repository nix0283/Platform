"use client";

import React, { useState } from 'react';
import OscillatorPanel from './OscillatorPanel';
import { ChartBarIcon, ChartPieIcon, CurrencyDollarIcon, XMarkIcon } from '@heroicons/react/24/outline';

export default function BottomPanel({ chartData = [], mainChartRef }) {
  const [showPanel, setShowPanel] = useState(true);
  const [activeOscillator, setActiveOscillator] = useState('RSI');
  const [panelHeight, setPanelHeight] = useState(200);

  const oscillators = [
    { id: 'RSI', name: 'RSI', icon: ChartBarIcon },
    { id: 'MACD', name: 'MACD', icon: ChartPieIcon },
    { id: 'Volume', name: 'Volume', icon: CurrencyDollarIcon },
  ];

  if (!showPanel) {
    return (
      <button 
        onClick={() => setShowPanel(true)}
        className="h-[30px] flex items-center justify-center px-4 border-t border-[#242832] bg-[#1e222d] text-[#787b86] hover:text-[#d1d4dc] text-xs"
      >
        Show Oscillators Panel
      </button>
    );
  }

  return (
    <div 
      className="border-t border-[#242832] bg-[#1e222d]"
      style={{ height: panelHeight }}
    >
      <div className="h-[36px] flex items-center px-2 border-b border-[#242832] bg-[#131722]">
        <div className="flex items-center gap-1">
          {oscillators.map((osc) => (
            <button
              key={osc.id}
              onClick={() => setActiveOscillator(osc.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded ${
                activeOscillator === osc.id
                  ? 'text-[#2962ff] bg-[#2962ff]/10'
                  : 'text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39]'
              }`}
            >
              <osc.icon className="w-4 h-4"/>
              <span>{osc.name}</span>
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button 
            onClick={() => setPanelHeight(h => h === 200 ? 300 : 200)}
            className="px-2 py-1 text-xs text-[#787b86] hover:text-[#d1d4dc]"
          >
            Resize
          </button>
          <button 
            onClick={() => setShowPanel(false)}
            className="p-1 text-[#787b86] hover:text-[#ef5350]"
          >
            <XMarkIcon className="w-4 h-4"/>
          </button>
        </div>
      </div>
      
      <div className="w-full" style={{ height: panelHeight - 36 }}>
        <OscillatorPanel activeOscillator={activeOscillator} chartData={chartData} mainChartRef={mainChartRef} />
      </div>
    </div>
  );
}
