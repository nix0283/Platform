'use client';

// ============================================
// TIMEFRAME SELECTOR — Все таймфреймы + кастомные
// ============================================

import React, { useState, useRef, useEffect } from 'react';
import { TIMEFRAMES, TIMEFRAME_GROUPS, parseCustomTimeframe, getTimeframeLabel } from '@trading-platform/charting';

interface TimeframeSelectorProps {
  value: string;
  onChange: (timeframe: string) => void;
}

export const TimeframeSelector: React.FC<TimeframeSelectorProps> = ({
  value,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [customError, setCustomError] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (tf: string) => {
    onChange(tf);
    setIsOpen(false);
  };

  const handleCustomSubmit = () => {
    const parsed = parseCustomTimeframe(customInput);
    
    if (parsed.isValid) {
      onChange(parsed.value);
      setCustomInput('');
      setCustomError('');
      setIsOpen(false);
    } else {
      setCustomError(parsed.error || 'Invalid timeframe');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCustomSubmit();
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Selector Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-[#2a2e39] hover:bg-[#363c4e] rounded text-sm text-[#d1d4dc] transition-colors"
      >
        <span>{getTimeframeLabel(value)}</span>
        <span className="text-[#787b86]">▼</span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-[#1e222d] border border-[#242832] rounded-lg shadow-xl z-50 min-w-[300px]">
          
          {/* Custom Input */}
          <div className="p-3 border-b border-[#242832]">
            <div className="text-xs text-[#787b86] mb-2">Custom Timeframe</div>
            <div className="flex gap-2">
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g., 10s, 45m, 8h, 10d"
                className="flex-1 bg-[#2a2e39] border border-[#363c4e] rounded px-3 py-1.5 text-sm text-[#d1d4dc] outline-none focus:border-[#2962ff]"
              />
              <button
                onClick={handleCustomSubmit}
                className="px-3 py-1.5 bg-[#2962ff] hover:bg-[#1e54e6] text-white text-sm rounded"
              >
                Set
              </button>
            </div>
            {customError && (
              <div className="text-xs text-[#ef5350] mt-1">{customError}</div>
            )}
          </div>

          {/* Timeframe Groups */}
          <div className="max-h-[400px] overflow-y-auto p-2">
            {/* Seconds */}
            <TimeframeGroup
              title="Seconds"
              timeframes={TIMEFRAME_GROUPS.seconds}
              selected={value}
              onSelect={handleSelect}
            />

            {/* Minutes */}
            <TimeframeGroup
              title="Minutes"
              timeframes={TIMEFRAME_GROUPS.minutes}
              selected={value}
              onSelect={handleSelect}
            />

            {/* Hours */}
            <TimeframeGroup
              title="Hours"
              timeframes={TIMEFRAME_GROUPS.hours}
              selected={value}
              onSelect={handleSelect}
            />

            {/* Days */}
            <TimeframeGroup
              title="Days"
              timeframes={TIMEFRAME_GROUPS.days}
              selected={value}
              onSelect={handleSelect}
            />

            {/* Weeks */}
            <TimeframeGroup
              title="Weeks"
              timeframes={TIMEFRAME_GROUPS.weeks}
              selected={value}
              onSelect={handleSelect}
            />

            {/* Months */}
            <TimeframeGroup
              title="Months"
              timeframes={TIMEFRAME_GROUPS.months}
              selected={value}
              onSelect={handleSelect}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// TIMEFRAME GROUP COMPONENT
// ============================================

interface TimeframeGroupProps {
  title: string;
  timeframes: Array<{ value: string; label: string }>;
  selected: string;
  onSelect: (tf: string) => void;
}

const TimeframeGroup: React.FC<TimeframeGroupProps> = ({
  title,
  timeframes,
  selected,
  onSelect,
}) => {
  return (
    <div className="mb-3">
      <div className="text-xs text-[#787b86] font-medium mb-1 px-2">{title}</div>
      <div className="grid grid-cols-5 gap-1">
        {timeframes.map((tf) => (
          <button
            key={tf.value}
            onClick={() => onSelect(tf.value)}
            className={`px-2 py-1.5 text-xs rounded transition-colors ${
              selected === tf.value
                ? 'bg-[#2962ff] text-white'
                : 'bg-[#2a2e39] text-[#d1d4dc] hover:bg-[#363c4e]'
            }`}
          >
            {tf.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TimeframeSelector;
