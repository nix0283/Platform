"use client";

import React, { useState } from 'react';
import Chart from '@/components/chart/Chart';
import TopToolbar from '@/components/toolbars/TopToolbar';
import LeftToolbar from '@/components/toolbars/LeftToolbar';
import BottomToolbar from '@/components/toolbars/BottomToolbar';
import BottomPanel from '@/components/oscillators/BottomPanel';
import { useChartStore } from '@/store/chartStore';
import { ChartBarIcon, DocumentTextIcon, NewspaperIcon, CreditCardIcon } from '@heroicons/react/24/outline';

function SimpleJournal() {
  return (
    <div className="p-4">
      <div className="text-[#d1d4dc] font-bold mb-4 flex items-center gap-2"><ChartBarIcon className="w-5 h-5"/> Trading Journal</div>
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-[#242832] p-3 rounded"><div className="text-[#787b86] text-xs">Trades</div><div className="text-[#d1d4dc] text-xl font-bold">0</div></div>
        <div className="bg-[#242832] p-3 rounded"><div className="text-[#787b86] text-xs">Win Rate</div><div className="text-[#d1d4dc] text-xl font-bold">0%</div></div>
        <div className="bg-[#242832] p-3 rounded"><div className="text-[#787b86] text-xs">PnL</div><div className="text-[#26a69a] text-xl font-bold">$0</div></div>
        <div className="bg-[#242832] p-3 rounded"><div className="text-[#787b86] text-xs">Profit Factor</div><div className="text-[#d1d4dc] text-xl font-bold">0</div></div>
      </div>
    </div>
  );
}

function SimplePaperTrading() {
  return (
    <div className="p-4">
      <div className="text-[#d1d4dc] font-bold mb-4 flex items-center gap-2"><DocumentTextIcon className="w-5 h-5"/> Paper Trading</div>
      <div className="bg-[#242832] p-3 rounded mb-4"><div className="text-[#787b86] text-xs mb-1">Balance</div><div className="text-[#26a69a] text-2xl font-bold">$10,000.00</div></div>
      <button className="w-full py-3 bg-[#26a69a] text-white rounded font-bold hover:bg-[#1e8c7d]">Buy / Long</button>
      <button className="w-full py-3 bg-[#ef5350] text-white rounded font-bold hover:bg-[#d64541] mt-2">Sell / Short</button>
    </div>
  );
}

function SimpleNews() {
  return (
    <div className="p-4">
      <div className="text-[#d1d4dc] font-bold mb-4 flex items-center gap-2"><NewspaperIcon className="w-5 h-5"/> News</div>
      <div className="text-[#787b86] text-sm">No news available</div>
    </div>
  );
}

export default function HomePage() {
  const [rightPanel, setRightPanel] = useState('journal');
  const [tradingMode, setTradingMode] = useState('PAPER');
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  
  const chartData = useChartStore((state) => state.chartData);
  const mainChart = useChartStore((state) => state.mainChart);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#131722]">
      <header className="h-[50px] flex items-center px-4 border-b border-[#242832] bg-[#1e222d]">
        <div className="flex items-center gap-4 mr-6">
          <span className="text-xl"><ChartBarIcon className="w-6 h-6"/></span>
          <span className="text-lg font-bold text-[#d1d4dc]">Trading Platform</span>
          <div className="h-6 w-px bg-[#242832]" />
          <div className="flex gap-2">
            <button onClick={() => setTradingMode('PAPER')} className={`px-3 py-1 text-xs rounded flex items-center gap-1 ${tradingMode === 'PAPER' ? 'bg-[#26a69a] text-white' : 'bg-[#242832] text-[#787b86]'}`}><DocumentTextIcon className="w-4 h-4"/> Paper</button>
            <button onClick={() => setTradingMode('REAL')} className={`px-3 py-1 text-xs rounded flex items-center gap-1 ${tradingMode === 'REAL' ? 'bg-[#2962ff] text-white' : 'bg-[#242832] text-[#787b86]'}`}><CreditCardIcon className="w-4 h-4"/> Real</button>
          </div>
        </div>
      </header>
      
      <TopToolbar />
      
      <div className="flex-1 flex overflow-hidden">
        <LeftToolbar />
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 relative">
            <Chart />
          </div>
          <BottomPanel chartData={chartData} mainChart={mainChart} />
          <BottomToolbar />
        </main>
        {rightPanelOpen && (
          <aside className="w-[400px] border-l border-[#242832] bg-[#1e222d] flex flex-col">
            <div className="flex border-b border-[#242832]">
              <button onClick={() => setRightPanel('journal')} className={`flex-1 py-2 text-xs flex items-center justify-center gap-1 ${rightPanel === 'journal' ? 'text-[#2962ff] border-b-2 border-[#2962ff]' : 'text-[#787b86] hover:text-[#d1d4dc]'}`}><ChartBarIcon className="w-4 h-4"/> Journal</button>
              <button onClick={() => setRightPanel('paper')} className={`flex-1 py-2 text-xs flex items-center justify-center gap-1 ${rightPanel === 'paper' ? 'text-[#2962ff] border-b-2 border-[#2962ff]' : 'text-[#787b86] hover:text-[#d1d4dc]'}`}><DocumentTextIcon className="w-4 h-4"/> Paper</button>
              <button onClick={() => setRightPanel('news')} className={`flex-1 py-2 text-xs flex items-center justify-center gap-1 ${rightPanel === 'news' ? 'text-[#2962ff] border-b-2 border-[#2962ff]' : 'text-[#787b86] hover:text-[#d1d4dc]'}`}><NewspaperIcon className="w-4 h-4"/> News</button>
            </div>
            <div className="flex-1 overflow-hidden">
              {rightPanel === 'journal' && <SimpleJournal />}
              {rightPanel === 'paper' && <SimplePaperTrading />}
              {rightPanel === 'news' && <SimpleNews />}
            </div>
          </aside>
        )}
      </div>
      
      <footer className="h-[30px] flex items-center px-4 border-t border-[#242832] bg-[#1e222d] text-xs text-[#787b86]">
        <span className="flex items-center gap-1"><span className="w-2 h-2 bg-[#26a69a] rounded-full" /> Connected</span>
        <span className={`ml-4 px-2 py-0.5 rounded text-[10px] ${tradingMode === 'PAPER' ? 'bg-[#26a69a]/20 text-[#26a69a]' : 'bg-[#2962ff]/20 text-[#2962ff]'}`}>PAPER</span>
        <span className="ml-4">Trades: 0</span>
        <span>PnL: $0</span>
      </footer>
    </div>
  );
}
