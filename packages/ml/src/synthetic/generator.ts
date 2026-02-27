// ============================================
// SYNTHETIC DATA MODULE
// Генерация синтетических рыночных данных
// ============================================

import { Candle } from '@trading-platform/core';

// ============================================
// TYPES
// ============================================

export interface SyntheticDataConfig {
  method: 'bootstrap' | 'gbm' | 'vae' | 'gan' | 'monte_carlo';
  count: number;           // Количество синтетических свечей
  volatility: number;      // Множитель волатильности (1.0 = как в оригинале)
  trend: number;           // Наклон тренда (-1 до 1)
  addNoise: boolean;       // Добавить шум
  noiseLevel: number;      // Уровень шума (0-1)
  preserveCorrelations: boolean; // Сохранять корреляции между символами
  seed?: number;           // Для воспроизводимости
}

export interface StressTestConfig {
  scenario: 'crash' | 'flash_crash' | 'pump' | 'sideways' | 'high_volatility';
  severity: number;        // 0-1, где 1 = максимальный стресс
  duration: number;        // Количество свечей стресс-периода
  startOffset?: number;    // Где начать стресс (0-1 от длины данных)
}

// ============================================
// SYNTHETIC DATA GENERATOR
// ============================================

export class SyntheticDataGenerator {
  private seedValue: number = Date.now();

  constructor(seed?: number) {
    if (seed !== undefined) {
      this.seedValue = seed;
    }
  }

  /**
   * Генерирует синтетические данные на основе исторических
   */
  generate(
    historicalData: Candle[],
    config: SyntheticDataConfig
  ): Candle[] {
    switch (config.method) {
      case 'bootstrap':
        return this.bootstrap(historicalData, config);
      case 'gbm':
        return this.geometricBrownianMotion(historicalData, config);
      case 'monte_carlo':
        return this.monteCarlo(historicalData, config);
      case 'vae':
      case 'gan':
        // Упрощенная версия - в продакшене использовать настоящие VAE/GAN
        return this.geometricBrownianMotion(historicalData, config);
      default:
        return this.bootstrap(historicalData, config);
    }
  }

  /**
   * Генерирует стресс-тест сценарий
   */
  generateStressTest(
    historicalData: Candle[],
    config: StressTestConfig
  ): Candle[] {
    const result = [...historicalData];
    const startIndex = Math.floor(
      historicalData.length * (config.startOffset || 0.5)
    );

    for (let i = startIndex; i < Math.min(startIndex + config.duration, result.length); i++) {
      result[i] = this.applyStress(result[i], config, i - startIndex);
    }

    return result;
  }

  /**
   * Генерирует множественные пути для Monte Carlo анализа
   */
  generatePaths(
    historicalData: Candle[],
    config: SyntheticDataConfig,
    numPaths: number
  ): Candle[][] {
    const paths: Candle[][] = [];
    
    for (let i = 0; i < numPaths; i++) {
      const path = this.generate(historicalData, {
        ...config,
        seed: this.seedValue + i,
      });
      paths.push(path);
    }
    
    return paths;
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  private bootstrap(historicalData: Candle[], config: SyntheticDataConfig): Candle[] {
    // Метод бутстрапа - случайная выборка с заменой
    const result: Candle[] = [];
    const length = config.count || historicalData.length;
    
    this.setSeed(config.seed);
    
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(this.random() * historicalData.length);
      const candle = historicalData[randomIndex];
      
      result.push({
        ...candle,
        timestamp: this.getNextTimestamp(result.length > 0 ? result[result.length - 1].timestamp : candle.timestamp),
        open: this.applyModifiers(candle.open, config),
        high: this.applyModifiers(candle.high, config),
        low: this.applyModifiers(candle.low, config),
        close: this.applyModifiers(candle.close, config),
        volume: this.applyModifiers(candle.volume, { ...config, volatility: config.volatility * 1.5 }),
      });
    }
    
    return result;
  }

