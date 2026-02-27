'use client';

// ============================================
// FLOATING ML HINTS
// ML подсказки прямо на графике
// ============================================

import React, { useState, useEffect } from 'react';
import { useJournalMLIntegration } from '@/hooks/useJournalMLIntegration';

interface FloatingMLHintsProps {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  maxHints?: number;
  autoHide?: boolean;
  autoHideDelay?: number;
}

export const FloatingMLHints: React.FC<FloatingMLHintsProps> = ({
  position = 'top-right',
  maxHints = 3,
  autoHide = false,
  autoHideDelay = 10000,
}) => {
  const { getMLSuggestions, ready } = useJournalMLIntegration();
  const [hints, setHints] = useState<any[]>([]);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (ready) {
      const suggestions = getMLSuggestions();
      setHints(suggestions.slice(0, maxHints));

      if (autoHide && suggestions.length > 0) {
        const timer = setTimeout(() => {
          setVisible(false);
        }, autoHideDelay);
        return () => clearTimeout(timer);
      }
    }
  }, [ready, getMLSuggestions, maxHints, autoHide, autoHideDelay]);

  if (!ready || hints.length === 0 || !visible) return null;

  const positionClasses = {
    'top-left': 'top-20 left-4',
    'top-right': 'top-20 right-4',
    'bottom-left': 'bottom-12 left-4',
    'bottom-right': 'bottom-12 right-4',
  };

  return (
    <div className={`absolute z-50 ${positionClasses[position]} space-y-2`}>
      {hints.map((hint) => (
        <div
          key={hint.id}
          className={`p-3 rounded-lg border shadow-lg max-w-sm backdrop-blur-sm ${
            hint.priority === 'high'
              ? 'bg-[#ef5350]/20 border-[#ef5350]/40'
              : hint.priority === 'medium'
              ? 'bg-[#ff9800]/20 border-[#ff9800]/40'
              : 'bg-[#2196f3]/20 border-[#2196f3]/40'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">
                  {hint.priority === 'high' ? '🔴' : hint.priority === 'medium' ? '🟠' : '🔵'}
                </span>
                <span className="text-xs font-medium text-[#d1d4dc]">
                  {hint.type.toUpperCase()}
                </span>
              </div>
              <div className="text-sm text-[#d1d4dc]">{hint.message}</div>
              <div className="text-xs text-[#787b86] mt-1">
                Confidence: {(hint.confidence * 100).toFixed(0)}% | Based on {hint.basedOn} trades
              </div>
            </div>
            <button
              onClick={() => setVisible(false)}
              className="text-[#787b86] hover:text-[#d1d4dc]"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default FloatingMLHints;
