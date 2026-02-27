// ============================================
// PINE CONVERTER — Главный экспорт
// ============================================

export { PineLexer } from './parser/lexer';
export { PineParser } from './parser/parser';
export { PineCompiler, compilePineScript, compilePineToModule } from './compiler/compiler';
export * from './parser/ast';

// Runtime для выполнения индикаторов
export { PineRuntime } from './runtime/runtime';

// Утилиты
export function convertPineToJavaScript(pineCode: string): string {
  const { PineParser } = require('./parser/parser');
  const { PineCompiler } = require('./compiler/compiler');
  
  const parser = new PineParser(pineCode);
  const ast = parser.parse();
  
  const compiler = new PineCompiler({
    outputFormat: 'module',
    includeRuntime: true,
    optimize: true,
  });
  
  return compiler.compile(ast);
}

export function validatePineScript(pineCode: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  try {
    const { PineParser } = require('./parser/parser');
    const parser = new PineParser(pineCode);
    parser.parse();
  } catch (error: any) {
    errors.push(error.message);
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

export function getSupportedFunctions(): string[] {
  return [
    // TA
    'ta.sma', 'ta.ema', 'ta.wma', 'ta.dema', 'ta.tema',
    'ta.rsi', 'ta.macd', 'ta.stoch', 'ta.stochrsi', 'ta.cci', 'ta.adx',
    'ta.atr', 'ta.bb', 'ta.bbw', 'ta.percent_b',
    'ta.obv', 'ta.mfi', 'ta.vwap',
    'ta.highest', 'ta.lowest', 'ta.highestbars', 'ta.lowestbars',
    'ta.crossover', 'ta.crossunder', 'ta.change', 'ta.valuewhen',
    'ta.barssince', 'ta.barslast', 'ta.sum', 'ta.avg',
    
    // Math
    'math.abs', 'math.ceil', 'math.floor', 'math.round', 'math.sign',
    'math.min', 'math.max', 'math.pow', 'math.sqrt', 'math.exp', 'math.log', 'math.log10',
    'math.sin', 'math.cos', 'math.tan', 'math.asin', 'math.acos', 'math.atan',
    
    // String
    'str.tostring', 'str.tonumber',
    'str.substr', 'str.strpos', 'str.replace', 'str.replace_all',
    'str.split', 'str.join', 'str.length',
    
    // Strategy
    'strategy.entry', 'strategy.exit', 'strategy.close',
    'strategy.order', 'strategy.cancel',
    'strategy.position_size', 'strategy.position_avg_price',
    'strategy.opentrades', 'strategy.closedtrades',
    'strategy.equity', 'strategy.initial_capital',
  ];
}
