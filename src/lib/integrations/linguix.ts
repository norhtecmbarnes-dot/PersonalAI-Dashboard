/**
 * Linguix Grammar Checker API Integration
 *
 * Free plan: 1,000,000 characters/month
 * API Docs: https://developer.linguix.com
 *
 * Features:
 * - Grammar check
 * - Spell check
 * - Style suggestions
 * - 30+ languages supported
 */

interface LinguixAlert {
  length: number;
  offset: number;
  message: string;
  category: string;
  replacements: string[];
}

interface LinguixStats {
  wordsCount: number;
  charsCount: number;
  sentencesCount: number;
  avgWordLength: number;
  avgSentenceLength: number;
  fleschIndex: number;
  readingTimeSeconds: number;
  speakingTimeSeconds: number;
  textScore: number;
}

interface LinguixCheckResponse {
  status: number;
  alerts: LinguixAlert[];
  stats: LinguixStats;
}

interface LinguixUsage {
  used: number;
  limit: number;
  remaining: number;
}

class LinguixService {
  private apiKey: string | null = null;
  private baseUrl = 'https://api.linguix.com/v2';
  private monthlyUsage: LinguixUsage = { used: 0, limit: 1000000, remaining: 1000000 };
  private loaded = false;

  async loadConfig(): Promise<void> {
    if (this.loaded) return;

    try {
      const response = await fetch('/api/linguix?action=status');
      const data = await response.json();

      if (data.configured) {
        this.apiKey = 'configured';
        this.loaded = true;
      }

      if (data.usage) {
        this.monthlyUsage = data.usage;
      }
    } catch (e) {
      console.error('[Linguix] Failed to load config:', e);
    }

    this.loaded = true;
  }

  isConfigured(): boolean {
    return this.loaded && !!this.apiKey;
  }

  getMonthlyUsage(): LinguixUsage {
    return this.monthlyUsage;
  }

