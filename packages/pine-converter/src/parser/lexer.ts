// ============================================
// PINE SCRIPT LEXER
// Лексический анализ Pine Script v5
// ============================================

export enum TokenType {
  // Literals
  NUMBER = 'NUMBER',
  STRING = 'STRING',
  BOOL = 'BOOL',
  
  // Identifiers & Keywords
  IDENTIFIER = 'IDENTIFIER',
  KEYWORD = 'KEYWORD',
  TYPE = 'TYPE',
  
  // Operators
  PLUS = 'PLUS',
  MINUS = 'MINUS',
  STAR = 'STAR',
  SLASH = 'SLASH',
  PERCENT = 'PERCENT',
  EQUALS = 'EQUALS',
  NOT_EQUALS = 'NOT_EQUALS',
  LESS = 'LESS',
  GREATER = 'GREATER',
  LESS_EQUALS = 'LESS_EQUALS',
  GREATER_EQUALS = 'GREATER_EQUALS',
  AND = 'AND',
  OR = 'OR',
  NOT = 'NOT',
  
  // Assignment
  ASSIGN = 'ASSIGN',
  ASSIGN_OP = 'ASSIGN_OP',
  
  // Delimiters
  LPAREN = 'LPAREN',
  RPAREN = 'RPAREN',
  LBRACKET = 'LBRACKET',
  RBRACKET = 'RBRACKET',
  LBRACE = 'LBRACE',
  RBRACE = 'RBRACE',
  COMMA = 'COMMA',
  DOT = 'DOT',
  COLON = 'COLON',
  SEMICOLON = 'SEMICOLON',
  
  // Special
  NEWLINE = 'NEWLINE',
  COMMENT = 'COMMENT',
  EOF = 'EOF',
}

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}

const KEYWORDS = new Set([
  'if', 'else', 'for', 'while', 'break', 'continue', 'return',
  'var', 'varip', 'na', 'true', 'false',
  'indicator', 'strategy', 'library',
  'input', 'plot', 'plotshape', 'plotchar',
  'alert', 'alertcondition',
  'fill', 'line', 'label', 'box', 'table',
  'request', 'security',
  'ta', 'math', 'str', 'color',
]);

const TYPES = new Set([
  'int', 'float', 'bool', 'string', 'color',
  'series<int>', 'series<float>', 'series<bool>', 'series<string>',
]);

const BUILTIN_FUNCTIONS = new Set([
  // Technical Analysis (ta.)
  'sma', 'ema', 'wma', 'dema', 'tema', 'kama',
  'rsi', 'macd', 'stoch', 'stochrsi', 'cci', 'adx',
  'atr', 'bb', 'bbw', 'percent_b',
  'obv', 'mfi', 'vwap', 'pwap',
  'highest', 'lowest', 'highestbars', 'lowestbars',
  'crossover', 'crossunder', 'ta.change', 'ta.valuewhen',
  'barssince', 'barslast', 'sum', 'avg',
  'median', 'mode', 'percentile', 'percentile_nearest_rank',
  'correlation', 'covariance', 'betarange',
  'gap', 'intraBarExtremum', 'intraBarRange',
  
  // Math (math.)
  'abs', 'ceil', 'floor', 'round', 'sign',
  'min', 'max', 'pow', 'sqrt', 'exp', 'log', 'log10',
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan',
  'pi', 'random', '纳',
  
  // String (str.)
  'tostring', 'tonumber',
  'substr', 'strpos', 'str.replace', 'str.replace_all',
  'split', 'join', 'length',
  
  // Color
  'color.new', 'color.rgb', 'color.from_gradient',
  'color.white', 'color.black', 'color.red', 'color.green',
  'color.blue', 'color.yellow', 'color.purple', 'color.orange',
  
  // Time/Date
  'timestamp', 'year', 'month', 'dayofmonth', 'dayofweek',
  'hour', 'minute', 'second', 'time', 'timenow',
  
  // Trading
  'strategy.entry', 'strategy.exit', 'strategy.close',
  'strategy.order', 'strategy.cancel',
  'strategy.position_size', 'strategy.position_avg_price',
  'strategy.opentrades', 'strategy.closedtrades',
  'strategy.equity', 'strategy.initial_capital',
]);

export class PineLexer {
  private input: string;
  private position: number = 0;
  private line: number = 1;
  private column: number = 1;
  private tokens: Token[] = [];

  constructor(input: string) {
    this.input = input;
  }

  tokenize(): Token[] {
    while (this.position < this.input.length) {
      this.skipWhitespace();
      if (this.position >= this.input.length) break;

      const char = this.currentChar();

      // Comments
      if (char === '/' && this.peek() === '/') {
        this.readComment();
        continue;
      }

      // Strings
      if (char === '"' || char === "'") {
        this.tokens.push(this.readString());
        continue;
      }

      // Numbers
      if (this.isDigit(char) || (char === '.' && this.isDigit(this.peek()))) {
        this.tokens.push(this.readNumber());
        continue;
      }

      // Identifiers & Keywords
      if (this.isAlpha(char) || char === '_') {
        this.tokens.push(this.readIdentifier());
        continue;
      }

      // Operators and delimiters
      this.tokens.push(this.readOperator());
    }

    this.tokens.push({
      type: TokenType.EOF,
      value: '',
      line: this.line,
      column: this.column,
    });

    return this.tokens;
  }

  private skipWhitespace(): void {
    while (this.position < this.input.length && /\s/.test(this.currentChar()) && this.currentChar() !== '\n') {
      this.advance();
    }
    
    // Handle newlines
    if (this.currentChar() === '\n') {
      this.tokens.push({
        type: TokenType.NEWLINE,
        value: '\n',
        line: this.line,
        column: this.column,
      });
      this.advance();
    }
  }

