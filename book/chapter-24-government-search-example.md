# Example Plugin: Government Search

This chapter demonstrates how to add a custom data source integration to your AI Dashboard. The Government Search feature is a personal example - you can use the same pattern to integrate your own data sources.

## What You'll Learn

- How to structure a new integration
- Where to add API endpoints
- How to create UI pages
- How to persist data locally
- Security considerations

## Overview: What Was Added

```
New Files Created:
src/
├── app/
│   ├── gov-search/
│   │   └── page.tsx              # Government Search UI
│   └── api/
│       ├── sam/
│       │   └── route.ts          # SAM.gov API
│       ├── usaspending/
│       │   └── route.ts          # USASpending.gov API
│       └── sam-searches/
│           └── route.ts          # Search history
├── lib/
│   └── services/
│       └── sam-gov.ts            # SAM.gov service
└── components/
    └── TopNav.tsx                # Navigation update
```

## Integration Pattern

### Step 1: Create the Service Class

**File:** `src/lib/services/sam-gov.ts`

```typescript
import { sqlDatabase } from '@/lib/database/sqlite';

export interface SAMOpportunity {
  id: string;
  title: string;
  synopsis?: string;
  solicitationNumber: string;
  // ... more fields
}

export class SamGovService {
  private static instance: SamGovService;
  private apiKey: string | null = null;
  private baseUrl = 'https://api.sam.gov/opportunities/v2/search';

  private constructor() {}

  static getInstance(): SamGovService {
    if (!SamGovService.instance) {
      SamGovService.instance = new SamGovService();
    }
    return SamGovService.instance;
  }

  async initialize(): Promise<void> {
    await sqlDatabase.initialize();
    this.apiKey = sqlDatabase.getApiKey('sam');  // Key from local DB!
  }

  async search(params: SAMSearchParams): Promise<{
    success: boolean;
    count: number;
    opportunities: SAMOpportunity[];
  }> {
    if (!this.apiKey) {
      throw new Error('SAM.gov API key not configured');
    }

    // Fetch from SAM.gov API
    const response = await fetch(`${this.baseUrl}?api_key=${this.apiKey}&...`);
    
    // Store results locally for history
    sqlDatabase.addSAMSearch(searchId, [keyword], { limit, offset });
    
    return { success: true, count: opportunities.length, opportunities };
  }
}

export const samGovService = SamGovService.getInstance();
```

### Key Points

1. **Singleton pattern** - One instance, shared across the app
2. **API key from database** - Never hardcoded, never exposed
3. **Local persistence** - Search history stored in SQLite
4. **Error handling** - Clear error if key not configured

### Step 2: Create the API Endpoint

**File:** `src/app/api/sam/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { sqlDatabase } from '@/lib/database/sqlite';
import { sanitizeString } from '@/lib/utils/validation';

export async function GET(request: NextRequest) {
  try {
    sqlDatabase.initialize();  // Note: synchronous now
    
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword');
    
    if (!keyword) {
      return NextResponse.json({ error: 'Keyword is required' }, { status: 400 });
    }
    
    // Get API key from database (local only!)
    const apiKey = sqlDatabase.getApiKey('sam');
    if (!apiKey) {
      return NextResponse.json({ error: 'SAM.gov API key not configured' }, { status: 400 });
    }
    
    // Fetch from SAM.gov
    const response = await fetch(`https://api.sam.gov/opportunities/v2/search?api_key=${apiKey}&title=${keyword}`);
    const data = await response.json();
    
    // Store search locally
    const searchId = `search_${Date.now()}`;
    sqlDatabase.addSAMSearch(searchId, [keyword], { /* params */ });
    
    return NextResponse.json({ 
      success: true, 
      opportunities: data.opportunitiesData || [] 
    });
  } catch (error) {
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
```

### Step 3: Create the UI Page

**File:** `src/app/gov-search/page.tsx`

```typescript
'use client';

import { useState } from 'react';

export default function GovSearchPage() {
  const [samResults, setSamResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [samApiKeyConfigured, setSamApiKeyConfigured] = useState(false);

  // Check if API key is configured
  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        const samKey = data.apiKeys.find((k: any) => k.provider === 'sam');
        setSamApiKeyConfigured(samKey?.hasKey || false);
      });
  }, []);

  const searchSAM = async () => {
    setLoading(true);
    const response = await fetch(`/api/sam?keyword=${query}`);
    const data = await response.json();
    setSamResults(data.opportunities || []);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      {/* UI components */}
      {!samApiKeyConfigured && (
        <div className="bg-amber-900/30 border border-amber-500/50 rounded-lg p-4 mb-6">
          <p className="text-amber-300">
            SAM.gov API key required. Add it in <a href="/settings">Settings</a>.
          </p>
        </div>
      )}
      {/* Search form and results */}
    </div>
  );
}
```

### Step 4: Add Navigation

**File:** `src/components/TopNav.tsx`

```typescript
// Add your page link
<NavLink href="/gov-search">Gov Search</NavLink>
```

## Database Schema

The SQLite database already includes tables for SAM opportunities:

```sql
-- Created automatically in src/lib/database/sqlite.ts
CREATE TABLE IF NOT EXISTS sam_opportunities (
  id TEXT PRIMARY KEY,
  search_id TEXT,
  title TEXT,
  synopsis TEXT,
  solicitation_number TEXT,
  posted_date TEXT,
  response_deadline TEXT,
  award_amount TEXT,
  naics_code TEXT,
  agency TEXT,
  url TEXT,
  keywords TEXT,
  captured_at INTEGER
);

