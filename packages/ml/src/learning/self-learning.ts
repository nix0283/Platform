// ============================================
// SELF-LEARNING TRADING SYSTEM
// Самообучение на действиях трейдера
// ============================================

import { TradeAction, PatternRecognition } from '../tracker/action-tracker';

export interface LearningModel {
  id: string;
  version: number;
  createdAt: number;
  updatedAt: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  
  // Pattern analysis
  patterns: PatternStats[];
  
  // Indicator effectiveness
  indicators: IndicatorStats[];
  
  // Timeframe performance
  timeframes: TimeframeStats[];
  
  // Context preferences
  contexts: ContextStats[];
  
  // Suggestions
  suggestions: TradingSuggestion[];
}

export interface PatternStats {
  name: string;
  occurrences: number;
  wins: number;
  losses: number;
  winRate: number;
  avgPnl: number;
  avgPnlPercent: number;
  confidence: number;
}

export interface IndicatorStats {
  name: string;
  occurrences: number;
  wins: number;
  losses: number;
  winRate: number;
  avgPnl: number;
  optimalParams?: Record<string, number>;
}

export interface TimeframeStats {
  timeframe: string;
  occurrences: number;
  wins: number;
  losses: number;
  winRate: number;
  avgPnl: number;
  avgDuration: number;
}

export interface ContextStats {
  context: string;
  occurrences: number;
  wins: number;
  losses: number;
  winRate: number;
  avgPnl: number;
}

export interface TradingSuggestion {
  id: string;
  type: 'entry' | 'exit' | 'risk' | 'pattern' | 'indicator';
  priority: 'high' | 'medium' | 'low';
  message: string;
  confidence: number;
  basedOn: number; // number of similar trades
  action?: {
    type: string;
    params: Record<string, any>;
  };
}

// ============================================
// SELF-LEARNING ENGINE
// ============================================

export class SelfLearningEngine {
  private model: LearningModel | null = null;
  private actions: TradeAction[] = [];
  private minTradesForLearning: number = 20;

  constructor() {
    this.loadModel();
  }

  // ============================================
  // LEARNING
  // ============================================

  async learnFromActions(actions: TradeAction[]): Promise<LearningModel> {
    this.actions = actions.filter(a => a.outcome); // Only completed trades

    if (this.actions.length < this.minTradesForLearning) {
      console.log(
        `⚠️ Need at least ${this.minTradesForLearning} trades for learning (have ${this.actions.length})`
      );
      return this.createEmptyModel();
    }

    console.log(`🧠 Learning from ${this.actions.length} trades...`);

    const model: LearningModel = {
      id: `model_${Date.now()}`,
      version: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      totalTrades: this.actions.length,
      winningTrades: this.actions.filter(a => (a.outcome?.pnl || 0) > 0).length,
      losingTrades: this.actions.filter(a => (a.outcome?.pnl || 0) <= 0).length,
      patterns: this.analyzePatterns(),
      indicators: this.analyzeIndicators(),
      timeframes: this.analyzeTimeframes(),
      contexts: this.analyzeContexts(),
      suggestions: this.generateSuggestions(),
    };

    this.model = model;
    this.saveModel();

    console.log(`✅ Model trained: ${model.winningTrades}/${model.totalTrades} wins (${((model.winningTrades / model.totalTrades) * 100).toFixed(1)}%)`);

    return model;
  }

  private analyzePatterns(): PatternStats[] {
    const patternGroups: Record<string, TradeAction[]> = {};

    for (const action of this.actions) {
      const pattern = action.candlePattern || 'No Pattern';
      if (!patternGroups[pattern]) {
        patternGroups[pattern] = [];
      }
      patternGroups[pattern].push(action);
    }

    return Object.entries(patternGroups).map(([name, trades]) => {
      const wins = trades.filter(a => (a.outcome?.pnl || 0) > 0).length;
      const losses = trades.length - wins;
      const winRate = (wins / trades.length) * 100;
      const avgPnl = trades.reduce((sum, a) => sum + (a.outcome?.pnl || 0), 0) / trades.length;
      const avgPnlPercent = trades.reduce((sum, a) => sum + (a.outcome?.pnlPercent || 0), 0) / trades.length;

      // Confidence based on sample size and consistency
      const confidence = this.calculateConfidence(trades.length, winRate);

      return {
        name,
        occurrences: trades.length,
        wins,
        losses,
        winRate,
        avgPnl,
        avgPnlPercent,
        confidence,
      };
    }).sort((a, b) => b.confidence - a.confidence);
  }