  async setApiKey(key: string): Promise<boolean> {
    try {
      const response = await fetch('/api/linguix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'configure', apiKey: key }),
      });

      const data = await response.json();

      if (data.success) {
        this.apiKey = key;
        this.loaded = true;
        return true;
      }

      return false;
    } catch (e) {
      console.error('[Linguix] Failed to set API key:', e);
      return false;
    }
  }

  async clearApiKey(): Promise<void> {
    try {
      await fetch('/api/linguix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear' }),
      });

      this.apiKey = null;
      this.loaded = false;
    } catch (e) {
      console.error('[Linguix] Failed to clear API key:', e);
    }
  }

  /**
   * Check text for grammar/spelling issues via API
   */
  async checkText(text: string, language = 'en-US'): Promise<LinguixCheckResponse> {
    if (!this.loaded) {
      await this.loadConfig();
    }

    if (!this.isConfigured()) {
      throw new Error('Linguix not configured. Add your API key in Settings.');
    }

    if (this.monthlyUsage.remaining < text.length) {
      throw new Error(
        `Monthly limit reached. Used: ${this.monthlyUsage.used.toLocaleString()} / ${this.monthlyUsage.limit.toLocaleString()} characters`
      );
    }

    try {
      const response = await fetch('/api/linguix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check', text, language }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `API error: ${response.status}`);
      }

      const result = await response.json();

      // Update usage
      if (result.usage) {
        this.monthlyUsage = result.usage;
      }

      return result;
    } catch (e) {
      console.error('[Linguix] Check failed:', e);
      throw e;
    }
  }

  /**
   * Quick check - returns only corrections
   */
  async quickCheck(text: string): Promise<{
    text: string;
    corrections: Array<{
      original: string;
      replacement: string;
      category: string;
      message: string;
    }>;
  }> {
    const result = await this.checkText(text);

    const corrections: Array<{
      original: string;
      replacement: string;
      category: string;
      message: string;
    }> = [];

    for (const alert of result.alerts) {
      const original = text.substring(alert.offset, alert.offset + alert.length);
      if (alert.replacements && alert.replacements.length > 0) {
        corrections.push({
          original,
          replacement: alert.replacements[0],
          category: alert.category,
          message: alert.message,
        });
      }
    }

    return {
      text,
      corrections,
    };
  }

  /**
   * Fix text - apply all corrections automatically
   */
  async fixText(
    text: string
  ): Promise<{ original: string; fixed: string; changes: number; stats?: LinguixStats }> {
    const result = await this.checkText(text);

    let fixedText = text;
    let changes = 0;

    // Sort alerts by offset descending to apply from end to start
    const sortedAlerts = [...result.alerts]
      .filter(a => a.replacements && a.replacements.length > 0)
      .sort((a, b) => b.offset - a.offset);

    for (const alert of sortedAlerts) {
      const replacement = alert.replacements[0];
      fixedText =
        fixedText.substring(0, alert.offset) +
        replacement +
        fixedText.substring(alert.offset + alert.length);
      changes++;
    }

    return { original: text, fixed: fixedText, changes, stats: result.stats };
  }

  /**
   * Analyze text - detailed suggestions with stats
   */
  async analyzeText(
    text: string,
    language = 'en-US'
  ): Promise<{
    original: string;
    alerts: LinguixAlert[];
    stats: LinguixStats;
    summary: {
      errors: number;
      warnings: number;
      score: number;
      readingTime: string;
    };
  }> {
    const result = await this.checkText(text, language);

    const errors = result.alerts.filter(
      a => a.category === 'Spelling' || a.category === 'Grammar'
    ).length;

    const warnings = result.alerts.filter(
      a => a.category === 'Style' || a.category === 'Punctuation'
    ).length;

    const minutes = Math.floor(result.stats.readingTimeSeconds / 60);
    const seconds = result.stats.readingTimeSeconds % 60;
    const readingTime = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

    return {
      original: text,
      alerts: result.alerts,
      stats: result.stats,
      summary: {
        errors,
        warnings,
        score: result.stats.textScore,
        readingTime,
      },
    };
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): Array<{ code: string; name: string }> {
    return [
      { code: 'en-US', name: 'English (US)' },
      { code: 'en-GB', name: 'English (UK)' },
      { code: 'en-AU', name: 'English (Australia)' },
      { code: 'en-CA', name: 'English (Canada)' },
      { code: 'es', name: 'Spanish' },
      { code: 'es-ES', name: 'Spanish (Spain)' },
      { code: 'es-MX', name: 'Spanish (Mexico)' },
      { code: 'fr', name: 'French' },
      { code: 'fr-CA', name: 'French (Canada)' },
      { code: 'de', name: 'German' },
      { code: 'it', name: 'Italian' },
      { code: 'pt', name: 'Portuguese' },
      { code: 'pt-BR', name: 'Portuguese (Brazil)' },
      { code: 'nl', name: 'Dutch' },
      { code: 'pl', name: 'Polish' },
      { code: 'ru', name: 'Russian' },
      { code: 'uk', name: 'Ukrainian' },
      { code: 'ja', name: 'Japanese' },
      { code: 'zh', name: 'Chinese' },
      { code: 'ko', name: 'Korean' },
      { code: 'ar', name: 'Arabic' },
    ];
  }
}

// React hook for Linguix
export function useLinguix() {
  const service = new LinguixService();
  return {
    initialize: () => service.loadConfig(),
    isConfigured: () => service.isConfigured(),
    check: (text: string, language?: string) => service.checkText(text, language),
    quickCheck: (text: string) => service.quickCheck(text),
    fix: (text: string) => service.fixText(text),
    analyze: (text: string, language?: string) => service.analyzeText(text, language),
    usage: () => service.getMonthlyUsage(),
    languages: () => service.getSupportedLanguages(),
    setApiKey: (key: string) => service.setApiKey(key),
    clearApiKey: () => service.clearApiKey(),
  };
}

// Singleton for server-side use
let serverInstance: LinguixService | null = null;

export function getLinguixService(): LinguixService {
  if (!serverInstance) {
    serverInstance = new LinguixService();
  }
  return serverInstance;
}

export { LinguixService };
export type { LinguixAlert, LinguixStats, LinguixCheckResponse, LinguixUsage };
