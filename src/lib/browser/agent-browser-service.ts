/**
 * Agent Browser Service — drives the user's installed browser (Microsoft Edge
 * or Google Chrome) through playwright-core. No browser download, no login.
 *
 * Why it exists:
 *  - SAM.gov rotates its API keys every 90 days, which breaks keyed searches
 *    until a new key is pasted in. The agent instead opens SAM.gov in a real
 *    browser session (the public search UI requires no login) and performs the
 *    SAME internal search call the site's own UI makes — same-origin, session
 *    cookies attached, real browser fingerprint. If that endpoint ever changes,
 *    it falls back to driving the search UI itself (typing, clicking, scraping
 *    result cards).
 *  - The AI's `browser_automate` tool and the opportunity scout's scraping of
 *    other public sources (DIU, SSC Front Door, AFWERX, SBIR.gov).
 */

import { chromium, type Browser, type Page } from 'playwright-core';
import { existsSync } from 'fs';
import type { SAMOpportunity } from '@/lib/services/sam-gov';

export interface BrowserSnapshot {
  elements: BrowserElement[];
  url: string;
  title: string;
}

export interface BrowserElement {
  ref: string;
  type: string;
  name?: string;
  text?: string;
  value?: string;
  placeholder?: string;
  tagName: string;
  isInteractive: boolean;
  attributes: Record<string, string>;
}

export interface AgentBrowserOptions {
  session?: string;
  timeout?: number;
  headed?: boolean;
  json?: boolean;
  /** Set false to include non-interactive elements (text, cards) in snapshots. Default: true. */
  interactiveOnly?: boolean;
}

export interface FormFillOptions {
  url: string;
  fields: Array<{
    selector: string;
    value: string;
    type?: 'text' | 'select' | 'checkbox';
  }>;
  submitSelector?: string;
  waitForNavigation?: boolean;
}

/** Query shape for the SAM.gov internal search (keyless browser search). */
export interface SAMBrowserQuery {
  keyword?: string;
  /** Comma-separated NAICS codes — the internal API's real filter param. */
  naics?: string;
  /** Comma-separated PSC codes. */
  psc?: string;
}

/** Browser executables to use, in preference order (Edge first on Windows). */
const BROWSER_EXECUTABLES = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/microsoft-edge',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
];

const DESKTOP_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

/** SAM.gov's public search landing page — no login required. */
const SAM_SEARCH_URL = 'https://sam.gov/search/?index=opp&sort=-modifiedDate';

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/** CSS-path builder run inside the page context. */
function cssPathInPage(el: Element): string {
  if (el.id) return '#' + CSS.escape(el.id);
  const parts: string[] = [];
  let node: Element | null = el;
  while (node && node.nodeType === 1) {
    const tag = node.tagName.toLowerCase();
    const parent: Element | null = node.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        c => c.tagName.toLowerCase() === tag
      );
      parts.unshift(
        siblings.length > 1
          ? tag + ':nth-of-type(' + (siblings.indexOf(node) + 1) + ')'
          : tag
      );
    } else {
      parts.unshift(tag);
    }
    node = parent;
  }
  return parts.join(' > ');
}

class AgentBrowserService {
  private currentBrowser: Browser | null = null;
  private currentPage: Page | null = null;
  private refPaths = new Map<string, string>();
  /** Serialize launches so concurrent calls share one browser. */
  private launchQueue: Promise<void> = Promise.resolve();

  private executablePath(): string | null {
    return BROWSER_EXECUTABLES.find(p => existsSync(p)) || null;
  }

  async checkInstalled(): Promise<boolean> {
    return this.executablePath() !== null;
  }

  async install(): Promise<boolean> {
    // The service uses the system-installed browser — nothing to download.
    return this.checkInstalled();
  }

