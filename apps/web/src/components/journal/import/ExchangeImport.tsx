'use client';

// ============================================
// EXCHANGE IMPORT COMPONENT
// Импорт сделок с бирж
// ============================================

import React, { useState } from 'react';

interface ExchangeInfo {
  id: string;
  name: string;
  fields: string[];
  supportsFutures: boolean;
}

interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
  total: number;
}

interface ExchangeImportProps {
  onSuccess?: (result: ImportResult) => void;
  onCancel?: () => void;
}

export const ExchangeImport: React.FC<ExchangeImportProps> = ({
  onSuccess,
  onCancel,
}) => {
  const [exchanges, setExchanges] = useState<ExchangeInfo[]>([]);
  const [selectedExchange, setSelectedExchange] = useState<string>('');
  const [credentials, setCredentials] = useState({
    apiKey: '',
    apiSecret: '',
    passphrase: '',
  });
  const [options, setOptions] = useState({
    symbol: '',
    startTime: '',
    endTime: '',
    includeFutures: false,
  });
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
    message: string;
  } | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load supported exchanges
  React.useEffect(() => {
    fetch('/api/journal/import/status')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setExchanges(data.exchanges);
        }
      })
      .catch(err => console.error('Failed to load exchanges:', err));
  }, []);

  const handleImport = async () => {
    if (!selectedExchange || !credentials.apiKey || !credentials.apiSecret) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError(null);
    setProgress({ current: 0, total: 100, message: 'Starting import...' });

    try {
      const response = await fetch('/api/journal/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exchange: selectedExchange,
          ...credentials,
          ...options,
          startTime: options.startTime ? new Date(options.startTime).getTime() : undefined,
          endTime: options.endTime ? new Date(options.endTime).getTime() : undefined,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Import failed');
      }

      setResult(data.result);
      setProgress({ current: 100, total: 100, message: 'Import complete!' });
      onSuccess?.(data.result);
    } catch (err: any) {
      setError(err.message);
      setProgress(null);
    } finally {
      setLoading(false);
    }
  };

  const selectedExchangeInfo = exchanges.find(e => e.id === selectedExchange);

  return (
    <div className="bg-[#1e222d] border border-[#242832] rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-[#d1d4dc]">📥 Import from Exchange</h3>
        {onCancel && (
          <button onClick={onCancel} className="text-[#787b86] hover:text-[#d1d4dc]">✕</button>
        )}
      </div>

      {/* Exchange Selection */}
      <div>
        <label className="text-sm text-[#787b86] block mb-2">Select Exchange</label>
        <select
          value={selectedExchange}
          onChange={(e) => setSelectedExchange(e.target.value)}
          className="w-full bg-[#2a2e39] border border-[#363c4e] rounded px-3 py-2 text-sm text-[#d1d4dc]"
        >
          <option value="">Choose an exchange...</option>
          {exchanges.map(ex => (
            <option key={ex.id} value={ex.id}>{ex.name}</option>
          ))}
        </select>
      </div>

      {/* API Credentials */}
      {selectedExchangeInfo && (
        <div className="space-y-3">
          <div>
            <label className="text-sm text-[#787b86] block mb-2">
              API Key {selectedExchangeInfo.fields.includes('apiKey') && '*'}
            </label>
            <input
              type="text"
              value={credentials.apiKey}
              onChange={(e) => setCredentials({ ...credentials, apiKey: e.target.value })}
              className="w-full bg-[#2a2e39] border border-[#363c4e] rounded px-3 py-2 text-sm text-[#d1d4dc]"
              placeholder="Enter your API key"
            />
          </div>

          <div>
            <label className="text-sm text-[#787b86] block mb-2">
              API Secret {selectedExchangeInfo.fields.includes('apiSecret') && '*'}
            </label>
            <input
              type="password"
              value={credentials.apiSecret}
              onChange={(e) => setCredentials({ ...credentials, apiSecret: e.target.value })}
              className="w-full bg-[#2a2e39] border border-[#363c4e] rounded px-3 py-2 text-sm text-[#d1d4dc]"
              placeholder="Enter your API secret"
            />
          </div>

          {selectedExchangeInfo.fields.includes('passphrase') && (
            <div>
              <label className="text-sm text-[#787b86] block mb-2">
                Passphrase *
              </label>
              <input
                type="password"
                value={credentials.passphrase}
                onChange={(e) => setCredentials({ ...credentials, passphrase: e.target.value })}
                className="w-full bg-[#2a2e39] border border-[#363c4e] rounded px-3 py-2 text-sm text-[#d1d4dc]"
                placeholder="Enter your passphrase"
              />
            </div>
          )}
        </div>
      )}

      {/* Import Options */}
      <div className="border-t border-[#242832] pt-4 space-y-3">
        <div className="text-sm font-medium text-[#d1d4dc]">Import Options</div>

        <div>
          <label className="text-sm text-[#787b86] block mb-2">Symbol (optional)</label>
          <input
            type="text"
            value={options.symbol}
            onChange={(e) => setOptions({ ...options, symbol: e.target.value })}
            className="w-full bg-[#2a2e39] border border-[#363c4e] rounded px-3 py-2 text-sm text-[#d1d4dc]"
            placeholder="e.g., BTC/USDT (leave empty for all)"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-[#787b86] block mb-2">Start Date</label>
            <input
              type="date"
              value={options.startTime}
              onChange={(e) => setOptions({ ...options, startTime: e.target.value })}
              className="w-full bg-[#2a2e39] border border-[#363c4e] rounded px-3 py-2 text-sm text-[#d1d4dc]"
            />
          </div>
          <div>
            <label className="text-sm text-[#787b86] block mb-2">End Date</label>
            <input
              type="date"
              value={options.endTime}
              onChange={(e) => setOptions({ ...options, endTime: e.target.value })}
              className="w-full bg-[#2a2e39] border border-[#363c4e] rounded px-3 py-2 text-sm text-[#d1d4dc]"
            />
          </div>
        </div>

        {selectedExchangeInfo?.supportsFutures && (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={options.includeFutures}
              onChange={(e) => setOptions({ ...options, includeFutures: e.target.checked })}
              className="rounded bg-[#2a2e39] border-[#363c4e]"
            />
            <label className="text-sm text-[#787b86]">Include Futures trades</label>
          </div>
        )}
      </div>

      {/* Progress */}
      {progress && (
        <div className="space-y-2">
          <div className="text-sm text-[#787b86]">{progress.message}</div>
          <div className="w-full bg-[#2a2e39] rounded-full h-2">
            <div
              className="bg-[#2962ff] h-2 rounded-full transition-all"
              style={{ width: `${progress.current}%` }}
            />
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="bg-[#2a2e39] rounded p-3 space-y-2">
          <div className="text-sm font-medium text-[#d1d4dc]">Import Result:</div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <span className="text-[#787b86]">Imported:</span>
              <span className="text-[#26a69a] ml-2">{result.imported}</span>
            </div>
            <div>
              <span className="text-[#787b86]">Skipped:</span>
              <span className="text-[#ff9800] ml-2">{result.skipped}</span>
            </div>
            <div>
              <span className="text-[#787b86]">Total:</span>
              <span className="text-[#d1d4dc] ml-2">{result.total}</span>
            </div>
          </div>
          {result.errors.length > 0 && (
            <div className="text-xs text-[#ef5350]">
              Errors: {result.errors.slice(0, 3).join(', ')}
              {result.errors.length > 3 && ` (+${result.errors.length - 3} more)`}
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
      <div className="flex justify-end gap-2 pt-4 border-t border-[#242832]">
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm bg-[#2a2e39] hover:bg-[#363c4e] text-[#d1d4dc] rounded"
          >
            Close
          </button>
        )}
        <button
          onClick={handleImport}
          disabled={loading || !selectedExchange}
          className="px-4 py-2 text-sm bg-[#2962ff] hover:bg-[#1e54e6] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded"
        >
          {loading ? 'Importing...' : 'Import Trades'}
        </button>
      </div>

      {/* Security Notice */}
      <div className="text-xs text-[#787b86] border-t border-[#242832] pt-3">
        🔒 Your API credentials are used only for this import and are not stored.
        Make sure your API key has <strong>Read-Only</strong> permissions.
      </div>
    </div>
  );
};

export default ExchangeImport;
