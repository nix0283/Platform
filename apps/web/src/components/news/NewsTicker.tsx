'use client';

// ============================================
// NEWS TICKER COMPONENT
// Окно новостей как в TradingView терминале
// ============================================

import React, { useState, useEffect, useRef } from 'react';

interface NewsItem {
  id: string;
  source: string;
  title: string;
  url: string;
  publishedAt: string;
  importance: number;
  relatedSymbols?: string[];
}

interface NewsTickerProps {
  compact?: boolean;
  autoScroll?: boolean;
  scrollSpeed?: number;
  maxItems?: number;
  customSources?: string[];
}

export const NewsTicker: React.FC<NewsTickerProps> = ({
  compact = false,
  autoScroll = true,
  scrollSpeed = 30,
  maxItems = 100,
  customSources = [],
}) => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [sources, setSources] = useState<string[]>([
    'https://www.binance.com/en/support/announcement',
    'https://announcements.bybit.com/en-US/',
    'https://www.okx.com/support/hc/en-us/articles',
    ...customSources,
  ]);
  const [newSource, setNewSource] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Загрузка новостей
  const loadNews = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/news?limit=${maxItems}`);
      const data = await response.json();
      if (data.success) {
        setNews(data.news);
      }
    } catch (error) {
      console.error('Failed to load news:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNews();
    const interval = setInterval(loadNews, 60000); // 1 minute
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (!autoScroll || compact || !containerRef.current) return;

    const container = containerRef.current;
    const scrollInterval = setInterval(() => {
      if (container.scrollTop + container.clientHeight >= container.scrollHeight) {
        container.scrollTop = 0;
      } else {
        container.scrollTop += 1;
      }
    }, scrollSpeed);

    return () => clearInterval(scrollInterval);
  }, [autoScroll, scrollSpeed, compact]);

  // Добавить источник
  const addSource = () => {
    if (newSource && newSource.startsWith('http')) {
      setSources([...sources, newSource]);
      setNewSource('');
    }
  };

  // Удалить источник
  const removeSource = (index: number) => {
    setSources(sources.filter((_, i) => i !== index));
  };

  // Format time
  const timeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  };

  // Get importance color
  const getImportanceColor = (importance: number): string => {
    if (importance >= 5) return 'text-[#ef5350]';
    if (importance >= 4) return 'text-[#ff9800]';
    if (importance >= 3) return 'text-[#2196f3]';
    return 'text-[#787b86]';
  };

  if (compact) {
    return (
      <div className="bg-[#1e222d] border-t border-[#242832] h-8 overflow-hidden">
        <div className="flex items-center h-full px-2">
          <span className="text-xs text-[#787b86] mr-2">📰</span>
          <div className="flex-1 overflow-hidden">
            {news.length > 0 && (
              <div className="text-xs text-[#d1d4dc] whitespace-nowrap truncate">
                {news[0].title}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#1e222d] border-l border-[#242832]">
      {/* Header */}
      <div className="flex items-center justify-between p-2 border-b border-[#242832]">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-[#d1d4dc]">📰 News</span>
          <span className="text-xs text-[#787b86]">({news.length})</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSources(!showSources)}
            className="p-1 hover:bg-[#2a2e39] rounded"
            title="Manage Sources"
          >
            ⚙️
          </button>
          <button
            onClick={loadNews}
            className="p-1 hover:bg-[#2a2e39] rounded"
            title="Refresh"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Sources Panel */}
      {showSources && (
        <div className="p-2 border-b border-[#242832] bg-[#2a2e39]">
          <div className="text-xs text-[#787b86] mb-2">News Sources:</div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {sources.map((source, index) => (
              <div key={index} className="flex items-center justify-between text-xs">
                <span className="text-[#d1d4dc] truncate flex-1">{source}</span>
                <button
                  onClick={() => removeSource(index)}
                  className="text-[#ef5350] hover:text-[#ff6b6b] ml-2"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-1 mt-2">
            <input
              type="text"
              value={newSource}
              onChange={(e) => setNewSource(e.target.value)}
              placeholder="Add URL..."
              className="flex-1 bg-[#1e222d] border border-[#363c4e] rounded px-2 py-1 text-xs text-[#d1d4dc]"
            />
            <button
              onClick={addSource}
              className="px-2 py-1 bg-[#2962ff] text-white text-xs rounded"
            >
              +
            </button>
          </div>
        </div>
      )}

      {/* News List */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto scrollbar-thin"
      >
        {loading && news.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-[#787b86] text-xs">Loading...</div>
          </div>
        ) : news.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-[#787b86] text-xs">No news</div>
          </div>
        ) : (
          <div className="divide-y divide-[#242832]">
            {news.map((item) => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-2 hover:bg-[#2a2e39] transition-colors group"
              >
                <div className="flex items-start gap-2">
                  {/* Importance Indicator */}
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                    item.importance >= 5 ? 'bg-[#ef5350]' :
                    item.importance >= 4 ? 'bg-[#ff9800]' :
                    item.importance >= 3 ? 'bg-[#2196f3]' :
                    'bg-[#787b86]'
                  }`} />
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-[#d1d4dc] font-medium line-clamp-2 group-hover:text-[#2962ff]">
                      {item.title}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-[#787b86]">
                      <span className={getImportanceColor(item.importance)}>
                        {item.source}
                      </span>
                      <span>•</span>
                      <span>{timeAgo(item.publishedAt)}</span>
                      {item.relatedSymbols && item.relatedSymbols.length > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-[#2962ff]">
                            {item.relatedSymbols.slice(0, 3).join(', ')}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-1 border-t border-[#242832] text-[10px] text-[#787b86] text-center">
        Auto-refresh: 60s • Storage: 3 months
      </div>
    </div>
  );
};

export default NewsTicker;
