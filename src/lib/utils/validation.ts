/**
 * Validation utilities for API routes
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Sanitize user input for use in prompts
 * Prevents prompt injection attacks
 */
export function sanitizePrompt(input: string, maxLength: number = 4000): string {
  if (!input || typeof input !== 'string') return '';
  
  // Truncate to max length
  let sanitized = input.slice(0, maxLength);
  
  // Remove potential prompt injection patterns
  const injectionPatterns = [
    /```[\s\S]*?```/g,                    // Remove code blocks
    /<\|.*?\|>/g,                          // Remove special tokens
    /\[INST\].*?\[\/INST\]/gi,             // Remove instruction tags
    /<<.*?>>/g,                            // Remove angle bracket tags
    /system\s*:/gi,                        // Remove "system:" prefixes
    /assistant\s*:/gi,                     // Remove "assistant:" prefixes
    /user\s*:/gi,                           // Remove "user:" prefixes
    /ignore\s+previous\s+instructions/gi,  // Common injection phrase
    /ignore\s+all\s+instructions/gi,       // Common injection phrase
    /disregard\s+all/gi,                    // Common injection phrase
    /forget\s+everything/gi,               // Common injection phrase
    /you\s+are\s+now/gi,                    // Role manipulation
    /new\s+instructions/gi,                // Instruction injection
    /\[SYSTEM\]/gi,                         // System tag injection
    /\[AI\]/gi,                             // AI tag injection
    /\[HUMAN\]/gi,                          // Human tag injection
  ];
  
  for (const pattern of injectionPatterns) {
    sanitized = sanitized.replace(pattern, '');
  }
  
  // Escape special characters that could be interpreted as prompt syntax
  sanitized = sanitized
    .replace(/\\/g, '\\\\')
    .replace(/\n{3,}/g, '\n\n');  // Limit consecutive newlines
  
  // Remove any control characters except newlines and tabs
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  return sanitized.trim();
}

/**
 * Sanitize for display/HTML contexts
 */
export function sanitizeDisplay(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
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
