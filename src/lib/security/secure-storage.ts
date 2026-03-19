/**
 * Secure Storage Service
 * Provides encrypted storage for sensitive data like API keys, passwords, etc.
 */

import { sqlDatabase } from '@/lib/database/sqlite';
import { encryptToStore, decryptFromStore, maskValue } from './encryption';

export interface SensitiveEntry {
  id: string;
  service: string;
  type: 'api_key' | 'password' | 'credential' | 'secret' | 'token';
  key?: string;
  value: string; // Encrypted in storage
  username?: string;
  url?: string;
  notes?: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  lastUsed?: number;
}

export interface SensitiveDataExport {
  version: number;
  exportedAt: number;
  entries: Array<{
    service: string;
    type: SensitiveEntry['type'];
    key?: string;
    value: string; // Still encrypted in export
    username?: string;
    url?: string;
    notes?: string;
    tags: string[];
  }>;
}

class SecureStorage {
  private initialized = false;

  initialize(): void {
    if (this.initialized) return;

    try {
      sqlDatabase.initialize();
      this.initialized = true;
    } catch (error) {
      console.error('[SecureStorage] Initialization failed:', error);
    }
  }

  /**
   * Store a sensitive value (encrypted)
   */
  store(data: {
    service: string;
    type: SensitiveEntry['type'];
    key?: string;
    value: string;
    username?: string;
    url?: string;
    notes?: string;
    tags?: string[];
  }): SensitiveEntry {
    this.initialize();

    const id = `${data.service}_${data.type}_${data.key || 'default'}`
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_');
    const now = Date.now();
    const encryptedValue = encryptToStore(data.value);

    sqlDatabase.setSetting(`sensitive_${id}`, encryptedValue, 'sensitive');

    // Store metadata
    sqlDatabase.setSetting(
      `sensitive_${id}_meta`,
      JSON.stringify({
        service: data.service,
        type: data.type,
        key: data.key,
        username: data.username,
        url: data.url,
        notes: data.notes,
        tags: data.tags || [],
      }),
      'sensitive_meta'
    );

    return this.get(id)!;
  }

  /**
   * Retrieve a sensitive value (decrypted)
   */
  get(id: string): SensitiveEntry | null {
    this.initialize();

    const value = sqlDatabase.getSetting(`sensitive_${id}`);
    const metaStr = sqlDatabase.getSetting(`sensitive_${id}_meta`);

    if (!value || !metaStr) return null;

    try {
      const meta = JSON.parse(metaStr);
      return {
        id,
        service: meta.service,
        type: meta.type,
        key: meta.key,
        value: decryptFromStore(value),
        username: meta.username,
        url: meta.url,
        notes: meta.notes,
        tags: meta.tags || [],
        createdAt: meta.createdAt || Date.now(),
        updatedAt: meta.updatedAt || Date.now(),
      };
    } catch {
      return null;
    }
  }

  /**
   * Get a value by service and type
   */
  getByService(service: string, type?: SensitiveEntry['type']): SensitiveEntry[] {
    this.initialize();

    const allSettings = sqlDatabase.getSettingsByCategory('sensitive_meta');
    const entries: SensitiveEntry[] = [];

    for (const [key, value] of Object.entries(allSettings)) {
      try {
        const meta = JSON.parse(value);
        if (meta.service === service && (!type || meta.type === type)) {
          const id = key.replace('sensitive_', '').replace('_meta', '');
          const entry = this.get(id);
          if (entry) entries.push(entry);
        }
      } catch {}
    }

    return entries;
  }

  /**
   * Get all API keys
   */
  getAllApiKeys(): Array<{ provider: string; keyId: string; hasKey: boolean; lastUsed?: number }> {
    this.initialize();

    const allSettings = sqlDatabase.getSettingsByCategory('sensitive_meta');
    const keys: Array<{ provider: string; keyId: string; hasKey: boolean; lastUsed?: number }> = [];

    for (const [key, value] of Object.entries(allSettings)) {
      try {
        const meta = JSON.parse(value);
        if (meta.type === 'api_key') {
          const id = key.replace('sensitive_', '').replace('_meta', '');
          keys.push({
            keyId: id,
            provider: meta.service,
            hasKey: true,
            lastUsed: meta.lastUsed,
          });
        }
      } catch {}
    }

    return keys;
  }

