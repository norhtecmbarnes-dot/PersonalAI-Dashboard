# Chat History Feature - February 2026

## Overview

The chat history feature automatically compacts conversations into markdown format and stores them in the database for easy search and retrieval.

---

## Implementation

### Database Schema

**Table: `chat_history`**

```sql
CREATE TABLE chat_history (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT,
  markdown_content TEXT NOT NULL,
  messages TEXT,                    -- JSON array of messages
  model TEXT,
  expert TEXT,
  tags TEXT,                        -- JSON array
  word_count INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
)
```

### API Endpoints

**`GET /api/chat-history`**
- `action=list` (default) - List all chats
- `action=recent&limit=N` - Get N most recent chats
- `action=get&id=xxx` - Get specific chat by ID
- `action=search&query=xxx` - Search chat content

**`POST /api/chat-history`**
- `action=save` - Save chat to history
  - Body: `{ action: 'save', messages: [...], model, expert, tags }`
- `action=delete` - Delete chat
  - Body: `{ action: 'delete', id: 'xxx' }`

### Methods Added to SQLite

| Method | Description |
|--------|-------------|
| `saveChatHistory(chat)` | Save/compact chat with auto-generated markdown |
| `getChatHistory(id?)` | Get all chats or specific chat by ID |
| `getRecentChatHistory(limit)` | Get most recent chats |
| `searchChatHistory(query)` | Full-text search in markdown content |
| `deleteChatHistory(id)` | Delete a chat record |

### Markdown Compaction

Messages are converted to markdown format:

```markdown
# Chat Session

**Date:** 2026-02-28T12:00:00.000Z

### 👤 User (10:30 AM)

Tell me about quantum computing

---

### 🤖 Assistant

Quantum computing uses quantum bits (qubits)...

---
```

### UI Features

1. **History Panel** - Clock icon toggle shows:
   - Current session messages
   - Saved conversations list
   - "Save Chat" button

2. **Auto-save** - Can be triggered manually with "Save Chat" button

3. **Search** - Full-text search across all saved chats

4. **Load** - Click on saved chat to restore messages

---

## Usage

### Save Current Chat
```typescript
await fetch('/api/chat-history', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'save',
    messages: messages,
    model: selectedModel,
    expert: selectedExpert?.id,
  }),
});
```

### Search History
```typescript
const response = await fetch('/api/chat-history?action=search&query=quantum');
const { results } = await response.json();
```

### Load Saved Chat
```typescript
const response = await fetch('/api/chat-history?action=get&id=chat-id');
const { chat } = await response.json();
setMessages(chat.messages);
```

---

## Files Modified

| File | Changes |
|------|---------|
| `src/lib/database/sqlite.ts` | Added `chat_history` table and methods |
| `src/app/api/chat-history/route.ts` | New API endpoint |
| `src/app/page.tsx` | Added save/load UI in history panel |

---

## Future Improvements

1. Auto-save on conversation end
2. Auto-title generation from content
3. Auto-tagging by topic
4. Export to PDF/DOCX
5. Merge multiple chats
6. AI-powered chat summarization