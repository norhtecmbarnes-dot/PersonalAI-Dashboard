# Bug Fix: SAM.gov and Documents Not Persisting

## Problem
When entering search criteria in SAM.gov or uploading documents, nothing was remembered after page refresh.

## Root Cause
Both SAM.gov and documents used `localStorage` for storage:
- `localStorage` is **client-side only**
- API routes run on the **server**
- Each request created a fresh instance with no access to client data
- Data stored in localStorage never reached the server

## Solution
Moved all data storage to SQLite database where it persists properly.

### Database Tables Added

#### SAM.gov Tables
```sql
CREATE TABLE sam_searches (
  id TEXT PRIMARY KEY,
  keywords TEXT NOT NULL,
  filters TEXT,
  status TEXT DEFAULT 'active',
  results_count INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  last_run INTEGER
);

CREATE TABLE sam_opportunities (
  id TEXT PRIMARY KEY,
  search_id TEXT,
  title TEXT NOT NULL,
  synopsis TEXT,
  solicitation_number TEXT,
  posted_date TEXT,
  response_deadline TEXT,
  award_amount TEXT,
  naics_code TEXT,
  classification_code TEXT,
  agency TEXT,
  office TEXT,
  location TEXT,
  url TEXT,
  keywords TEXT,
  matched_keywords TEXT,
  captured_at INTEGER NOT NULL
);

CREATE TABLE sam_api_keys (
  key TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  last_used INTEGER
);
```

#### Documents Table
```sql
CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  type TEXT DEFAULT 'text',
  category TEXT,
  tags TEXT,
  metadata TEXT,
  size INTEGER DEFAULT 0,
  vectorized INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

### Changed Files
- `src/lib/database/sqlite.ts` - Added tables and methods
- `src/lib/integrations/sam-gov.ts` - Replaced localStorage with SQLite
- `src/lib/storage/documents.ts` - Made async, uses SQLite
- `src/lib/storage/knowledge.ts` - Updated for async document methods
- `src/app/api/documents/route.ts` - Using async methods
- `src/app/api/brand-chat/route.ts` - Using async document methods
- `src/app/api/memory/route.ts` - Using async document methods
- `src/components/DocumentManager.tsx` - Using async document methods

### Methods Added to SQLDatabase Class

**SAM Methods:**
- `addSAMSearch()`, `getSAMSearches()`, `updateSAMSearch()`, `deleteSAMSearch()`
- `addSAMOpportunity()`, `getSAMOpportunities()`, `clearSAMOpportunities()`
- `addSAMApiKey()`, `getSAMApiKeys()`, `getActiveSAMApiKey()`, `deleteSAMApiKey()`

**Document Methods:**
- `addDocument()`, `getDocuments()`, `getDocumentById()`, `updateDocument()`, `deleteDocument()`, `searchDocuments()`

## Result
- SAM.gov searches persist across page refreshes
- Documents uploaded on home page persist
- API keys are managed server-side
- All data stored in `data/assistant.db` SQLite database