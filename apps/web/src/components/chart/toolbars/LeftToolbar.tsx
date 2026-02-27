'use client';

// ============================================
// LEFT TOOLBAR — Инструменты рисования
// ============================================

import React, { useState } from 'react';
import { useAppStore } from '@/store';

type DrawingTool = 
  | 'cursor'
  | 'trendline'
  | 'horizontal'
  | 'vertical'
  | 'fibonacci'
  | 'fibonacci_retracement'
  | 'rectangle'
  | 'ellipse'
  | 'text'
  | 'arrow_up'
  | 'arrow_down'
  | 'brush'
  | 'measure'
  | 'pitchfork'
  | 'gann'
  | 'callout';

interface LeftToolbarProps {
  onToolSelect?: (tool: DrawingTool) => void;
  onDrawingAction?: (action: 'undo' | 'redo' | 'clear') => void;
}

export const LeftToolbar: React.FC<LeftToolbarProps> = ({
  onToolSelect,
  onDrawingAction,
}) => {
  const { chartConfig } = useAppStore();
  const [activeTool, setActiveTool] = useState<DrawingTool>('cursor');
  const [showColors, setShowColors] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#2962ff');

  const tools: { id: DrawingTool; icon: string; label: string; group: string }[] = [
    { id: 'cursor', icon: '↖️', label: 'Cursor', group: 'navigation' },
    { id: 'measure', icon: '📏', label: 'Measure', group: 'navigation' },
    
    { id: 'trendline', icon: '╱', label: 'Trend Line', group: 'lines' },
    { id: 'horizontal', icon: '━', label: 'Horizontal', group: 'lines' },
    { id: 'vertical', icon: '┃', label: 'Vertical', group: 'lines' },
    
    { id: 'fibonacci_retracement', icon: '⊡', label: 'Fib Retracement', group: 'fibonacci' },
    { id: 'fibonacci', icon: '⊡', label: 'Fibonacci', group: 'fibonacci' },
    { id: 'pitchfork', icon: '⟆', label: 'Pitchfork', group: 'fibonacci' },
    
    { id: 'rectangle', icon: '▭', label: 'Rectangle', group: 'shapes' },
    { id: 'ellipse', icon: '◯', label: 'Ellipse', group: 'shapes' },
    
    { id: 'text', icon: 'T', label: 'Text', group: 'annotation' },
    { id: 'callout', icon: '💬', label: 'Callout', group: 'annotation' },
    { id: 'arrow_up', icon: '↑', label: 'Arrow Up', group: 'annotation' },
    { id: 'arrow_down', icon: '↓', label: 'Arrow Down', group: 'annotation' },
    
    { id: 'brush', icon: '🖌️', label: 'Brush', group: 'annotation' },
    { id: 'gann', icon: '⊞', label: 'Gann Box', group: 'advanced' },
  ];

  const colors = [
    '#2962ff', '#00bcd4', '#00c853', '#ffeb3b',
    '#ff6d00', '#ef5350', '#d500f9', '#9e9e9e',
  ];

  const handleToolSelect = (tool: DrawingTool) => {
    setActiveTool(tool);
    onToolSelect?.(tool);
  };

  const renderGroup = (groupName: string) => {
    const groupTools = tools.filter((t) => t.group === groupName);
    if (groupTools.length === 0) return null;

    return (
      <div key={groupName} className="flex flex-col gap-0.5 py-1 border-b border-[#242832] last:border-0">
        {groupTools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => handleToolSelect(tool.id)}
            className={`w-10 h-8 flex items-center justify-center rounded ${
              activeTool === tool.id
                ? 'bg-[#2962ff] text-white'
                : 'hover:bg-[#2a2e39]'
            }`}
            title={tool.label}
          >
            <span className="text-sm">{tool.icon}</span>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="w-12 bg-[#1e222d] border-r border-[#242832] flex flex-col items-center py-2 gap-1">
      {/* Drawing Tools */}
      {renderGroup('navigation')}
      {renderGroup('lines')}
      {renderGroup('fibonacci')}
      {renderGroup('shapes')}
      {renderGroup('annotation')}
      {renderGroup('advanced')}

      {/* Color Picker */}
      <div className="relative mt-2">
        <button
          onClick={() => setShowColors(!showColors)}
          className="w-8 h-8 rounded border-2 border-[#2a2e39]"
          style={{ backgroundColor: selectedColor }}
          title="Color"
        />
        
        {showColors && (
          <div className="absolute left-full ml-2 top-0 bg-[#1e222d] border border-[#242832] rounded-lg p-2 shadow-xl z-50">
            <div className="grid grid-cols-2 gap-1">
              {colors.map((color) => (
                <button
                  key={color}
                  onClick={() => {
                    setSelectedColor(color);
                    setShowColors(false);
                  }}
                  className="w-6 h-6 rounded"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Width Selector */}
      <div className="flex flex-col gap-1 mt-2">
        {[1, 2, 3, 4].map((width) => (
          <button
            key={width}
            className="w-8 h-6 flex items-center justify-center hover:bg-[#2a2e39] rounded"
            title={`Width: ${width}`}
          >
            <div
              className="bg-[#787b86]"
              style={{ height: width, width: 16 }}
            />
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="mt-auto flex flex-col gap-1">
        <button
          onClick={() => onDrawingAction?.('undo')}
          className="w-10 h-8 flex items-center justify-center hover:bg-[#2a2e39] rounded"
          title="Undo (Ctrl+Z)"
        >
          ↩️
        </button>
        <button
          onClick={() => onDrawingAction?.('redo')}
          className="w-10 h-8 flex items-center justify-center hover:bg-[#2a2e39] rounded"
          title="Redo (Ctrl+Y)"
        >
          ↪️
        </button>
        <button
          onClick={() => onDrawingAction?.('clear')}
          className="w-10 h-8 flex items-center justify-center hover:bg-[#2a2e39] rounded text-[#ef5350]"
          title="Clear All Drawings"
        >
          🗑️
        </button>
      </div>
    </div>
  );
};

export default LeftToolbar;
