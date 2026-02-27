"use client";

import React from 'react';
import { Bars3Icon, ChartBarIcon, PencilSquareIcon, BellIcon, ClipboardDocumentListIcon, CalendarIcon, ArrowTrendingUpIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';

export default function TopToolbar() {
  return (
    <div className="h-[40px] flex items-center px-2 border-b border-[#242832] bg-[#1e222d]">
      <div className="flex items-center gap-1">
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39] rounded">
          <Bars3Icon className="w-4 h-4"/>
          <span className="hidden lg:inline">Menu</span>
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39] rounded">
          <ChartBarIcon className="w-4 h-4"/>
          <span className="hidden lg:inline">Indicators</span>
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39] rounded">
          <PencilSquareIcon className="w-4 h-4"/>
          <span className="hidden lg:inline">Draw</span>
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39] rounded">
          <BellIcon className="w-4 h-4"/>
          <span className="hidden lg:inline">Alert</span>
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39] rounded">
          <ClipboardDocumentListIcon className="w-4 h-4"/>
          <span className="hidden lg:inline">Screener</span>
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39] rounded">
          <CalendarIcon className="w-4 h-4"/>
          <span className="hidden lg:inline">Calendar</span>
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39] rounded">
          <ArrowTrendingUpIcon className="w-4 h-4"/>
          <span className="hidden lg:inline">Compare</span>
        </button>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39] rounded">
          <Cog6ToothIcon className="w-4 h-4"/>
          Settings
        </button>
        <button className="px-4 py-1.5 text-xs font-medium text-white bg-[#2962ff] rounded hover:bg-[#1e54e6]">
          Trade
        </button>
      </div>
    </div>
  );
}
