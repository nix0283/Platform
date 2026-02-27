// ============================================
// PINE SCRIPT TO JAVASCRIPT COMPILER
// Конвертация AST в исполняемый JS код
// ============================================

import {
  ASTNode,
  Program,
  Expression,
  Identifier,
  Literal,
  BinaryExpression,
  UnaryExpression,
  FunctionCall,
  MemberExpression,
  IfStatement,
  ForStatement,
  VariableDeclaration,
  Assignment,
  ReturnStatement,
  PlotStatement,
  InputDeclaration,
  IndicatorDeclaration,
  StrategyDeclaration,
} from './ast';

export interface CompileOptions {
  outputFormat: 'module' | 'iife' | 'class';
  includeRuntime: boolean;
  optimize: boolean;
}

export class PineCompiler {
  private indentLevel: number = 0;
  private output: string = '';
  private variables: Set<string> = new Set();
  private functions: Map<string, any> = new Map();
  private inputs: Map<string, any> = new Set();

  constructor(private options: Partial<CompileOptions> = {}) {}

  compile(ast: Program): string {
    this.output = '';
    this.variables.clear();
    
    if (this.options.includeRuntime !== false) {
      this.emitRuntime();
    }
    
    // Process declarations
    for (const node of ast.body) {
      this.compileNode(node);
    }
    
    return this.output;
  }

  private emitRuntime(): void {
    this.output += `
// ============================================
// PINE SCRIPT RUNTIME
// ============================================

class PineRuntime {
  private data: Map<string, number[]> = new Map();
  private currentIndex: number = 0;
  private indicators: Map<string, any> = new Map();
  
  // Series helpers
  series<T>(initialValue: T): T[] {
    return [initialValue];
  }
  
  get(series: any[], index: number = 0): any {
    const i = this.currentIndex - index;
    return i >= 0 && i < series.length ? series[i] : null;
  }
  
  push(series: any[], value: any): void {
    series.push(value);
  }
  
  // Math helpers
  na(value: any): boolean {
    return value === null || value === undefined || Number.isNaN(value);
  }
  
  nz(value: any, replacement: number = 0): number {
    return this.na(value) ? replacement : value;
  }
  
  // TA functions
  sma(series: number[], period: number): number {
    if (series.length < period) return null;
    const slice = series.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / period;
  }
  
  ema(series: number[], period: number): number {
    const k = 2 / (period + 1);
    if (series.length === 0) return null;
    
    let ema = series[0];
    for (let i = 1; i < series.length; i++) {
      ema = series[i] * k + ema * (1 - k);
    }
    return ema;
  }
  
  rsi(series: number[], period: number = 14): number {
    if (series.length < period + 1) return null;
    
    let gains = 0, losses = 0;
    for (let i = series.length - period; i < series.length; i++) {
      const change = series[i] - series[i - 1];
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }
    
    const rs = losses === 0 ? 100 : gains / losses;
    return 100 - (100 / (1 + rs));
  }
  
  crossover(a: number, b: number, aPrev: number, bPrev: number): boolean {
    return aPrev <= bPrev && a > b;
  }
  
  crossunder(a: number, b: number, aPrev: number, bPrev: number): boolean {
    return aPrev >= bPrev && a < b;
  }
  
  highest(series: number[], period: number): number {
    if (series.length < period) return null;
    return Math.max(...series.slice(-period));
  }
  
  lowest(series: number[], period: number): number {
    if (series.length < period) return null;
    return Math.min(...series.slice(-period));
  }
  
  sum(series: number[], period: number): number {
    if (series.length < period) return null;
    return series.slice(-period).reduce((a, b) => a + b, 0);
  }
  
  avg(...values: number[]): number {
    return values.reduce((a, b) => a + b, 0) / values.length;
  }
  
  // Strategy helpers
  private positions: Map<string, any> = new Map();
  private orders: any[] = [];
  
  strategy_entry(id: string, direction: 'long' | 'short', qty: number = 1, price?: number): void {
    this.orders.push({ type: 'entry', id, direction, qty, price, index: this.currentIndex });
  }
  
  strategy_exit(id: string, qty?: number, price?: number): void {
    this.orders.push({ type: 'exit', id, qty, price, index: this.currentIndex });
  }
  
  // Update with new bar data
  updateBar(data: { open: number; high: number; low: number; close: number; volume: number }): void {
    this.currentIndex++;
    
    for (const [key, series] of this.data.entries()) {
      // Update series based on data
    }
  }
}

const runtime = new PineRuntime();
const { sma, ema, rsi, crossover, crossunder, highest, lowest, sum, avg, na, nz } = runtime;

`;
  }

