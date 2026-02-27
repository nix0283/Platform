export { PaperTradingEngine } from './engine';
export type { PaperTrade, PaperTradingStats, PaperTradingConfig } from './engine';
export function createPaperTradingEngine(config?: any): PaperTradingEngine { return new PaperTradingEngine(config); }