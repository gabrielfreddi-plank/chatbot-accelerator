import type Anthropic from '@anthropic-ai/sdk'

export const calculatorTool: Anthropic.Tool = {
  name: 'calculate',
  description:
    'Evaluate a mathematical expression and return the numeric result. Supports +, -, *, /, ** (power, e.g. 2**8 = 256), // (square root prefix, e.g. //9 = 3), and parentheses. Use this whenever the user asks for arithmetic or math calculations.',
  input_schema: {
    type: 'object' as const,
    properties: {
      expression: {
        type: 'string',
        description: 'The mathematical expression to evaluate, e.g. "2**10 + //16"',
      },
    },
    required: ['expression'],
  },
}

type TokenType =
  | 'NUMBER'
  | 'PLUS'
  | 'MINUS'
  | 'STAR'
  | 'SLASH'
  | 'LPAREN'
  | 'RPAREN'
  | 'POW'
  | 'SQRT'
  | 'EOF'

interface Token {
  type: TokenType
  value?: number
}

function tokenize(input: string): Token[] {
  const tokens: Token[] = []
  const s = input.replace(/\s+/g, '')
  let i = 0

  while (i < s.length) {
    if (s[i] === '*' && s[i + 1] === '*') {
      tokens.push({ type: 'POW' }); i += 2
    } else if (s[i] === '/' && s[i + 1] === '/') {
      tokens.push({ type: 'SQRT' }); i += 2
    } else if (s[i] === '+') {
      tokens.push({ type: 'PLUS' }); i++
    } else if (s[i] === '-') {
      tokens.push({ type: 'MINUS' }); i++
    } else if (s[i] === '*') {
      tokens.push({ type: 'STAR' }); i++
    } else if (s[i] === '/') {
      tokens.push({ type: 'SLASH' }); i++
    } else if (s[i] === '(') {
      tokens.push({ type: 'LPAREN' }); i++
    } else if (s[i] === ')') {
      tokens.push({ type: 'RPAREN' }); i++
    } else if (/[\d.]/.test(s[i])) {
      let num = ''
      while (i < s.length && /[\d.]/.test(s[i])) { num += s[i]; i++ }
      tokens.push({ type: 'NUMBER', value: parseFloat(num) })
    } else {
      throw new Error(`Unknown character: "${s[i]}"`)
    }
  }

  tokens.push({ type: 'EOF' })
  return tokens
}

class Parser {
  private pos = 0
  constructor(private readonly tokens: Token[]) {}

  private peek(): Token { return this.tokens[this.pos] }
  private consume(): Token { return this.tokens[this.pos++] }
  private expect(type: TokenType): void {
    const t = this.consume()
    if (t.type !== type) throw new Error(`Expected ${type}, got ${t.type}`)
  }

  parse(): number {
    const result = this.parseAdditive()
    if (this.peek().type !== 'EOF') throw new Error('Unexpected token after expression')
    return result
  }

  private parseAdditive(): number {
    let left = this.parseMultiplicative()
    while (this.peek().type === 'PLUS' || this.peek().type === 'MINUS') {
      const op = this.consume().type
      const right = this.parseMultiplicative()
      left = op === 'PLUS' ? left + right : left - right
    }
    return left
  }

  private parseMultiplicative(): number {
    let left = this.parsePower()
    while (this.peek().type === 'STAR' || this.peek().type === 'SLASH') {
      const op = this.consume().type
      const right = this.parsePower()
      if (op === 'SLASH' && right === 0) throw new Error('Division by zero')
      left = op === 'STAR' ? left * right : left / right
    }
    return left
  }

  private parsePower(): number {
    const base = this.parseUnary()
    if (this.peek().type === 'POW') {
      this.consume()
      return Math.pow(base, this.parsePower()) // right-associative
    }
    return base
  }

  private parseUnary(): number {
    if (this.peek().type === 'SQRT') {
      this.consume()
      const val = this.parseUnary()
      if (val < 0) throw new Error('Cannot take square root of a negative number')
      return Math.sqrt(val)
    }
    if (this.peek().type === 'MINUS') {
      this.consume()
      return -this.parseUnary()
    }
    return this.parsePrimary()
  }

  private parsePrimary(): number {
    const t = this.peek()
    if (t.type === 'NUMBER') {
      this.consume()
      return t.value!
    }
    if (t.type === 'LPAREN') {
      this.consume()
      const val = this.parseAdditive()
      this.expect('RPAREN')
      return val
    }
    throw new Error(`Unexpected token: ${t.type}`)
  }
}

export function executeCalculate(expression: string): string {
  try {
    const tokens = tokenize(expression)
    const result = new Parser(tokens).parse()
    return String(result)
  } catch (err) {
    return `Error: ${(err as Error).message}`
  }
}
