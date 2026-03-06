# Chapter 6: Database vs Datalake - Storing Information

Your AI Dashboard needs to store information. But not all data is the same. This chapter explains the **two-tier storage system**: databases for structured data and datalakes for AI-searchable content.

## What You'll Learn

- What is a **database** (SQLite)
- What is a **datalake** (Vector Store)
- How they're different and why you need both
- How they work together
- Basic operations in each

---

## The Two-Tier Storage Philosophy

Enterprise AI systems use two types of storage:

| Aspect | Database | Datalake |
|--------|----------|----------|
| **Purpose** | Organized human data | AI-searchable content |
| **Structure** | Tables, rows, columns | Embeddings, vectors |
| **Search Type** | Exact match queries | Semantic similarity |
| **Example Query** | "Find brand named 'Acme'" | "Find discussions about pricing" |
| **Speed** | Millisecond queries | Millisecond semantic search |
| **Best For** | CRUD operations | AI context, RAG |

**Why both?** Because humans organize by categories, but AI understands by meaning.

---

## Part 1: The Database (SQLite)

### What is SQLite?

**SQLite** is a file-based database. No server needs to run. Just a file.

```
data/assistant.db  ← This is your entire database!
```

### Why SQLite?

| Feature | SQLite | Traditional DB |
|---------|--------|-----------------|
| Installation | One file | Separate server |
| Configuration | None | Complex setup |
| Performance | Excellent for local | Better for distributed |
| Learning curve | Simple | Moderate |
| Portability | Copy the file | Export/import |

### Database Structure

```
SQLite Database (assistant.db)
├── brands_v2          # Brand information
├── projects_v2        # Project data
├── chat_sessions      # Conversation history
├── documents          # File metadata
├── scheduled_tasks    # Automated tasks
├── contacts           # Contact directory
├── notes              # User notes
├── calendar_events    # Calendar items
├── custom_tools       # Tool definitions
├── prompts            # Saved prompts
├── experts            # Expert profiles
└── settings           # System settings
```

### Example: Brands Table

```sql
CREATE TABLE brands_v2 (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  persona TEXT,
  voice_style TEXT,
  system_prompt TEXT,
  documents TEXT,        -- JSON array of document IDs
  created_at INTEGER,
  updated_at INTEGER
);
```

**How humans use it:**

```javascript
// Create a brand
sqlDatabase.addBrand({
  id: 'brand-123',
  name: 'Coffee Shop',
  persona: 'Friendly neighborhood cafe'
});

// Query a brand
const brand = sqlDatabase.getBrandById('brand-123');

// Update a brand
sqlDatabase.updateBrand('brand-123', {
  voice_style: 'Warm and inviting'
});
```

### The Code: lib/database/sqlite.ts

```typescript
// Location: src/lib/database/sqlite.ts

class SQLDatabase {
  private db: Database | null = null;
  private dbPath: string;

  async initialize() {
    // Create or open the database file
    this.db = new SQL.Database(fs.readFileSync(this.dbPath));
    
    // Create tables
    this.createTables();
  }

  private createTables() {
    // Brands table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS brands_v2 (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        persona TEXT,
        created_at INTEGER
      )
    `);
    
    // Projects table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS projects_v2 (
        id TEXT PRIMARY KEY,
        brand_id TEXT,
        name TEXT,
        created_at INTEGER
      )
    `);
    
    // ... more tables
  }

  addBrand(brand: Brand) {
    this.db.run(
      'INSERT INTO brands_v2 (id, name, persona, created_at) VALUES (?, ?, ?, ?',
      [brand.id, brand.name, brand.persona, Date.now()]
    );
    this.save();
  }
}
```

---

## Part 2: The Datalake (Vector Store)

### What is a Vector Store?

A **vector store** converts text into numbers (embeddings) that the AI can search by meaning, not keywords.

### How It Works

```
Text: "The coffee shop offers organic blends"

         ↓ Embedding Model

Vector: [0.123, -0.456, 0.789, ..., 0.234]  (384-1536 numbers)

         ↓ Store in Vector Database

When you ask: "What beverages do they have?"
         ↓ Convert to vector

Search finds: "coffee", "blends" (semantic similarity)
```

### Why a Datalake?

| Question | Database (SQL) | Datalake (Vector) |
|----------|---------------|-------------------|
| "Find brand named 'Acme'" | ✓ Exact match | ✗ Overkill |
| "What did we discuss about pricing?" | ✗ Can't search meaning | ✓ Semantic search |
| "Get project #123" | ✓ Exact ID | ✗ Overkill |
| "Find similar documents" | ✗ No similarity | ✓ Similarity search |

### The Code: lib/storage/vector-lake.ts

