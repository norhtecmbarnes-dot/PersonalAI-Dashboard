export interface Note {
    id: string;
    title: string;
    content: string;
    category: 'research' | 'idea' | 'summary' | 'todo' | 'custom';
    tags: string[];
    createdAt: number;
    updatedAt: number;
    importance: 'low' | 'medium' | 'high';
    relatedDocuments?: string[];
}

export class NoteStore {
    private static storageKey = 'ai_notes';

    static create(note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Note {
        const notes = this.getAll();
        const newNote: Note = {
            ...note,
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        notes.unshift(newNote);
        this.save(notes);
        return newNote;
    }

    static getAll(): Note[] {
        if (typeof window === 'undefined') return [];
        try {
            const notes = localStorage.getItem(this.storageKey);
            return notes ? JSON.parse(notes) : [];
        } catch (error) {
            console.error('Error loading notes:', error);
            return [];
        }
    }

    static getById(id: string): Note | null {
        const notes = this.getAll();
        return notes.find(note => note.id === id) || null;
    }

    static update(id: string, updates: Partial<Note>): Note | null {
        const notes = this.getAll();
        const index = notes.findIndex(note => note.id === id);
        if (index === -1) return null;

        notes[index] = {
            ...notes[index],
            ...updates,
            updatedAt: Date.now(),
        };
        this.save(notes);
        return notes[index];
    }

    static delete(id: string): boolean {
        const notes = this.getAll();
        const filtered = notes.filter(note => note.id !== id);
        this.save(filtered);
        return filtered.length !== notes.length;
    }

    static search(query: string): Note[] {
        const notes = this.getAll();
        if (!query.trim()) return notes;

        const lowerQuery = query.toLowerCase();
        return notes.filter(note =>
            note.title.toLowerCase().includes(lowerQuery) ||
            note.content.toLowerCase().includes(lowerQuery) ||
            note.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
            note.category.toLowerCase().includes(lowerQuery)
        );
    }

    static getByCategory(category: Note['category']): Note[] {
        const notes = this.getAll();
        return notes.filter(note => note.category === category);
    }

    static getByTags(tags: string[]): Note[] {
        const notes = this.getAll();
        const newTags = tags.filter(tag => tag.trim());
        return notes.filter(note =>
            note.tags.some(tag => newTags.includes(tag))
        );
    }

    static getByImportance(importance: Note['importance']): Note[] {
        const notes = this.getAll();
        return notes.filter(note => note.importance === importance);
    }

    static markAsHighPriority(id: string): Note | null {
        return this.update(id, { importance: 'high' });
    }

    static clear(): void {
        if (typeof window === 'undefined') return;
        localStorage.removeItem(this.storageKey);
    }

    static exportNotes(): string {
        const notes = this.getAll();
        return JSON.stringify(notes, null, 2);
    }

    private static save(notes: Note[]): void {
        if (typeof window === 'undefined') return;
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(notes));
        } catch (error) {
            console.error('Error saving notes:', error);
        }
    }
}