  private compileNode(node: ASTNode): void {
    switch (node.type) {
      case 'IndicatorDeclaration':
        this.compileIndicatorDeclaration(node as IndicatorDeclaration);
        break;
      case 'StrategyDeclaration':
        this.compileStrategyDeclaration(node as StrategyDeclaration);
        break;
      case 'InputDeclaration':
        this.compileInputDeclaration(node as InputDeclaration);
        break;
      case 'VariableDeclaration':
      case 'Assignment':
        this.compileAssignment(node as any);
        break;
      case 'PlotStatement':
        this.compilePlotStatement(node as PlotStatement);
        break;
      case 'IfStatement':
        this.compileIfStatement(node as IfStatement);
        break;
      case 'ForStatement':
        this.compileForStatement(node as ForStatement);
        break;
      case 'ReturnStatement':
        this.compileReturnStatement(node as ReturnStatement);
        break;
      case 'FunctionCall':
        this.emit(this.compileExpression(node as FunctionCall) + ';');
        break;
      default:
        // Handle other nodes
        break;
    }
  }

  private compileIndicatorDeclaration(node: IndicatorDeclaration): void {
    this.emit(`// Indicator: ${node.name}`);
    this.emit(`const indicatorConfig = ${JSON.stringify(node.params)};`);
    this.emit('');
  }

  private compileStrategyDeclaration(node: StrategyDeclaration): void {
    this.emit(`// Strategy: ${node.name}`);
    this.emit(`const strategyConfig = ${JSON.stringify(node.params)};`);
    this.emit('');
  }

  private compileInputDeclaration(node: InputDeclaration): void {
    const varName = node.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    this.emit(`let ${varName} = ${JSON.stringify(node.defaultValue)};`);
    this.inputs.set(varName, node);
  }

  private compileAssignment(node: VariableDeclaration | Assignment): void {
    if (node.type === 'VariableDeclaration') {
      const varName = (node.id as Identifier).name;
      this.variables.add(varName);
      
      if (node.init) {
        this.emit(`let ${varName} = ${this.compileExpression(node.init)};`);
      } else {
        this.emit(`let ${varName} = null;`);
      }
    } else {
      const left = this.compileExpression(node.left);
      const right = this.compileExpression(node.right);
      const op = node.operator === ':=' ? '=' : node.operator;
      this.emit(`${left} ${op} ${right};`);
    }
  }

  private compilePlotStatement(node: PlotStatement): void {
    const expr = this.compileExpression(node.expression);
    const title = node.title || 'plot';
    this.emit(`runtime.push(${title}, ${expr});`);
    this.emit(`console.log('${title}:', ${expr});`);
  }

  private compileIfStatement(node: IfStatement): void {
    this.emit(`if (${this.compileExpression(node.test)}) {`);
    this.indent();
    for (const stmt of node.consequent.body) {
      this.compileNode(stmt);
    }
    this.dedent();
    
    if (node.alternate) {
      this.emit('} else {');
      this.indent();
      for (const stmt of node.alternate.body) {
        this.compileNode(stmt);
      }
      this.dedent();
    }
    
    this.emit('}');
  }

