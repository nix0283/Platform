// ============================================
// TIMEFRAME SELECTOR — Все таймфреймы TradingView
// от 1 секунды до 6 месяцев + кастомные
// ============================================

export type TimeframeUnit = 's' | 'm' | 'h' | 'd' | 'w' | 'M';

export interface Timeframe {
  value: string;
  label: string;
  seconds: number;
  category: 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months';
}

// ============================================
// STANDARD TIMEFRAMES
// ============================================

export const TIMEFRAMES: Timeframe[] = [
  // Seconds
  { value: '1s', label: '1 сек', seconds: 1, category: 'seconds' },
  { value: '5s', label: '5 сек', seconds: 5, category: 'seconds' },
  { value: '10s', label: '10 сек', seconds: 10, category: 'seconds' },
  { value: '15s', label: '15 сек', seconds: 15, category: 'seconds' },
  { value: '30s', label: '30 сек', seconds: 30, category: 'seconds' },
  
  // Minutes
  { value: '1m', label: '1 мин', seconds: 60, category: 'minutes' },
  { value: '3m', label: '3 мин', seconds: 180, category: 'minutes' },
  { value: '5m', label: '5 мин', seconds: 300, category: 'minutes' },
  { value: '15m', label: '15 мин', seconds: 900, category: 'minutes' },
  { value: '30m', label: '30 мин', seconds: 1800, category: 'minutes' },
  { value: '45m', label: '45 мин', seconds: 2700, category: 'minutes' },
  
  // Hours
  { value: '1h', label: '1 час', seconds: 3600, category: 'hours' },
  { value: '2h', label: '2 часа', seconds: 7200, category: 'hours' },
  { value: '3h', label: '3 часа', seconds: 10800, category: 'hours' },
  { value: '4h', label: '4 часа', seconds: 14400, category: 'hours' },
  { value: '6h', label: '6 часов', seconds: 21600, category: 'hours' },
  { value: '8h', label: '8 часов', seconds: 28800, category: 'hours' },
  { value: '12h', label: '12 часов', seconds: 43200, category: 'hours' },
  
  // Days
  { value: '1d', label: '1 день', seconds: 86400, category: 'days' },
  { value: '2d', label: '2 дня', seconds: 172800, category: 'days' },
  { value: '3d', label: '3 дня', seconds: 259200, category: 'days' },
  { value: '5d', label: '5 дней', seconds: 432000, category: 'days' },
  { value: '7d', label: '7 дней', seconds: 604800, category: 'days' },
  
  // Weeks
  { value: '1w', label: '1 неделя', seconds: 604800, category: 'weeks' },
  { value: '2w', label: '2 недели', seconds: 1209600, category: 'weeks' },
  { value: '3w', label: '3 недели', seconds: 1814400, category: 'weeks' },
  
  // Months
  { value: '1M', label: '1 месяц', seconds: 2592000, category: 'months' },
  { value: '2M', label: '2 месяца', seconds: 5184000, category: 'months' },
  { value: '3M', label: '3 месяца', seconds: 7776000, category: 'months' },
  { value: '4M', label: '4 месяца', seconds: 10368000, category: 'months' },
  { value: '5M', label: '5 месяцев', seconds: 12960000, category: 'months' },
  { value: '6M', label: '6 месяцев', seconds: 15552000, category: 'months' },
];

// ============================================
// CUSTOM TIMEFRAME PARSER
// ============================================

export interface CustomTimeframe {
  value: string;
  amount: number;
  unit: TimeframeUnit;
  seconds: number;
  isValid: boolean;
  error?: string;
}

