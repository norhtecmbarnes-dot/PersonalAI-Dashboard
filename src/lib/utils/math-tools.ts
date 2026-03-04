import { evaluate, parse, simplify, derivative, matrix, inv, dot, cross } from 'mathjs';

export interface MathResult {
  success: boolean;
  expression: string;
  result: any;
  error?: string;
}

export interface MathTools {
  calculate: (expression: string) => MathResult;
  evaluate: (expression: string) => MathResult;
  simplify: (expression: string) => MathResult;
  derivative: (expression: string, variable?: string) => MathResult;
  matrix: (data: number[][]) => MathResult;
  matrixInverse: (data: number[][]) => MathResult;
  matrixMultiply: (a: number[][], b: number[][]) => MathResult;
  dotProduct: (a: number[], b: number[]) => MathResult;
  crossProduct: (a: number[], b: number[]) => MathResult;
}

export const mathTools: MathTools = {
  calculate: (expression: string): MathResult => {
    try {
      const result = evaluate(expression);
      return {
        success: true,
        expression,
        result: typeof result === 'object' ? result.toString() : result,
      };
    } catch (error) {
      return {
        success: false,
        expression,
        result: null,
        error: error instanceof Error ? error.message : 'Calculation error',
      };
    }
  },

  evaluate: (expression: string): MathResult => {
    return mathTools.calculate(expression);
  },

  simplify: (expression: string): MathResult => {
    try {
      const simplified = simplify(expression);
      return {
        success: true,
        expression,
        result: simplified.toString(),
      };
    } catch (error) {
      return {
        success: false,
        expression,
        result: null,
        error: error instanceof Error ? error.message : 'Simplify error',
      };
    }
  },

  derivative: (expression: string, variable: string = 'x'): MathResult => {
    try {
      const deriv = derivative(expression, variable);
      return {
        success: true,
        expression,
        result: deriv.toString(),
      };
    } catch (error) {
      return {
        success: false,
        expression,
        result: null,
        error: error instanceof Error ? error.message : 'Derivative error',
      };
    }
  },

  matrix: (data: number[][]): MathResult => {
    try {
      const m = matrix(data);
      return {
        success: true,
        expression: 'matrix',
        result: m.toString(),
      };
    } catch (error) {
      return {
        success: false,
        expression: 'matrix',
        result: null,
        error: error instanceof Error ? error.message : 'Matrix creation error',
      };
    }
  },

  matrixInverse: (data: number[][]): MathResult => {
    try {
      const m = matrix(data);
      const inverse = inv(m);
      return {
        success: true,
        expression: 'inverse',
        result: inverse.toString(),
      };
    } catch (error) {
      return {
        success: false,
        expression: 'inverse',
        result: null,
        error: error instanceof Error ? error.message : 'Matrix inverse error',
      };
    }
  },

  matrixMultiply: (a: number[][], b: number[][]): MathResult => {
    try {
      const ma = matrix(a);
      const mb = matrix(b);
      const result = (ma as any).multiply(mb);
      return {
        success: true,
        expression: 'multiply',
        result: result.toString(),
      };
    } catch (error) {
      return {
        success: false,
        expression: 'multiply',
        result: null,
        error: error instanceof Error ? error.message : 'Matrix multiply error',
      };
    }
  },

  dotProduct: (a: number[], b: number[]): MathResult => {
    try {
      const result = dot(a, b);
      return {
        success: true,
        expression: 'dot',
        result: result.toString(),
      };
    } catch (error) {
      return {
        success: false,
        expression: 'dot',
        result: null,
        error: error instanceof Error ? error.message : 'Dot product error',
      };
    }
  },

  crossProduct: (a: number[], b: number[]): MathResult => {
    try {
      const result = cross(a, b);
      return {
        success: true,
        expression: 'cross',
        result: result.toString(),
      };
    } catch (error) {
      return {
        success: false,
        expression: 'cross',
        result: null,
        error: error instanceof Error ? error.message : 'Cross product error',
      };
    }
  },
};

export function getMathToolsDescription(): string {
  return `
## Math Tools Available

The AI can use these math functions when needed:

1. **calculate(expression)** - Evaluate any mathematical expression
   - Example: calculate("2 + 2 * 3") = 8
   - Supports: +, -, *, /, ^, sqrt, sin, cos, tan, log, ln, etc.

2. **simplify(expression)** - Simplify a mathematical expression
   - Example: simplify("2*x + 4*x") = "6*x"

3. **derivative(expression, variable)** - Calculate derivative
   - Example: derivative("x^2 + 3*x", "x") = "2*x + 3"

4. **matrix(data)** - Create a matrix
   - Example: matrix([[1, 2], [3, 4]])

5. **matrixInverse(data)** - Calculate matrix inverse
   - Example: matrixInverse([[1, 2], [3, 4]])

6. **matrixMultiply(a, b)** - Multiply two matrices

7. **dotProduct(a, b)** - Calculate dot product of two vectors

8. **crossProduct(a, b)** - Calculate cross product of two 3D vectors

Use these tools whenever the user asks for calculations, math, or quantitative analysis.
`;
}