  /** Launch the system browser (once) and return a page. */
  private async ensureBrowser(options: AgentBrowserOptions = {}): Promise<Page> {
    if (this.currentBrowser && this.currentPage) return this.currentPage;
    const run = this.launchQueue.then(async () => {
      if (this.currentBrowser && this.currentPage) return;
      const exe = this.executablePath();
      if (!exe) {
        throw new Error(
          'No supported browser found. Install Microsoft Edge or Google Chrome to enable browser search.'
        );
      }
      this.currentBrowser = await chromium.launch({
        executablePath: exe,
        headless: !options.headed,
        args: [
          '--no-sandbox',
          '--disable-blink-features=AutomationControlled',
          '--disable-dev-shm-usage',
        ],
      });
      const context = await this.currentBrowser.newContext({
        userAgent: DESKTOP_UA,
        viewport: { width: 1440, height: 900 },
        locale: 'en-US',
      });
      this.currentPage = await context.newPage();
    });
    this.launchQueue = run.catch(() => {});
    await run;
    return this.currentPage!;
  }

  async open(
    url: string,
    options: AgentBrowserOptions = {}
  ): Promise<{ success: boolean; message: string }> {
    if (!/^https?:\/\//i.test(url)) {
      return { success: false, message: 'Invalid URL. Only http/https protocols allowed.' };
    }
    try {
      const page = await this.ensureBrowser(options);
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: options.timeout || 45000,
      });
      // Small settle time so SPAs can render.
      await page.waitForTimeout(1500);
      return { success: true, message: 'Page opened' };
    } catch (error) {
      return {
        success: false,
        message: `Failed to open page: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async snapshot(options: AgentBrowserOptions = {}): Promise<BrowserSnapshot> {
    const page = await this.ensureBrowser(options);
    const data = await page.evaluate(
      (opts: { interactiveOnly: boolean }) => {
        const interactiveSel =
          'a, button, input, select, textarea, [role="button"], [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';
        const textSel = 'h1, h2, h3, h4, p, li, td, th';
        const selector = opts.interactiveOnly
          ? interactiveSel
          : interactiveSel + ', ' + textSel;
        const out: any[] = [];
        let idx = 0;
        const seen = new Set<Element>();
        for (const el of Array.from(document.querySelectorAll(selector))) {
          if (seen.has(el)) continue;
          seen.add(el);
          const tag = el.tagName.toLowerCase();
          const text = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 2000);
          const isInteractive = el.matches(interactiveSel);
          if (!isInteractive && !text) continue;
          if (!isInteractive && text.length < 2) continue;
          const isControl =
            ['input', 'select', 'textarea', 'button'].includes(tag) ||
            el.getAttribute('role') === 'button';
          idx += 1;
          const attributes: Record<string, string> = {};
          if (el.hasAttribute('href')) attributes.href = el.getAttribute('href') || '';
          if (el.hasAttribute('id')) attributes.id = el.getAttribute('id') || '';
          if (el.hasAttribute('name')) attributes.name = el.getAttribute('name') || '';
          if (el.hasAttribute('placeholder'))
            attributes.placeholder = el.getAttribute('placeholder') || '';
          out.push({
            ref: `@e${idx}`,
            tagName: tag,
            type:
              el.getAttribute('role') ||
              (isControl ? tag : tag === 'a' ? 'link' : 'text'),
            name:
              el.getAttribute('name') || el.getAttribute('aria-label') || undefined,
            text:
              isControl
                ? el.getAttribute('value') || text || undefined
                : text || undefined,
            value: el.getAttribute('value') || undefined,
            placeholder: el.getAttribute('placeholder') || undefined,
            isInteractive,
            attributes,
            cssPath: cssPathInPage(el),
          });
        }
        return { elements: out, url: location.href, title: document.title };
      },
      { interactiveOnly: options.interactiveOnly !== false }
    );

    this.refPaths.clear();
    const elements = (data.elements || []).map((el: any) => {
      this.refPaths.set(el.ref, el.cssPath);
      const { cssPath: _css, ...rest } = el;
      return rest;
    });
    return { elements, url: data.url, title: data.title };
  }

  private async locate(ref: string, options: AgentBrowserOptions = {}) {
    const page = await this.ensureBrowser(options);
    const selector = this.refPaths.get(ref) || ref;
    return page.locator(selector).first();
  }

  async click(ref: string, options: AgentBrowserOptions = {}): Promise<boolean> {
    try {
      const loc = await this.locate(ref, options);
      await loc.click({ timeout: options.timeout || 8000 });
      return true;
    } catch {
      return false;
    }
  }

  async fill(ref: string, value: string, options: AgentBrowserOptions = {}): Promise<boolean> {
    try {
      const loc = await this.locate(ref, options);
      await loc.fill(value, { timeout: options.timeout || 8000 });
      return true;
    } catch {
      return false;
    }
  }

  async type(ref: string, value: string, options: AgentBrowserOptions = {}): Promise<boolean> {
    try {
      const loc = await this.locate(ref, options);
      await loc.pressSequentially(value, { delay: 30, timeout: options.timeout || 10000 });
      return true;
    } catch {
      return false;
    }
  }

  async press(key: string, options: AgentBrowserOptions = {}): Promise<boolean> {
    try {
      const page = await this.ensureBrowser(options);
      await page.keyboard.press(key);
      return true;
    } catch {
      return false;
    }
  }

  async wait(selector: string | number, options: AgentBrowserOptions = {}): Promise<boolean> {
    try {
      const page = await this.ensureBrowser(options);
      if (typeof selector === 'number') {
        await page.waitForTimeout(selector);
      } else {
        await page.waitForSelector(selector, { timeout: options.timeout || 30000 });
      }
      return true;
    } catch {
      return false;
    }
  }

  async getText(ref: string, options: AgentBrowserOptions = {}): Promise<string> {
    try {
      const loc = await this.locate(ref, options);
      return ((await loc.innerText()) || '').trim();
    } catch {
      return '';
    }
  }

  async screenshot(path?: string, options: AgentBrowserOptions = {}): Promise<Buffer | null> {
    try {
      const page = await this.ensureBrowser(options);
      const buffer = await page.screenshot({ fullPage: true });
      if (path) {
        const fs = await import('fs');
        await fs.promises.writeFile(path, buffer);
      }
      return buffer;
    } catch {
      return null;
    }
  }

  async getState(options: AgentBrowserOptions = {}): Promise<{ url: string; title: string }> {
    try {
      const page = await this.ensureBrowser(options);
      return { url: page.url(), title: await page.title() };
    } catch {
      return { url: '', title: '' };
    }
  }

  async close(): Promise<void> {
    try {
      await this.currentBrowser?.close();
    } catch {
      // Ignore close errors
    }
    this.currentBrowser = null;
    this.currentPage = null;
  }

  async fillForm(options: FormFillOptions): Promise<{ success: boolean; message: string; url?: string }> {
    try {
      const opened = await this.open(options.url);
      if (!opened.success) return opened;
      const page = await this.ensureBrowser();
      await page.waitForTimeout(1500);
      const snapshot = await this.snapshot();
      for (const field of options.fields) {
        const element = this.findElement(snapshot.elements, field.selector);
        if (!element) {
          return { success: false, message: `Element not found: ${field.selector}` };
        }
        if (field.type === 'checkbox') {
          await this.click(element.ref);
        } else if (field.type === 'select') {
          const loc = await this.locate(element.ref);
          await loc.selectOption({ label: field.value });
        } else {
          await this.fill(element.ref, field.value);
        }
      }
      if (options.submitSelector) {
        await this.click(options.submitSelector);
        if (options.waitForNavigation) {
          await page.waitForTimeout(3000);
        }
      }
      const state = await this.getState();
      return { success: true, message: 'Form filled successfully', url: state.url };
    } catch (error) {
      return {
        success: false,
        message: `Form fill failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async extractData(url: string, selectors: Record<string, string>): Promise<Record<string, string>> {
    try {
      const opened = await this.open(url);
      if (!opened.success) return {};
      await this.wait(2000);
      const snapshot = await this.snapshot();
      const data: Record<string, string> = {};
      for (const [key, selector] of Object.entries(selectors)) {
        const element = this.findElement(snapshot.elements, selector);
        if (element) {
          data[key] = await this.getText(element.ref);
        }
      }
      return data;
    } catch {
      return {};
    }
  }

  async saveState(_path: string): Promise<boolean> {
    // Sessions are held in-memory by the service — nothing to persist.
    return true;
  }

  async loadState(_path: string): Promise<boolean> {
    return true;
  }

  private findElement(elements: BrowserElement[], selector: string): BrowserElement | null {
    if (selector.startsWith('@')) {
      return elements.find(e => e.ref === selector) || null;
    }
    return (
      elements.find(
        e =>
          e.name === selector ||
          e.text?.includes(selector) ||
          e.attributes.id === selector ||
          e.attributes.name === selector
      ) || null
    );
  }

  // ==================== SAM.gov keyless search ====================

  /**
   * Search SAM.gov WITHOUT an API key and WITHOUT login. Opens sam.gov in a real
   * browser session, then performs the same internal search call the site's own
   * UI makes (session cookies attached, real browser fingerprint). If that
   * endpoint changes or fails, falls back to driving the search UI itself.
   *
   * Returns per-query results; a query that fails both paths reports `error`.
   */
  async searchSAMGovBatch(
    queries: SAMBrowserQuery[],
    opts: { limit?: number } = {}
  ): Promise<Array<{ query: string; opportunities: SAMOpportunity[]; error?: string }>> {
    const pageSize = Math.min(Math.max(opts.limit || 25, 1), 100);
    const results: Array<{ query: string; opportunities: SAMOpportunity[]; error?: string }> = [];
    let browser: Browser | null = null;

    try {
      const page = await this.ensureBrowser({ headed: false });
      browser = this.currentBrowser;

      // Establish a real session on sam.gov (public search — no login needed).
      await page.goto(SAM_SEARCH_URL, {
        waitUntil: 'domcontentloaded',
        timeout: 45000,
      });
      await page.waitForTimeout(3000);

      for (const q of queries) {
        const queryLabel = q.keyword || q.naics || q.psc || '';
        try {
          const url = this.buildSAMSearchUrl(q, pageSize);
          const data = await page.evaluate(async (u: string) => {
            const res = await fetch(u, {
              headers: { Accept: 'application/hal+json' },
              credentials: 'include',
            });
            if (!res.ok) throw new Error('SAM search API returned HTTP ' + res.status);
            return await res.json();
          }, url);
          const opps = ((data?._embedded?.results as any[]) || []).map((r: any) =>
            this.mapSAMResult(r, queryLabel)
          );
          results.push({ query: queryLabel, opportunities: opps });
        } catch (e) {
          console.error(
            `[AgentBrowser] SAM internal search failed for "${queryLabel}":`,
            e
          );
          try {
            const opps = await this.uiSearch(page, queryLabel, pageSize);
            results.push({ query: queryLabel, opportunities: opps });
          } catch (e2) {
            results.push({
              query: queryLabel,
              opportunities: [],
              error: `SAM.gov search failed for "${queryLabel}": ${
                e2 instanceof Error ? e2.message : 'unknown error'
              }`,
            });
          }
        }
        // Be polite to the site between queries.
        await page.waitForTimeout(1200);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'unknown error';
      for (const q of queries) {
        results.push({
          query: q.keyword || q.naics || q.psc || '',
          opportunities: [],
          error: `Browser search unavailable: ${message}`,
        });
      }
    } finally {
      if (browser) await browser.close().catch(() => {});
      this.currentBrowser = null;
      this.currentPage = null;
    }
    return results;
  }

  /** Single-query convenience wrapper. */
  async searchSAMGov(params: SAMBrowserQuery & { limit?: number }): Promise<{
    success: boolean;
    opportunities: SAMOpportunity[];
    message?: string;
  }> {
    const [res] = await this.searchSAMGovBatch([params], { limit: params.limit });
    return {
      success: !res.error,
      opportunities: res.opportunities,
      message: res.error,
    };
  }

  /** Build the same internal search URL the SAM.gov SPA calls. */
  private buildSAMSearchUrl(q: SAMBrowserQuery, size: number): string {
    const p = new URLSearchParams();
    p.set('index', 'opp');
    p.set('page', '0');
    p.set('sort', '-modifiedDate');
    p.set('size', String(size));
    p.set('mode', 'search');
    p.set('responseType', 'json');
    if (q.keyword) p.set('q', q.keyword);
    p.set('qMode', 'ALL');
    p.set('is_active', 'true');
    if (q.naics) p.set('naics', q.naics);
    if (q.psc) p.set('psc', q.psc);
    p.set('random', String(Date.now() + Math.floor(Math.random() * 100000)));
    return 'https://sam.gov/api/prod/sgs/v1/search/?' + p.toString();
  }

  /** Map an internal-API result into our opportunity shape. */
  private mapSAMResult(r: any, query: string): SAMOpportunity {
    const orgs: any[] = r.organizationHierarchy || [];
    const agency =
      orgs.find((o: any) => o.level === 2)?.name || orgs[0]?.name || undefined;
    const office = orgs.find((o: any) => o.level >= 5)?.name || undefined;
    const desc = Array.isArray(r.descriptions)
      ? r.descriptions[0]?.content || ''
      : '';
    return {
      id: r._id || r.id,
      title: r.title,
      synopsis: stripHtml(desc) || undefined,
      solicitationNumber: r.solicitationNumber || r._id,
      postedDate: r.publishDate || undefined,
      responseDeadline: r.responseDate || undefined,
      classificationCode: r.type?.value || undefined,
      agency,
      office,
      url: r._id ? `https://sam.gov/opp/${r._id}/view` : undefined,
      keywords: [query],
    };
  }

  /** Fallback: drive the SAM.gov search UI directly and scrape result cards. */
  private async uiSearch(page: Page, query: string, maxResults: number): Promise<SAMOpportunity[]> {
    await page.goto(SAM_SEARCH_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    });
    await page.waitForTimeout(3000);
    const box = page.locator('input[type="search"]').first();
    await box.fill(query);
    await page.waitForTimeout(500);
    await page
      .locator('button:has-text("Search"), button[type="submit"]')
      .first()
      .click()
      .catch(() => {});
    await page
      .waitForSelector('a[href*="/opp/"]', { timeout: 20000 })
      .catch(() => {});
    await page.waitForTimeout(3000);

    const cards = await page.evaluate(() => {
      const out: any[] = [];
      const seen = new Set<string>();
      const anchors = Array.from(document.querySelectorAll('a[href*="/opp/"]'));
      for (const a of anchors) {
        const href = a.getAttribute('href') || '';
        if (seen.has(href)) continue;
        const title = (a.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 200);
        if (title.length < 5) continue;
        seen.add(href);
        const card =
          a.closest('article') ||
          a.closest('[class*="card"]') ||
          a.closest('li') ||
          a.parentElement;
        const cardText = card
          ? (card.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 1500)
          : '';
        out.push({ title, href, cardText });
      }
      return out;
    });

    return cards.slice(0, maxResults).map((c: any, i: number) => {
      const sol = (c.cardText || '').match(
        /\b([A-Z]{1,8}\d{4,6}[A-Z]{0,4}\d{3,6})\b/i
      );
      const due = (c.cardText || '').match(/\b(\d{1,2}\/\d{1,2}\/\d{4})\b/);
      return {
        id: `sam_ui_${Date.now()}_${i}`,
        title: c.title,
        synopsis:
          c.cardText ||
          'Discovered via SAM.gov browser search — open the link to review.',
        solicitationNumber: sol
          ? sol[1].toUpperCase()
          : `SAM-UI-${Date.now()}-${i}`,
        responseDeadline: due ? due[1] : undefined,
        url: new URL(c.href, 'https://sam.gov').toString(),
        keywords: [query],
      };
    });
  }
}

export const agentBrowserService = new AgentBrowserService();

// Tool definition for AI to use
export const agentBrowserToolDefinition = {
  type: 'function' as const,
  function: {
    name: 'browser_automate',
    description:
      'Automate browser interactions using the system browser (Edge/Chrome). Navigate, click, type, fill forms, extract data from web pages.',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['open', 'click', 'fill', 'type', 'press', 'snapshot', 'wait', 'get', 'close', 'screenshot'],
          description: 'The browser action to perform',
        },
        url: {
          type: 'string',
          description: 'URL to open (for open action)',
        },
        ref: {
          type: 'string',
          description: 'Element reference from snapshot (for click, fill, type actions)',
        },
        value: {
          type: 'string',
          description: 'Value to type or fill',
        },
        key: {
          type: 'string',
          description: 'Key to press (for press action)',
        },
        selector: {
          type: 'string',
          description: 'CSS selector or element description',
        },
      },
      required: ['action'],
    },
  },
};