export function parseCustomTimeframe(input: string): CustomTimeframe {
  const trimmed = input.trim().toLowerCase();
  
  // Regex для парсинга: число + единица
  const match = trimmed.match(/^(\d+)(s|m|h|d|w|M)$/);
  
  if (!match) {
    return {
      value: input,
      amount: 0,
      unit: 'm',
      seconds: 0,
      isValid: false,
      error: 'Неверный формат. Используйте: число + единица (1s, 5m, 1h, 1d, 1w, 1M)',
    };
  }
  
  const amount = parseInt(match[1], 10);
  const unit = match[2] as TimeframeUnit;
  
  // Валидация диапазона
  const limits: Record<TimeframeUnit, { min: number; max: number }> = {
    s: { min: 1, max: 59 },
    m: { min: 1, max: 59 },
    h: { min: 1, max: 24 },
    d: { min: 1, max: 30 },
    w: { min: 1, max: 52 },
    M: { min: 1, max: 12 },
  };
  
  if (amount < limits[unit].min || amount > limits[unit].max) {
    return {
      value: input,
      amount,
      unit,
      seconds: 0,
      isValid: false,
      error: `Значение должно быть от ${limits[unit].min} до ${limits[unit].max} ${getUnitName(unit)}`,
    };
  }
  
  const seconds = timeframeToSeconds(amount, unit);
  
  return {
    value: `${amount}${unit}`,
    amount,
    unit,
    seconds,
    isValid: true,
  };
}

function getUnitName(unit: TimeframeUnit): string {
  const names: Record<TimeframeUnit, string> = {
    s: 'секунд',
    m: 'минут',
    h: 'часов',
    d: 'дней',
    w: 'недель',
    M: 'месяцев',
  };
  return names[unit];
}

function timeframeToSeconds(amount: number, unit: TimeframeUnit): number {
  const multipliers: Record<TimeframeUnit, number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
    w: 604800,
    M: 2592000,
  };
  return amount * multipliers[unit];
}

// ============================================
// TIMEFRAME UTILS
// ============================================

export function getTimeframeLabel(value: string): string {
  const tf = TIMEFRAMES.find(t => t.value === value);
  if (tf) return tf.label;
  
  const custom = parseCustomTimeframe(value);
  if (custom.isValid) {
    return `${custom.amount} ${getUnitNamePlural(custom.amount, custom.unit)}`;
  }
  
  return value;
}

function getUnitNamePlural(amount: number, unit: TimeframeUnit): string {
  const names: Record<TimeframeUnit, string[]> = {
    s: ['секунда', 'секунды', 'секунд'],
    m: ['минута', 'минуты', 'минут'],
    h: ['час', 'часа', 'часов'],
    d: ['день', 'дня', 'дней'],
    w: ['неделя', 'недели', 'недель'],
    M: ['месяц', 'месяца', 'месяцев'],
  };
  
  return pluralize(amount, names[unit]);
}

function pluralize(amount: number, forms: string[]): string {
  const n = amount % 100;
  const n1 = n % 10;
  
  if (n > 10 && n < 20) return forms[2];
  if (n1 > 1 && n1 < 5) return forms[1];
  if (n1 === 1) return forms[0];
  return forms[2];
}

export function getTimeframeCategory(value: string): string {
  const tf = TIMEFRAMES.find(t => t.value === value);
  if (tf) return tf.category;
  
  const custom = parseCustomTimeframe(value);
  if (custom.isValid) return custom.unit;
  
  return 'minutes';
}

export function getTimeframeSeconds(value: string): number {
  const tf = TIMEFRAMES.find(t => t.value === value);
  if (tf) return tf.seconds;
  
  const custom = parseCustomTimeframe(value);
  if (custom.isValid) return custom.seconds;
  
  return 60; // default 1 minute
}

// ============================================
// TIMEFRAME GROUPS
// ============================================

export const TIMEFRAME_GROUPS = {
  seconds: TIMEFRAMES.filter(tf => tf.category === 'seconds'),
  minutes: TIMEFRAMES.filter(tf => tf.category === 'minutes'),
  hours: TIMEFRAMES.filter(tf => tf.category === 'hours'),
  days: TIMEFRAMES.filter(tf => tf.category === 'days'),
  weeks: TIMEFRAMES.filter(tf => tf.category === 'weeks'),
  months: TIMEFRAMES.filter(tf => tf.category === 'months'),
};

export default {
  TIMEFRAMES,
  TIMEFRAME_GROUPS,
  parseCustomTimeframe,
  getTimeframeLabel,
  getTimeframeSeconds,
  getTimeframeCategory,
};
