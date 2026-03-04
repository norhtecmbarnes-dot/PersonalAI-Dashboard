/**
 * Validation utilities for API routes
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateString(value: any, fieldName: string, options?: {
  minLength?: number;
  maxLength?: number;
  required?: boolean;
}): ValidationResult {
  const { minLength = 1, maxLength = 10000, required = true } = options || {};
  
  if (required && (value === undefined || value === null || value === '')) {
    return { valid: false, error: `${fieldName} is required` };
  }
  
  if (!required && (value === undefined || value === null)) {
    return { valid: true };
  }
  
  if (typeof value !== 'string') {
    return { valid: false, error: `${fieldName} must be a string` };
  }
  
  if (value.length < minLength) {
    return { valid: false, error: `${fieldName} must be at least ${minLength} characters` };
  }
  
  if (value.length > maxLength) {
    return { valid: false, error: `${fieldName} must be no more than ${maxLength} characters` };
  }
  
  return { valid: true };
}

export function validateArray(value: any, fieldName: string, options?: {
  maxLength?: number;
  required?: boolean;
}): ValidationResult {
  const { maxLength = 1000, required = false } = options || {};
  
  if (required && !Array.isArray(value)) {
    return { valid: false, error: `${fieldName} must be an array` };
  }
  
  if (Array.isArray(value) && value.length > maxLength) {
    return { valid: false, error: `${fieldName} must have no more than ${maxLength} items` };
  }
  
  return { valid: true };
}

export function validateNumber(value: any, fieldName: string, options?: {
  min?: number;
  max?: number;
  required?: boolean;
}): ValidationResult {
  const { required = false } = options || {};
  
  if (required && (value === undefined || value === null)) {
    return { valid: false, error: `${fieldName} is required` };
  }
  
  if (value === undefined || value === null) {
    return { valid: true };
  }
  
  if (typeof value !== 'number' || isNaN(value)) {
    return { valid: false, error: `${fieldName} must be a valid number` };
  }
  
  if (options?.min !== undefined && value < options.min) {
    return { valid: false, error: `${fieldName} must be at least ${options.min}` };
  }
  
  if (options?.max !== undefined && value > options.max) {
    return { valid: false, error: `${fieldName} must be no more than ${options.max}` };
  }
  
  return { valid: true };
}

export function validateBoolean(value: any, fieldName: string): ValidationResult {
  if (value === undefined || value === null) {
    return { valid: true };
  }
  
  if (typeof value !== 'boolean') {
    return { valid: false, error: `${fieldName} must be a boolean` };
  }
  
  return { valid: true };
}

export function validateObject(value: any, fieldName: string, options?: {
  required?: boolean;
}): ValidationResult {
  const { required = false } = options || {};
  
  if (required && (value === undefined || value === null)) {
    return { valid: false, error: `${fieldName} is required` };
  }
  
  if (!required && (value === undefined || value === null)) {
    return { valid: true };
  }
  
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { valid: false, error: `${fieldName} must be an object` };
  }
  
  return { valid: true };
}

export function sanitizeString(input: string): string {
  // Remove null bytes and trim
  return input.replace(/\x00/g, '').trim();
}

export function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  return obj;
}
