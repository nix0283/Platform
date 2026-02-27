// ============================================
// CHARTING PACKAGE — Экспорт компонентов
// ============================================

export * from './extended-chart';

// Дополнительные утилиты для графиков
export function calculateVisibleRange(
  dataLength: number,
  containerWidth: number,
  candleWidth: number = 6
): { from: number; to: number } {
  const visibleCandles = Math.floor(containerWidth / candleWidth);
  const to = dataLength;
  const from = Math.max(0, dataLength - visibleCandles);
  return { from, to };
}

export function getChartColors(theme: 'light' | 'dark') {
  return theme === 'dark'
    ? {
        background: '#131722',
        text: '#d1d4dc',
        grid: '#242832',
        crosshair: '#363c4e',
        up: '#26a69a',
        down: '#ef5350',
      }
    : {
        background: '#ffffff',
        text: '#191919',
        grid: '#e6e6e6',
        crosshair: '#c0c3c9',
        up: '#26a69a',
        down: '#ef5350',
      };
}
