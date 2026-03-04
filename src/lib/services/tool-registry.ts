import type { Tool, ToolResult, ToolRegistryStats } from '@/types/tools';

interface ToolCallRecord {
  tool: string;
  parameters: Record<string, any>;
  success: boolean;
  duration: number;
  timestamp: number;
}

class ToolRegistry {
  private static instance: ToolRegistry;
  private tools: Map<string, Tool> = new Map();
  private callHistory: ToolCallRecord[] = [];
  private maxHistory: number = 1000;

  private constructor() {
    this.registerBuiltInTools();
  }

  static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry();
    }
    return ToolRegistry.instance;
  }

  private registerBuiltInTools(): void {
    this.registerTool({
      name: 'vector_search',
      description: 'Search the vector knowledge base for relevant information',
      parameters: {
        query: { type: 'string', description: 'Search query', required: true },
        limit: { type: 'number', description: 'Max results (default 5)', required: false },
        threshold: { type: 'number', description: 'Similarity threshold 0-1 (default 0.3)', required: false },
      },
      execute: async (params) => {
        const { VectorStore } = await import('@/lib/storage/vector');
        VectorStore.initialize();
        const results = VectorStore.search(params.query, params.limit || 5, params.threshold || 0.3);
        return { success: true, data: results };
      },
    });

    this.registerTool({
      name: 'sql_query',
      description: 'Execute a SQL query on the database',
      parameters: {
        query: { type: 'string', description: 'SQL SELECT query', required: true },
      },
      execute: async (params) => {
        const { sqlDatabase } = await import('@/lib/database/sqlite');
        await sqlDatabase.initialize();
        try {
          const results = await sqlDatabase.all(params.query);
          return { success: true, data: results };
        } catch (error) {
          return { success: false, error: error instanceof Error ? error.message : 'Query failed' };
        }
      },
    });

    this.registerTool({
      name: 'document_read',
      description: 'Read a document from storage',
      parameters: {
        id: { type: 'string', description: 'Document ID', required: true },
      },
      execute: async (params) => {
        const { DocumentStore } = await import('@/lib/storage/documents');
        const doc = DocumentStore.getById(params.id);
        if (doc) {
          return { success: true, data: doc };
        }
        return { success: false, error: 'Document not found' };
      },
    });

    this.registerTool({
      name: 'calculate',
      description: 'Perform mathematical calculations',
      parameters: {
        expression: { type: 'string', description: 'Mathematical expression to evaluate', required: true },
      },
      execute: async (params) => {
        try {
          const sanitized = params.expression.replace(/[^0-9+\-*/().^%\s]/g, '');
          const result = Function(`"use strict"; return (${sanitized})`)();
          return { success: true, data: { expression: params.expression, result } };
        } catch (error) {
          return { success: false, error: 'Invalid mathematical expression' };
        }
      },
    });

    this.registerTool({
      name: 'web_search',
      description: 'Search the web for information',
      parameters: {
        query: { type: 'string', description: 'Search query', required: true },
        limit: { type: 'number', description: 'Max results (default 5)', required: false },
      },
      execute: async (params) => {
        try {
          const { performWebSearch } = await import('@/lib/websearch');
          const results = await performWebSearch(params.query);
          return { success: true, data: results.slice(0, params.limit || 5) };
        } catch (error) {
          return { success: false, error: 'Web search failed' };
        }
      },
    });

    this.registerTool({
      name: 'web_fetch',
      description: 'Fetch and extract content from a URL',
      parameters: {
        url: { type: 'string', description: 'URL to fetch', required: true },
      },
      execute: async (params) => {
        try {
          const response = await fetch(params.url);
          const text = await response.text();
          const content = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 5000);
          return { success: true, data: { url: params.url, content } };
        } catch (error) {
          return { success: false, error: 'Failed to fetch URL' };
        }
      },
    });

    this.registerTool({
      name: 'calendar_add_event',
      description: 'Add an event to the calendar. Use this when the user wants to schedule something, make an appointment, or add a reminder.',
      parameters: {
        title: { type: 'string', description: 'Event title/name', required: true },
        start_date: { type: 'string', description: 'Start date and time in ISO format or natural language (e.g., "2024-03-02T09:00:00" or "March 2nd at 9am")', required: true },
        end_date: { type: 'string', description: 'End date and time (optional)', required: false },
        description: { type: 'string', description: 'Event description', required: false },
        location: { type: 'string', description: 'Event location', required: false },
        attendees: { type: 'string', description: 'Comma-separated list of attendee emails', required: false },
      },
      execute: async (params) => {
        try {
          const { sqlDatabase } = await import('@/lib/database/sqlite');
          await sqlDatabase.initialize();
          
          const parseDate = (dateStr: string): number => {
            if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(dateStr)) {
              return new Date(dateStr).getTime();
            }
            const parsed = new Date(dateStr);
            if (!isNaN(parsed.getTime())) {
              return parsed.getTime();
            }
            const now = new Date();
            const match = dateStr.match(/(?:march|april|may|june|july|august|september|october|november|december|january|february)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s+at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?)?/i);
            if (match) {
              const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
              const monthName = dateStr.toLowerCase().match(/(?:march|april|may|june|july|august|september|october|november|december|january|february)/i)?.[0]?.toLowerCase();
              const month = months.indexOf(monthName || '');
              const day = parseInt(match[1]);
              const hour = match[2] ? parseInt(match[2]) : 9;
              const minute = match[3] ? parseInt(match[3]) : 0;
              const ampm = match[4];
              const year = now.getMonth() < month ? now.getFullYear() : now.getFullYear() + 1;
              return new Date(year, month, day, ampm === 'pm' && hour !== 12 ? hour + 12 : hour, minute).getTime();
            }
            return now.getTime();
          };

          const startDate = parseDate(params.start_date);
          const endDate = params.end_date ? parseDate(params.end_date) : startDate + 60 * 60 * 1000;

          const event = sqlDatabase.addEvent({
            title: params.title,
            description: params.description,
            startDate,
            endDate,
            location: params.location,
            attendees: params.attendees?.split(',').map((e: string) => e.trim()).filter(Boolean) || [],
            status: 'confirmed',
          });

          return { 
            success: true, 
            data: { 
              id: event.id,
              title: event.title,
              startDate: new Date(startDate).toISOString(),
              message: `Event "${params.title}" added to calendar for ${new Date(startDate).toLocaleString()}`
            }
          };
        } catch (error) {
          return { success: false, error: error instanceof Error ? error.message : 'Failed to add event' };
        }
      },
    });

    this.registerTool({
      name: 'calendar_get_events',
      description: 'Get calendar events for a date range. Use when user asks about their schedule or upcoming events.',
      parameters: {
        start_date: { type: 'string', description: 'Start date (ISO format or "today", "tomorrow")', required: false },
        end_date: { type: 'string', description: 'End date (ISO format)', required: false },
        days: { type: 'number', description: 'Number of days to look ahead (default 7)', required: false },
      },
      execute: async (params) => {
        try {
          const { sqlDatabase } = await import('@/lib/database/sqlite');
          await sqlDatabase.initialize();

          const now = new Date();
          let startDate: number;
          let endDate: number;

          if (params.start_date === 'today') {
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
          } else if (params.start_date === 'tomorrow') {
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
          } else if (params.start_date) {
            startDate = new Date(params.start_date).getTime();
          } else {
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
          }

          const days = params.days || 7;
          endDate = startDate + days * 24 * 60 * 60 * 1000;

          const events = sqlDatabase.getEvents(startDate, endDate);
          
          const formattedEvents = events.map((e: any) => ({
            id: e.id,
            title: e.title,
            date: new Date(e.startDate).toLocaleDateString(),
            time: new Date(e.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            location: e.location,
          }));

          return { success: true, data: { events: formattedEvents, count: formattedEvents.length } };
        } catch (error) {
          return { success: false, error: 'Failed to get events' };
        }
      },
    });

    this.registerTool({
      name: 'calendar_delete_event',
      description: 'Delete an event from the calendar. Use when user wants to cancel or remove an event.',
      parameters: {
        event_id: { type: 'string', description: 'ID of the event to delete', required: true },
      },
      execute: async (params) => {
        try {
          const { sqlDatabase } = await import('@/lib/database/sqlite');
          await sqlDatabase.initialize();

          const deleted = sqlDatabase.deleteEvent(params.event_id);
          return { success: deleted, data: { message: deleted ? 'Event deleted' : 'Event not found' } };
        } catch (error) {
          return { success: false, error: 'Failed to delete event' };
        }
      },
    });

    this.registerTool({
      name: 'document_list',
      description: 'List uploaded documents. Use when user wants to see what documents are available.',
      parameters: {},
      execute: async () => {
        try {
          const { sqlDatabase } = await import('@/lib/database/sqlite');
          await sqlDatabase.initialize();

          const docs = sqlDatabase.getDocuments?.() || [];
          return { 
            success: true, 
            data: { 
              documents: docs.map((d: any) => ({
                id: d.id,
                title: d.title,
                category: d.category,
                created: new Date(d.createdAt).toLocaleDateString(),
              }))
            }
          };
        } catch (error) {
          return { success: false, error: 'Failed to list documents' };
        }
      },
    });

    this.registerTool({
      name: 'document_chat',
      description: 'Chat with a specific document. Use when user wants to ask questions about an uploaded document.',
      parameters: {
        document_id: { type: 'string', description: 'ID of the document to chat with', required: true },
        question: { type: 'string', description: 'Question to ask about the document', required: true },
      },
      execute: async (params) => {
        try {
          const response = await fetch('/api/documents/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              documentId: params.document_id,
              question: params.question,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            return { success: true, data: { answer: data.answer } };
          }
          return { success: false, error: 'Failed to chat with document' };
        } catch (error) {
          return { success: false, error: 'Failed to chat with document' };
        }
      },
    });

    // ==================== ONLYOFFICE DOCUMENT TOOLS ====================

    this.registerTool({
      name: 'create_word_document',
      description: 'Create a new Word document with text content. Use when user wants to write a document, letter, report, or any text content.',
      parameters: {
        title: { type: 'string', description: 'Title of the document', required: true },
        content: { type: 'string', description: 'Text content to put in the document', required: false },
      },
      execute: async (params) => {
        try {
          // Split content into paragraphs if provided
          const paragraphs = params.content ? params.content.split('\n\n').filter((p: string) => p.trim()) : [];
          
          const response = await fetch('/api/onlyoffice/documents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'createWithContent',
              data: {
                title: params.title,
                type: 'word',
                content: params.content,
              },
            }),
          });

          if (response.ok) {
            const data = await response.json();
            return { 
              success: true, 
              data: { 
                documentId: data.document.id,
                title: data.document.title,
                message: `Created Word document: ${data.document.title}. Open it at /onlyoffice` 
              } 
            };
          }
          return { success: false, error: 'Failed to create document' };
        } catch (error) {
          return { success: false, error: 'Failed to create document' };
        }
      },
    });

    this.registerTool({
      name: 'create_spreadsheet',
      description: 'Create a new Excel spreadsheet with data. Use when user wants to create a table, track data, budget, or organize information in rows and columns.',
      parameters: {
        title: { type: 'string', description: 'Title of the spreadsheet', required: true },
        headers: { type: 'string', description: 'Column headers separated by commas (e.g., "Name, Amount, Date")', required: true },
        data: { type: 'string', description: 'Rows of data, each row on a new line, values separated by commas', required: true },
      },
      execute: async (params) => {
        try {
          const headers = params.headers.split(',').map((h: string) => h.trim());
          const rows = params.data.split('\n').map((row: string) => row.split(',').map((cell: string) => cell.trim()));
          
          const response = await fetch('/api/onlyoffice/documents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'createWithContent',
              data: {
                title: params.title,
                type: 'cell',
                headers: headers,
                rows: rows,
              },
            }),
          });

          if (response.ok) {
            const data = await response.json();
            return { 
              success: true, 
              data: { 
                documentId: data.document.id,
                title: data.document.title,
                message: `Created spreadsheet: ${data.document.title} with ${rows.length} rows. Open it at /onlyoffice` 
              } 
            };
          }
          return { success: false, error: 'Failed to create spreadsheet' };
        } catch (error) {
          return { success: false, error: 'Failed to create spreadsheet' };
        }
      },
    });

    this.registerTool({
      name: 'create_presentation',
      description: 'Create a new PowerPoint presentation with slides. Use when user wants to create a presentation, pitch deck, or slide show.',
      parameters: {
        title: { type: 'string', description: 'Title of the presentation', required: true },
        content: { type: 'string', description: 'Slide content. Format: "Slide Title: bullet1, bullet2, bullet3" (one slide per line)', required: true },
      },
      execute: async (params) => {
        try {
          // Parse content into slides
          const slides = params.content.split('\n').filter((line: string) => line.trim()).map((line: string) => {
            const parts = line.split(':');
            const title = parts[0].trim();
            const bulletPoints = parts.length > 1 
              ? parts[1].split(',').map((b: string) => b.trim()).filter((b: string) => b)
              : [];
            return { title, bulletPoints };
          });
          
          const response = await fetch('/api/onlyoffice/documents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'createWithContent',
              data: {
                title: params.title,
                type: 'slide',
                slides: slides,
              },
            }),
          });

          if (response.ok) {
            const data = await response.json();
            return { 
              success: true, 
              data: { 
                documentId: data.document.id,
                title: data.document.title,
                slideCount: slides.length,
                message: `Created presentation: ${data.document.title} with ${slides.length} slides. Open it at /onlyoffice` 
              } 
            };
          }
          return { success: false, error: 'Failed to create presentation' };
        } catch (error) {
          return { success: false, error: 'Failed to create presentation' };
        }
      },
    });

    this.registerTool({
      name: 'list_documents',
      description: 'List all ONLYOFFICE documents (Word, Excel, PowerPoint). Use when user wants to see their documents.',
      parameters: {},
      execute: async () => {
        try {
          const response = await fetch('/api/onlyoffice/documents?action=list');
          if (response.ok) {
            const data = await response.json();
            return { 
              success: true, 
              data: { 
                documents: data.documents.map((d: any) => ({
                  id: d.id,
                  title: d.title,
                  type: d.fileType,
                  created: new Date(d.createdAt).toLocaleDateString(),
                }))
              } 
            };
          }
          return { success: false, error: 'Failed to list documents' };
        } catch (error) {
          return { success: false, error: 'Failed to list documents' };
        }
      },
    });

      this.registerTool({
        name: 'append_to_spreadsheet',
        description: 'Add new rows to an existing spreadsheet. Use when user wants to add data to an existing Excel file.',
        parameters: {
          document_id: { type: 'string', description: 'ID of the spreadsheet to update', required: true },
          data: { type: 'string', description: 'New rows to add, each row on a new line, values separated by commas', required: true },
        },
        execute: async (params) => {
          try {
            const rows = params.data.split('\n').map((row: string) => row.split(',').map((cell: string) => cell.trim()));
            
            const response = await fetch('/api/onlyoffice/documents', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'appendToSpreadsheet',
                data: { documentId: params.document_id, rows: rows },
              }),
            });

            if (response.ok) {
              return { success: true, data: { message: `Added ${rows.length} rows to spreadsheet` } };
            }
            return { success: false, error: 'Failed to append to spreadsheet' };
          } catch (error) {
            return { success: false, error: 'Failed to append to spreadsheet' };
          }
        },
      });

    // ==================== SETTINGS MANAGEMENT TOOLS ====================

    this.registerTool({
      name: 'get_api_keys',
      description: 'Get list of configured API keys (shows which providers have keys set, not the actual keys). Use this to check what API keys are available.',
      parameters: {},
      execute: async () => {
        try {
          const response = await fetch('/api/settings');
          if (response.ok) {
            const data = await response.json();
            const keys = data.apiKeys || [];
            return { 
              success: true, 
              data: { 
                keys: keys.map((k: any) => ({
                  provider: k.provider,
                  configured: k.hasKey,
                })),
                message: keys.filter((k: any) => k.hasKey).length > 0 
                  ? `Configured: ${keys.filter((k: any) => k.hasKey).map((k: any) => k.provider).join(', ')}`
                  : 'No API keys configured. Use set_api_key to add one.'
              }
            };
          }
          return { success: false, error: 'Failed to get API keys' };
        } catch (error) {
          return { success: false, error: 'Failed to get API keys' };
        }
      },
    });

    this.registerTool({
      name: 'set_api_key',
      description: 'Set an API key for a provider. Use this when the user wants to add or update an API key.',
      parameters: {
        provider: { type: 'string', description: 'Provider name (tavily, brave, serpapi, openrouter, glm, deepseek, sam, openai, anthropic)', required: true },
        key: { type: 'string', description: 'The API key value', required: true },
      },
      execute: async (params) => {
        try {
          const response = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provider: params.provider, value: params.key }),
          });
          if (response.ok) {
            return { 
              success: true, 
              data: { 
                message: `API key for ${params.provider} has been saved successfully.`,
                provider: params.provider,
              }
            };
          }
          const error = await response.json();
          return { success: false, error: error.error || 'Failed to save API key' };
        } catch (error) {
          return { success: false, error: 'Failed to save API key' };
        }
      },
    });

    this.registerTool({
      name: 'remove_api_key',
      description: 'Remove an API key for a provider. Use this when the user wants to delete an API key.',
      parameters: {
        provider: { type: 'string', description: 'Provider name (tavily, brave, serpapi, openrouter, etc.)', required: true },
      },
      execute: async (params) => {
        try {
          const response = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete', provider: params.provider }),
          });
          if (response.ok) {
            return { 
              success: true, 
              data: { 
                message: `API key for ${params.provider} has been removed.`,
                provider: params.provider,
              }
            };
          }
          return { success: false, error: 'Failed to remove API key' };
        } catch (error) {
          return { success: false, error: 'Failed to remove API key' };
        }
      },
    });

    this.registerTool({
      name: 'get_settings',
      description: 'Get current system settings including model preferences and search mode.',
      parameters: {},
      execute: async () => {
        try {
          const response = await fetch('/api/settings');
          if (response.ok) {
            const data = await response.json();
            return { 
              success: true, 
              data: {
                modelPreferences: data.modelPreferences,
                searchMode: data.searchMode,
              }
            };
          }
          return { success: false, error: 'Failed to get settings' };
        } catch (error) {
          return { success: false, error: 'Failed to get settings' };
        }
      },
    });

    this.registerTool({
      name: 'set_model_preference',
      description: 'Set model preferences. Use this when the user wants to change default model or routing behavior.',
      parameters: {
        defaultModel: { type: 'string', description: 'Default model ID (e.g., "glm-4.7-flash", "llama3.2")', required: false },
        autoRoute: { type: 'boolean', description: 'Automatically route to best model for task', required: false },
        preferLocal: { type: 'boolean', description: 'Prefer local Ollama models over cloud', required: false },
        cloudForChat: { type: 'boolean', description: 'Use cloud models for chat', required: false },
      },
      execute: async (params) => {
        try {
          const prefs: any = {};
          if (params.defaultModel) prefs.defaultModel = params.defaultModel;
          if (params.autoRoute !== undefined) prefs.autoRoute = params.autoRoute;
          if (params.preferLocal !== undefined) prefs.preferLocal = params.preferLocal;
          if (params.cloudForChat !== undefined) prefs.cloudForChat = params.cloudForChat;
          
          const response = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ modelPreferences: prefs }),
          });
          if (response.ok) {
            return { 
              success: true, 
              data: { 
                message: 'Model preferences updated.',
                preferences: prefs,
              }
            };
          }
          return { success: false, error: 'Failed to update model preferences' };
        } catch (error) {
          return { success: false, error: 'Failed to update model preferences' };
        }
      },
    });

    this.registerTool({
      name: 'toggle_search_mode',
      description: 'Enable or disable web search mode. When enabled, responses will include web search results.',
      parameters: {
        enabled: { type: 'boolean', description: 'true to enable search, false to disable', required: true },
      },
      execute: async (params) => {
        try {
          const response = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ searchMode: params.enabled }),
          });
          if (response.ok) {
            return { 
              success: true, 
              data: { 
                message: `Web search has been ${params.enabled ? 'enabled' : 'disabled'}.`,
                searchMode: params.enabled,
              }
            };
          }
          return { success: false, error: 'Failed to toggle search mode' };
        } catch (error) {
          return { success: false, error: 'Failed to toggle search mode' };
        }
      },
    });

    // ==================== CUSTOM API TOOL MANAGEMENT ====================

    this.registerTool({
      name: 'list_custom_tools',
      description: 'List all custom API tools that have been configured. Use this to see what custom tools are available.',
      parameters: {},
      execute: async () => {
        try {
          const response = await fetch('/api/custom-tools');
          if (response.ok) {
            const data = await response.json();
            const tools = data.tools || [];
            return { 
              success: true, 
              data: { 
                tools: tools.map((t: any) => ({
                  name: t.name,
                  endpoint: t.endpoint,
                  method: t.method,
                  enabled: t.enabled,
                  description: t.description,
                })),
                count: tools.length,
                message: tools.length > 0 
                  ? `${tools.length} custom tool(s) configured.`
                  : 'No custom tools configured. Use create_custom_tool to add one.'
              }
            };
          }
          return { success: false, error: 'Failed to list custom tools' };
        } catch (error) {
          return { success: false, error: 'Failed to list custom tools' };
        }
      },
    });

    this.registerTool({
      name: 'create_custom_tool',
      description: 'Create a new custom API tool that the AI can call. Use this when the user wants to connect a local or external API.',
      parameters: {
        name: { type: 'string', description: 'Tool name (lowercase, underscores, e.g., "my_local_api")', required: true },
        endpoint: { type: 'string', description: 'API endpoint URL (e.g., "http://localhost:3001/api/search")', required: true },
        method: { type: 'string', description: 'HTTP method: GET, POST, PUT, or DELETE (default: POST)', required: false },
        description: { type: 'string', description: 'What this tool does', required: false },
        headers: { type: 'object', description: 'HTTP headers as JSON object (e.g., {"Authorization": "Bearer token"})', required: false },
        bodyTemplate: { type: 'string', description: 'JSON body template with {{parameter}} placeholders', required: false },
        parameters: { type: 'array', description: 'Array of parameter definitions: {name, type, description, required}', required: false },
        responsePath: { type: 'string', description: 'Dot-separated path to extract from response (e.g., "data.results")', required: false },
      },
      execute: async (params) => {
        try {
          const response = await fetch('/api/custom-tools', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'create',
              tool: {
                name: params.name,
                endpoint: params.endpoint,
                method: params.method || 'POST',
                description: params.description,
                headers: params.headers,
                bodyTemplate: params.bodyTemplate,
                parameters: params.parameters,
                responsePath: params.responsePath,
              },
            }),
          });
          const data = await response.json();
          if (response.ok && data.success) {
            return { 
              success: true, 
              data: { 
                message: `Custom tool "${params.name}" created successfully. I can now use it when appropriate.`,
                id: data.id,
              }
            };
          }
          return { success: false, error: data.error || 'Failed to create custom tool' };
        } catch (error) {
          return { success: false, error: 'Failed to create custom tool' };
        }
      },
    });

    this.registerTool({
      name: 'delete_custom_tool',
      description: 'Delete a custom API tool. Use this to remove a tool that is no longer needed.',
      parameters: {
        name: { type: 'string', description: 'Name of the tool to delete', required: true },
      },
      execute: async (params) => {
        try {
          // First get the tool by name to find its ID
          const listResponse = await fetch('/api/custom-tools');
          const listData = await listResponse.json();
          const tool = listData.tools?.find((t: any) => t.name === params.name);
          
          if (!tool) {
            return { success: false, error: `Tool "${params.name}" not found` };
          }
          
          const response = await fetch('/api/custom-tools', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete', id: tool.id }),
          });
          if (response.ok) {
            return { 
              success: true, 
              data: { message: `Custom tool "${params.name}" has been deleted.` }
            };
          }
          return { success: false, error: 'Failed to delete custom tool' };
        } catch (error) {
          return { success: false, error: 'Failed to delete custom tool' };
        }
      },
    });

    this.registerTool({
      name: 'toggle_custom_tool',
      description: 'Enable or disable a custom API tool.',
      parameters: {
        name: { type: 'string', description: 'Name of the tool', required: true },
        enabled: { type: 'boolean', description: 'true to enable, false to disable', required: true },
      },
      execute: async (params) => {
        try {
          const listResponse = await fetch('/api/custom-tools');
          const listData = await listResponse.json();
          const tool = listData.tools?.find((t: any) => t.name === params.name);
          
          if (!tool) {
            return { success: false, error: `Tool "${params.name}" not found` };
          }
          
          const response = await fetch('/api/custom-tools', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'toggle', id: tool.id, enabled: params.enabled }),
          });
          if (response.ok) {
            return { 
              success: true, 
              data: { message: `Custom tool "${params.name}" has been ${params.enabled ? 'enabled' : 'disabled'}.` }
            };
          }
          return { success: false, error: 'Failed to toggle custom tool' };
        } catch (error) {
          return { success: false, error: 'Failed to toggle custom tool' };
        }
      },
    });

    // ==================== PROMPT MANAGEMENT ====================

    this.registerTool({
      name: 'save_prompt',
      description: 'Save a prompt to the prompt database for later reuse. Use this when the user wants to remember a prompt they crafted.',
      parameters: {
        title: { type: 'string', description: 'Short title for the prompt', required: true },
        content: { type: 'string', description: 'The full prompt content', required: true },
        category: { type: 'string', description: 'Category (e.g., "writing", "analysis", "coding", "general")', required: false },
        tags: { type: 'array', description: 'Tags for organization', required: false },
        variables: { type: 'array', description: 'Variable definitions: {name, description, default}', required: false },
      },
      execute: async (params) => {
        try {
          const response = await fetch('/api/prompts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: params.title,
              content: params.content,
              category: params.category || 'general',
              tags: params.tags || [],
              variables: params.variables || [],
            }),
          });
          const data = await response.json();
          if (response.ok && data.success) {
            return { 
              success: true, 
              data: { 
                message: `Prompt "${params.title}" saved successfully.`,
                id: data.prompt?.id,
              }
            };
          }
          return { success: false, error: data.error || 'Failed to save prompt' };
        } catch (error) {
          return { success: false, error: 'Failed to save prompt' };
        }
      },
    });

    this.registerTool({
      name: 'get_prompts',
      description: 'Retrieve saved prompts from the database. Use this to find prompts the user has saved.',
      parameters: {
        category: { type: 'string', description: 'Filter by category (optional)', required: false },
        query: { type: 'string', description: 'Search query (optional)', required: false },
      },
      execute: async (params) => {
        try {
          const queryString = new URLSearchParams();
          if (params.category) queryString.set('category', params.category);
          if (params.query) queryString.set('query', params.query);
          
          const response = await fetch(`/api/prompts?${queryString.toString()}`);
          if (response.ok) {
            const data = await response.json();
            const prompts = data.prompts || [];
            return { 
              success: true, 
              data: { 
                prompts: prompts.map((p: any) => ({
                  id: p.id,
                  title: p.title,
                  category: p.category,
                  tags: p.tags,
                  useCount: p.use_count,
                })),
                count: prompts.length,
                message: prompts.length > 0 
                  ? `Found ${prompts.length} saved prompt(s).`
                  : 'No saved prompts found. Use save_prompt to create one.'
              }
            };
          }
          return { success: false, error: 'Failed to get prompts' };
        } catch (error) {
          return { success: false, error: 'Failed to get prompts' };
        }
      },
    });

    this.registerTool({
      name: 'use_prompt',
      description: 'Retrieve and use a saved prompt by ID. Increments the use count.',
      parameters: {
        id: { type: 'string', description: 'The prompt ID', required: true },
      },
      execute: async (params) => {
        try {
          const response = await fetch(`/api/prompts?id=${params.id}`);
          if (response.ok) {
            const data = await response.json();
            if (data.prompt) {
              return {
                success: true,
                data: {
                  prompt: data.prompt,
                  message: `Loaded prompt: "${data.prompt.title}"`,
                },
              };
            }
          }
          return { success: false, error: 'Prompt not found' };
        } catch (error) {
          return { success: false, error: 'Failed to get prompt' };
        }
      },
    });

    this.registerTool({
      name: 'delete_prompt',
      description: 'Delete a saved prompt from the database.',
      parameters: {
        id: { type: 'string', description: 'The prompt ID to delete', required: true },
      },
      execute: async (params) => {
        try {
          const response = await fetch('/api/prompts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete', id: params.id }),
          });
          if (response.ok) {
            return { success: true, data: { message: 'Prompt deleted.' } };
          }
          return { success: false, error: 'Failed to delete prompt' };
        } catch (error) {
          return { success: false, error: 'Failed to delete prompt' };
        }
      },
    });

    // ==================== NOTE EXTRACTION ====================

    this.registerTool({
      name: 'extract_from_note',
      description: 'Extract structured data from text/notes. Finds contacts, tasks, events, API keys, and other information. Saves to database automatically.',
      parameters: {
        content: { type: 'string', description: 'The text content to extract data from', required: true },
        saveToDb: { type: 'boolean', description: 'Whether to save extracted data to database (default: true)', required: false },
      },
      execute: async (params) => {
        try {
          const response = await fetch('/api/notes/extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: params.content,
              saveToDb: params.saveToDb !== false,
            }),
          });
          const data = await response.json();
          if (response.ok && data.success) {
            const extracted = data.extracted;
            const saved = data.saved;
            
            let summary = 'Extracted:\n';
            if (extracted.contacts?.length) summary += `- ${extracted.contacts.length} contact(s)\n`;
            if (extracted.tasks?.length) summary += `- ${extracted.tasks.length} task(s)\n`;
            if (extracted.events?.length) summary += `- ${extracted.events.length} event(s)\n`;
            if (extracted.emails?.length) summary += `- ${extracted.emails.length} email(s)\n`;
            if (extracted.phones?.length) summary += `- ${extracted.phones.length} phone number(s)\n`;
            if (extracted.urls?.length) summary += `- ${extracted.urls.length} URL(s)\n`;
            
            if (saved && saved.contacts > 0 || saved?.tasks > 0 || saved?.events > 0) {
              summary += `\nSaved to database: ${saved.contacts || 0} contacts, ${saved.tasks || 0} tasks, ${saved.events || 0} events`;
            }
            
            return {
              success: true,
              data: {
                extracted,
                saved,
                summary,
                message: data.message || 'Content processed successfully.',
              },
            };
          }
          return { success: false, error: data.error || 'Failed to extract' };
        } catch (error) {
          return { success: false, error: 'Failed to extract content' };
        }
      },
    });

    // ==================== SAM.gov OPPORTUNITY TRACKING ====================

    this.registerTool({
      name: 'track_opportunity',
      description: 'Track a SAM.gov opportunity for monitoring. Use this when the user wants to add a government contracting opportunity to their watch list.',
      parameters: {
        title: { type: 'string', description: 'Opportunity title', required: true },
        solicitationNumber: { type: 'string', description: 'Solicitation number (e.g., FA8652-26-R-0001)', required: true },
        type: { type: 'string', description: 'Opportunity type (Solicitation, Presolicitation, Sources Sought, etc.)', required: false },
        agency: { type: 'string', description: 'Agency name', required: false },
        office: { type: 'string', description: 'Office name', required: false },
        postedDate: { type: 'string', description: 'Date posted (YYYY-MM-DD)', required: false },
        responseDeadline: { type: 'string', description: 'Due date/time (ISO format)', required: false },
        awardAmount: { type: 'string', description: 'Award amount', required: false },
        naicsCode: { type: 'string', description: 'NAICS code', required: false },
        location: { type: 'string', description: 'Place of performance', required: false },
        synopsis: { type: 'string', description: 'Brief description', required: false },
        url: { type: 'string', description: 'SAM.gov URL', required: false },
        notes: { type: 'string', description: 'User notes', required: false },
        priority: { type: 'string', description: 'Priority: low, medium, high, or critical', required: false },
      },
      execute: async (params) => {
        try {
          const priority = params.priority as 'low' | 'medium' | 'high' | 'critical';
          const response = await fetch('/api/sam/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: params.title,
              solicitationNumber: params.solicitationNumber,
              type: params.type || 'Solicitation',
              agency: params.agency,
              office: params.office,
              postedDate: params.postedDate,
              responseDeadline: params.responseDeadline,
              awardAmount: params.awardAmount,
              naicsCode: params.naicsCode,
              location: params.location,
              synopsis: params.synopsis,
              url: params.url,
              notes: params.notes,
              priority: priority || 'medium',
            }),
          });
          const data = await response.json();
          if (response.ok && data.success) {
            return {
              success: true,
              data: {
                message: `Started tracking "${params.title}" (${params.solicitationNumber})`,
                id: data.opportunity?.id,
              },
            };
          }
          if (response.status === 409) {
            return { success: false, error: 'Already tracking this opportunity' };
          }
          return { success: false, error: data.error || 'Failed to track opportunity' };
        } catch (error) {
          return { success: false, error: 'Failed to track opportunity' };
        }
      },
    });

    this.registerTool({
      name: 'list_tracked_opportunities',
      description: 'List tracked SAM.gov opportunities. Use this when the user wants to see their tracked opportunities.',
      parameters: {
        status: { type: 'string', description: 'Filter by status: active, past_due, awarded, closed', required: false },
      },
      execute: async (params) => {
        try {
          const queryString = params.status ? `?status=${params.status}` : '';
          const response = await fetch(`/api/sam/track${queryString}`);
          const data = await response.json();
          if (response.ok) {
            const opps = data.opportunities || [];
            return {
              success: true,
              data: {
                opportunities: opps.map((o: any) => ({
                  id: o.id,
                  title: o.title,
                  solicitationNumber: o.solicitation_number,
                  agency: o.agency,
                  status: o.status,
                  deadline: o.response_deadline,
                  priority: o.user_priority,
                })),
                count: opps.length,
                message: opps.length > 0 ? `Found ${opps.length} tracked opportunity(ies)` : 'No tracked opportunities found.',
              },
            };
          }
          return { success: false, error: 'Failed to list opportunities' };
        } catch (error) {
          return { success: false, error: 'Failed to list opportunities' };
        }
      },
    });

    this.registerTool({
      name: 'update_opportunity_status',
      description: 'Update the status of a tracked SAM.gov opportunity.',
      parameters: {
        solicitationNumber: { type: 'string', description: 'Solicitation number to find the opportunity', required: true },
        status: { type: 'string', description: 'New status: active, past_due, awarded, closed', required: true },
        notes: { type: 'string', description: 'Notes to add', required: false },
      },
      execute: async (params) => {
        try {
          // First find the opportunity
          const findResponse = await fetch(`/api/sam/track?solicitationNumber=${encodeURIComponent(params.solicitationNumber)}`);
          const findData = await findResponse.json();
          
          if (!findData.opportunity) {
            return { success: false, error: `Opportunity ${params.solicitationNumber} not found in tracked list` };
          }
          
          const response = await fetch('/api/sam/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'update',
              id: findData.opportunity.id,
              status: params.status,
              notes: params.notes,
            }),
          });
          
          if (response.ok) {
            return {
              success: true,
              data: { message: `Updated ${params.solicitationNumber} status to ${params.status}` },
            };
          }
          return { success: false, error: 'Failed to update opportunity' };
        } catch (error) {
          return { success: false, error: 'Failed to update opportunity' };
        }
      },
    });

    // Load custom tools from database
    this.loadCustomTools();
  }

  private loadCustomTools(): void {
    // This is called synchronously during construction, but custom tools need async init
    // So we defer loading until first use
    this.customToolsLoaded = false;
  }

  private customToolsLoaded: boolean = false;

  async ensureCustomToolsLoaded(): Promise<void> {
    if (this.customToolsLoaded) return;
    
    try {
      const { sqlDatabase } = await import('@/lib/database/sqlite');
      await sqlDatabase.initialize();
      
      const customTools = sqlDatabase.getCustomTools(true);
      
      for (const tool of customTools) {
        // Build parameters schema
        const parameters: Record<string, { type: string; description: string; required: boolean }> = {};
        if (tool.parameters && Array.isArray(tool.parameters)) {
          for (const param of tool.parameters) {
            parameters[param.name] = {
              type: param.type || 'string',
              description: param.description || '',
              required: param.required !== false,
            };
          }
        }
        
        this.registerTool({
          name: tool.name,
          description: tool.description || `Custom API: ${tool.name}`,
          parameters,
          execute: async (params) => {
            try {
              const response = await fetch('/api/custom-tools/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ toolName: tool.name, parameters: params }),
              });
              
              const result = await response.json();
              return result;
            } catch (error) {
              return { success: false, error: `Failed to execute ${tool.name}` };
            }
          },
        });
      }
      
      this.customToolsLoaded = true;
    } catch (error) {
      console.error('[ToolRegistry] Failed to load custom tools:', error);
    }
  }

  registerTool(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  unregisterTool(name: string): void {
    this.tools.delete(name);
  }

  getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  async getAllToolsAsync(): Promise<Tool[]> {
    await this.ensureCustomToolsLoaded();
    return Array.from(this.tools.values());
  }

  getAllTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  async getToolDescriptionsAsync(): Promise<Array<{ name: string; description: string; parameters: Record<string, any> }>> {
    await this.ensureCustomToolsLoaded();
    return this.getAllTools().map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    }));
  }

  getToolDescriptions(): Array<{ name: string; description: string; parameters: Record<string, any> }> {
    return this.getAllTools().map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    }));
  }

  async getToolPromptAsync(): Promise<string> {
    await this.ensureCustomToolsLoaded();
    const tools = this.getAllTools();
    if (tools.length === 0) return '';

    let prompt = 'You have access to the following tools:\n\n';
    
    for (const tool of tools) {
      prompt += `## ${tool.name}\n${tool.description}\n\nParameters:\n`;
      for (const [param, spec] of Object.entries(tool.parameters)) {
        prompt += `- ${param} (${spec.type}${spec.required ? ', required' : ', optional'}): ${spec.description}\n`;
      }
      prompt += '\n';
    }

    prompt += `To use a tool, respond with JSON: { "tool": "name", "parameters": { ... } }`;
    return prompt;
  }

  getToolPrompt(): string {
    const tools = this.getAllTools();
    if (tools.length === 0) return '';

    let prompt = 'You have access to the following tools:\n\n';
    
    for (const tool of tools) {
      prompt += `## ${tool.name}\n${tool.description}\n\nParameters:\n`;
      for (const [param, spec] of Object.entries(tool.parameters)) {
        prompt += `- ${param} (${spec.type}${spec.required ? ', required' : ', optional'}): ${spec.description}\n`;
      }
      prompt += '\n';
    }

    prompt += `To use a tool, respond with JSON: { "tool": "name", "parameters": { ... } }`;
    return prompt;
  }

  async executeTool(name: string, parameters: Record<string, any>): Promise<ToolResult> {
    const startTime = Date.now();
    
    const { toolEfficiencyAnalyzer } = await import('./tool-efficiency');
    
    const tool = this.tools.get(name);
    if (!tool) {
      return { success: false, error: `Unknown tool: ${name}` };
    }

    try {
      const result = await tool.execute(parameters);
      const duration = Date.now() - startTime;
      
      toolEfficiencyAnalyzer.recordToolCall(name, parameters, result, duration, result.success);
      
      return {
        ...result,
        metadata: { tool: name, duration },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      toolEfficiencyAnalyzer.recordToolCall(name, parameters, null, duration, false);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  getStats(): ToolRegistryStats {
    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;
    const recentCalls = this.callHistory.filter(c => c.timestamp > dayAgo);
    
    const byTool: Record<string, { calls: number; success: number; avgDuration: number }> = {};
    for (const call of recentCalls) {
      if (!byTool[call.tool]) {
        byTool[call.tool] = { calls: 0, success: 0, avgDuration: 0 };
      }
      byTool[call.tool].calls++;
      if (call.success) byTool[call.tool].success++;
      byTool[call.tool].avgDuration = 
        (byTool[call.tool].avgDuration * (byTool[call.tool].calls - 1) + call.duration) / 
        byTool[call.tool].calls;
    }
    
    const successCount = recentCalls.filter(c => c.success).length;
    const totalDuration = recentCalls.reduce((sum, c) => sum + c.duration, 0);
    
    return {
      toolsAvailable: this.tools.size,
      callsToday: recentCalls.length,
      successRate: recentCalls.length > 0 ? successCount / recentCalls.length : 0,
      avgDuration: recentCalls.length > 0 ? totalDuration / recentCalls.length : 0,
      byTool,
    };
  }
}

export const toolRegistry = ToolRegistry.getInstance();