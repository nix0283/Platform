// ============================================
// GRAPH NEURAL NETWORK MODULE
// Анализ корреляций и связей между активами
// ============================================

import { Candle } from '@trading-platform/core';

// ============================================
// TYPES
// ============================================

export interface GraphNode {
  id: string;           // Символ (BTC/USDT)
  features: number[];   // Признаки узла
  metadata: {
    symbol: string;
    exchange: string;
    sector?: string;    // Например: L1, DeFi, Meme
  };
}

export interface GraphEdge {
  source: string;       // Исходный узел
  target: string;       // Целевой узел
  weight: number;       // Вес ребра (корреляция)
  type: 'correlation' | 'causation' | 'similarity';
  lag?: number;         // Временной лаг для причинности
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  timestamp: number;
}

export interface CorrelationMatrix {
  symbols: string[];
  matrix: number[][];
  timestamp: number;
}

export interface GraphSignal {
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

// ============================================
// CORRELATION GRAPH BUILDER
// ============================================

export class CorrelationGraphBuilder {
  private lookbackWindow: number;
  private correlationThreshold: number;
  private maxEdges: number;

  constructor(config: {
    lookbackWindow?: number;
    correlationThreshold?: number;
    maxEdges?: number;
  } = {}) {
    this.lookbackWindow = config.lookbackWindow || 60;
    this.correlationThreshold = config.correlationThreshold || 0.5;
    this.maxEdges = config.maxEdges || 100;
  }

  /**
   * Построение графа корреляций из данных
   */
  build(candlesBySymbol: Record<string, Candle[]>): GraphData {
    const symbols = Object.keys(candlesBySymbol);
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    // Создание узлов
    for (const symbol of symbols) {
      const candles = candlesBySymbol[symbol];
      if (candles.length < this.lookbackWindow) continue;

      const features = this.extractFeatures(candles);
      nodes.push({
        id: symbol,
        features,
        metadata: {
          symbol,
          exchange: this.extractExchange(symbol),
          sector: this.inferSector(symbol),
        },
      });
    }

    // Расчет корреляционной матрицы
    const correlationMatrix = this.calculateCorrelationMatrix(candlesBySymbol);

    // Создание ребер
    for (let i = 0; i < correlationMatrix.symbols.length; i++) {
      for (let j = i + 1; j < correlationMatrix.symbols.length; j++) {
        const correlation = correlationMatrix.matrix[i][j];
        
        if (Math.abs(correlation) >= this.correlationThreshold) {
          edges.push({
            source: correlationMatrix.symbols[i],
            target: correlationMatrix.symbols[j],
            weight: correlation,
            type: 'correlation',
          });
        }
      }
    }

    // Ограничение количества ребер
    edges.sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));
    const trimmedEdges = edges.slice(0, this.maxEdges);

