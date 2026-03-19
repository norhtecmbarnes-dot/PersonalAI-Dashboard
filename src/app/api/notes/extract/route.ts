export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { sqlDatabase } from '@/lib/database/sqlite';
import { secureStorage } from '@/lib/security/secure-storage';
import { maskValue } from '@/lib/security/encryption';

interface ExtractedData {
  contacts: Array<{ name: string; email?: string; phone?: string; company?: string }>;
  tasks: Array<{ title: string; dueDate?: string; priority: string; description?: string }>;
  events: Array<{ title: string; date?: string; time?: string; description?: string }>;
  apiKeys: Array<{ provider: string; keyId?: string; maskedValue: string; saved: boolean }>;
  passwords: Array<{ service: string; username?: string; maskedValue: string; saved: boolean }>;
  urls: string[];
  emails: string[];
  phones: string[];
  summary: string;
  keywords: string[];
}

export async function POST(request: NextRequest) {
  try {
    sqlDatabase.initialize();

    const body = await request.json();
    const { content, saveToDb = true } = body;

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    const extracted = extractContent(content);

    if (saveToDb) {
      const savedData = await saveExtractedData(extracted);
      return NextResponse.json({
        success: true,
        extracted,
        saved: savedData,
        message: formatSavedMessage(savedData),
      });
    }

    return NextResponse.json({ success: true, extracted });
  } catch (error) {
    console.error('Extract error:', error);
    return NextResponse.json({ error: 'Failed to extract content' }, { status: 500 });
  }
}

