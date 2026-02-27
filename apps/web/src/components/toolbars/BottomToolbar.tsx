"use client";

import React from 'react';
import { BookOpenIcon, ChartPieIcon, ClipboardDocumentIcon, WalletIcon, DocumentTextIcon, CpuChipIcon } from '@heroicons/react/24/outline';

export default function BottomToolbar() {
  return (
    <div className="h-[36px] flex items-center px-2 border-t border-[#242832] bg-[#1e222d]">
      <div className="flex items-center gap-1">
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#2962ff] bg-[#2962ff]/10 rounded">
          <BookOpenIcon className="w-4 h-4"/>
          <span>Order Book</span>
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39] rounded">
          <ChartPieIcon className="w-4 h-4"/>
          <span>Positions</span>
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39] rounded">
          <ClipboardDocumentIcon className="w-4 h-4"/>
          <span>Orders</span>
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39] rounded">
          <WalletIcon className="w-4 h-4"/>
          <span>Account</span>
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39] rounded">
          <DocumentTextIcon className="w-4 h-4"/>
          <span>History</span>
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39] rounded">
          <CpuChipIcon className="w-4 h-4"/>
          <span>ML Signals</span>
        </button>
      </div>
      <div className="ml-auto flex items-center gap-4 text-xs text-[#787b86]">
        <span>O: <span className="text-[#d1d4dc]">67,937.27</span></span>
        <span>H: <span className="text-[#26a69a]">68,124.50</span></span>
        <span>L: <span className="text-[#ef5350]">67,801.33</span></span>
        <span>C: <span className="text-[#d1d4dc]">67,937.27</span></span>
        <span className="border-l border-[#242832] pl-4">Vol: <span className="text-[#d1d4dc]">25,432 BTC</span></span>
        <span>1:1</span>
        <span>Log %</span>
      </div>
    </div>
  );
}
