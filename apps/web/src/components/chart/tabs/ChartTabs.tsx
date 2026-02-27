'use client';

// ============================================
// CHART TABS MANAGER — Мульти-чарт система
// ============================================

import React, { useState, useCallback } from 'react';
import { ChartConfig } from '@trading-platform/core';

export interface ChartTab {
  id: string;
  name: string;
  config: ChartConfig;
  createdAt: number;
  updatedAt: number;
}

interface ChartTabsManagerProps {
  tabs: ChartTab[];
  activeTabId: string;
  onTabChange: (tabId: string) => void;
  onTabAdd: () => void;
  onTabClose: (tabId: string) => void;
  onTabRename: (tabId: string, name: string) => void;
}

export const ChartTabs: React.FC<ChartTabsManagerProps> = ({
  tabs,
  activeTabId,
  onTabChange,
  onTabAdd,
  onTabClose,
  onTabRename,
}) => {
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleAddTab = () => {
    onTabAdd();
  };

  const handleStartRename = (tab: ChartTab, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTabId(tab.id);
    setEditName(tab.name);
  };

  const handleSaveRename = (tabId: string) => {
    if (editName.trim()) {
      onTabRename(tabId, editName.trim());
    }
    setEditingTabId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, tabId: string) => {
    if (e.key === 'Enter') {
      handleSaveRename(tabId);
    } else if (e.key === 'Escape') {
      setEditingTabId(null);
    }
  };

  return (
    <div className="flex items-center bg-[#1e222d] border-b border-[#242832]">
      {/* Tabs */}
      <div className="flex overflow-x-auto scrollbar-thin">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`group flex items-center gap-2 px-4 py-2 border-r border-[#242832] cursor-pointer transition-colors min-w-[150px] max-w-[250px] ${
              activeTabId === tab.id
                ? 'bg-[#2a2e39] text-[#d1d4dc]'
                : 'bg-[#1e222d] text-[#787b86] hover:bg-[#242832]'
            }`}
            onClick={() => onTabChange(tab.id)}
          >
            {/* Tab Name */}
            {editingTabId === tab.id ? (
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={() => handleSaveRename(tab.id)}
                onKeyDown={(e) => handleKeyDown(e, tab.id)}
                className="flex-1 bg-[#131722] text-[#d1d4dc] text-sm px-1 rounded outline-none"
                autoFocus
              />
            ) : (
              <span
                className="flex-1 text-sm truncate"
                onDoubleClick={(e) => handleStartRename(tab, e)}
              >
                {tab.name}
              </span>
            )}

            {/* Close Button */}
            {tabs.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTabClose(tab.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-[#ef5350] hover:text-white rounded transition-all"
                title="Close tab"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add Tab Button */}
      <button
        onClick={handleAddTab}
        className="px-3 py-2 text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#242832] transition-colors"
        title="New chart tab"
      >
        +
      </button>
    </div>
  );
};

// ============================================
// CHART TABS MANAGER HOOK
// ============================================

export function useChartTabsManager(initialConfig: ChartConfig) {
  const [tabs, setTabs] = useState<ChartTab[]>([
    {
      id: `chart_${Date.now()}`,
      name: 'Chart 1',
      config: initialConfig,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ]);
  
  const [activeTabId, setActiveTabId] = useState(tabs[0].id);

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  const addTab = useCallback(() => {
    const newTab: ChartTab = {
      id: `chart_${Date.now()}`,
      name: `Chart ${tabs.length + 1}`,
      config: { ...initialConfig },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
  }, [initialConfig, tabs.length]);

  const closeTab = useCallback((tabId: string) => {
    if (tabs.length === 1) return;
    
    setTabs(prev => {
      const newTabs = prev.filter(t => t.id !== tabId);
      
      // If closing active tab, switch to another
      if (tabId === activeTabId) {
        const index = prev.findIndex(t => t.id === tabId);
        const newActiveIndex = Math.min(index, newTabs.length - 1);
        setActiveTabId(newTabs[newActiveIndex].id);
      }
      
      return newTabs;
    });
  }, [tabs.length, activeTabId]);

  const renameTab = useCallback((tabId: string, name: string) => {
    setTabs(prev =>
      prev.map(t =>
        t.id === tabId ? { ...t, name, updatedAt: Date.now() } : t
      )
    );
  }, []);

  const updateActiveTabConfig = useCallback((config: Partial<ChartConfig>) => {
    setTabs(prev =>
      prev.map(t =>
        t.id === activeTabId
          ? { ...t, config: { ...t.config, ...config }, updatedAt: Date.now() }
          : t
      )
    );
  }, [activeTabId]);

  return {
    tabs,
    activeTab,
    activeTabId,
    setActiveTabId,
    addTab,
    closeTab,
    renameTab,
    updateActiveTabConfig,
  };
}

export default ChartTabs;
