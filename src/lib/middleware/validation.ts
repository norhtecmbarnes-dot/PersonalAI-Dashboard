export interface ValidationResult {
  valid: boolean;
  errors: string[];
  sanitized?: Record<string, unknown>;
}

export type FieldType = 'string' | 'number' | 'boolean' | 'array' | 'object' | 'email' | 'url' | 'uuid' | 'date';

export interface FieldSchema {
  type: FieldType;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: (string | number)[];
  sanitize?: boolean;
  default?: unknown;
}

export interface Schema {
  [key: string]: FieldSchema;
}

const validators: Record<FieldType, (value: unknown, field: FieldSchema) => string | null> = {
  string: (value, field) => {
    if (typeof value !== 'string') return 'Must be a string';
    if (field.minLength && value.length < field.minLength) return `Minimum ${field.minLength} characters`;
    if (field.maxLength && value.length > field.maxLength) return `Maximum ${field.maxLength} characters`;
    if (field.pattern && !field.pattern.test(value)) return 'Invalid format';
    if (field.enum && !field.enum.includes(value)) return `Must be one of: ${field.enum.join(', ')}`;
    return null;
  },
  number: (value, field) => {
    if (typeof value !== 'number' || isNaN(value)) return 'Must be a number';
    if (field.min !== undefined && value < field.min) return `Minimum: ${field.min}`;
    if (field.max !== undefined && value > field.max) return `Maximum: ${field.max}`;
    return null;
  },
  boolean: (value) => {
    if (typeof value !== 'boolean') return 'Must be a boolean';
    return null;
  },
  array: (value, field) => {
    if (!Array.isArray(value)) return 'Must be an array';
    if (field.minLength && value.length < field.minLength) return `Minimum ${field.minLength} items`;
    if (field.maxLength && value.length > field.maxLength) return `Maximum ${field.maxLength} items`;
    return null;
  },
  object: (value) => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return 'Must be an object';
    return null;
  },
  email: (value) => {
    if (typeof value !== 'string') return 'Must be a string';
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(value)) return 'Invalid email format';
    return null;
  },
  url: (value) => {
    if (typeof value !== 'string') return 'Must be a string';
    try {
      new URL(value);
      return null;
    } catch {
      return 'Invalid URL format';
    }
  },
  uuid: (value) => {
    if (typeof value !== 'string') return 'Must be a string';
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(value)) return 'Invalid UUID format';
    return null;
  },
  date: (value) => {
    if (typeof value !== 'string' && typeof value !== 'number') return 'Must be a string or number';
    const date = new Date(value as string | number);
    if (isNaN(date.getTime())) return 'Invalid date';
    return null;
  },
};

function sanitizeString(value: string): string {
  return value
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .trim();
}

function sanitizeValue(value: unknown, field: FieldSchema): unknown {
  if (field.sanitize === false) return value;
  
  if (typeof value === 'string' && field.type === 'string') {
    return sanitizeString(value);
  }
  
  if (Array.isArray(value)) {
    return value.map(v => typeof v === 'string' ? sanitizeString(v) : v);
  }
  
  if (typeof value === 'object' && value !== null) {
    const sanitized: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      sanitized[k] = typeof v === 'string' ? sanitizeString(v) : v;
    }
    return sanitized;
  }
  
  return value;
}

export function validate(data: Record<string, unknown>, schema: Schema): ValidationResult {
  const errors: string[] = [];
  const sanitized: Record<string, unknown> = {};
  
  for (const [field, fieldSchema] of Object.entries(schema)) {
    const value = data[field];
    
    if (value === undefined || value === null || value === '') {
      if (fieldSchema.required) {
        errors.push(`${field} is required`);
        continue;
      }
      if (fieldSchema.default !== undefined) {
        sanitized[field] = fieldSchema.default;
      }
      continue;
    }
    
    const validator = validators[fieldSchema.type];
    if (!validator) {
      errors.push(`${field}: Unknown type ${fieldSchema.type}`);
      continue;
    }
    
    const error = validator(value, fieldSchema);
    if (error) {
      errors.push(`${field}: ${error}`);
      continue;
    }
    
    sanitized[field] = sanitizeValue(value, fieldSchema);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    sanitized,
  };
}

export function validateBody(body: unknown, schema: Schema): ValidationResult {
  if (typeof body !== 'object' || body === null) {
    return { valid: false, errors: ['Request body must be a JSON object'] };
  }
  return validate(body as Record<string, unknown>, schema);
}

export const commonSchemas = {
  id: { type: 'uuid' as const, required: true },
  pagination: {
    page: { type: 'number' as const, min: 1, default: 1 },
    limit: { type: 'number' as const, min: 1, max: 100, default: 20 },
  },
  message: {
    content: { type: 'string' as const, required: true, minLength: 1, maxLength: 10000 },
    model: { type: 'string' as const, required: false },
  },
  document: {
    title: { type: 'string' as const, required: true, minLength: 1, maxLength: 500 },
    content: { type: 'string' as const, required: true },
    type: { type: 'string' as const, enum: ['text', 'markdown', 'html', 'code'] },
  },
  note: {
    title: { type: 'string' as const, required: true, minLength: 1, maxLength: 200 },
    content: { type: 'string' as const, required: true },
    category: { type: 'string' as const, required: false },
  },
};