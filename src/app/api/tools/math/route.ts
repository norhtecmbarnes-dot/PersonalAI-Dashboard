import { NextResponse } from 'next/server';
import { mathTools, getMathToolsDescription } from '@/lib/utils/math-tools';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { operation, expression, data, a, b, variable } = body;

    let result;

    switch (operation) {
      case 'calculate':
      case 'evaluate':
        result = mathTools.calculate(expression);
        break;
      
      case 'simplify':
        result = mathTools.simplify(expression);
        break;
      
      case 'derivative':
        result = mathTools.derivative(expression, variable);
        break;
      
      case 'matrix':
        result = mathTools.matrix(data);
        break;
      
      case 'matrixInverse':
        result = mathTools.matrixInverse(data);
        break;
      
      case 'matrixMultiply':
        result = mathTools.matrixMultiply(a, b);
        break;
      
      case 'dotProduct':
        result = mathTools.dotProduct(a, b);
        break;
      
      case 'crossProduct':
        result = mathTools.crossProduct(a, b);
        break;
      
      case 'help':
        return NextResponse.json({
          tools: getMathToolsDescription()
        });
      
      default:
        return NextResponse.json(
          { error: 'Unknown operation. Use: calculate, simplify, derivative, matrix, matrixInverse, matrixMultiply, dotProduct, crossProduct' },
          { status: 400 }
        );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Math tools error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    available: true,
    description: 'Math tools API',
    operations: [
      'calculate/evaluate - Basic calculations',
      'simplify - Simplify expressions',
      'derivative - Calculate derivatives',
      'matrix - Create matrix',
      'matrixInverse - Inverse of matrix',
      'matrixMultiply - Multiply matrices',
      'dotProduct - Dot product of vectors',
      'crossProduct - Cross product of vectors',
    ]
  });
}