  private analyzeIndicators(): IndicatorStats[] {
    const indicatorGroups: Record<string, TradeAction[]> = {};

    for (const action of this.actions) {
      for (const indicator of action.chartState.indicators) {
        const key = indicator.name;
        if (!indicatorGroups[key]) {
          indicatorGroups[key] = [];
        }
        indicatorGroups[key].push(action);
      }
    }

    return Object.entries(indicatorGroups).map(([name, trades]) => {
      const wins = trades.filter(a => (a.outcome?.pnl || 0) > 0).length;
      const losses = trades.length - wins;
      const winRate = (wins / trades.length) * 100;
      const avgPnl = trades.reduce((sum, a) => sum + (a.outcome?.pnl || 0), 0) / trades.length;

      return {
        name,
        occurrences: trades.length,
        wins,
        losses,
        winRate,
        avgPnl,
      };
    }).sort((a, b) => b.occurrences - a.occurrences);
  }

  private analyzeTimeframes(): TimeframeStats[] {
    const tfGroups: Record<string, TradeAction[]> = {};

    for (const action of this.actions) {
      const tf = action.chartState.timeframe;
      if (!tfGroups[tf]) {
        tfGroups[tf] = [];
      }
      tfGroups[tf].push(action);
    }

    return Object.entries(tfGroups).map(([timeframe, trades]) => {
      const wins = trades.filter(a => (a.outcome?.pnl || 0) > 0).length;
      const losses = trades.length - wins;
      const winRate = (wins / trades.length) * 100;
      const avgPnl = trades.reduce((sum, a) => sum + (a.outcome?.pnl || 0), 0) / trades.length;
      const avgDuration = trades.reduce((sum, a) => sum + (a.outcome?.duration || 0), 0) / trades.length;

      return {
        timeframe,
        occurrences: trades.length,
        wins,
        losses,
        winRate,
        avgPnl,
        avgDuration,
      };
    }).sort((a, b) => b.winRate - a.winRate);
  }

  private analyzeContexts(): ContextStats[] {
    const contextGroups: Record<string, TradeAction[]> = {};

    for (const action of this.actions) {
      // Create context string from multiple factors
      const contextParts: string[] = [];

      if (action.candlePattern) {
        contextParts.push(action.candlePattern);
      }

      if (action.chartState.indicators.length > 0) {
        contextParts.push(`${action.chartState.indicators.length} indicators`);
      }

      if (action.supportLevels && action.supportLevels.length > 0) {
        contextParts.push('Near Support');
      }

      if (action.resistanceLevels && action.resistanceLevels.length > 0) {
        contextParts.push('Near Resistance');
      }

      const context = contextParts.join(' + ') || 'No Context';

      if (!contextGroups[context]) {
        contextGroups[context] = [];
      }
      contextGroups[context].push(action);
    }

    return Object.entries(contextGroups).map(([context, trades]) => {
      const wins = trades.filter(a => (a.outcome?.pnl || 0) > 0).length;
      const losses = trades.length - wins;
      const winRate = (wins / trades.length) * 100;
      const avgPnl = trades.reduce((sum, a) => sum + (a.outcome?.pnl || 0), 0) / trades.length;

      return {
        context,
        occurrences: trades.length,
        wins,
        losses,
        winRate,
        avgPnl,
      };
    }).sort((a, b) => b.winRate - a.winRate);
  }