CREATE TABLE IF NOT EXISTS sam_searches (
  id TEXT PRIMARY KEY,
  keywords TEXT,
  params TEXT,
  results_count INTEGER,
  last_run INTEGER
);
```

## Adding Your Own Integration

### Template for New Data Source

1. **Create service:** `src/lib/services/my-source.ts`

```typescript
import { sqlDatabase } from '@/lib/database/sqlite';

export class MySourceService {
  private static instance: MySourceService;
  private apiKey: string | null = null;
  
  private constructor() {}
  
  static getInstance(): MySourceService {
    if (!MySourceService.instance) {
      MySourceService.instance = new MySourceService();
    }
    return MySourceService.instance;
  }
  
  async initialize(): Promise<void> {
    sqlDatabase.initialize();
    this.apiKey = sqlDatabase.getApiKey('my_source');
  }
  
  async fetchData(query: string): Promise<any> {
    if (!this.apiKey) {
      throw new Error('MySource API key not configured');
    }
    
    // Fetch from your API
    const response = await fetch(`https://api.mysource.com/search?key=${this.apiKey}&q=${query}`);
    return response.json();
  }
}
```

2. **Create API route:** `src/app/api/my-source/route.ts`

3. **Create UI page:** `src/app/my-source/page.tsx`

4. **Add to database schema** (if needed) in `src/lib/database/sqlite.ts`

5. **Register API key provider** in `getAllApiKeys()`:

```typescript
const providers = [
  // ... existing providers
  'my_source'  // Add your provider
];
```

6. **Add to Settings UI** in `src/app/settings/page.tsx`:

```typescript
{ id: 'my_source', name: 'My Source', desc: 'Description of your integration', category: 'Custom' }
```

## Security Best Practices for Integrations

### DO:

```typescript
// ✅ Get API key from database
const apiKey = sqlDatabase.getApiKey('my_provider');

// ✅ Sanitize user input
const safeQuery = sanitizeString(query);

// ✅ Use HTTPS for API calls
const response = await fetch(`https://api.example.com/search?key=${apiKey}`);

// ✅ Store results locally (optional)
sqlDatabase.addSearchHistory(searchId, [safeQuery], results);

// ✅ Handle errors gracefully
return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
```

### DON'T:

```typescript
// ❌ Never hardcode API keys
const apiKey = 'sk-12345abcdef';

// ❌ Never expose keys to frontend
return NextResponse.json({ apiKey: someKey });  // NEVER!

// ❌ Never use unsanitized input in API calls
fetch(`https://api.example.com?q=${userInput}`);  // Injection risk!

// ❌ Never skip error handling
fetch(url).then(res => res.json());  // What if it fails?
```

## Configuration

### Adding a New API Key Provider

1. Edit `src/lib/database/sqlite.ts`:

```typescript
getAllApiKeys(): { provider: string; hasKey: boolean }[] {
  const providers = [
    'ollama', 'openrouter', 'tavily', 'brave', 'serpapi',
    'glm', 'deepseek', 'sam', 'openai', 'anthropic', 'gemini',
    'groq', 'mistral',
    'your_new_provider'  // <-- Add here
  ];
  return providers.map(provider => ({
    provider,
    hasKey: !!this.getApiKey(provider),
  }));
}
```

2. Use it in your code:

```typescript
const key = sqlDatabase.getApiKey('your_new_provider');
```

### Setting API Keys

**Programmatically:**

```typescript
await fetch('/api/settings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    provider: 'your_provider', 
    value: 'your-api-key' 
  })
});
```

**From UI:**

Users add keys in Settings → API Keys section.

## Where Data Lives

All integration data is stored locally:

```
data/
└── assistant.db
    ├── settings              # API keys (api_key_*)
    ├── sam_searches          # Search history
    ├── sam_opportunities     # Opportunity cache
    └── [your tables]         # Your custom data
```

**This data is:**
- ✅ Stored locally on your machine
- ✅ Never uploaded to any cloud
- ✅ Excluded from git (in `.gitignore`)
- ✅ Under your full control

## Summary

The Government Search example demonstrates:

| Pattern | Location | Purpose |
|---------|----------|---------|
| Singleton service | `src/lib/services/` | Centralized API logic |
| API key storage | SQLite `settings` table | Secure, local-only storage |
| API route | `src/app/api/[name]/route.ts` | Backend endpoint |
| UI page | `src/app/[name]/page.tsx` | User interface |
| Navigation | `TopNav.tsx` | Access to feature |

Follow this pattern to add your own integrations!