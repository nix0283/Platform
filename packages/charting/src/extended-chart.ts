// ============================================
// EXTENDED CHARTING ENGINE
// Расширение Lightweight Charts с дополнительным функционалом
// ============================================

import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  LineData,
  HistogramData,
  Time,
  UTCTimestamp,
  ColorType,
  ChartOptions,
} from 'lightweight-charts';

import { Candle, Indicator, Drawing, ChartConfig } from '@trading-platform/core';

// --- Расширенные данные для индикаторов ---
export interface IndicatorData {
  time: Time;
  value?: number;
  color?: string;
}

export interface PaneData {
  id: string;
  height: number;
  series: ISeriesApi<'Line' | 'Histogram'>[];
}

// --- Конфигурация расширенного графика ---
export interface ExtendedChartOptions extends ChartOptions {
  drawingsEnabled: boolean;
  indicatorsEnabled: boolean;
  tradingEnabled: boolean;
  crosshairLabelRight: boolean;
  watermark: {
    text: string;
    color: string;
    fontSize: number;
  };
}

// --- Основной класс расширенного графика ---
export class ExtendedChart {
  private chart: IChartApi;
  private container: HTMLElement;
  private candleSeries: ISeriesApi<'Candlestick'>;
  private volumeSeries: ISeriesApi<'Histogram'>;
  private panes: Map<string, PaneData> = new Map();
  private indicators: Map<string, ISeriesApi<any>> = new Map();
  private drawings: Map<string, any> = new Map();
  private config: ExtendedChartOptions;