  /**
   * Update last used timestamp
   */
  markUsed(id: string): void {
    const metaStr = sqlDatabase.getSetting(`sensitive_${id}_meta`);
    if (metaStr) {
      try {
        const meta = JSON.parse(metaStr);
        meta.lastUsed = Date.now();
        sqlDatabase.setSetting(`sensitive_${id}_meta`, JSON.stringify(meta), 'sensitive_meta');
      } catch {}
    }
  }

  /**
   * Delete a sensitive entry
   */
  delete(id: string): boolean {
    this.initialize();

    sqlDatabase.deleteSetting(`sensitive_${id}`);
    sqlDatabase.deleteSetting(`sensitive_${id}_meta`);
    return true;
  }

  /**
   * Delete all sensitive data (purge)
   */
  deleteAll(): number {
    this.initialize();

    const allSettings = sqlDatabase.getSettingsByCategory('sensitive');
    let count = 0;

    for (const key of Object.keys(allSettings)) {
      sqlDatabase.deleteSetting(key);
      count++;
    }

    const allMeta = sqlDatabase.getSettingsByCategory('sensitive_meta');
    for (const key of Object.keys(allMeta)) {
      sqlDatabase.deleteSetting(key);
    }

    return count;
  }

  /**
   * List all entries (with values masked)
   */
  list(): Array<Omit<SensitiveEntry, 'value'> & { maskedValue: string }> {
    this.initialize();

    const allSettings = sqlDatabase.getSettingsByCategory('sensitive_meta');
    const entries: Array<Omit<SensitiveEntry, 'value'> & { maskedValue: string }> = [];

    for (const [key, value] of Object.entries(allSettings)) {
      try {
        const meta = JSON.parse(value);
        const id = key.replace('sensitive_', '').replace('_meta', '');
        const valueStr = sqlDatabase.getSetting(`sensitive_${id}`);

        entries.push({
          id,
          service: meta.service,
          type: meta.type,
          key: meta.key,
          maskedValue: valueStr ? maskValue(valueStr) : '***',
          username: meta.username,
          url: meta.url,
          notes: meta.notes,
          tags: meta.tags || [],
          createdAt: meta.createdAt || Date.now(),
          updatedAt: meta.updatedAt || Date.now(),
          lastUsed: meta.lastUsed,
        });
      } catch {}
    }

    return entries;
  }

  /**
   * Export all data (encrypted)
   */
  export(): SensitiveDataExport {
    this.initialize();

    const allSettings = sqlDatabase.getSettingsByCategory('sensitive_meta');
    const entries: SensitiveDataExport['entries'] = [];

    for (const [key, value] of Object.entries(allSettings)) {
      try {
        const meta = JSON.parse(value);
        const id = key.replace('sensitive_', '').replace('_meta', '');
        const encryptedValue = sqlDatabase.getSetting(`sensitive_${id}`);

        entries.push({
          service: meta.service,
          type: meta.type,
          key: meta.key,
          value: encryptedValue || '',
          username: meta.username,
          url: meta.url,
          notes: meta.notes,
          tags: meta.tags || [],
        });
      } catch {}
    }

    return {
      version: 1,
      exportedAt: Date.now(),
      entries,
    };
  }

  /**
   * Import data (decrypts from export format)
   */
  import(data: SensitiveDataExport, merge: boolean = true): { added: number; skipped: number } {
    this.initialize();

    let added = 0;
    let skipped = 0;

    for (const entry of data.entries) {
      try {
        if (!merge && this.getByService(entry.service, entry.type).length > 0) {
          skipped++;
          continue;
        }

        this.store({
          service: entry.service,
          type: entry.type,
          key: entry.key,
          value: entry.value, // Already encrypted
          username: entry.username,
          url: entry.url,
          notes: entry.notes,
          tags: entry.tags,
        });
        added++;
      } catch (error) {
        console.error('[SecureStorage] Import failed for:', entry.service, error);
        skipped++;
      }
    }

    return { added, skipped };
  }

  /**
   * Get statistics about stored data
   */
  getStats(): { total: number; byType: Record<string, number>; byService: Record<string, number> } {
    this.initialize();

    const allSettings = sqlDatabase.getSettingsByCategory('sensitive_meta');
    const stats = {
      total: 0,
      byType: {} as Record<string, number>,
      byService: {} as Record<string, number>,
    };

    for (const value of Object.values(allSettings)) {
      try {
        const meta = JSON.parse(value as string);
        stats.total++;
        stats.byType[meta.type] = (stats.byType[meta.type] || 0) + 1;
        stats.byService[meta.service] = (stats.byService[meta.service] || 0) + 1;
      } catch {}
    }

    return stats;
  }
}

export const secureStorage = new SecureStorage();
