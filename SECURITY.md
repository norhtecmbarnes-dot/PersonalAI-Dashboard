# Security & Data Privacy

## API Key Storage

**All API keys and sensitive data are stored LOCALLY and never uploaded to any cloud service.**

### Storage Location
- Database: `data/assistant.db` (SQLite)
- Environment: `.env.local`
- User Preferences: `data/user-preferences.json`

### What's Protected
1. **API Keys** - Stored in local SQLite database (`settings` table)
   - Ollama API key
   - OpenAI API key
   - Anthropic API key
   - Gemini API key
   - Tavily API key
   - Brave Search API key
   - SerpAPI key
   - SAM.gov API key
   - All other provider keys

2. **User Data** - All stored locally
   - Chat history
   - Documents
   - Brand information
   - Research data
   - Calendar/events
   - Tasks and notes

### Git Exclusions (`.gitignore`)
The following are EXCLUDED from version control:
```
data/                  # All local database and user data
*.db                   # Database files
.env                   # Environment files
.env.local             # Local environment with secrets
*.pem, *.key           # Certificate/key files
secrets.json           # Secrets file
session-*.md           # Session logs (may contain sensitive data)
```

### Network Requests
This application makes outbound requests ONLY when:
1. **You enable search mode** and send a query - calls Ollama/Tavily/Brave/SerpAPI
2. **You configure an AI model** - calls Ollama/OpenAI/Anthropic/Gemini APIs
3. **You use government search** - calls SAM.gov or USASpending.gov APIs

**No data is ever sent anywhere without your explicit action.**

### Running Offline
This application can run 100% offline when using local Ollama models:
- All data stays on your machine
- No cloud telemetry
- No analytics
- No automatic updates

### Best Practices
1. **Never commit `.env.local`** - It contains your API keys
2. **Back up `data/` folder** - Use local backup, not cloud sync
3. **Rotate compromised keys** - If keys leak, regenerate immediately
4. **Use environment variables** - For production, use secrets management

### Database Schema
API keys are stored in the `settings` table:
```sql
SELECT * FROM settings WHERE key LIKE 'api_key_%';
-- Returns: api_key_ollama, api_key_openai, etc.
```

Keys are stored as plain text (encrypt the database for additional security).

### Security Checklist
- [x] Local SQLite database (no cloud database)
- [x] `.gitignore` excludes all data files
- [x] No third-party analytics
- [x] No telemetry
- [x] No automatic cloud sync
- [x] Environment files excluded from git
- [x] No hardcoded API keys in source code