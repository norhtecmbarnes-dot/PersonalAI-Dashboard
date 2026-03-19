/**
 * Encryption utility for sensitive data
 * Uses AES-256-GCM for encrypting API keys and other secrets
 * The encryption key is derived from a master password stored in .env or user-provided
 */

import * as crypto from 'crypto';

// Master encryption key - can be set via ENCRYPTION_KEY env var
// If not set, generates a random one (data won't persist across restarts)
let masterKey: Buffer | null = null;

function getMasterKey(): Buffer {
  if (masterKey) return masterKey;

  // Try to get from environment
  const envKey = process.env.ENCRYPTION_KEY;
  if (envKey) {
    // Derive a 32-byte key from the provided key
    masterKey = crypto.createHash('sha256').update(envKey).digest();
    return masterKey;
  }

  // Generate a deterministic key based on machine info
  // This allows data to persist across restarts on the same machine
  const machineId = getMachineId();
  masterKey = crypto.createHash('sha256').update(`personalai-${machineId}`).digest();
  return masterKey;
}

function getMachineId(): string {
  // Create a stable machine identifier
  // This is NOT cryptographically secure, but provides consistency
  try {
    const os = require('os');
    const hostname = os.hostname();
    const username = os.userInfo().username;
    const platform = os.platform();
    return `${hostname}-${username}-${platform}`;
  } catch {
    return 'default-machine-id';
  }
}

export interface EncryptedData {
  encrypted: string; // Base64 encoded encrypted data
  iv: string; // Base64 encoded initialization vector
  authTag: string; // Base64 encoded authentication tag
  version: number; // Encryption version for future compatibility
}

/**
 * Encrypt a string value using AES-256-GCM
 */
export function encrypt(plaintext: string): EncryptedData {
  const key = getMasterKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    version: 1,
  };
}

/**
 * Decrypt an encrypted value
 */
export function decrypt(encryptedData: EncryptedData): string {
  const key = getMasterKey();
  const iv = Buffer.from(encryptedData.encrypted, 'base64');
  const authTag = Buffer.from(encryptedData.authTag, 'base64');

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(encryptedData.encrypted, 'base64')
  );

  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedData.encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Encrypt and encode to JSON string for storage
 */
export function encryptToStore(plaintext: string): string {
  const encrypted = encrypt(plaintext);
  return JSON.stringify(encrypted);
}

/**
 * Decrypt from JSON string storage
 */
export function decryptFromStore(stored: string): string {
  try {
    const encryptedData: EncryptedData = JSON.parse(stored);
    return decrypt(encryptedData);
  } catch (error) {
    // If decryption fails, data might be unencrypted (legacy)
    // Return as-is for backward compatibility
    console.warn(
      '[Encryption] Failed to decrypt, returning raw value (may be legacy unencrypted data)'
    );
    return stored;
  }
}

/**
 * Check if a string is encrypted data
 */
export function isEncrypted(value: string): boolean {
  try {
    const parsed = JSON.parse(value);
    return (
      parsed.version !== undefined &&
      parsed.encrypted !== undefined &&
      parsed.iv !== undefined &&
      parsed.authTag !== undefined
    );
  } catch {
    return false;
  }
}

/**
 * Securely hash a value (one-way, cannot be decrypted)
 */
export function hashValue(value: string): string {
  const key = getMasterKey();
  return crypto.createHmac('sha256', key).update(value).digest('hex');
}

/**
 * Verify a value against a hash
 */
export function verifyHash(value: string, hashed: string): boolean {
  return hashValue(value) === hashed;
}

/**
 * Generate a random password
 */
export function generatePassword(length: number = 32): string {
  return crypto.randomBytes(length).toString('base64').slice(0, length);
}

/**
 * Mask a sensitive value for display
 */
export function maskValue(value: string, visibleChars: number = 4): string {
  if (!value) return '***';
  if (value.length <= visibleChars) return '*'.repeat(value.length);
  return (
    value.slice(0, Math.ceil(visibleChars / 2)) + '***' + value.slice(-Math.floor(visibleChars / 2))
  );
}

/**
 * Check if running in a secure context (Node.js)
 */
export function isSecureContext(): boolean {
  try {
    // Check if we can access crypto module
    require('crypto');
    return true;
  } catch {
    return false;
  }
}