  private geometricBrownianMotion(historicalData: Candle[], config: SyntheticDataConfig): Candle[] {
    // Геометрическое броуновское движение
    const result: Candle[] = [];
    const length = config.count || historicalData.length;
    
    this.setSeed(config.seed);
    
    // Расчет параметров из исторических данных
    const returns = this.calculateReturns(historicalData);
    const mu = returns.reduce((a, b) => a + b, 0) / returns.length; // Дрейф
    const sigma = Math.sqrt(
      returns.reduce((sum, r) => sum + Math.pow(r - mu, 2), 0) / returns.length
    ); // Волатильность
    
    let price = historicalData[historicalData.length - 1].close;
    const dt = 1; // Временной шаг
    
    for (let i = 0; i < length; i++) {
      const dW = this.gaussianRandom() * Math.sqrt(dt); // Винеровский процесс
      const drift = (mu * config.trend) * dt;
      const diffusion = (sigma * config.volatility) * dW;
      
      price = price * Math.exp(drift + diffusion);
      
      const open = price;
      const close = price * (1 + (this.random() - 0.5) * 0.02);
      const high = Math.max(open, close) * (1 + this.random() * 0.01);
      const low = Math.min(open, close) * (1 - this.random() * 0.01);
      const volume = historicalData[historicalData.length - 1].volume * (0.5 + this.random());
      
      result.push({
        timestamp: this.getNextTimestamp(result.length > 0 ? result[result.length - 1].timestamp : historicalData[historicalData.length - 1].timestamp),
        open,
        high,
        low,
        close,
        volume,
        symbol: historicalData[0].symbol,
        interval: historicalData[0].interval,
      });
    }
    
    return result;
  }

  private monteCarlo(historicalData: Candle[], config: SyntheticDataConfig): Candle[] {
    // Monte Carlo симуляция на основе исторических распределений
    const result: Candle[] = [];
    const length = config.count || historicalData.length;
    
    this.setSeed(config.seed);
    
    // Гистограмма доходностей
    const returns = this.calculateReturns(historicalData);
    const bins = this.createHistogram(returns, 50);
    
    let price = historicalData[historicalData.length - 1].close;
    
    for (let i = 0; i < length; i++) {
      // Выборка из гистограммы
      const binIndex = Math.floor(this.random() * bins.length);
      const bin = bins[binIndex];
      const returnSample = bin.min + this.random() * (bin.max - bin.min);
      
      price = price * (1 + returnSample * config.volatility + config.trend * 0.001);
      
      const open = price;
      const close = price * (1 + (this.random() - 0.5) * 0.02);
      const high = Math.max(open, close) * (1 + this.random() * 0.01 * config.volatility);
      const low = Math.min(open, close) * (1 - this.random() * 0.01 * config.volatility);
      const volume = historicalData[historicalData.length - 1].volume * (0.5 + this.random());
      
      result.push({
        timestamp: this.getNextTimestamp(result.length > 0 ? result[result.length - 1].timestamp : historicalData[historicalData.length - 1].timestamp),
        open,
        high,
        low,
        close,
        volume,
        symbol: historicalData[0].symbol,
        interval: historicalData[0].interval,
      });
    }
    
    return result;
  }

