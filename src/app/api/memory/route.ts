import { NextResponse } from 'next/server';
import { VectorStore } from '@/lib/storage/vector';
import { TokenOptimizer } from '@/lib/utils/tokens';
import { DocumentStore } from '@/lib/storage/documents';
import { memoryStore, MemoryCategory } from '@/lib/memory/persistent-store';
import { 
  injectMemoryContext, 
  saveImportantFact, 
  getMemoryStats,
  setUserName,
  setAssistantName,
  setUserPreference,
} from '@/lib/memory/memory-injector';
import {
  loadScratchpad,
  saveScratchpad,
  updateScratchpad,
  updateUserProfile,
  addActiveProject,
  addRecentDecision,
  updateSessionContext,
} from '@/lib/memory/scratchpad';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case 'importDocument': {
        const { title, content, type, tags } = data;
        
        if (!title || !content) {
          return NextResponse.json(
            { error: 'Title and content are required' },
            { status: 400 }
          );
        }

        const doc = await DocumentStore.create({
          title,
          content,
          type: type || 'text',
          size: content.length,
          metadata: { tags: tags || [] },
        });

        VectorStore.addDocument({
          id: doc.id,
          content,
          title,
          tags,
        });

        return NextResponse.json({
          success: true,
          document: doc,
          message: 'Document imported and indexed successfully',
        });
      }

      case 'searchMemory': {
        const { query, limit } = data;
        
        if (!query) {
          return NextResponse.json(
            { error: 'Query is required' },
            { status: 400 }
          );
        }

        const results = VectorStore.search(query, limit || 5);

        return NextResponse.json({
          results,
          count: results.length,
        });
      }

      case 'getContext': {
        const { query, maxTokens } = data;
        
        if (!query) {
          return NextResponse.json(
            { error: 'Query is required' },
            { status: 400 }
          );
        }

        const context = VectorStore.getContextForQuery(
          query,
          maxTokens || 2000
        );

        return NextResponse.json({
          context,
          tokens: TokenOptimizer.estimateTokens(context),
        });
      }

      case 'optimizeTokens': {
        const { messages, systemPrompt, additionalContext } = data;

        const optimized = TokenOptimizer.optimizeContext(
          messages || [],
          systemPrompt || 'You are a helpful AI assistant.',
          additionalContext || ''
        );

        return NextResponse.json({
          optimized,
          estimatedTokens: TokenOptimizer.estimateTokens(
            JSON.stringify(optimized)
          ),
        });
      }

      case 'syncMemory': {
        VectorStore.syncWithStorage();
        
        return NextResponse.json({
          success: true,
          stats: VectorStore.getStats(),
        });
      }

      case 'clearMemory': {
        const { type } = data;
        
        if (type) {
          const entries = VectorStore.getByType(type);
          entries.forEach(entry => VectorStore.delete(entry.id));
        } else {
          VectorStore.clear();
        }

        return NextResponse.json({
          success: true,
          stats: VectorStore.getStats(),
        });
      }

      case 'getStats': {
        const docs = await DocumentStore.getAll();
        return NextResponse.json({
          vectorStore: VectorStore.getStats(),
          documents: docs.length,
        });
      }

      // New Persistent Memory endpoints
      case 'persistent_search': {
        const { query, limit, category } = data;
        const results = await memoryStore.search(query, { limit: limit || 5, category });
        return NextResponse.json({ success: true, results });
      }

      case 'persistent_recent': {
        const { limit, category } = data;
        const memories = await memoryStore.getRecent(limit || 10, category);
        return NextResponse.json({ success: true, memories });
      }

      case 'persistent_save': {
        const { content, key, category, importance } = data;
        if (!content || !key) {
          return NextResponse.json({ error: 'Content and key required' }, { status: 400 });
        }
        if (memoryStore.isSensitive(content)) {
          return NextResponse.json({ error: 'Cannot save sensitive information' }, { status: 400 });
        }
        const id = await memoryStore.saveMemory({
          content,
          key,
          category: category || 'knowledge',
          importance: importance || 5,
          metadata: {},
        });
        return NextResponse.json({ success: true, id });
      }

      case 'persistent_delete': {
        const { id } = data;
        if (!id) {
          return NextResponse.json({ error: 'ID required' }, { status: 400 });
        }
        const deleted = await memoryStore.delete(id);
        return NextResponse.json({ success: deleted });
      }

      case 'scratchpad_get': {
        const scratchpad = loadScratchpad();
        return NextResponse.json({ success: true, scratchpad });
      }

      case 'scratchpad_update': {
        const { updates } = data;
        const updated = updateScratchpad(updates);
        return NextResponse.json({ success: true, scratchpad: updated });
      }

      case 'inject_context': {
        const { query, maxTokens } = data;
        const result = await injectMemoryContext(query, maxTokens || 1500);
        return NextResponse.json({ success: true, ...result });
      }

      case 'memory_stats': {
        const stats = await memoryStore.getStats();
        const scratchpadStats = getMemoryStats();
        return NextResponse.json({ success: true, stats: { ...stats, scratchpad: scratchpadStats } });
      }

      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Memory API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    endpoints: {
      POST: {
        importDocument: 'Import and index a document',
        searchMemory: 'Search vector memory',
        getContext: 'Get context for a query',
        optimizeTokens: 'Optimize token usage',
        syncMemory: 'Sync memory with storage',
        clearMemory: 'Clear memory entries',
        getStats: 'Get memory statistics',
        // New Persistent Memory endpoints
        persistent_search: 'Search persistent memories',
        persistent_recent: 'Get recent persistent memories',
        persistent_save: 'Save a new persistent memory',
        persistent_delete: 'Delete a persistent memory',
        scratchpad_get: 'Get scratchpad contents',
        scratchpad_update: 'Update scratchpad',
        inject_context: 'Inject memory context for chat',
        memory_stats: 'Get comprehensive memory statistics',
      },
    },
  });
}