function extractContent(content: string): ExtractedData {
  const contacts: ExtractedData['contacts'] = [];
  const tasks: ExtractedData['tasks'] = [];
  const events: ExtractedData['events'] = [];
  const urls: string[] = [];
  const emails: string[] = [];
  const phones: string[] = [];
  const keywords: string[] = [];
  const extractedApiKeys: ExtractedData['apiKeys'] = [];
  const extractedPasswords: ExtractedData['passwords'] = [];

  // Extract emails
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const foundEmails = content.match(emailPattern) || [];
  emails.push(...foundEmails);

  // Extract phone numbers
  const phonePatterns = [
    /\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
    /\d{3}[-.\s]\d{3}[-.\s]\d{4}/g,
  ];
  for (const pattern of phonePatterns) {
    const found = content.match(pattern) || [];
    phones.push(...found);
  }

  // Extract URLs
  const urlPattern = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g;
  const foundUrls = content.match(urlPattern) || [];
  urls.push(...foundUrls);

  // Extract contacts (name + email patterns)
  const nameEmailPatterns = [
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*<([^>]+)>/g,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*\(([^)]+)\)/g,
    /(?:contact|name|organizer|from|with):\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi,
  ];

  for (const email of foundEmails) {
    const emailIndex = content.indexOf(email);
    const beforeEmail = content.substring(Math.max(0, emailIndex - 50), emailIndex);

    let name = '';
    for (const pattern of nameEmailPatterns) {
      pattern.lastIndex = 0;
      const match = pattern.exec(beforeEmail);
      if (match) {
        name = match[1];
        break;
      }
    }

    contacts.push({
      name:
        name ||
        email
          .split('@')[0]
          .replace(/[._]/g, ' ')
          .replace(/\b\w/g, c => c.toUpperCase()),
      email: email.toLowerCase(),
    });
  }

  // Extract tasks
  const taskPatterns = [
    /^(?:todo|task|action item|next step|follow.?up|reminder|need to|must|should|will)\s*[:\-]?\s*(.+)$/gim,
    /^[-•*]\s*\[?\s*\]?\s*(.+)$/gm,
  ];

  const highKeywords = ['urgent', 'important', 'critical', 'asap', 'priority', 'deadline'];
  const mediumKeywords = ['should', 'need to', 'follow-up', 'review'];

  const lines = content.split('\n');
  for (const line of lines) {
    for (const pattern of taskPatterns) {
      pattern.lastIndex = 0;
      const match = pattern.exec(line);
      if (match && match[1]) {
        const taskText = match[1].trim();
        if (taskText.length < 5) continue;

        const lowerText = taskText.toLowerCase();
        let priority: 'low' | 'medium' | 'high' = 'low';

        if (highKeywords.some(kw => lowerText.includes(kw))) {
          priority = 'high';
        } else if (mediumKeywords.some(kw => lowerText.includes(kw))) {
          priority = 'medium';
        }

        const dateMatch = taskText.match(
          /by\s+(\w+ \d{1,2}(?:st|nd|rd|th)?,? ?\d{4}?)|before\s+(\w+ \d{1,2})|due\s+(\w+ \d{1,2})/i
        );

        tasks.push({
          title: taskText.slice(0, 100),
          dueDate: dateMatch ? dateMatch[0] : undefined,
          priority,
          description: line.trim(),
        });
        break;
      }
    }
  }

  // Extract events/meetings
  const eventKeywords = [
    'meeting',
    'call',
    'appointment',
    'deadline',
    'conference',
    'session',
    'workshop',
    'webinar',
    'presentation',
    'interview',
  ];
  const datePattern =
    /(\w+ \d{1,2}(?:st|nd|rd|th)?,? ?\d{4}?)|(\d{1,2}\/\d{1,2}\/\d{2,4})|(\d{4}-\d{2}-\d{2})|(next \w+)|(tomorrow|today)/gi;
  const timePattern = /(?:at\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/gi;

  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    if (eventKeywords.some(kw => lowerLine.includes(kw)) || datePattern.test(line)) {
      const dateMatch = line.match(datePattern);
      const timeMatch = line.match(timePattern);

      if (dateMatch || eventKeywords.some(kw => lowerLine.includes(kw))) {
        events.push({
          title:
            line
              .replace(/(?:on|at|meeting|call|with)\s+/gi, '')
              .trim()
              .slice(0, 80) || 'Event',
          date: dateMatch ? dateMatch[0] : undefined,
          time: timeMatch ? timeMatch[0] : undefined,
          description: line.trim(),
        });
      }
    }
  }

  // Extract API keys and credentials - Store securely
  const providerHints: Record<string, RegExp> = {
    openai: /openai|gpt|chatgpt/i,
    anthropic: /anthropic|claude/i,
    gemini: /gemini|google.*ai/i,
    deepseek: /deepseek/i,
    openrouter: /openrouter/i,
    tavily: /tavily/i,
    brave: /brave.*search/i,
    serpapi: /serpapi/i,
  };

  for (const [provider, hint] of Object.entries(providerHints)) {
    if (hint.test(content)) {
      const keyPattern = /(?:key|token|api[-_]?key)\s*[:=]\s*["']?([a-zA-Z0-9_\-]{8,})["']?/gi;
      let match;
      while ((match = keyPattern.exec(content)) !== null) {
        try {
          const key = match[1];
          secureStorage.store({
            service: provider,
            type: 'api_key',
            value: key,
          });
          extractedApiKeys.push({
            provider,
            maskedValue: maskValue(key),
            saved: true,
          });
        } catch (e) {
          console.error('[Extract] Failed to store API key:', e);
        }
      }
    }
  }

  // Extract passwords/credentials - Store securely
  const credentialPatterns = [
    { pattern: /(?:password|passwd|pwd)\s*[:=]\s*["']?([^"'\s]{8,})["']?/gi, type: 'password' },
    { pattern: /(?:username|user|login)\s*[:=]\s*["']?([^"'\s]+)["']?/gi, type: 'credential' },
    {
      pattern: /(?:email)\s*[:=]\s*["']?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})["']?/gi,
      type: 'credential',
    },
  ];

  for (const { pattern, type } of credentialPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      try {
        const value = match[1];
        secureStorage.store({
          service: 'note-extracted',
          type: type as 'password' | 'credential',
          value: value,
          notes: 'Extracted from note content',
        });
        extractedPasswords.push({
          service: type === 'password' ? 'password' : 'credential',
          maskedValue: maskValue(value),
          saved: true,
        });
      } catch (e) {
        console.error('[Extract] Failed to store credential:', e);
      }
    }
  }

  // Generate summary
  const summary =
    content.replace(/\s+/g, ' ').trim().slice(0, 200) + (content.length > 200 ? '...' : '');

  // Extract keywords
  const wordFreq: Record<string, number> = {};
  const significantWords = content
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(
      w =>
        w.length > 4 &&
        ![
          'about',
          'after',
          'again',
          'below',
          'between',
          'could',
          'every',
          'first',
          'found',
          'great',
          'house',
          'large',
          'learn',
          'never',
          'other',
          'over',
          'small',
          'their',
          'there',
          'these',
          'those',
          'under',
          'would',
        ].includes(w)
    );

  for (const word of significantWords) {
    wordFreq[word] = (wordFreq[word] || 0) + 1;
  }

  keywords.push(
    ...Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word)
  );

  return {
    contacts: deduplicateByField(contacts, 'email'),
    tasks: deduplicateByField(tasks, 'title'),
    events: deduplicateByField(events, 'title'),
    apiKeys: extractedApiKeys,
    passwords: extractedPasswords,
    urls: [...new Set(urls)],
    emails: [...new Set(emails)],
    phones: [...new Set(phones)],
    summary,
    keywords,
  };
}

