# Bug Fix Documentation

## Issue: Setup Page Redirect Loop

### Problem
After entering user name and assistant name in the setup page and clicking "Get Started", the system would redirect back to the setup page instead of going to the main chat page.

### Root Cause (UPDATED)
**Database table mismatch** - not a race condition as initially thought. 

The API was:
- **Saving** preferences to the `documents` table using `sqlDatabase.addDocument()`
- **Reading** preferences from the `notes` table using `sqlDatabase.getNotes('user_preference')`

This table mismatch meant:
1. User preferences were written to `documents` table
2. Preferences were read from `notes` table (which was empty)
3. `hasCompletedSetup` always returned `false`
4. Infinite redirect loop between `/setup` and `/`

### Files Modified

**src/app/api/user/route.ts** (lines 42-58)

Changed from:
```typescript
async function savePreferences(prefs: UserPrefs): Promise<void> {
  await sqlDatabase.initialize();
  
  const notes = sqlDatabase.getNotes('user_preference');
  const content = JSON.stringify(prefs);
  
  if (notes && notes.length > 0) {
    sqlDatabase.updateDocument(notes[0].id, { content });  // WRONG TABLE
  } else {
    sqlDatabase.addDocument({                              // WRONG TABLE
      title: 'User Preferences',
      content,
      category: 'user_preference',
      tags: ['config', 'user'],
    });
  }
}
```

To:
```typescript
async function savePreferences(prefs: UserPrefs): Promise<void> {
  await sqlDatabase.initialize();
  
  const notes = sqlDatabase.getNotes('user_preference');
  const content = JSON.stringify(prefs);
  
  if (notes && notes.length > 0) {
    sqlDatabase.updateNote(notes[0].id, { content });  // CORRECT TABLE
  } else {
    sqlDatabase.addNote({                               // CORRECT TABLE
      title: 'User Preferences',
      content,
      category: 'user_preference',
      tags: ['config', 'user'],
    });
  }
}
```

### Technical Details

The codebase has two different document storage systems:
- `documents` table - used by `addDocument()`, `getDocumentById()`, `updateDocument()`
- `notes` table - used by `addNote()`, `getNotes()`, `updateNote()`

The user preferences were being saved to one table but retrieved from another. This was likely introduced during refactoring when `addDocument` was mistakenly used instead of `addNote`.

### Solution Applied

**Changed method calls:**
- `addDocument()` → `addNote()`
- `updateDocument()` → `updateNote()`

Both operations now correctly use the `notes` table, matching the `getNotes('user_preference')` read operation.

### Testing
To test this fix:
1. Delete database: `data/assistant.db`
2. Clear browser storage
3. Visit the application
4. Complete setup form
5. Should redirect to `/` (chat page) and display personalized greeting
6. Refresh page - should stay on `/` (not redirect back to `/setup`)

### Related Systems
- User preferences storage (SQLite `notes` table)
- Setup flow
- Authentication/gatekeeping logic

### Status
✓ **FIXED** - 2025-02-28

### Lessons Learned
1. Always ensure read/write operations use the same data source
2. Consider creating a dedicated preferences service to avoid confusion between storage tables
3. Add integration tests that verify data persistence across operations