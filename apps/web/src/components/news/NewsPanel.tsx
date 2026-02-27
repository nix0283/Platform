'use client';

// ============================================
// NEWS PANEL — TradingView Style
// Окно новостей с управлением источниками
// ============================================

import React, { useState, useEffect } from 'react';
import { NewsTicker } from './NewsTicker';

interface NewsPanelProps {
  defaultSources?: string[];
  compact?: boolean;
}

export const NewsPanel: React.FC<NewsPanelProps> = ({
  defaultSources = [],
  compact = false,
}) => {
  const [sources, setSources] = useState<string[]>(() => {
    // Load from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('news_sources');
      if (saved) {
        return JSON.parse(saved);
      }
    }
    return [
      'https://www.binance.com/en/support/announcement',
      'https://announcements.bybit.com/en-US/',
      'https://www.okx.com/support/hc/en-us/articles',
      ...defaultSources,
    ];
  });

  // Save sources to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('news_sources', JSON.stringify(sources));
    }
  }, [sources]);

  if (compact) {
    return <NewsTicker compact={true} customSources={sources} />;
  }

  return (
    <div className="h-full">
      <NewsTicker
        compact={false}
        autoScroll={true}
        scrollSpeed={30}
        customSources={sources}
      />
    </div>
  );
};

// ============================================
// NEWS SOURCES MANAGER
// Управление источниками новостей
// ============================================

interface NewsSourcesManagerProps {
  sources: string[];
  onSourcesChange: (sources: string[]) => void;
}

export const NewsSourcesManager: React.FC<NewsSourcesManagerProps> = ({
  sources,
  onSourcesChange,
}) => {
  const [newSource, setNewSource] = useState('');
  const [newName, setNewName] = useState('');

  const addSource = () => {
    if (newSource && newSource.startsWith('http')) {
      onSourcesChange([...sources, newSource]);
      setNewSource('');
      setNewName('');
    }
  };

  const removeSource = (index: number) => {
    onSourcesChange(sources.filter((_, i) => i !== index));
  };

  const moveSource = (index: number, direction: 'up' | 'down') => {
    const newSources = [...sources];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex >= 0 && newIndex < sources.length) {
      [newSources[index], newSources[newIndex]] = [newSources[newIndex], newSources[index]];
      onSourcesChange(newSources);
    }
  };

  return (
    <div className="p-4 bg-[#1e222d] border border-[#242832] rounded-lg">
      <h3 className="text-sm font-bold text-[#d1d4dc] mb-3">📰 News Sources</h3>
      
      {/* Sources List */}
      <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
        {sources.map((source, index) => (
          <div
            key={index}
            className="flex items-center gap-2 p-2 bg-[#2a2e39] rounded"
          >
            <div className="flex-1 min-w-0">
              <div className="text-xs text-[#d1d4dc] truncate">{source}</div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => moveSource(index, 'up')}
                disabled={index === 0}
                className="p-1 text-[#787b86] hover:text-[#d1d4dc] disabled:opacity-50"
              >
                ↑
              </button>
              <button
                onClick={() => moveSource(index, 'down')}
                disabled={index === sources.length - 1}
                className="p-1 text-[#787b86] hover:text-[#d1d4dc] disabled:opacity-50"
              >
                ↓
              </button>
              <button
                onClick={() => removeSource(index)}
                className="p-1 text-[#ef5350] hover:text-[#ff6b6b]"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Source Form */}
      <div className="space-y-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Source name (optional)"
          className="w-full bg-[#2a2e39] border border-[#363c4e] rounded px-3 py-2 text-xs text-[#d1d4dc]"
        />
        <div className="flex gap-2">
          <input
            type="text"
            value={newSource}
            onChange={(e) => setNewSource(e.target.value)}
            placeholder="https://example.com/news"
            className="flex-1 bg-[#2a2e39] border border-[#363c4e] rounded px-3 py-2 text-xs text-[#d1d4dc]"
          />
          <button
            onClick={addSource}
            className="px-4 py-2 bg-[#2962ff] hover:bg-[#1e54e6] text-white text-xs font-medium rounded"
          >
            Add
          </button>
        </div>
      </div>

      {/* Preset Sources */}
      <div className="mt-4 pt-4 border-t border-[#242832]">
        <div className="text-xs text-[#787b86] mb-2">Quick Add:</div>
        <div className="grid grid-cols-1 gap-1">
          {[
            { name: 'Binance', url: 'https://www.binance.com/en/support/announcement' },
            { name: 'Bybit', url: 'https://announcements.bybit.com/en-US/' },
            { name: 'OKX', url: 'https://www.okx.com/support/hc/en-us/articles' },
            { name: 'CoinDesk', url: 'https://www.coindesk.com/' },
            { name: 'CoinTelegraph', url: 'https://cointelegraph.com/' },
          ].map((preset) => (
            <button
              key={preset.url}
              onClick={() => {
                if (!sources.includes(preset.url)) {
                  onSourcesChange([...sources, preset.url]);
                }
              }}
              className="text-xs text-[#2962ff] hover:text-[#1e54e6] text-left"
            >
              + {preset.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NewsPanel;
