// ============================================
// PINE SCRIPT PARSER
// Синтаксический анализ в AST
// ============================================

import { TokenType, Token, PineLexer } from './lexer';
import {
  ASTNode,
  Program,
  Expression,
  Statement,
  Identifier,
  Literal,
  BinaryExpression,
  UnaryExpression,
  FunctionCall,
  MemberExpression,
  Assignment,
  VariableDeclaration,
  IfStatement,
  ForStatement,
  BlockStatement,
  ReturnStatement,
  PlotStatement,
  InputDeclaration,
  IndicatorDeclaration,
} from './ast';

export class PineParser {
  private tokens: Token[];
  private position: number = 0;

  constructor(source: string) {
    const lexer = new PineLexer(source);
    this.tokens = lexer.tokenize();
  }

  parse(): Program {
    const program: Program = {
      type: 'Program',
      body: [],
      sourceType: 'script',
    };

    while (!this.isAtEnd()) {
      const declaration = this.parseDeclaration();
      if (declaration) {
        program.body.push(declaration);
      }
    }

    return program;
  }

  private parseDeclaration(): ASTNode | null {
    // indicator() / strategy() / library()
    if (this.match(TokenType.KEYWORD, 'indicator')) {
      return this.parseIndicatorDeclaration();
    }
    if (this.match(TokenType.KEYWORD, 'strategy')) {
      return this.parseStrategyDeclaration();
    }

    // input()
    if (this.match(TokenType.KEYWORD, 'input')) {
      return this.parseInputDeclaration();
    }

    // var / varip declaration
    if (this.match(TokenType.KEYWORD, 'var') || this.match(TokenType.KEYWORD, 'varip')) {
      return this.parseVariableDeclaration(true);
    }

    // plot()
    if (this.match(TokenType.KEYWORD, 'plot')) {
      return this.parsePlotStatement();
    }

    // alert()
    if (this.match(TokenType.KEYWORD, 'alert')) {
      return this.parseAlertStatement();
    }

    // strategy.* calls
    if (this.check(TokenType.IDENTIFIER) && this.peek().value === 'strategy') {
      return this.parseStatement();
    }

    // Regular statement or expression
    return this.parseStatement();
  }

  private parseIndicatorDeclaration(): IndicatorDeclaration {
    this.consume(TokenType.LPAREN, "Expected '(' after 'indicator'");
    
    const params: Record<string, any> = {};
    
    while (!this.check(TokenType.RPAREN) && !this.isAtEnd()) {
      if (this.match(TokenType.IDENTIFIER)) {
        const name = this.previous().value;
        if (this.match(TokenType.COLON)) {
          const value = this.parseExpression();
          params[name] = this.extractLiteralValue(value);
        }
      }
      this.match(TokenType.COMMA);
    }
    
    this.consume(TokenType.RPAREN, "Expected ')'");
    
    return {
      type: 'IndicatorDeclaration',
      name: params.title || 'Untitled',
      overlay: params.overlay ?? false,
      params,
    };
  }

  private parseStrategyDeclaration(): any {
    this.consume(TokenType.LPAREN, "Expected '(' after 'strategy'");
    
    const params: Record<string, any> = {};
    
    while (!this.check(TokenType.RPAREN) && !this.isAtEnd()) {
      if (this.match(TokenType.IDENTIFIER)) {
        const name = this.previous().value;
        if (this.match(TokenType.COLON)) {
          const value = this.parseExpression();
          params[name] = this.extractLiteralValue(value);
        }
      }
      this.match(TokenType.COMMA);
    }
    
    this.consume(TokenType.RPAREN, "Expected ')'");
    
    return {
      type: 'StrategyDeclaration',
      name: params.title || 'Untitled',
      params,
    };
  }