  private generateSuggestions(): TradingSuggestion[] {
    const suggestions: TradingSuggestion[] = [];

    if (!this.model) return suggestions;

    // Suggestion 1: Best performing pattern
    const bestPattern = this.model.patterns.find(p => p.occurrences >= 5 && p.winRate > 60);
    if (bestPattern) {
      suggestions.push({
        id: `suggestion_${Date.now()}_1`,
        type: 'pattern',
        priority: 'high',
        message: `Pattern "${bestPattern.name}" has ${bestPattern.winRate.toFixed(1)}% success rate (${bestPattern.occurrences} trades)`,
        confidence: bestPattern.confidence,
        basedOn: bestPattern.occurrences,
      });
    }

    // Suggestion 2: Best timeframe
    const bestTimeframe = this.model.timeframes.find(tf => tf.occurrences >= 5 && tf.winRate > 60);
    if (bestTimeframe) {
      suggestions.push({
        id: `suggestion_${Date.now()}_2`,
        type: 'entry',
        priority: 'medium',
        message: `Timeframe "${bestTimeframe.timeframe}" shows ${bestTimeframe.winRate.toFixed(1)}% win rate`,
        confidence: (bestTimeframe.winRate / 100),
        basedOn: bestTimeframe.occurrences,
      });
    }

    // Suggestion 3: Best indicator
    const bestIndicator = this.model.indicators.find(ind => ind.occurrences >= 5 && ind.winRate > 60);
    if (bestIndicator) {
      suggestions.push({
        id: `suggestion_${Date.now()}_3`,
        type: 'indicator',
        priority: 'medium',
        message: `Using "${bestIndicator.name}" correlates with ${bestIndicator.winRate.toFixed(1)}% win rate`,
        confidence: (bestIndicator.winRate / 100),
        basedOn: bestIndicator.occurrences,
      });
    }

    // Suggestion 4: Risk management
    const avgLosingTrade = this.actions
      .filter(a => (a.outcome?.pnl || 0) < 0)
      .reduce((sum, a) => sum + (a.outcome?.pnl || 0), 0) / 
      this.actions.filter(a => (a.outcome?.pnl || 0) < 0).length || 0;

    if (avgLosingTrade < -100) {
      suggestions.push({
        id: `suggestion_${Date.now()}_4`,
        type: 'risk',
        priority: 'high',
        message: `Average losing trade is $${Math.abs(avgLosingTrade).toFixed(2)}. Consider reducing position size.`,
        confidence: 0.8,
        basedOn: this.actions.filter(a => (a.outcome?.pnl || 0) < 0).length,
      });
    }

    return suggestions;
  }

  private calculateConfidence(sampleSize: number, winRate: number): number {
    // Confidence based on sample size and consistency
    const sampleFactor = Math.min(1, sampleSize / 30); // Max confidence at 30+ samples
    const consistencyFactor = winRate > 50 ? winRate / 100 : (100 - winRate) / 100;
    
    return (sampleFactor * 0.6 + consistencyFactor * 0.4);
  }

  // ============================================
  // REAL-TIME SUGGESTIONS
  // ============================================

  getSuggestionsForCurrentContext(currentChartState: any): TradingSuggestion[] {
    if (!this.model) return [];

    const suggestions: TradingSuggestion[] = [];

    // Check if current context matches high-probability patterns
    for (const pattern of this.model.patterns.filter(p => p.winRate > 60 && p.occurrences >= 5)) {
      suggestions.push({
        id: `realtime_${Date.now()}_${pattern.name}`,
        type: 'pattern',
        priority: pattern.winRate > 70 ? 'high' : 'medium',
        message: `Pattern "${pattern.name}" detected. Historical success: ${pattern.winRate.toFixed(1)}%`,
        confidence: pattern.confidence,
        basedOn: pattern.occurrences,
      });
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
  }

  // ============================================
  // MODEL MANAGEMENT
  // ============================================

  private createEmptyModel(): LearningModel {
    return {
      id: `model_${Date.now()}`,
      version: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      patterns: [],
      indicators: [],
      timeframes: [],
      contexts: [],
      suggestions: [],
    };
  }

  private saveModel() {
    if (typeof window === 'undefined' || !this.model) return;

    try {
      localStorage.setItem('ml_model', JSON.stringify(this.model));
    } catch (error) {
      console.error('Failed to save ML model:', error);
    }
  }

  private loadModel() {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem('ml_model');
      if (stored) {
        this.model = JSON.parse(stored);
        console.log(`Loaded ML model: ${this.model.totalTrades} trades analyzed`);
      }
    } catch (error) {
      console.error('Failed to load ML model:', error);
    }
  }

  getModel(): LearningModel | null {
    return this.model;
  }

  reset() {
    this.model = null;
    this.actions = [];
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ml_model');
    }
  }
}

export default SelfLearningEngine;