```typescript
// Location: src/lib/storage/vector-lake.ts

class VectorLake {
  private embeddings: Map<string, number[]>;
  
  async addDocument(doc: Document) {
    // Convert text to vector
    const vector = await this.embed(doc.content);
    
    // Store with metadata
    this.embeddings.set(doc.id, vector);
    this.metadata.set(doc.id, {
      title: doc.title,
      type: doc.type,
      tags: doc.tags
    });
  }

  async search(query: string, limit: number = 10) {
    // Convert query to vector
    const queryVector = await this.embed(query);
    
    // Find most similar vectors
    const results = [];
    for (const [id, vector] of this.embeddings) {
      const similarity = this.cosineSimilarity(queryVector, vector);
      results.push({ id, similarity, metadata: this.metadata.get(id) });
    }
    
    // Sort by similarity
    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    // Calculate dot product divided by magnitude product
    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      magnitudeA += a[i] * a[i];
      magnitudeB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
  }
}
```

### How It's Used

```typescript
// Add a document to the datalake
await vectorLake.addDocument({
  id: 'doc-123',
  content: 'Our pricing strategy focuses on value-based pricing...',
  title: 'Pricing Strategy',
  type: 'document'
});

// Search by meaning
const results = await vectorLake.search('How do we price products?');
// Returns documents about pricing, even if they don't say "price"
```

---

## Part 3: How They Work Together

### The Flow

```
User Query
    │
    ▼
┌─────────────────────────────────────────────────┐
│                  AI Assistant                    │
│                                                 │
│  1. Check Database for structured data         │
│     • User settings                            │
│     • Brand information                        │
│     • Project details                           │
│                                                 │
│  2. Search Datalake for context               │
│     • Related documents                        │
│     • Past conversations                        │
│     • Knowledge base                             │
│                                                 │
│  3. Combine both for complete context          │
│                                                 │
│  4. Generate response                           │
└─────────────────────────────────────────────────┘
```

### Example: User Asks "What's our pricing for the new product?"

**Step 1: Database lookup (exact match)**
```sql
SELECT * FROM projects_v2 
WHERE name LIKE '%new product%';
-- Returns: project details, associated brand
```

**Step 2: Datalake search (semantic)**
```javascript
vectorLake.search("pricing strategy new product");
// Returns: 
// - "Pricing Strategy" document (similarity: 0.89)
// - "Q2 Revenue Planning" document (similarity: 0.72)
// - Chat about pricing from last week (similarity: 0.65)
```

**Step 3: Combine context**
```javascript
const context = {
  structured: { project, brand, settings },
  semantic: { documents, conversations }
};
```

**Step 4: AI generates response**
```
"Based on your pricing strategy document and 
the Q2 planning discussion, the new product 
pricing should follow the value-based approach..."
```

---

## Part 4: Memory.md - The Third Layer

### What is Memory.md?

A Markdown file that stores persistent AI memory - things the AI should always remember.

### Why Another Layer?

| Storage | Stores | Best For |
|---------|--------|----------|
| Database | Structured facts | Queries by ID, name, relationship |
| Datalake | Content | Semantic search |
| Memory.md | AI instructions | Context the AI always needs |

### Example Memory.md

```markdown
# User Profile
- Name: Michael
- Role: Software Developer
- Preferences: Prefers TypeScript, uses local models

# Projects
## AI Dashboard
- Purpose: Personal AI assistant
- Tech Stack: Next.js, TypeScript, SQLite
- Status: Production

# Brand Guidelines
## Writing Style
- Tone: Professional but friendly
- Avoid: Jargon, overly technical terms
- Emphasize: Practical, actionable advice

# Operating Procedures
## Daily Tasks
- Generate intelligence report at 8 AM
- Check calendar for scheduled meetings
- Review any pending tasks

## Communication Style
- Ask clarifying questions when needed
- Provide sources for information
- Acknowledge when uncertain
```

### The Code: lib/services/memory-file.ts

```typescript
// Location: src/lib/services/memory-file.ts

class MemoryFileService {
  private memoryPath = 'data/MEMORY.md';
  
  getSystemPrompt(): string {
    // Read the memory file and convert to system prompt
    if (!fs.existsSync(this.memoryPath)) {
      return '';
    }
    
    const content = fs.readFileSync(this.memoryPath, 'utf-8');
    return `You have persistent memory:\n\n${content}`;
  }
  
  updateUser(userProfile: UserProfile) {
    // Update the user section of memory
    const current = this.getMemory();
    current.user = userProfile;
    this.saveMemory(current);
  }
  
  addKnowledge(section: KnowledgeSection) {
    // Add a new knowledge entry
    const current = this.getMemory();
    current.knowledge.push(section);
    this.saveMemory(current);
  }
}
```

---

## CRUD Operations Comparison

### Database CRUD