  private parseInputDeclaration(): InputDeclaration {
    this.consume(TokenType.LPAREN, "Expected '(' after 'input'");
    
    const inputType = 'float';
    let defaultValue: any = null;
    let title: string | undefined;
    let min: number | undefined;
    let max: number | undefined;
    let step: number | undefined;
    
    // Parse first argument (default value)
    if (!this.check(TokenType.RPAREN)) {
      const expr = this.parseExpression();
      defaultValue = this.extractLiteralValue(expr);
    }
    
    // Parse named arguments
    while (this.match(TokenType.COMMA)) {
      if (this.match(TokenType.IDENTIFIER)) {
        const name = this.previous().value;
        if (this.match(TokenType.COLON)) {
          const value = this.parseExpression();
          const val = this.extractLiteralValue(value);
          
          if (name === 'title') title = val;
          if (name === 'minval') min = val;
          if (name === 'maxval') max = val;
          if (name === 'step') step = val;
          if (name === 'options') { /* Handle options */ }
        }
      }
    }
    
    this.consume(TokenType.RPAREN, "Expected ')'");
    
    const id: Identifier = { type: 'Identifier', name: title || 'input' };
    
    return {
      type: 'InputDeclaration',
      name: title || 'input',
      inputType,
      defaultValue,
      title,
      min,
      max,
      step,
    };
  }

  private parseVariableDeclaration(isVar: boolean = false): VariableDeclaration {
    const varip = isVar && this.match(TokenType.KEYWORD, 'ip');
    const id = this.parseIdentifier();
    
    let init: Expression | undefined;
    if (this.match(TokenType.ASSIGN, TokenType.ASSIGN_OP)) {
      const operator = this.previous().value as '=' | ':=';
      init = this.parseExpression();
      
      return {
        type: 'Assignment',
        left: id,
        operator,
        right: init,
      } as any;
    }
    
    return {
      type: 'VariableDeclaration',
      id,
      var: isVar,
      varip,
    };
  }

  private parsePlotStatement(): PlotStatement {
    this.consume(TokenType.LPAREN, "Expected '(' after 'plot'");
    
    const expression = this.parseExpression();
    const params: Record<string, any> = {};
    
    while (this.match(TokenType.COMMA)) {
      if (this.match(TokenType.IDENTIFIER)) {
        const name = this.previous().value;
        if (this.match(TokenType.COLON)) {
          params[name] = this.parseExpression();
        }
      }
    }
    
    this.consume(TokenType.RPAREN, "Expected ')'");
    
    return {
      type: 'PlotStatement',
      expression,
      title: params.title ? this.extractLiteralValue(params.title) : undefined,
      color: params.color,
      linewidth: params.linewidth ? this.extractLiteralValue(params.linewidth) : 1,
      style: params.style ? this.extractLiteralValue(params.style) : 'line',
    };
  }

  private parseAlertStatement(): any {
    this.consume(TokenType.LPAREN, "Expected '(' after 'alert'");
    const message = this.parseExpression();
    this.consume(TokenType.RPAREN, "Expected ')'");
    
    return {
      type: 'AlertStatement',
      message,
    };
  }

  private parseStatement(): ASTNode {
    // If statement
    if (this.match(TokenType.KEYWORD, 'if')) {
      return this.parseIfStatement();
    }
    
    // For statement
    if (this.match(TokenType.KEYWORD, 'for')) {
      return this.parseForStatement();
    }
    
    // While statement
    if (this.match(TokenType.KEYWORD, 'while')) {
      return this.parseWhileStatement();
    }
    
    // Return statement
    if (this.match(TokenType.KEYWORD, 'return')) {
      return this.parseReturnStatement();
    }
    
    // Break/Continue
    if (this.match(TokenType.KEYWORD, 'break')) {
      return { type: 'BreakStatement' };
    }
    if (this.match(TokenType.KEYWORD, 'continue')) {
      return { type: 'ContinueStatement' };
    }
    
    // Expression statement or assignment
    const expr = this.parseExpression();
    
    if (this.match(TokenType.ASSIGN, TokenType.ASSIGN_OP)) {
      const operator = this.previous().value as '=' | ':=';
      const right = this.parseExpression();
      return {
        type: 'Assignment',
        left: expr,
        operator,
        right,
      };
    }
    
    this.skipNewlines();
    return expr;
  }

  private parseIfStatement(): IfStatement {
    const test = this.parseExpression();
    const consequent = this.parseBlock();
    
    let alternate: BlockStatement | undefined;
    if (this.match(TokenType.KEYWORD, 'else')) {
      alternate = this.parseBlock();
    }
    
    return {
      type: 'IfStatement',
      test,
      consequent,
      alternate,
    };
  }