  private readComment(): Token {
    const startLine = this.line;
    const startCol = this.column;
    let value = '';

    while (this.position < this.input.length && this.currentChar() !== '\n') {
      value += this.currentChar();
      this.advance();
    }

    return {
      type: TokenType.COMMENT,
      value,
      line: startLine,
      column: startCol,
    };
  }

  private readString(): Token {
    const startLine = this.line;
    const startCol = this.column;
    const quote = this.currentChar();
    let value = '';

    this.advance(); // Skip opening quote

    while (this.position < this.input.length && this.currentChar() !== quote) {
      if (this.currentChar() === '\\') {
        this.advance();
        value += this.currentChar();
      } else {
        value += this.currentChar();
      }
      this.advance();
    }

    this.advance(); // Skip closing quote

    return {
      type: TokenType.STRING,
      value,
      line: startLine,
      column: startCol,
    };
  }

  private readNumber(): Token {
    const startLine = this.line;
    const startCol = this.column;
    let value = '';

    // Integer part
    while (this.isDigit(this.currentChar())) {
      value += this.currentChar();
      this.advance();
    }

    // Decimal part
    if (this.currentChar() === '.' && this.isDigit(this.peek())) {
      value += this.currentChar();
      this.advance();
      while (this.isDigit(this.currentChar())) {
        value += this.currentChar();
        this.advance();
      }
    }

    return {
      type: TokenType.NUMBER,
      value,
      line: startLine,
      column: startCol,
    };
  }

  private readIdentifier(): Token {
    const startLine = this.line;
    const startCol = this.column;
    let value = '';

    while (this.isAlphaNumeric(this.currentChar()) || this.currentChar() === '_') {
      value += this.currentChar();
      this.advance();
    }

    // Check for namespace (ta., math., etc.)
    if (this.currentChar() === '.' && this.isAlpha(this.peek())) {
      const namespace = value;
      this.advance(); // Skip dot
      
      let methodName = '';
      while (this.isAlphaNumeric(this.currentChar()) || this.currentChar() === '_') {
        methodName += this.currentChar();
        this.advance();
      }
      
      value = `${namespace}.${methodName}`;
    }

    const type = KEYWORDS.has(value) ? TokenType.KEYWORD
      : TYPES.has(value) ? TokenType.TYPE
      : TokenType.IDENTIFIER;

    return {
      type,
      value,
      line: startLine,
      column: startCol,
    };
  }

  private readOperator(): Token {
    const startLine = this.line;
    const startCol = this.column;
    const char = this.currentChar();
    const next = this.peek();

    // Two-character operators
    if (char === '=' && next === '=') {
      this.advance();
      this.advance();
      return { type: TokenType.EQUALS, value: '==', line: startLine, column: startCol };
    }
    if (char === '!' && next === '=') {
      this.advance();
      this.advance();
      return { type: TokenType.NOT_EQUALS, value: '!=', line: startLine, column: startCol };
    }
    if (char === '<' && next === '=') {
      this.advance();
      this.advance();
      return { type: TokenType.LESS_EQUALS, value: '<=', line: startLine, column: startCol };
    }
    if (char === '>' && next === '=') {
      this.advance();
      this.advance();
      return { type: TokenType.GREATER_EQUALS, value: '>=', line: startLine, column: startCol };
    }
    if (char === ':' && next === '=') {
      this.advance();
      this.advance();
      return { type: TokenType.ASSIGN_OP, value: ':=', line: startLine, column: startCol };
    }
    if (char === 'a' && next === 'n' && this.input[this.position + 2] === 'd') {
      this.advance(); this.advance(); this.advance();
      return { type: TokenType.AND, value: 'and', line: startLine, column: startCol };
    }
    if (char === 'o' && next === 'r') {
      this.advance(); this.advance();
      return { type: TokenType.OR, value: 'or', line: startLine, column: startCol };
    }
    if (char === 'n' && next === 'o' && this.input[this.position + 2] === 't') {
      this.advance(); this.advance(); this.advance();
      return { type: TokenType.NOT, value: 'not', line: startLine, column: startCol };
    }

    // Single-character operators
    this.advance();
    
    const mapping: Record<string, TokenType> = {
      '+': TokenType.PLUS,
      '-': TokenType.MINUS,
      '*': TokenType.STAR,
      '/': TokenType.SLASH,
      '%': TokenType.PERCENT,
      '=': TokenType.ASSIGN,
      '<': TokenType.LESS,
      '>': TokenType.GREATER,
      '(': TokenType.LPAREN,
      ')': TokenType.RPAREN,
      '[': TokenType.LBRACKET,
      ']': TokenType.RBRACKET,
      '{': TokenType.LBRACE,
      '}': TokenType.RBRACE,
      ',': TokenType.COMMA,
      '.': TokenType.DOT,
      ':': TokenType.COLON,
      ';': TokenType.SEMICOLON,
    };

    return {
      type: mapping[char] || TokenType.IDENTIFIER,
      value: char,
      line: startLine,
      column: startCol,
    };
  }

  private currentChar(): string {
    return this.input[this.position] || '';
  }

  private peek(): string {
    return this.input[this.position + 1] || '';
  }

  private advance(): void {
    if (this.currentChar() === '\n') {
      this.line++;
      this.column = 1;
    } else {
      this.column++;
    }
    this.position++;
  }

  private isDigit(char: string): boolean {
    return /[0-9]/.test(char);
  }

  private isAlpha(char: string): boolean {
    return /[a-zA-Z]/.test(char);
  }

  private isAlphaNumeric(char: string): boolean {
    return /[a-zA-Z0-9]/.test(char);
  }
}
