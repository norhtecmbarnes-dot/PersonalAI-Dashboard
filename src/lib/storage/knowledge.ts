import { DocumentStore } from './documents';
import { NoteStore } from './notes';

export class KnowledgeBase {
    private static documents = DocumentStore;
    private static notes = NoteStore;

    static async getRelevantContent(query: string, maxResults = 5): Promise<string[]> {
        const [relevantDocs, relevantNotes] = await Promise.all([
            this.documents.search(query),
            this.notes.search(query)
        ]);

        const snippets: string[] = [];

        relevantDocs.slice(0, maxResults).forEach(doc => {
            if (doc.content) {
                snippets.push(`[Document: ${doc.title}]\n${doc.content}`);
            }
        });

        relevantNotes.slice(0, maxResults).forEach(note => {
            snippets.push(`[Note: ${note.title}]\n${note.content}\nTags: ${note.tags.join(', ')}`);
        });

        return snippets;
    }

    static async getMemoryContext(conversationHistory: any[], maxHistory = 10): Promise<string[]> {
        const relevantContext: string[] = [];

        if (conversationHistory.length > 0) {
            const recentContent = conversationHistory.slice(-maxHistory)
                .map(msg => `User: ${msg.user}\nAssistant: ${msg.assistant}`)
                .join('\n---\n');

            relevantContext.push(`Recent Conversation:\n${recentContent}`);
        }

        const importantNotes = this.notes.getByImportance('high').slice(0, 3);
        importantNotes.forEach(note => {
            relevantContext.push(`[Important Note - ${note.title}]\n${note.content}`);
        });

        return relevantContext;
    }

    static async addKnowledge(
        text: string,
        title?: string,
        type: 'document' | 'note' = 'note',
        category?: string,
        tags?: string[]
    ): Promise<any> {
        if (type === 'document') {
            return this.documents.create({
                title: title || 'Untitled Document',
                type: this.detectType(text),
                content: text,
                size: text.length,
                metadata: { tags: tags || [] }
            });
        } else {
            return this.notes.create({
                title: title || 'Untitled Note',
                content: text,
                category: (category || 'custom') as 'custom' | 'research' | 'idea' | 'summary' | 'todo',
                tags: tags || [],
                importance: 'medium'
            });
        }
    }

    static async enhanceResponse(
        userQuery: string,
        model: string,
        apiCall: Function,
        systemPrompt?: string
    ): Promise<any> {
        const [relevantDocs, relevantNotes] = await Promise.all([
            this.getRelevantContent(userQuery),
            this.getMemoryContext([])
        ]);

        const enhancedPrompts = [];

        if (relevantDocs.length > 0) {
            enhancedPrompts.push({
                role: 'system',
                content: `You have access to relevant documents. Use this information to answer:\n\n${relevantDocs.join('\n\n\n')}`
            });
        }

        if (relevantNotes.length > 0) {
            enhancedPrompts.push({
                role: 'system',
                content: `Remember these important notes:\n\n${relevantNotes.join('\n\n\n')}`
            });
        }

        if (systemPrompt) {
            enhancedPrompts.push({
                role: 'system',
                content: systemPrompt
            });
        }

        return apiCall(model, enhancedPrompts);
    }

    private static detectType(content: string): 'text' | 'pdf' | 'markdown' | 'code' | 'other' {
        if (content.match(/^```(\w+)?\n/)) return 'code';
        if (content.match(/^#+\s/)) return 'markdown';
        if (content.match(/\.(pdf|txt|md|json|csv|xml)$/i)) return 'text';
        return 'text';
    }

    static async searchKnowledge(query: string) {
        const [docs, notes] = await Promise.all([
            this.documents.search(query),
            this.notes.search(query)
        ]);

        return {
            documents: docs,
            notes: notes,
            total: docs.length + notes.length
        };
    }

    static async getStatistics() {
        const [docs, notes] = await Promise.all([
            this.documents.getAll(),
            this.notes.getAll()
        ]);

        return {
            totalDocuments: docs.length,
            totalNotes: notes.length,
            documentsByType: docs.reduce((acc, doc) => {
                acc[doc.type] = (acc[doc.type] || 0) + 1;
                return acc;
            }, {} as Record<string, number>),
            notesByCategory: notes.reduce((acc, note) => {
                acc[note.category] = (acc[note.category] || 0) + 1;
                return acc;
            }, {} as Record<string, number>),
            importantNotes: notes.filter(note => note.importance === 'high').length
        };
    }
}