  private parseForStatement(): ForStatement {
    this.consume(TokenType.IDENTIFIER, "Expected variable name");
    const variable = this.previous() as Identifier;
    
    this.consume(TokenType.KEYWORD, "Expected 'from'");
    const from = this.parseExpression();
    
    this.consume(TokenType.KEYWORD, "Expected 'to'");
    const to = this.parseExpression();
    
    const body = this.parseBlock();
    
    return {
      type: 'ForStatement',
      variable,
      from,
      to,
      body,
    };
  }

  private parseWhileStatement(): any {
    const test = this.parseExpression();
    const body = this.parseBlock();
    
    return {
      type: 'WhileStatement',
      test,
      body,
    };
  }

  private parseReturnStatement(): ReturnStatement {
    let argument: Expression | undefined;
    if (!this.check(TokenType.NEWLINE) && !this.check(TokenType.RPAREN) && !this.isAtEnd()) {
      argument = this.parseExpression();
    }
    
    this.skipNewlines();
    
    return {
      type: 'ReturnStatement',
      argument,
    };
  }

  private parseBlock(): BlockStatement {
    const body: ASTNode[] = [];
    
    // Check for indentation-based block
    this.skipNewlines();
    
    while (!this.isAtEnd() && !this.check(TokenType.KEYWORD, 'else')) {
      const stmt = this.parseDeclaration();
      if (stmt) {
        body.push(stmt);
      }
      this.skipNewlines();
      
      // Check if we're still in the block (same or greater indentation)
      // Simplified: just check for newlines
      if (this.check(TokenType.EOF)) break;
    }
    
    return {
      type: 'BlockStatement',
      body,
    };
  }

  private parseExpression(): Expression {
    return this.parseAssignment();
  }

  private parseAssignment(): Expression {
    const expr = this.parseOr();
    
    if (this.match(TokenType.ASSIGN, TokenType.ASSIGN_OP)) {
      const operator = this.previous().value as '=' | ':=';
      const right = this.parseAssignment();
      return {
        type: 'BinaryExpression',
        operator: operator as any,
        left: expr,
        right,
      };
    }
    
    return expr;
  }

  private parseOr(): Expression {
    let expr = this.parseAnd();
    
    while (this.match(TokenType.OR, TokenType.KEYWORD, 'or')) {
      const operator = this.previous().value;
      const right = this.parseAnd();
      expr = {
        type: 'BinaryExpression',
        operator: 'or',
        left: expr,
        right,
      };
    }
    
    return expr;
  }

  private parseAnd(): Expression {
    let expr = this.parseEquality();
    
    while (this.match(TokenType.AND, TokenType.KEYWORD, 'and')) {
      const operator = this.previous().value;
      const right = this.parseEquality();
      expr = {
        type: 'BinaryExpression',
        operator: 'and',
        left: expr,
        right,
      };
    }
    
    return expr;
  }

  private parseEquality(): Expression {
    let expr = this.parseComparison();
    
    while (this.match(TokenType.EQUALS, TokenType.NOT_EQUALS)) {
      const operator = this.previous().type === TokenType.EQUALS ? '==' : '!=';
      const right = this.parseComparison();
      expr = {
        type: 'BinaryExpression',
        operator,
        left: expr,
        right,
      };
    }
    
    return expr;
  }

  private parseComparison(): Expression {
    let expr = this.parseAdditive();
    
    while (this.match(TokenType.LESS, TokenType.GREATER, TokenType.LESS_EQUALS, TokenType.GREATER_EQUALS)) {
      const operator = this.previous().value as any;
      const right = this.parseAdditive();
      expr = {
        type: 'BinaryExpression',
        operator,
        left: expr,
        right,
      };
    }
    
    return expr;
  }

  private parseAdditive(): Expression {
    let expr = this.parseMultiplicative();
    
    while (this.match(TokenType.PLUS, TokenType.MINUS)) {
      const operator = this.previous().type === TokenType.PLUS ? '+' : '-';
      const right = this.parseMultiplicative();
      expr = {
        type: 'BinaryExpression',
        operator,
        left: expr,
        right,
      };
    }
    
    return expr;
  }

  private parseMultiplicative(): Expression {
    let expr = this.parseUnary();
    
    while (this.match(TokenType.STAR, TokenType.SLASH, TokenType.PERCENT)) {
      const operator = this.previous().value as any;
      const right = this.parseUnary();
      expr = {
        type: 'BinaryExpression',
        operator,
        left: expr,
        right,
      };
    }
    
    return expr;
  }

