'use client';

// ============================================
// AUTO-SYNC SETTINGS COMPONENT
// Настройки авто-синхронизации с биржами
// ============================================

import React, { useState, useEffect } from 'react';

interface ExchangeConfig {
  id: string;
  name: string;
  apiKey: string;
  apiSecret: string;
  passphrase?: string;
  autoImport: boolean;
  autoSyncPositions: boolean;
}

interface SyncSettingsProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const SyncSettings: React.FC<SyncSettingsProps> = ({
  onSuccess,
  onCancel,
}) => {
  const [enabled, setEnabled] = useState(false);
  const [interval, setInterval] = useState(60); // seconds
  const [exchanges, setExchanges] = useState<ExchangeConfig[]>([
    {
      id: 'okx',
      name: 'OKX',
      apiKey: '',
      apiSecret: '',
      passphrase: '',
      autoImport: false,
      autoSyncPositions: false,
    },
    {
      id: 'bitget',
      name: 'Bitget',
      apiKey: '',
      apiSecret: '',
      passphrase: '',
      autoImport: false,
      autoSyncPositions: false,
    },
    {
      id: 'bingx',
      name: 'BingX',
      apiKey: '',
      apiSecret: '',
      autoImport: false,
      autoSyncPositions: false,
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{
    lastSync: string | null;
    nextSync: string | null;
    imported: number;
    errors: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load current sync status
  useEffect(() => {
    fetch('/api/journal/sync/status')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setEnabled(data.status.enabled);
          if (data.status.lastSync) {
            setStatus({
              lastSync: new Date(data.status.lastSync).toLocaleString(),
              nextSync: data.status.nextSync ? new Date(data.status.nextSync).toLocaleString() : null,
              imported: data.status.imported || 0,
              errors: data.status.errors || [],
            });
          }
        }
      })
      .catch(err => console.error('Failed to load sync status:', err));
  }, []);

  const handleSave = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/journal/sync/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled,
          interval,
          exchanges: exchanges.filter(e => e.autoImport || e.autoSyncPositions),
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to save settings');
      }

      onSuccess?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncNow = async () => {
    setLoading(true);
    setError(null);

    try {
      // Trigger immediate sync
      const response = await fetch('/api/journal/sync/trigger', {
        method: 'POST',
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Sync failed');
      }

      setStatus({
        lastSync: new Date().toLocaleString(),
        nextSync: new Date(Date.now() + interval * 1000).toLocaleString(),
        imported: data.result?.imported || 0,
        errors: data.result?.errors || [],
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateExchange = (id: string, updates: Partial<ExchangeConfig>) => {
    setExchanges(prev =>
      prev.map(e => (e.id === id ? { ...e, ...updates } : e))
    );
  };

  return (
    <div className="bg-[#1e222d] border border-[#242832] rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-[#d1d4dc]">🔄 Auto-Sync Settings</h3>
        {onCancel && (
          <button onClick={onCancel} className="text-[#787b86] hover:text-[#d1d4dc]">✕</button>
        )}
      </div>

      {/* Enable/Disable */}
      <div className="flex items-center justify-between p-3 bg-[#2a2e39] rounded">
        <div>
          <div className="text-sm font-medium text-[#d1d4dc]">Auto-Sync Trades</div>
          <div className="text-xs text-[#787b86]">Automatically import new trades from exchanges</div>
        </div>
        <button
          onClick={() => setEnabled(!enabled)}
          className={`w-12 h-6 rounded-full transition-colors ${
            enabled ? 'bg-[#26a69a]' : 'bg-[#787b86]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-transform ${
              enabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {/* Sync Interval */}
      {enabled && (
        <div>
          <label className="text-sm text-[#787b86] block mb-2">Sync Interval</label>
          <select
            value={interval}
            onChange={(e) => setInterval(parseInt(e.target.value))}
            className="w-full bg-[#2a2e39] border border-[#363c4e] rounded px-3 py-2 text-sm text-[#d1d4dc]"
          >
            <option value={30}>30 seconds</option>
            <option value={60}>1 minute</option>
            <option value={300}>5 minutes</option>
            <option value={600}>10 minutes</option>
            <option value={1800}>30 minutes</option>
          </select>
        </div>
      )}

      {/* Exchanges */}
      {enabled && (
        <div className="space-y-3">
          <div className="text-sm font-medium text-[#d1d4dc]">Exchanges</div>

          {exchanges.map(exchange => (
            <div key={exchange.id} className="border border-[#363c4e] rounded p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-medium text-[#d1d4dc]">{exchange.name}</div>
                <div className="flex items-center gap-3">
                  <label className="text-xs text-[#787b86] flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={exchange.autoImport}
                      onChange={(e) => updateExchange(exchange.id, { autoImport: e.target.checked })}
                      className="rounded bg-[#2a2e39] border-[#363c4e]"
                    />
                    Import Trades
                  </label>
                  <label className="text-xs text-[#787b86] flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={exchange.autoSyncPositions}
                      onChange={(e) => updateExchange(exchange.id, { autoSyncPositions: e.target.checked })}
                      className="rounded bg-[#2a2e39] border-[#363c4e]"
                    />
                    Sync Positions
                  </label>
                </div>
              </div>

              {(exchange.autoImport || exchange.autoSyncPositions) && (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="API Key"
                    value={exchange.apiKey}
                    onChange={(e) => updateExchange(exchange.id, { apiKey: e.target.value })}
                    className="w-full bg-[#2a2e39] border border-[#363c4e] rounded px-3 py-2 text-sm text-[#d1d4dc]"
                  />
                  <input
                    type="password"
                    placeholder="API Secret"
                    value={exchange.apiSecret}
                    onChange={(e) => updateExchange(exchange.id, { apiSecret: e.target.value })}
                    className="w-full bg-[#2a2e39] border border-[#363c4e] rounded px-3 py-2 text-sm text-[#d1d4dc]"
                  />
                  {exchange.id === 'okx' && (
                    <input
                      type="password"
                      placeholder="Passphrase"
                      value={exchange.passphrase}
                      onChange={(e) => updateExchange(exchange.id, { passphrase: e.target.value })}
                      className="w-full bg-[#2a2e39] border border-[#363c4e] rounded px-3 py-2 text-sm text-[#d1d4dc]"
                    />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Sync Status */}
      {status && (
        <div className="bg-[#2a2e39] rounded p-3 space-y-2">
          <div className="text-sm font-medium text-[#d1d4dc]">Sync Status</div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-[#787b86]">Last Sync:</span>
              <span className="text-[#d1d4dc] ml-2">{status.lastSync || 'Never'}</span>
            </div>
            <div>
              <span className="text-[#787b86]">Next Sync:</span>
              <span className="text-[#d1d4dc] ml-2">{status.nextSync || '-'}</span>
            </div>
            <div>
              <span className="text-[#787b86]">Imported:</span>
              <span className="text-[#26a69a] ml-2">{status.imported}</span>
            </div>
          </div>
          {status.errors.length > 0 && (
            <div className="text-xs text-[#ef5350]">
              Errors: {status.errors.slice(0, 3).join(', ')}
              {status.errors.length > 3 && ` (+${status.errors.length - 3} more)`}
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-[#ef5350]/20 border border-[#ef5350] rounded p-3 text-sm text-[#ef5350]">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between gap-2 pt-4 border-t border-[#242832]">
        {enabled && (
          <button
            onClick={handleSyncNow}
            disabled={loading}
            className="px-4 py-2 text-sm bg-[#26a69a] hover:bg-[#1e8c7a] disabled:opacity-50 text-white rounded"
          >
            🔄 Sync Now
          </button>
        )}
        <div className="flex gap-2 ml-auto">
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm bg-[#2a2e39] hover:bg-[#363c4e] text-[#d1d4dc] rounded"
            >
              Close
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 text-sm bg-[#2962ff] hover:bg-[#1e54e6] disabled:opacity-50 text-white rounded"
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* Security Notice */}
      <div className="text-xs text-[#787b86] border-t border-[#242832] pt-3">
        🔒 Your API credentials are encrypted and used only for syncing.
        Use <strong>Read-Only</strong> API keys for security.
      </div>
    </div>
  );
};

export default SyncSettings;
