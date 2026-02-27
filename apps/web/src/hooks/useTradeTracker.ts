'use client';
import { useState } from 'react';

export interface TradeAction {
  id: string;
  type: string;
  symbol: string;
  pnl?: number;
}

export function useTradeTracker() {
  const [actions, setActions] = useState<TradeAction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const captureAction = (action: Omit<TradeAction, 'id'>) => {
    const newAction = { ...action, id: `action_${Date.now()}` };
    setActions(prev => [...prev, newAction]);
    return newAction;
  };

  return { actions, isLoading, captureAction };
}