  private parseUnary(): Expression {
    if (this.match(TokenType.MINUS, TokenType.NOT, TokenType.KEYWORD, 'not')) {
      const operator = this.previous().value as any;
      const argument = this.parseUnary();
      return {
        type: 'UnaryExpression',
        operator,
        argument,
      };
    }
    
    return this.parseCall();
  }

  private parseCall(): Expression {
    let expr = this.parseMember();
    
    while (true) {
      if (this.match(TokenType.LPAREN)) {
        expr = this.finishCall(expr);
      } else if (this.match(TokenType.LBRACKET)) {
        const index = this.parseExpression();
        this.consume(TokenType.RBRACKET, "Expected ']'");
        expr = {
          type: 'IndexExpression',
          object: expr,
          index,
        };
      } else {
        break;
      }
    }
    
    return expr;
  }

  private finishCall(callee: Expression): FunctionCall {
    const args: Expression[] = [];
    
    if (!this.check(TokenType.RPAREN)) {
      do {
        args.push(this.parseExpression());
      } while (this.match(TokenType.COMMA));
    }
    
    this.consume(TokenType.RPAREN, "Expected ')'");
    
    return {
      type: 'FunctionCall',
      callee,
      arguments: args,
    };
  }

  private parseMember(): Expression {
    let expr = this.parsePrimary();
    
    while (this.match(TokenType.DOT)) {
      const property = this.parseIdentifier();
      expr = {
        type: 'MemberExpression',
        object: expr,
        property,
        computed: false,
      };
    }
    
    return expr;
  }

  private parsePrimary(): Expression {
    if (this.match(TokenType.NUMBER, TokenType.STRING, TokenType.BOOL)) {
      const token = this.previous();
      return {
        type: 'Literal',
        value: this.parseLiteralValue(token),
        raw: token.value,
      };
    }
    
    if (this.match(TokenType.KEYWORD, 'na')) {
      return {
        type: 'Literal',
        value: null,
        raw: 'na',
      };
    }
    
    if (this.match(TokenType.KEYWORD, 'true')) {
      return { type: 'Literal', value: true, raw: 'true' };
    }
    
    if (this.match(TokenType.KEYWORD, 'false')) {
      return { type: 'Literal', value: false, raw: 'false' };
    }
    
    if (this.match(TokenType.IDENTIFIER)) {
      return this.previous() as Identifier;
    }
    
    if (this.match(TokenType.LPAREN)) {
      const expr = this.parseExpression();
      this.consume(TokenType.RPAREN, "Expected ')'");
      return expr;
    }
    
    throw this.error(this.peek(), "Expected expression");
  }

  private parseIdentifier(): Identifier {
    this.consume(TokenType.IDENTIFIER, "Expected identifier");
    return this.previous() as Identifier;
  }

  // Helper methods
  private match(...types: (TokenType | string)[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private check(type: TokenType | string, value?: string): boolean {
    if (this.isAtEnd()) return false;
    const token = this.peek();
    if (typeof type === 'string') {
      return token.type === TokenType.KEYWORD && token.value === type;
    }
    if (value !== undefined) {
      return token.type === type && token.value === value;
    }
    return token.type === type;
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) {
      return this.advance();
    }
    throw this.error(this.peek(), message);
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.position++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private peek(): Token {
    return this.tokens[this.position];
  }

  private previous(): Token {
    return this.tokens[this.position - 1];
  }

  private skipNewlines(): void {
    while (this.match(TokenType.NEWLINE, TokenType.COMMENT)) {}
  }

  private error(token: Token, message: string): Error {
    return new Error(`[Line ${token.line}] Error at '${token.value}': ${message}`);
  }

  private extractLiteralValue(expr: Expression): any {
    if (expr.type === 'Literal') {
      return expr.value;
    }
    return undefined;
  }

  private parseLiteralValue(token: Token): any {
    switch (token.type) {
      case TokenType.NUMBER:
        return parseFloat(token.value);
      case TokenType.STRING:
        return token.value;
      case TokenType.BOOL:
      case TokenType.KEYWORD:
        return token.value === 'true';
      default:
        return token.value;
    }
  }
}