  private applyStress(candle: Candle, config: StressTestConfig, progress: number): Candle {
    // Применение стресс-сценария
    const severity = config.severity;
    const progressFactor = Math.sin((progress / config.duration) * Math.PI); // Плавное нарастание и спад
    
    let priceMultiplier = 1;
    let volumeMultiplier = 1;
    
    switch (config.scenario) {
      case 'crash':
        priceMultiplier = 1 - (severity * progressFactor * 0.3); // До -30%
        volumeMultiplier = 1 + (severity * progressFactor * 5); // До 5x объема
        break;
        
      case 'flash_crash':
        const flashPoint = config.duration / 2;
        if (Math.abs(progress - flashPoint) < config.duration * 0.1) {
          priceMultiplier = 1 - (severity * 0.5); // Быстрое падение на 50%
          volumeMultiplier = 1 + (severity * 10);
        }
        break;
        
      case 'pump':
        priceMultiplier = 1 + (severity * progressFactor * 0.5); // До +50%
        volumeMultiplier = 1 + (severity * progressFactor * 3);
        break;
        
      case 'sideways':
        priceMultiplier = 1 + (this.random() - 0.5) * 0.02 * (1 - severity);
        volumeMultiplier = 0.5 + (this.random() * 0.5);
        break;
        
      case 'high_volatility':
        const volFactor = 1 + (severity * 3);
        priceMultiplier = 1 + (this.random() - 0.5) * 0.1 * volFactor;
        volumeMultiplier = 1 + (this.random() * volFactor);
        break;
    }
    
    return {
      ...candle,
      open: candle.open * priceMultiplier,
      high: candle.high * priceMultiplier,
      low: candle.low * priceMultiplier,
      close: candle.close * priceMultiplier,
      volume: candle.volume * volumeMultiplier,
    };
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private calculateReturns(candles: Candle[]): number[] {
    const returns: number[] = [];
    for (let i = 1; i < candles.length; i++) {
      returns.push((candles[i].close - candles[i - 1].close) / candles[i - 1].close);
    }
    return returns;
  }

  private createHistogram(data: number[], bins: number): Array<{ min: number; max: number; count: number }> {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const binWidth = (max - min) / bins;
    
    const histogram = Array.from({ length: bins }, (_, i) => ({
      min: min + i * binWidth,
      max: min + (i + 1) * binWidth,
      count: 0,
    }));
    
    for (const value of data) {
      const binIndex = Math.min(Math.floor((value - min) / binWidth), bins - 1);
      histogram[binIndex].count++;
    }
    
    return histogram;
  }

  private applyModifiers(value: number, config: SyntheticDataConfig): number {
    let modified = value;
    
    // Применение волатильности
    if (config.volatility !== 1) {
      modified = modified * (1 + (this.random() - 0.5) * (config.volatility - 1) * 0.1);
    }
    
    // Применение тренда
    if (config.trend !== 0) {
      modified = modified * (1 + config.trend * 0.001);
    }
    
    // Применение шума
    if (config.addNoise && config.noiseLevel > 0) {
      modified = modified * (1 + (this.random() - 0.5) * config.noiseLevel * 0.1);
    }
    
    return modified;
  }

  private getNextTimestamp(lastTimestamp: number): number {
    // Добавляем 1 час (в миллисекундах)
    return lastTimestamp + 3600000;
  }

  private setSeed(seed?: number): void {
    this.seedValue = seed || Date.now();
  }

  private random(): number {
    // Простой LCG генератор
    this.seedValue = (this.seedValue * 1103515245 + 12345) & 0x7fffffff;
    return this.seedValue / 0x7fffffff;
  }

  private gaussianRandom(): number {
    // Box-Muller transform
    const u1 = this.random();
    const u2 = this.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
}

// ============================================
// STATISTICAL ANALYSIS
// ============================================

export interface StatisticalComparison {
  original: StatisticalMetrics;
  synthetic: StatisticalMetrics;
  divergence: number;  // 0 = идентичны, 1 = полностью разные
}

export interface StatisticalMetrics {
  mean: number;
  stdDev: number;
  skewness: number;
  kurtosis: number;
  autocorrelation: number;
  maxDrawdown: number;
  sharpeRatio: number;
}

export function compareStatistics(
  original: Candle[],
  synthetic: Candle[]
): StatisticalComparison {
  const originalMetrics = calculateMetrics(original);
  const syntheticMetrics = calculateMetrics(synthetic);
  
  // Расчет дивергенции (упрощенная)
  const divergence = Math.sqrt(
    Math.pow(originalMetrics.mean - syntheticMetrics.mean, 2) +
    Math.pow(originalMetrics.stdDev - syntheticMetrics.stdDev, 2) +
    Math.pow(originalMetrics.skewness - syntheticMetrics.skewness, 2)
  ) / 3;
  
  return {
    original: originalMetrics,
    synthetic: syntheticMetrics,
    divergence: Math.min(1, divergence),
  };
}

function calculateMetrics(candles: Candle[]): StatisticalMetrics {
  const closes = candles.map(c => c.close);
  const returns = [];
  for (let i = 1; i < closes.length; i++) {
    returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
  }
  
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  
  // Skewness
  const skewness = returns.reduce((sum, r) => sum + Math.pow((r - mean) / stdDev, 3), 0) / returns.length;
  
  // Kurtosis
  const kurtosis = returns.reduce((sum, r) => sum + Math.pow((r - mean) / stdDev, 4), 0) / returns.length - 3;
  
  // Autocorrelation (lag 1)
  let autocorr = 0;
  for (let i = 1; i < returns.length; i++) {
    autocorr += (returns[i] - mean) * (returns[i - 1] - mean);
  }
  autocorr /= variance * (returns.length - 1);
  
  // Max Drawdown
  let peak = closes[0];
  let maxDD = 0;
  for (const close of closes) {
    if (close > peak) peak = close;
    const dd = (peak - close) / peak;
    if (dd > maxDD) maxDD = dd;
  }
  
  // Sharpe Ratio (annualized, assuming daily returns)
  const sharpe = mean > 0 ? (mean / stdDev) * Math.sqrt(252) : 0;
  
  return {
    mean,
    stdDev,
    skewness,
    kurtosis,
    autocorrelation: autocorr,
    maxDrawdown: maxDD,
    sharpeRatio: sharpe,
  };
}

// ============================================
// EXPORTS
// ============================================

export default SyntheticDataGenerator;