    return {
      nodes,
      edges: trimmedEdges,
      timestamp: Date.now(),
    };
  }

  /**
   * Обнаружение аномалий в графе
   */
  detectAnomalies(
    currentGraph: GraphData,
    historicalGraphs: GraphData[]
  ): Array<{
    symbol: string;
    anomalyType: 'correlation_break' | 'isolation' | 'hub';
    severity: number;
    description: string;
  }> {
    const anomalies: Array<{
      symbol: string;
      anomalyType: 'correlation_break' | 'isolation' | 'hub';
      severity: number;
      description: string;
    }> = [];

    if (historicalGraphs.length === 0) return anomalies;

    // Средняя историческая корреляция для каждого узла
    const avgConnections = new Map<string, number>();
    for (const graph of historicalGraphs) {
      for (const edge of graph.edges) {
        avgConnections.set(
          edge.source,
          (avgConnections.get(edge.source) || 0) + 1
        );
        avgConnections.set(
          edge.target,
          (avgConnections.get(edge.target) || 0) + 1
        );
      }
    }
    for (const [symbol, count] of avgConnections.entries()) {
      avgConnections.set(symbol, count / historicalGraphs.length);
    }

    // Проверка текущих узлов
    for (const node of currentGraph.nodes) {
      const currentConnections = currentGraph.edges.filter(
        e => e.source === node.id || e.target === node.id
      ).length;
      const historicalAvg = avgConnections.get(node.id) || 0;

      // Изоляция (резкое падение связей)
      if (historicalAvg > 3 && currentConnections < historicalAvg * 0.3) {
        anomalies.push({
          symbol: node.id,
          anomalyType: 'isolation',
          severity: 1 - currentConnections / historicalAvg,
          description: `Аномальная изоляция: ${currentConnections} связей vs ${historicalAvg.toFixed(1)} исторических`,
        });
      }

      // Хаб (резкий рост связей)
      if (currentConnections > historicalAvg * 3) {
        anomalies.push({
          symbol: node.id,
          anomalyType: 'hub',
          severity: Math.min(1, currentConnections / historicalAvg / 3),
          description: `Аномальный хаб: ${currentConnections} связей vs ${historicalAvg.toFixed(1)} исторических`,
        });
      }
    }

    // Проверка разрыва корреляций
    const historicalCorrelations = this.calculateAverageCorrelations(historicalGraphs);
    for (const edge of currentGraph.edges) {
      const historicalCorr = historicalCorrelations.get(
        `${edge.source}-${edge.target}`
      ) || historicalCorrelations.get(`${edge.target}-${edge.source}`);

      if (historicalCorr !== undefined) {
        const correlationChange = Math.abs(edge.weight - historicalCorr);
        if (correlationChange > 0.5) {
          anomalies.push({
            symbol: edge.source,
            anomalyType: 'correlation_break',
            severity: correlationChange,
            description: `Разрыв корреляции с ${edge.target}: ${historicalCorr.toFixed(2)} → ${edge.weight.toFixed(2)}`,
          });
        }
      }
    }

    return anomalies.sort((a, b) => b.severity - a.severity);
  }

  /**
   * Генерация торговых сигналов на основе графа
   */
  generateSignals(graph: GraphData, priceChanges: Record<string, number>): GraphSignal[] {
    const signals: GraphSignal[] = [];

    for (const node of graph.nodes) {
      const edges = graph.edges.filter(e => e.source === node.id || e.target === node.id);
      const relatedSymbols: Array<{
        symbol: string;
        correlation: number;
        influence: 'positive' | 'negative';
      }> = [];

      // Анализ влияния соседей
      let expectedMove = 0;
      let totalWeight = 0;

      for (const edge of edges) {
        const neighbor = edge.source === node.id ? edge.target : edge.source;
        const neighborChange = priceChanges[neighbor] || 0;
        const influence = edge.weight * neighborChange;

        expectedMove += influence;
        totalWeight += Math.abs(edge.weight);

        relatedSymbols.push({
          symbol: neighbor,
          correlation: edge.weight,
          influence: edge.weight > 0 ? 'positive' : 'negative',
        });
      }

      if (totalWeight > 0) {
        expectedMove /= totalWeight;
      }

      // Генерация сигнала
      const threshold = 0.02; // 2% порог
      let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
      let confidence = 0;

      if (expectedMove > threshold) {
        signal = 'BUY';
        confidence = Math.min(1, expectedMove / threshold);
      } else if (expectedMove < -threshold) {
        signal = 'SELL';
        confidence = Math.min(1, Math.abs(expectedMove) / threshold);
      } else {
        confidence = 1 - Math.abs(expectedMove) / threshold;
      }

      signals.push({
        symbol: node.id,
        signal,
        confidence,
        reasons: this.generateReasons(signal, expectedMove, relatedSymbols),
        relatedSymbols: relatedSymbols.slice(0, 5),
      });
    }

    return signals.sort((a, b) => b.confidence - a.confidence);
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  private extractFeatures(candles: Candle[]): number[] {
    const closes = candles.slice(-this.lookbackWindow).map(c => c.close);
    const returns = [];
    for (let i = 1; i < closes.length; i++) {
      returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
    }

    // Статистические признаки
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    const min = Math.min(...returns);
    const max = Math.max(...returns);

    // Технические признаки
    const sma20 = closes.length >= 20 ? closes.slice(-20).reduce((a, b) => a + b, 0) / 20 : closes[closes.length - 1];
    const priceToSMA = closes[closes.length - 1] / sma20;

    return [mean, stdDev, min, max, priceToSMA, returns[returns.length - 1] || 0];
  }

  private calculateCorrelationMatrix(candlesBySymbol: Record<string, Candle[]>): CorrelationMatrix {
    const symbols = Object.keys(candlesBySymbol).filter(
      s => candlesBySymbol[s].length >= this.lookbackWindow
    );
    const returns: Record<string, number[]> = {};

    // Расчет доходностей
    for (const symbol of symbols) {
      const closes = candlesBySymbol[symbol]
        .slice(-this.lookbackWindow)
        .map(c => c.close);
      returns[symbol] = [];
      for (let i = 1; i < closes.length; i++) {
        returns[symbol].push((closes[i] - closes[i - 1]) / closes[i - 1]);
      }
    }

    // Расчет корреляций
    const matrix: number[][] = [];
    for (let i = 0; i < symbols.length; i++) {
      matrix[i] = [];
      for (let j = 0; j < symbols.length; j++) {
        if (i === j) {
          matrix[i][j] = 1;
        } else {
          matrix[i][j] = this.calculatePearsonCorrelation(
            returns[symbols[i]],
            returns[symbols[j]]
          );
        }
      }
    }

    return {
      symbols,
      matrix,
      timestamp: Date.now(),
    };
  }

  private calculatePearsonCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    if (n === 0) return 0;

    const meanX = x.slice(0, n).reduce((a, b) => a + b, 0) / n;
    const meanY = y.slice(0, n).reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let sumX2 = 0;
    let sumY2 = 0;

    for (let i = 0; i < n; i++) {
      const dx = x[i] - meanX;
      const dy = y[i] - meanY;
      numerator += dx * dy;
      sumX2 += dx * dx;
      sumY2 += dy * dy;
    }

    const denominator = Math.sqrt(sumX2 * sumY2);
    return denominator === 0 ? 0 : numerator / denominator;
  }

  private calculateAverageCorrelations(graphs: GraphData[]): Map<string, number> {
    const correlations = new Map<string, number[]>();

    for (const graph of graphs) {
      for (const edge of graph.edges) {
        const key = edge.source < edge.target 
          ? `${edge.source}-${edge.target}` 
          : `${edge.target}-${edge.source}`;
        
        if (!correlations.has(key)) {
          correlations.set(key, []);
        }
        correlations.get(key)!.push(edge.weight);
      }
    }

    const averages = new Map<string, number>();
    for (const [key, values] of correlations.entries()) {
      averages.set(
        key,
        values.reduce((a, b) => a + b, 0) / values.length
      );
    }

    return averages;
  }

  private generateReasons(
    signal: 'BUY' | 'SELL' | 'HOLD',
    expectedMove: number,
    relatedSymbols: Array<{ symbol: string; correlation: number; influence: 'positive' | 'negative' }>
  ): string[] {
    const reasons: string[] = [];

    if (signal === 'BUY') {
      reasons.push(`Ожидаемый рост: ${(expectedMove * 100).toFixed(2)}%`);
      const positiveInfluencers = relatedSymbols.filter(r => r.influence === 'positive' && r.correlation > 0.7);
      if (positiveInfluencers.length > 0) {
        reasons.push(`Сильная корреляция с ростом ${positiveInfluencers.map(s => s.symbol).join(', ')}`);
      }
    } else if (signal === 'SELL') {
      reasons.push(`Ожидаемое падение: ${(Math.abs(expectedMove) * 100).toFixed(2)}%`);
      const negativeInfluencers = relatedSymbols.filter(r => r.influence === 'negative' && Math.abs(r.correlation) > 0.7);
      if (negativeInfluencers.length > 0) {
        reasons.push(`Обратная корреляция с ${negativeInfluencers.map(s => s.symbol).join(', ')}`);
      }
    } else {
      reasons.push('Недостаточно сигналов для входа');
    }

    return reasons;
  }

  private extractExchange(symbol: string): string {
    if (symbol.includes('BINANCE')) return 'binance';
    if (symbol.includes('BYBIT')) return 'bybit';
    return 'unknown';
  }

  private inferSector(symbol: string): string {
    const base = symbol.split('/')[0];
    if (['BTC', 'ETH'].includes(base)) return 'L1';
    if (['UNI', 'AAVE', 'COMP'].includes(base)) return 'DeFi';
    if (['DOGE', 'SHIB', 'PEPE'].includes(base)) return 'Meme';
    return 'Other';
  }
}

// ============================================
// EXPORTS
// ============================================

export default CorrelationGraphBuilder;