```typescript
// CREATE
sqlDatabase.addContact({
  id: uuid(),
  name: 'Alice Smith',
  email: 'alice@example.com'
});

// READ
const contact = sqlDatabase.getContact('contact-123');
const allContacts = sqlDatabase.getContacts();

// UPDATE
sqlDatabase.updateContact('contact-123', {
  email: 'alice.new@example.com'
});

// DELETE
sqlDatabase.deleteContact('contact-123');
```

### Datalake CRUD

```typescript
// ADD (Create)
await vectorLake.addDocument({
  id: 'doc-123',
  content: 'Document text here...',
  title: 'My Document'
});

// SEARCH (Read)
const results = await vectorLake.search('search query', 5);

// UPDATE (Remove + Re-add)
await vectorLake.removeDocument('doc-123');
await vectorLake.addDocument(updatedDoc);

// DELETE
await vectorLake.removeDocument('doc-123');
```

### Memory CRUD

```typescript
// READ
const memory = memoryFileService.getMemory();
const prompt = memoryFileService.getSystemPrompt();

// UPDATE
memoryFileService.updateUser({ name: 'New Name' });
memoryFileService.addKnowledge({
  topic: 'New Topic',
  content: 'Information to remember'
});
```

---

## When to Use Which

### Use the Database When:
- ✅ You need exact queries (WHERE id = X)
- ✅ Data has clear structure (tables)
- ✅ You need relationships (foreign keys)
- ✅ Data changes frequently
- ✅ You need transactions

**Examples:**
- User settings
- Brand profiles
- Project details
- Task schedules
- Contact directory

### Use the Datalake When:
- ✅ You need semantic search
- ✅ Content is unstructured
- ✅ AI needs to find "similar" items
- ✅ Building RAG (Retrieval-Augmented Generation)
- ✅ Context for conversations

**Examples:**
- Document content
- Knowledge articles
- Research summaries
- Long conversation history
- Product descriptions

### Use Memory.md When:
- ✅ AI should ALWAYS remember this
- ✅ Context applies across all queries
- ✅ Information is about the user
- ✅ Guidelines and preferences

**Examples:**
- User profile
- Brand guidelines
- Operating procedures
- Writing style preferences
- Project context

---

## PROMPT YOU CAN USE

Create a database schema:

```
Create a SQLite database schema for an AI Dashboard that needs:
1. User settings (preferences, name, theme)
2. Brands (name, persona, voice_style, system_prompt)
3. Projects (name, brand_id, description, status)
4. Documents (filename, content, type, uploaded_at)
5. Chat sessions (conversation_id, role, content, timestamp)
6. Scheduled tasks (name, type, schedule, last_run)

Include:
- Primary keys
- Foreign keys where appropriate
- Indexes for common queries
- Timestamps for all tables

Provide the CREATE TABLE statements.
```

Create a vector store:

```
Create a JavaScript/TypeScript class for a simple vector store that:
1. Stores documents with their embeddings
2. Adds documents with addDocument(doc)
3. Searches with search(query, limit)
4. Uses cosine similarity for matching
5. Supports metadata filtering

Assume an embed() function exists that converts text to vectors.
Include all necessary methods.
```

---

## Security: Input Validation

The AI Dashboard validates ALL inputs before they reach the database or AI:

```typescript
// Location: src/lib/utils/validation.ts

/**
 * Sanitize user input for use in prompts
 * Prevents prompt injection attacks
 */
export function sanitizePrompt(input: string, maxLength: number = 4000): string {
  if (!input || typeof input !== 'string') return '';
  
  // Truncate to max length
  let sanitized = input.slice(0, maxLength);
  
  // Remove potential prompt injection patterns
  const injectionPatterns = [
    /```[\s\S]*?```/g,              // Remove code blocks
    /<\|.*?\|>/g,                  // Remove special tokens
    /\[INST\].*?\[\/INST\]/gi,     // Remove instruction tags
    /system\s*:/gi,                // Remove "system:" prefixes
    /ignore\s+previous/gi,         // Common injection
  ];
  
  for (const pattern of injectionPatterns) {
    sanitized = sanitized.replace(pattern, '');
  }
  
  return sanitized.trim();
}
```

This is called BEFORE any user input goes to:
- Database queries
- AI model prompts
- File operations

---

## Key Takeaways

✅ **Database** = Structured data, exact queries, CRUD operations

✅ **Datalake** = Unstructured content, semantic search, AI context

✅ **Memory.md** = Persistent AI knowledge, always-remember context

✅ **SQLite** = File-based database, perfect for local apps

✅ **Vector Store** = Converts text to numbers for similarity search

✅ **Input Validation** = All inputs sanitized before storage or AI

✅ **Context Composition** = Database + Datalake + Memory = Complete context

---

## Next Steps

In the next chapter, you'll learn:
- How the project structure is organized
- Where to find specific features
- How pages and API routes connect
- How to navigate the codebase

---

**Next: Chapter 7 - Understanding the Project Structure**