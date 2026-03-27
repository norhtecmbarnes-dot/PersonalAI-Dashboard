
/**
 * API Input Validation Wrapper
 * Use this in all API routes to ensure proper input validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateString, validateArray, validateObject } from '@/lib/utils/validation';

export interface APIInputOptions {
  maxBodySize?: number;
  allowedFields?: string[];
}

export function validateAPIInput(
  body: any,
  schema: Record<string, { type: 'string' | 'number' | 'boolean' | 'array' | 'object'; required?: boolean; max?: number; min?: number }>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const [field, rules] of Object.entries(schema)) {
    const value = body[field];
    
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push(`${field} is required`);
      continue;
    }
    
    if (value === undefined || value === null) continue;
    
    switch (rules.type) {
      case 'string':
        if (typeof value !== 'string') {
          errors.push(`${field} must be a string`);
        } else if (rules.max !== undefined && value.length > rules.max) {
          errors.push(`${field} must be at most ${rules.max} characters`);
        } else if (rules.min !== undefined && value.length < rules.min) {
          errors.push(`${field} must be at least ${rules.min} characters`);
        }
        break;
      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          errors.push(`${field} must be a valid number`);
        } else if (rules.max !== undefined && value > rules.max) {
          errors.push(`${field} must be at most ${rules.max}`);
        } else if (rules.min !== undefined && value < rules.min) {
          errors.push(`${field} must be at least ${rules.min}`);
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push(`${field} must be a boolean`);
        }
        break;
      case 'array':
        if (!Array.isArray(value)) {
          errors.push(`${field} must be an array`);
        } else if (rules.max !== undefined && value.length > rules.max) {
          errors.push(`${field} must have at most ${rules.max} items`);
        }
        break;
      case 'object':
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          errors.push(`${field} must be an object`);
        }
        break;
    }
  }

  return { valid: errors.length === 0, errors };
}

export function sanitizeSearchParam(param: string | null, maxLength: number = 500): string {
  if (!param) return '';
  return param.slice(0, maxLength).replace(/[<>"'&]/g, '');
}

export function parseSearchParams(request: NextRequest): Record<string, string> {
  const params: Record<string, string> = {};
  request.nextUrl.searchParams.forEach((value, key) => {
    params[key] = sanitizeSearchParam(value);
  });
  return params;
}
