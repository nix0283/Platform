'use client';

// ============================================
// TRADING LAYOUT
// Основной layout торговой платформы
// ============================================

import React, { useState } from 'react';
import { UnifiedJournalPanel } from '@/components/journal';
import { MLAssistantPanel } from '@/components/ml/MLAssistantPanel';
import { ChartWithToolbars } from '@/components/chart/toolbars';
import { QuickAccessPanel } from './QuickAccessPanel';
import { MLChartOverlay } from '@/components/chart/overlays/MLChartOverlay';

interface TradingLayoutProps {
  children?: React.ReactNode;
}

export const TradingLayout: React.FC<TradingLayoutProps> = ({ children }) => {
  const [rightPanel, setRightPanel] = useState<'journal' | 'ml' | 'order'>('journal');
  const [showQuickAccess, setShowQuickAccess] = useState(true);
  const [showMLOnChart, setShowMLOnChart] = useState(true);

  return (
    <div className="flex h-screen w-screen bg-[#131722] overflow-hidden">
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Chart Area */}
        <div className="flex-1 relative">
          {children || <ChartWithToolbars />}
          
          {/* ML Overlay on Chart */}
          {showMLOnChart && <MLChartOverlay />}
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-[400px] flex flex-col border-l border-[#242832] bg-[#1e222d]">
        {/* Panel Tabs */}
        <div className="flex border-b border-[#242832]">
          <button
            onClick={() => setRightPanel('journal')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              rightPanel === 'journal'
                ? 'text-[#2962ff] border-b-2 border-[#2962ff] bg-[#2962ff]/10'
                : 'text-[#787b86] hover:text-[#d1d4dc]'
            }`}
          >
            📊 Journal
          </button>
          <button
            onClick={() => setRightPanel('ml')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              rightPanel === 'ml'
                ? 'text-[#2962ff] border-b-2 border-[#2962ff] bg-[#2962ff]/10'
                : 'text-[#787b86] hover:text-[#d1d4dc]'
            }`}
          >
            🤖 ML
          </button>
          <button
            onClick={() => setRightPanel('order')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              rightPanel === 'order'
                ? 'text-[#2962ff] border-b-2 border-[#2962ff] bg-[#2962ff]/10'
                : 'text-[#787b86] hover:text-[#d1d4dc]'
            }`}
          >
            📈 Order
          </button>
        </div>

        {/* Panel Content */}
        <div className="flex-1 overflow-hidden">
          {rightPanel === 'journal' && <UnifiedJournalPanel />}
          {rightPanel === 'ml' && <MLAssistantPanel />}
          {rightPanel === 'order' && (
            <div className="p-4">
              <div className="text-[#d1d4dc] text-sm">Order Panel</div>
              {/* Quick Order Panel would go here */}
            </div>
          )}
        </div>
      </div>

      {/* Quick Access Floating Panel */}
      {showQuickAccess && (
        <QuickAccessPanel
          onClose={() => setShowQuickAccess(false)}
          onToggleML={() => setShowMLOnChart(!showMLOnChart)}
          showML={showMLOnChart}
        />
      )}
    </div>
  );
};

export default TradingLayout;