  constructor(container: HTMLElement, options?: Partial<ExtendedChartOptions>) {
    this.container = container;
    this.config = this.mergeOptions(options);
    
    this.chart = createChart(container, this.config);
    
    // Основная серия свечей
    this.candleSeries = this.chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    // Серия объёмов
    this.volumeSeries = this.chart.addHistogramSeries({
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    this.setupInteractions();
    this.setupWatermark();
  }

  // === Данные ===

  setCandles(candles: Candle[]): void {
    const candleData: CandlestickData[] = candles.map((c) => ({
      time: (c.timestamp / 1000) as UTCTimestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    const volumeData: HistogramData[] = candles.map((c) => ({
      time: (c.timestamp / 1000) as UTCTimestamp,
      value: c.volume,
      color: c.close >= c.open ? '#26a69a40' : '#ef535040',
    }));

    this.candleSeries.setData(candleData);
    this.volumeSeries.setData(volumeData);
  }

  updateCandle(candle: Candle): void {
    const time = (candle.timestamp / 1000) as UTCTimestamp;
    
    this.candleSeries.update({
      time,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    });

    this.volumeSeries.update({
      time,
      value: candle.volume,
      color: candle.close >= candle.open ? '#26a69a40' : '#ef535040',
    });
  }

  // === Индикаторы ===

  addIndicator(indicator: Indicator, data: IndicatorData[]): void {
    if (indicator.type === 'overlay') {
      const series = this.chart.addLineSeries({
        title: indicator.name,
        color: this.getColorForIndicator(indicator.name),
        lineWidth: 2,
      });

      series.setData(data);
      this.indicators.set(indicator.id, series);
    } else {
      // Создаём новую панель для индикатора
      const pane = this.createPane(indicator.name);
      const series = this.chart.addLineSeries({
        title: indicator.name,
        color: this.getColorForIndicator(indicator.name),
        lineWidth: 2,
        priceScaleId: pane.id,
      });

      series.setData(data);
      this.indicators.set(indicator.id, series);
      this.panes.set(pane.id, pane);
    }
  }

  removeIndicator(indicatorId: string): void {
    const series = this.indicators.get(indicatorId);
    if (series) {
      this.chart.removeSeries(series);
      this.indicators.delete(indicatorId);
    }
  }

  clearIndicators(): void {
    this.indicators.forEach((series) => this.chart.removeSeries(series));
    this.indicators.clear();
  }

  // === Рисования ===

  addDrawing(drawing: Drawing): void {
    // Lightweight Charts не поддерживает рисования из коробки
    // Нужно использовать кастомный canvas overlay или plugin
    // Здесь заглушка для будущей реализации
    this.drawings.set(drawing.id, drawing);
    this.renderDrawings();
  }

  removeDrawing(drawingId: string): void {
    this.drawings.delete(drawingId);
    this.renderDrawings();
  }

  clearDrawings(): void {
    this.drawings.clear();
    this.renderDrawings();
  }

  private renderDrawings(): void {
    // TODO: Реализовать отрисовку на canvas overlay
    console.log('Rendering drawings:', this.drawings.size);
  }

  // === Торговля ===

  addOrderMarker(order: {
    time: Time;
    position: 'aboveBar' | 'belowBar';
    color: string;
    shape: 'arrowUp' | 'arrowDown' | 'circle' | 'square';
    text: string;
  }): void {
    this.candleSeries.setMarkers([
      ...(this.candleSeries.markers() || []),
      order,
    ]);
  }

  clearOrderMarkers(): void {
    this.candleSeries.setMarkers([]);
  }

  addPositionLine(price: number, color: string, text: string): void {
    // TODO: Реализовать через price line API
    const priceLine = {
      price,
      color,
      lineWidth: 2,
      lineStyle: 2 as const,
      axisLabelVisible: true,
      title: text,
    };
    
    // Lightweight Charts поддерживает priceLine через series
    // Нужно сохранить ссылку для удаления
  }

  // === Настройки ===

  setSymbol(symbol: string): void {
    this.config.watermark.text = symbol;
    this.setupWatermark();
  }

  setInterval(interval: string): void {
    // Интервал хранится отдельно, не влияет на график
  }

  setTheme(theme: 'light' | 'dark'): void {
    const isDark = theme === 'dark';
    this.chart.applyOptions({
      layout: {
        background: { type: ColorType.Solid, color: isDark ? '#131722' : '#ffffff' },
        textColor: isDark ? '#d1d4dc' : '#191919',
      },
      grid: {
        vertLines: { color: isDark ? '#242832' : '#e6e6e6' },
        horzLines: { color: isDark ? '#242832' : '#e6e6e6' },
      },
      crosshair: {
        vertLine: { color: isDark ? '#363c4e' : '#c0c3c9' },
        horzLine: { color: isDark ? '#363c4e' : '#c0c3c9' },
      },
    });
  }

  setTimeRange(from: number, to: number): void {
    this.chart.timeScale().setVisibleRange({
      from: from as UTCTimestamp,
      to: to as UTCTimestamp,
    });
  }

  fitContent(): void {
    this.chart.timeScale().fitContent();
  }

  // === События ===

  onCrosshairMove(callback: (params: any) => void): void {
    this.chart.subscribeCrosshairMove(callback);
  }

  onClick(callback: (params: any) => void): void {
    this.chart.subscribeClick(callback);
  }

  onVisibleRangeChange(callback: (range: any) => void): void {
    this.chart.timeScale().subscribeVisibleRangeChange(callback);
  }

  // === Утилиты ===

  resize(width: number, height: number): void {
    this.chart.resize(width, height);
  }

  destroy(): void {
    this.chart.remove();
    this.indicators.clear();
    this.panes.clear();
    this.drawings.clear();
  }

  getChart(): IChartApi {
    return this.chart;
  }

  getCandleSeries(): ISeriesApi<'Candlestick'> {
    return this.candleSeries;
  }

  // === Приватные методы ===

  private mergeOptions(options?: Partial<ExtendedChartOptions>): ExtendedChartOptions {
    const defaults: ExtendedChartOptions = {
      layout: {
        background: { type: ColorType.Solid, color: '#131722' },
        textColor: '#d1d4dc',
      },
      grid: {
        vertLines: { color: '#242832' },
        horzLines: { color: '#242832' },
      },
      crosshair: {
        vertLine: { color: '#363c4e' },
        horzLine: { color: '#363c4e' },
      },
      timeScale: {
        borderColor: '#242832',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: '#242832',
      },
      drawingsEnabled: true,
      indicatorsEnabled: true,
      tradingEnabled: true,
      crosshairLabelRight: true,
      watermark: {
        text: '',
        color: 'rgba(255, 255, 255, 0.1)',
        fontSize: 48,
      },
    };

    return { ...defaults, ...options };
  }

  private setupInteractions(): void {
    // Горячие клавиши
    document.addEventListener('keydown', (e) => {
      if (!this.config.drawingsEnabled) return;

      switch (e.key) {
        case 'Delete':
        case 'Backspace':
          // Удалить выделенное рисование
          break;
        case 't':
          // Trendline tool
          break;
        case 'h':
          // Horizontal line
          break;
      }
    });
  }

  private setupWatermark(): void {
    // Lightweight Charts не поддерживает watermark из коробки
    // Нужно использовать кастомный canvas overlay
    // Здесь заглушка
  }

  private createPane(title: string): PaneData {
    const id = `pane_${Date.now()}`;
    return {
      id,
      height: 0.2, // 20% высоты
      series: [],
    };
  }

  private getColorForIndicator(name: string): string {
    const colors = [
      '#2962FF', // Blue
      '#FF6D00', // Orange
      '#00C853', // Green
      '#D500F9', // Purple
      '#FF1744', // Red
      '#00BCD4', // Cyan
    ];
    const index = name.length % colors.length;
    return colors[index];
  }
}

// === Фабрика индикаторов ===
export class IndicatorFactory {
  static calculateSMA(data: Candle[], period: number): IndicatorData[] {
    const result: IndicatorData[] = [];
    
    for (let i = period - 1; i < data.length; i++) {
      const sum = data.slice(i - period + 1, i + 1)
        .reduce((acc, c) => acc + c.close, 0);
      const avg = sum / period;
      
      result.push({
        time: (data[i].timestamp / 1000) as UTCTimestamp,
        value: avg,
      });
    }
    
    return result;
  }

  static calculateEMA(data: Candle[], period: number): IndicatorData[] {
    const result: IndicatorData[] = [];
    const k = 2 / (period + 1);
    let ema = data[0].close;

    for (let i = 0; i < data.length; i++) {
      ema = data[i].close * k + ema * (1 - k);
      result.push({
        time: (data[i].timestamp / 1000) as UTCTimestamp,
        value: ema,
      });
    }

    return result;
  }

  static calculateRSI(data: Candle[], period: number = 14): IndicatorData[] {
    const result: IndicatorData[] = [];
    const gains: number[] = [];
    const losses: number[] = [];

    for (let i = 1; i < data.length; i++) {
      const change = data[i].close - data[i - 1].close;
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }

    for (let i = period; i < data.length; i++) {
      const avgGain = gains.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
      const avgLoss = losses.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
      
      const rs = avgGain / avgLoss;
      const rsi = 100 - (100 / (1 + rs));

      result.push({
        time: (data[i].timestamp / 1000) as UTCTimestamp,
        value: rsi,
      });
    }

    return result;
  }

  static calculateMACD(
    data: Candle[],
    fastPeriod: number = 12,
    slowPeriod: number = 26,
    signalPeriod: number = 9
  ): { macd: IndicatorData[]; signal: IndicatorData[]; histogram: IndicatorData[] } {
    const fastEMA = this.calculateEMA(data, fastPeriod);
    const slowEMA = this.calculateEMA(data, slowPeriod);

    const macd: IndicatorData[] = [];
    for (let i = 0; i < slowEMA.length; i++) {
      const fastValue = fastEMA.find((e) => e.time === slowEMA[i].time)?.value || 0;
      macd.push({
        time: slowEMA[i].time,
        value: fastValue - slowEMA[i].value,
      });
    }

    // Signal line - EMA от MACD
    const signal: IndicatorData[] = [];
    const k = 2 / (signalPeriod + 1);
    let ema = macd[0].value || 0;

    for (let i = 0; i < macd.length; i++) {
      ema = (macd[i].value || 0) * k + ema * (1 - k);
      signal.push({
        time: macd[i].time,
        value: ema,
      });
    }

    // Histogram
    const histogram: IndicatorData[] = macd.map((m, i) => ({
      time: m.time,
      value: (m.value || 0) - (signal[i].value || 0),
      color: ((m.value || 0) - (signal[i].value || 0)) >= 0 ? '#26a69a' : '#ef5350',
    }));

    return { macd, signal, histogram };
  }
}
