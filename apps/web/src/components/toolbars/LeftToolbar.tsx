"use client";

import React, { useState } from 'react';
import { 
  ArrowRightIcon, 
  MinusIcon, 
  PlusIcon, 
  XMarkIcon, 
  Square2StackIcon, 
  CircleStackIcon, 
  CurrencyDollarIcon, 
  DocumentTextIcon, 
  MapPinIcon, 
  ArrowLongRightIcon, 
  WrenchScrewdriverIcon, 
  TrashIcon 
} from '@heroicons/react/24/outline';

export default function LeftToolbar() {
  const [activeTool, setActiveTool] = useState<number | null>(null);
  
  const tools = [
    { icon: ArrowRightIcon, label: 'Trend' },
    { icon: MinusIcon, label: 'Horizontal' },
    { icon: PlusIcon, label: 'Vertical' },
    { icon: XMarkIcon, label: 'Cross' },
    { icon: Square2StackIcon, label: 'Rectangle' },
    { icon: CircleStackIcon, label: 'Circle' },
    { icon: CurrencyDollarIcon, label: 'Fibonacci' },
    { icon: DocumentTextIcon, label: 'Text' },
    { icon: MapPinIcon, label: 'Pin' },
    { icon: ArrowLongRightIcon, label: 'Arrow' },
    { icon: WrenchScrewdriverIcon, label: 'Tools' },
  ];

  return (
    <div className="w-[50px] flex flex-col items-center py-2 border-r border-[#242832] bg-[#1e222d]">
      <div className="flex flex-col gap-1">
        {tools.map((tool, i) => (
          <button
            key={i}
            onClick={() => setActiveTool(activeTool === i ? null : i)}
            className={`w-10 h-10 flex items-center justify-center rounded ${
              activeTool === i 
                ? 'bg-[#2962ff] text-white' 
                : 'text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39]'
            }`}
            title={tool.label}
          >
            <tool.icon className="w-5 h-5"/>
          </button>
        ))}
      </div>
      <div className="mt-auto flex flex-col gap-1">
        <button className="w-10 h-10 flex items-center justify-center text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39] rounded" title="Clear">
          <TrashIcon className="w-5 h-5"/>
        </button>
      </div>
    </div>
  );
}
