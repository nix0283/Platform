// ============================================
// CORE PACKAGE — Экспорт всех типов и утилит
// ============================================

export * from './types';

// Утилиты
export function normalizeSymbol(symbol: string): string {
  return symbol.replace('/', '').replace('-', '').toUpperCase();
}

export function denormalizeSymbol(symbol: string, quoteAsset: string = 'USDT'): string {
  if (symbol.includes('/')) return symbol;
  
  const quoteIndex = symbol.lastIndexOf(quoteAsset);
  if (quoteIndex > 0) {
    return `${symbol.substring(0, quoteIndex)}/${symbol.substring(quoteIndex)}`;
  }
  return symbol;
}

export function formatPrice(price: number, tickSize: number = 0.01): string {
  const decimals = tickSize >= 1 ? 0 : -Math.log10(tickSize);
  return price.toFixed(Math.min(decimals, 8));
}

export function formatVolume(volume: number): string {
  if (volume >= 1e9) return `${(volume / 1e9).toFixed(2)}B`;
  if (volume >= 1e6) return `${(volume / 1e6).toFixed(2)}M`;
  if (volume >= 1e3) return `${(volume / 1e3).toFixed(2)}K`;
  return volume.toFixed(2);
}

export function calculatePnl(
  entryPrice: number,
  exitPrice: number,
  quantity: number,
  side: 'BUY' | 'SELL'
): number {
  const diff = exitPrice - entryPrice;
  return side === 'BUY' ? diff * quantity : -diff * quantity;
}

export function calculatePositionSize(
  balance: number,
  riskPercent: number,
  entryPrice: number,
  stopLossPrice: number
): number {
  const riskAmount = balance * (riskPercent / 100);
  const priceDiff = Math.abs(entryPrice - stopLossPrice);
  return riskAmount / priceDiff;
}

export function generateClientId(): string {
  return `tp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export const INTERVALS = [
  '1m', '3m', '5m', '15m', '30m',
  '1h', '2h', '4h', '6h', '12h',
  '1d', '3d', '1w', '1M'
] as const;

export const EXCHANGES = [
  { id: 'binance', name: 'Binance', supported: true },
  { id: 'bybit', name: 'Bybit', supported: true },
  { id: 'okx', name: 'OKX', supported: true },
  { id: 'bitget', name: 'Bitget', supported: true },
  { id: 'bingx', name: 'BingX', supported: true },
] as const;