export async function executeBrowserTool(args: {
  action: 'open' | 'click' | 'fill' | 'type' | 'press' | 'snapshot' | 'wait' | 'get' | 'close' | 'screenshot';
  url?: string;
  ref?: string;
  value?: string;
  key?: string;
  selector?: string;
}): Promise<string> {
  const service = agentBrowserService;

  switch (args.action) {
    case 'open':
      if (!args.url) return 'Error: URL required for open action';
      const openResult = await service.open(args.url);
      return openResult.message;

    case 'snapshot':
      const snapshot = await service.snapshot();
      const elements = snapshot.elements
        .filter(e => e.isInteractive)
        .slice(0, 20)
        .map(e => `${e.ref}: ${e.type} "${e.text || e.name || ''}"`)
        .join('\n');
      return `Page: ${snapshot.title}\nURL: ${snapshot.url}\n\nInteractive Elements:\n${elements}`;

    case 'click':
      if (!args.ref) return 'Error: ref required for click action';
      const clicked = await service.click(args.ref);
      return clicked ? `Clicked ${args.ref}` : `Failed to click ${args.ref}`;

    case 'fill':
      if (!args.ref || !args.value) return 'Error: ref and value required for fill action';
      const filled = await service.fill(args.ref, args.value);
      return filled ? `Filled ${args.ref} with "${args.value}"` : `Failed to fill ${args.ref}`;

    case 'type':
      if (!args.ref || !args.value) return 'Error: ref and value required for type action';
      const typed = await service.type(args.ref, args.value);
      return typed ? `Typed "${args.value}" into ${args.ref}` : `Failed to type into ${args.ref}`;

    case 'press':
      if (!args.key) return 'Error: key required for press action';
      const pressed = await service.press(args.key);
      return pressed ? `Pressed ${args.key}` : `Failed to press ${args.key}`;

    case 'wait':
      await service.wait(args.ref ? parseInt(args.ref, 10) : 2000);
      return 'Waited';

    case 'get':
      if (!args.ref) return 'Error: ref required for get action';
      const text = await service.getText(args.ref);
      return text || 'No text found';

    case 'close':
      await service.close();
      return 'Browser closed';

    case 'screenshot':
      const buffer = await service.screenshot();
      return buffer ? 'Screenshot taken' : 'Failed to take screenshot';

    default:
      return `Unknown action: ${args.action}`;
  }
}