  private compileForStatement(node: ForStatement): void {
    const varName = node.variable.name;
    const from = this.compileExpression(node.from);
    const to = this.compileExpression(node.to);
    
    this.emit(`for (let ${varName} = ${from}; ${varName} <= ${to}; ${varName}++) {`);
    this.indent();
    for (const stmt of node.body.body) {
      this.compileNode(stmt);
    }
    this.dedent();
    this.emit('}');
  }

  private compileReturnStatement(node: ReturnStatement): void {
    if (node.argument) {
      this.emit(`return ${this.compileExpression(node.argument)};`);
    } else {
      this.emit('return;');
    }
  }

  private compileExpression(expr: Expression): string {
    switch (expr.type) {
      case 'Literal':
        return this.compileLiteral(expr as Literal);
      
      case 'Identifier':
        return this.compileIdentifier(expr as Identifier);
      
      case 'BinaryExpression':
        return this.compileBinaryExpression(expr as BinaryExpression);
      
      case 'UnaryExpression':
        return this.compileUnaryExpression(expr as UnaryExpression);
      
      case 'FunctionCall':
        return this.compileFunctionCall(expr as FunctionCall);
      
      case 'MemberExpression':
        return this.compileMemberExpression(expr as MemberExpression);
      
      default:
        return 'null';
    }
  }

  private compileLiteral(node: Literal): string {
    if (node.value === null) {
      return 'null';
    }
    return JSON.stringify(node.value);
  }

  private compileIdentifier(node: Identifier): string {
    // Map Pine builtins to runtime functions
    const builtinMap: Record<string, string> = {
      'ta.sma': 'sma',
      'ta.ema': 'ema',
      'ta.rsi': 'rsi',
      'ta.crossover': 'crossover',
      'ta.crossunder': 'crossunder',
      'ta.highest': 'highest',
      'ta.lowest': 'lowest',
      'ta.sum': 'sum',
      'ta.avg': 'avg',
      'math.abs': 'Math.abs',
      'math.min': 'Math.min',
      'math.max': 'Math.max',
      'math.pow': 'Math.pow',
      'math.sqrt': 'Math.sqrt',
      'math.log': 'Math.log',
      'str.tonumber': 'parseFloat',
      'str.tostring': 'String',
    };
    
    if (builtinMap[node.name]) {
      return builtinMap[node.name];
    }
    
    return node.name;
  }

  private compileBinaryExpression(node: BinaryExpression): string {
    const left = this.compileExpression(node.left);
    const right = this.compileExpression(node.right);
    
    // Map Pine operators to JS
    const opMap: Record<string, string> = {
      'and': '&&',
      'or': '||',
      'not': '!',
      ':=': '=',
    };
    
    const op = opMap[node.operator] || node.operator;
    return `(${left} ${op} ${right})`;
  }

  private compileUnaryExpression(node: UnaryExpression): string {
    const arg = this.compileExpression(node.argument);
    const op = node.operator === 'not' ? '!' : node.operator;
    return `(${op}${arg})`;
  }

  private compileFunctionCall(node: FunctionCall): string {
    const callee = this.compileExpression(node.callee);
    const args = node.arguments.map(arg => this.compileExpression(arg)).join(', ');
    return `${callee}(${args})`;
  }

  private compileMemberExpression(node: MemberExpression): string {
    const object = this.compileExpression(node.object);
    const property = (node.property as Identifier).name;
    return `${object}.${property}`;
  }

  private emit(code: string): void {
    const indent = '  '.repeat(this.indentLevel);
    this.output += indent + code + '\n';
  }

  private indent(): void {
    this.indentLevel++;
  }

  private dedent(): void {
    this.indentLevel = Math.max(0, this.indentLevel - 1);
  }
}

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

export function compilePineScript(source: string, options?: Partial<CompileOptions>): string {
  const { PineParser } = require('./parser/parser');
  const parser = new PineParser(source);
  const ast = parser.parse();
  
  const compiler = new PineCompiler(options);
  return compiler.compile(ast);
}

export function compilePineToModule(source: string): string {
  return compilePineScript(source, {
    outputFormat: 'module',
    includeRuntime: true,
    optimize: true,
  });
}
