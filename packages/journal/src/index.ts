export { JournalManager } from './manager';
export * from './types';
export { SETUP_TYPES, EMOTIONS, COMMON_MISTAKES } from './types';
export type { JournalEntry, JournalStats, JournalMonthlyStats, JournalSetupStats, JournalFilters, IndicatorSnapshot, TakeProfitLevel, TradeDirection, TradeStatus, SetupType, EmotionType, MistakeType } from './types';
export function createJournalManager(): JournalManager { return new JournalManager(); }