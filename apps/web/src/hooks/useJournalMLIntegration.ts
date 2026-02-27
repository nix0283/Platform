'use client';
import { useState, useEffect } from 'react';
import { JournalManager } from '@trading-platform/journal';

export interface UnifiedStats {
  totalTrades: number;
  winRate?: number;
  totalPnl?: number;
  currentBalance?: number;
}

export function useJournalMLIntegration(autoStart: boolean = true) {
  const [journal] = useState(() => new JournalManager());
  const [stats, setStats] = useState<UnifiedStats | null>({ totalTrades: 0, winRate: 0, totalPnl: 0 });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (autoStart) {
      journal.getStats().then(setStats).catch(console.error);
    }
  }, [autoStart, journal]);

  return { journal, stats, setStats, isLoading };
}