function deduplicateByField<T>(arr: T[], field: keyof T): T[] {
  const seen = new Set();
  return arr.filter(item => {
    const key = String(item[field]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function saveExtractedData(extracted: ExtractedData) {
  const savedContacts: string[] = [];
  const savedTasks: string[] = [];
  const savedEvents: string[] = [];

  // Save contacts
  for (const contact of extracted.contacts) {
    try {
      const c = sqlDatabase.findOrCreateContact(contact.name, contact.email);
      if (contact.phone) {
        sqlDatabase.updateContact(c.id, { phone: contact.phone });
      }
      if (contact.company) {
        sqlDatabase.updateContact(c.id, { company: contact.company });
      }
      savedContacts.push(c.id);
    } catch (e) {
      console.error('Failed to save contact:', e);
    }
  }

  // Save tasks
  for (const task of extracted.tasks) {
    try {
      const t = sqlDatabase.addTask({
        title: task.title,
        description: task.description,
        dueDate: task.dueDate ? parseDueDate(task.dueDate) : undefined,
        priority: task.priority as 'low' | 'medium' | 'high',
        status: 'pending',
        tags: ['extracted', 'from-note'],
        source: 'note-extraction',
      });
      savedTasks.push(t.id);
    } catch (e) {
      console.error('Failed to save task:', e);
    }
  }

  // Save events
  for (const event of extracted.events) {
    try {
      const e = sqlDatabase.addEvent({
        title: event.title,
        description: event.description,
        startDate: event.date ? parseDate(event.date) : Date.now(),
        status: 'pending',
        source: 'note-extraction',
      });
      savedEvents.push(e.id);
    } catch (e) {
      console.error('Failed to save event:', e);
    }
  }

  const savedApiKeys = extracted.apiKeys.filter(k => k.saved).length;
  const savedPasswords = extracted.passwords.filter(p => p.saved).length;

  return {
    contacts: savedContacts.length,
    tasks: savedTasks.length,
    events: savedEvents.length,
    apiKeys: savedApiKeys,
    passwords: savedPasswords,
    contactIds: savedContacts,
    taskIds: savedTasks,
    eventIds: savedEvents,
  };
}

function parseDate(dateStr: string): number {
  try {
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed.getTime();
    }
  } catch {}
  return Date.now();
}

function parseDueDate(dateStr: string): number | undefined {
  return parseDate(dateStr);
}

function formatSavedMessage(saved: {
  contacts: number;
  tasks: number;
  events: number;
  apiKeys: number;
  passwords: number;
}): string {
  const parts: string[] = [];
  if (saved.contacts > 0) parts.push(`${saved.contacts} contact(s)`);
  if (saved.tasks > 0) parts.push(`${saved.tasks} task(s)`);
  if (saved.events > 0) parts.push(`${saved.events} event(s)`);
  if (saved.apiKeys > 0) parts.push(`${saved.apiKeys} API key(s) [encrypted]`);
  if (saved.passwords > 0) parts.push(`${saved.passwords} credential(s) [encrypted]`);

  if (parts.length === 0) {
    return 'No structured data found to save';
  }

  return `Saved to database: ${parts.join(', ')}. Sensitive data is encrypted and stored securely.`;
}
