'use client';

// ============================================
// ML DASHBOARD COMPONENT
// Интеграция ML анализа в веб-интерфейс
// ============================================

import React, { useState, useEffect } from 'react';

interface Signal {
  symbol: string;
  signal: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  reasons: string[];
  relatedSymbols: Array<{
    symbol: string;
    correlation: number;
    influence: 'positive' | 'negative';
  }>;
}

interface Anomaly {
  symbol: string;
  anomalyType: 'correlation_break' | 'isolation' | 'hub';
  severity: number;
  description: string;
}

interface GraphData {
  nodes: number;
  edges: number;
  averageCorrelation: number;
  maxCorrelation?: {
    value: number;
    pair: string[];
  };
}

interface MLData {
  signals: Signal[];
  anomalies: Anomaly[];
  graph: GraphData;
  timestamp: number;
}

export const MLDashboard: React.FC = () => {
  const [data, setData] = useState<MLData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<'signals' | 'anomalies' | 'graph'>('signals');

  // Загрузка ML данных
  const loadMLData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [signalsRes, anomaliesRes, graphRes] = await Promise.all([
        fetch('/api/ml/signals'),
        fetch('/api/ml/anomalies'),
        fetch('/api/ml/graph'),
      ]);

      const signalsData = await signalsRes.json();
      const anomaliesData = await anomaliesRes.json();
      const graphData = await graphRes.json();

      if (!signalsData.success || !anomaliesData.success || !graphData.success) {
        throw new Error('Failed to load ML data');
      }

      setData({
        signals: signalsData.signals || [],
        anomalies: anomaliesData.anomalies || [],
        graph: graphData.data?.graph || { nodes: 0, edges: 0, averageCorrelation: 0 },
        timestamp: signalsData.timestamp,
      });

      setLastUpdate(new Date());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Авто-обновление каждые 60 секунд
  useEffect(() => {
    loadMLData();
    const interval = setInterval(loadMLData, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-[#d1d4dc]">Loading ML data...</div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-[#ef5350]">Error: {error}</div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="flex flex-col h-full bg-[#1e222d]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#242832]">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-[#d1d4dc]">🤖 ML Analytics</span>
          {lastUpdate && (
            <span className="text-xs text-[#787b86]">
              Updated: {lastUpdate.toLocaleTimeString()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadMLData}
            className="px-3 py-1.5 text-xs bg-[#2a2e39] hover:bg-[#363c4e] rounded text-[#d1d4dc]"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#242832]">
        <button
          onClick={() => setActiveTab('signals')}
          className={`flex-1 px-4 py-2 text-sm font-medium ${
            activeTab === 'signals'
              ? 'text-[#2962ff] border-b-2 border-[#2962ff]'
              : 'text-[#787b86] hover:text-[#d1d4dc]'
          }`}
        >
          📊 Signals ({data.signals.length})
        </button>
        <button
          onClick={() => setActiveTab('anomalies')}
          className={`flex-1 px-4 py-2 text-sm font-medium ${
            activeTab === 'anomalies'
              ? 'text-[#2962ff] border-b-2 border-[#2962ff]'
              : 'text-[#787b86] hover:text-[#d1d4dc]'
          }`}
        >
          ⚠️ Anomalies ({data.anomalies.length})
        </button>
        <button
          onClick={() => setActiveTab('graph')}
          className={`flex-1 px-4 py-2 text-sm font-medium ${
            activeTab === 'graph'
              ? 'text-[#2962ff] border-b-2 border-[#2962ff]'
              : 'text-[#787b86] hover:text-[#d1d4dc]'
          }`}
        >
          🕸️ Graph ({data.graph.nodes} nodes)
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'signals' && <SignalsTab signals={data.signals} />}
        {activeTab === 'anomalies' && <AnomaliesTab anomalies={data.anomalies} />}
        {activeTab === 'graph' && <GraphTab graph={data.graph} />}
      </div>
    </div>
  );
};

// ============================================
// SIGNALS TAB
// ============================================

const SignalsTab: React.FC<{ signals: Signal[] }> = ({ signals }) => {
  const getSignalColor = (signal: string) => {
    switch (signal) {
      case 'BUY':
        return 'bg-[#26a69a]/20 text-[#26a69a] border-[#26a69a]';
      case 'SELL':
        return 'bg-[#ef5350]/20 text-[#ef5350] border-[#ef5350]';
      default:
        return 'bg-[#787b86]/20 text-[#787b86] border-[#787b86]';
    }
  };

  const getSignalIcon = (signal: string) => {
    switch (signal) {
      case 'BUY':
        return '🟢';
      case 'SELL':
        return '🔴';
      default:
        return '⚪';
    }
  };

  return (
    <div className="space-y-3">
      {signals.length === 0 ? (
        <div className="text-center text-[#787b86] py-8">No strong signals</div>
      ) : (
        signals.map((signal, index) => (
          <div
            key={index}
            className="bg-[#2a2e39] rounded-lg p-4 border border-[#363c4e]"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{getSignalIcon(signal.signal)}</span>
                <div>
                  <div className="font-bold text-[#d1d4dc]">{signal.symbol}</div>
                  <div className="text-xs text-[#787b86]">
                    {signal.relatedSymbols.length} related symbols
                  </div>
                </div>
              </div>
              <div
                className={`px-3 py-1 rounded-full text-sm font-medium border ${getSignalColor(
                  signal.signal
                )}`}
              >
                {signal.signal}
              </div>
            </div>

            <div className="mb-3">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-[#787b86]">Confidence</span>
                <span className="text-[#d1d4dc] font-medium">
                  {(signal.confidence * 100).toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-[#363c4e] rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    signal.signal === 'BUY'
                      ? 'bg-[#26a69a]'
                      : signal.signal === 'SELL'
                      ? 'bg-[#ef5350]'
                      : 'bg-[#787b86]'
                  }`}
                  style={{ width: `${signal.confidence * 100}%` }}
                />
              </div>
            </div>

            {signal.reasons.length > 0 && (
              <div className="mb-3">
                <div className="text-xs text-[#787b86] mb-1">Reasons:</div>
                <ul className="space-y-1">
                  {signal.reasons.map((reason, i) => (
                    <li key={i} className="text-sm text-[#d1d4dc] flex items-start gap-2">
                      <span className="text-[#2962ff]">•</span>
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {signal.relatedSymbols.length > 0 && (
              <div>
                <div className="text-xs text-[#787b86] mb-1">Correlated:</div>
                <div className="flex flex-wrap gap-2">
                  {signal.relatedSymbols.slice(0, 5).map((rel, i) => (
                    <span
                      key={i}
                      className={`px-2 py-1 text-xs rounded ${
                        rel.influence === 'positive'
                          ? 'bg-[#26a69a]/20 text-[#26a69a]'
                          : 'bg-[#ef5350]/20 text-[#ef5350]'
                      }`}
                    >
                      {rel.symbol.split('/')[0]} ({(rel.correlation * 100).toFixed(0)}%)
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};

// ============================================
// ANOMALIES TAB
// ============================================

const AnomaliesTab: React.FC<{ anomalies: Anomaly[] }> = ({ anomalies }) => {
  const getSeverityColor = (severity: number) => {
    if (severity > 0.7) return 'text-[#ef5350]';
    if (severity > 0.4) return 'text-[#ff9800]';
    return 'text-[#26a69a]';
  };

  const getSeverityIcon = (severity: number) => {
    if (severity > 0.7) return '🔴';
    if (severity > 0.4) return '🟡';
    return '🟢';
  };

  return (
    <div className="space-y-3">
      {anomalies.length === 0 ? (
        <div className="text-center text-[#26a69a] py-8">
          ✅ No anomalies detected
        </div>
      ) : (
        anomalies.map((anomaly, index) => (
          <div
            key={index}
            className="bg-[#2a2e39] rounded-lg p-4 border border-[#363c4e]"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="text-xl">{getSeverityIcon(anomaly.severity)}</span>
                <div>
                  <div className="font-bold text-[#d1d4dc]">{anomaly.symbol}</div>
                  <div className="text-xs text-[#787b86]">{anomaly.anomalyType}</div>
                </div>
              </div>
              <div className={`text-sm font-medium ${getSeverityColor(anomaly.severity)}`}>
                {(anomaly.severity * 100).toFixed(1)}%
              </div>
            </div>

            <div className="text-sm text-[#d1d4dc]">{anomaly.description}</div>

            <div className="w-full bg-[#363c4e] rounded-full h-1.5 mt-3">
              <div
                className={`h-1.5 rounded-full ${getSeverityColor(anomaly.severity).replace('text-', 'bg-')}`}
                style={{ width: `${anomaly.severity * 100}%` }}
              />
            </div>
          </div>
        ))
      )}
    </div>
  );
};

// ============================================
// GRAPH TAB
// ============================================

const GraphTab: React.FC<{ graph: GraphData }> = ({ graph }) => {
  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#2a2e39] rounded-lg p-4">
          <div className="text-xs text-[#787b86] mb-1">Nodes</div>
          <div className="text-2xl font-bold text-[#d1d4dc]">{graph.nodes}</div>
        </div>
        <div className="bg-[#2a2e39] rounded-lg p-4">
          <div className="text-xs text-[#787b86] mb-1">Edges</div>
          <div className="text-2xl font-bold text-[#d1d4dc]">{graph.edges}</div>
        </div>
        <div className="bg-[#2a2e39] rounded-lg p-4">
          <div className="text-xs text-[#787b86] mb-1">Avg Correlation</div>
          <div className="text-2xl font-bold text-[#d1d4dc]">
            {(graph.averageCorrelation * 100).toFixed(1)}%
          </div>
        </div>
        <div className="bg-[#2a2e39] rounded-lg p-4">
          <div className="text-xs text-[#787b86] mb-1">Max Correlation</div>
          <div className="text-2xl font-bold text-[#2962ff]">
            {graph.maxCorrelation ? (graph.maxCorrelation.value * 100).toFixed(0) : 'N/A'}%
          </div>
        </div>
      </div>

      {/* Max Correlation Pair */}
      {graph.maxCorrelation && (
        <div className="bg-[#2a2e39] rounded-lg p-4 border border-[#363c4e]">
          <div className="text-xs text-[#787b86] mb-2">Strongest Correlation</div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[#d1d4dc] font-medium">
                {graph.maxCorrelation.pair[0]}
              </span>
              <span className="text-[#787b86]">↔</span>
              <span className="text-[#d1d4dc] font-medium">
                {graph.maxCorrelation.pair[1]}
              </span>
            </div>
            <div className="text-[#26a69a] font-bold">
              {(graph.maxCorrelation.value * 100).toFixed(1)}%
            </div>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="bg-[#2962ff]/10 border border-[#2962ff]/30 rounded-lg p-4">
        <div className="text-sm text-[#2962ff]">
          ℹ️ Graph analysis based on {graph.nodes} symbols with {graph.edges} significant
          correlations
        </div>
      </div>
    </div>
  );
};

export default MLDashboard;
