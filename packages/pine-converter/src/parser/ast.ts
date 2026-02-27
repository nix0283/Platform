// ============================================
// PINE SCRIPT AST (Abstract Syntax Tree)
// ============================================

export type ASTNode =
  | Program
  | IndicatorDeclaration
  | StrategyDeclaration
  | InputDeclaration
  | VariableDeclaration
  | Assignment
  | FunctionDeclaration
  | FunctionCall
  | IfStatement
  | ForStatement
  | WhileStatement
  | ReturnStatement
  | BreakStatement
  | ContinueStatement
  | BinaryExpression
  | UnaryExpression
  | MemberExpression
  | IndexExpression
  | Identifier
  | Literal
  | PlotStatement
  | AlertStatement
  | StrategyEntry
  | StrategyExit;

export interface Position {
  line: number;
  column: number;
}

export interface BaseNode {
  type: string;
  loc?: { start: Position; end: Position };
}

export interface Program extends BaseNode {
  type: 'Program';
  body: ASTNode[];
  sourceType: 'script' | 'library';
}

export interface IndicatorDeclaration extends BaseNode {
  type: 'IndicatorDeclaration';
  name: string;
  overlay: boolean;
  params: Record<string, any>;
}

export interface StrategyDeclaration extends BaseNode {
  type: 'StrategyDeclaration';
  name: string;
  params: Record<string, any>;
}

export interface InputDeclaration extends BaseNode {
  type: 'InputDeclaration';
  name: string;
  inputType: 'integer' | 'float' | 'boolean' | 'string' | 'source' | 'color';
  defaultValue: any;
  title?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: any[];
}

export interface VariableDeclaration extends BaseNode {
  type: 'VariableDeclaration';
  id: Identifier;
  init?: Expression;
  var: boolean;  // Pine 'var' keyword
  varip: boolean;  // Pine 'varip' keyword
}

export interface Assignment extends BaseNode {
  type: 'Assignment';
  left: Expression;
  operator: '=' | ':=';
  right: Expression;
}

export interface FunctionDeclaration extends BaseNode {
  type: 'FunctionDeclaration';
  id: Identifier;
  params: Identifier[];
  body: BlockStatement;
  returnType?: string;
}

export interface FunctionCall extends BaseNode {
  type: 'FunctionCall';
  callee: Expression;
  arguments: Expression[];
}

export interface IfStatement extends BaseNode {
  type: 'IfStatement';
  test: Expression;
  consequent: BlockStatement;
  alternate?: BlockStatement;
}

export interface ForStatement extends BaseNode {
  type: 'ForStatement';
  variable: Identifier;
  from: Expression;
  to: Expression;
  body: BlockStatement;
}

export interface WhileStatement extends BaseNode {
  type: 'WhileStatement';
  test: Expression;
  body: BlockStatement;
}

export interface ReturnStatement extends BaseNode {
  type: 'ReturnStatement';
  argument?: Expression;
}

export interface BreakStatement extends BaseNode {
  type: 'BreakStatement';
}

export interface ContinueStatement extends BaseNode {
  type: 'ContinueStatement';
}

export interface BlockStatement extends BaseNode {
  type: 'BlockStatement';
  body: ASTNode[];
}

export interface BinaryExpression extends BaseNode {
  type: 'BinaryExpression';
  operator: '+' | '-' | '*' | '/' | '%' | '==' | '!=' | '<' | '>' | '<=' | '>=' | 'and' | 'or';
  left: Expression;
  right: Expression;
}

export interface UnaryExpression extends BaseNode {
  type: 'UnaryExpression';
  operator: '-' | '!' | 'not';
  argument: Expression;
}

export interface MemberExpression extends BaseNode {
  type: 'MemberExpression';
  object: Expression;
  property: Identifier;
  computed: boolean;
}

export interface IndexExpression extends BaseNode {
  type: 'IndexExpression';
  object: Expression;
  index: Expression;
}

export interface Identifier extends BaseNode {
  type: 'Identifier';
  name: string;
}

export interface Literal extends BaseNode {
  type: 'Literal';
  value: string | number | boolean | null;
  raw?: string;
}

export interface PlotStatement extends BaseNode {
  type: 'PlotStatement';
  expression: Expression;
  title?: string;
  color?: Expression;
  linewidth?: number;
  style?: 'line' | 'stepline' | 'histogram' | 'cross' | 'area' | 'columns';
  display?: 'all' | 'none' | 'data_window' | 'pane';
}

export interface AlertStatement extends BaseNode {
  type: 'AlertStatement';
  message: Expression;
  frequency?: 'once_per_bar' | 'once_per_bar_close' | 'all';
}

export interface StrategyEntry extends BaseNode {
  type: 'StrategyEntry';
  id: string;
  direction: 'long' | 'short';
  quantity?: Expression;
  price?: Expression;
  limit?: Expression;
  stop?: Expression;
}

export interface StrategyExit extends BaseNode {
  type: 'StrategyExit';
  id: string;
  quantity?: Expression;
  price?: Expression;
  limit?: Expression;
  stop?: Expression;
}

// Expression type union
export type Expression =
  | BinaryExpression
  | UnaryExpression
  | MemberExpression
  | IndexExpression
  | Identifier
  | Literal
  | FunctionCall;

// Helper type guards
export function isExpression(node: ASTNode): node is Expression {
  return [
    'BinaryExpression',
    'UnaryExpression',
    'MemberExpression',
    'IndexExpression',
    'Identifier',
    'Literal',
    'FunctionCall',
  ].includes(node.type);
}

export function isStatement(node: ASTNode): boolean {
  return !isExpression(node);
}
