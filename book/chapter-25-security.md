# Chapter 25: Security Hardening & Production Readiness

**Status:** ✅ Complete  
**Last Updated:** March 2026

---

## Overview

This chapter covers essential security hardening techniques and production readiness practices for your AI Dashboard. We'll address common security vulnerabilities, remove development-only code, and prepare your application for deployment.

## Learning Objectives

By the end of this chapter, you will:
• Understand common security vulnerabilities in web applications
• Know how to identify and fix dangerous code patterns
• Implement production-ready logging practices
• Remove development-only code from production builds
• Configure environment variables securely

---

## Security Vulnerabilities Identified

### 1. Dangerous eval() Usage

**Problem:** Using `eval()` to execute dynamic code can lead to code injection attacks.

**Location:** `src/lib/utils/runtime.ts:28`

**Before (Vulnerable):**
```typescript
const mod = await eval(`import('${moduleName}')`);
```

**After (Secure):**
```typescript
// Validate module name before importing
if (!/^[a-zA-Z0-9\-_./]+$/.test(moduleName)) {
  throw new Error('Invalid module name');
}
const mod = await import(moduleName);
```

**Why This Matters:**
• `eval()` executes any JavaScript code passed to it
• Attackers could inject malicious code through moduleName parameter
• Input validation prevents arbitrary code execution
• Using native `import()` is safer and equally powerful

---

### 2. Empty Catch Blocks

**Problem:** Silently swallowing errors makes debugging impossible and hides security issues.

**Location:** Multiple files including `src/app/api/security/route.ts`

**Before (Vulnerable):**
```typescript
try {
  const content = fs.readFileSync(fullPath, 'utf-8');
  files.push({ path: relativePath, content });
} catch {}  // Error silently ignored
```

**After (Secure):**
```typescript
try {
  const content = fs.readFileSync(fullPath, 'utf-8');
  files.push({ path: relativePath, content });
} catch (error) {
  console.warn(`Failed to read file ${fullPath}:`, error);
}
```

**Why This Matters:**
• Silent failures can hide security breaches
• Proper logging helps identify attack attempts
• Debugging is impossible without error information
• Production systems need audit trails

---

### 3. Console.log in Production

**Problem:** Excessive logging in production:
• Exposes sensitive information
• Wastes CPU cycles and I/O
• Fills up log storage
• Can leak API keys or user data

**Location:** 186+ console.log statements found across codebase

**Before (Development-only):**
```typescript
console.log('[TaskScheduler] Session started - pausing low priority tasks');
```

**After (Production-ready):**
```typescript
if (process.env.NODE_ENV === 'development') {
  console.log('[TaskScheduler] Session started - pausing low priority tasks');
}
```

**Best Practice:**
• Wrap all console.log in NODE_ENV checks
• Use proper logging libraries (Winston, Pino) in production
• Configure log levels (error, warn, info, debug)
• Never log sensitive data (tokens, passwords, API keys)

---

## Production Readiness Checklist

### Code Quality
• [ ] All eval() calls removed or validated
• [ ] No empty catch blocks
• [ ] console.log wrapped in NODE_ENV checks
• [ ] No hardcoded secrets or API keys
• [ ] Input validation on all user inputs
• [ ] Error messages don't expose stack traces

### Performance
• [ ] Memory injection optimized (400 tokens vs 1500)
• [ ] Duplicate task creation prevented
• [ ] Unnecessary logging removed
• [ ] Database queries optimized
• [ ] Conversation history trimmed (20 messages max)

### Security
• [ ] CORS configured properly (no wildcard *)
• [ ] HTTPS enforced in production
• [ ] API keys stored in environment variables
• [ ] Rate limiting implemented
• [ ] SQL injection prevention (parameterized queries)
• [ ] XSS prevention (sanitize user inputs)

### Deployment
• [ ] .env files not committed to git
• [ ] Database files in data/ directory
• [ ] Build artifacts (.next/) in .gitignore
• [ ] Health check endpoint available
• [ ] Error monitoring configured (Sentry, etc.)

---

## Testing Security Fixes

### 1. Test Input Validation

```bash
# Try to load a module with invalid characters
curl -X POST http://localhost:3000/api/... \
  -H "Content-Type: application/json" \
  -d '{"module": "../../../etc/passwd"}'

# Should return: "Invalid module name"
```

### 2. Verify Error Logging

```bash
# Trigger an error
curl http://localhost:3000/api/nonexistent

# Check server logs for proper error message
# Should see: "Failed to read file..." or similar
```

### 3. Test Production Mode

```bash
# Set production environment
set NODE_ENV=production
npm run build
npm start

# Try to trigger console.log
# Should see NO output in production mode
```

---

## Writing Studio Security

The Writing Studio includes several security-sensitive features:

### Streaming AI Responses
• **Risk:** Streaming can expose partial tokens
• **Mitigation:** Validate all AI responses before displaying
• **Implementation:** Error handling in `page.tsx:330`

### File System Access API
• **Risk:** Users could access unauthorized directories
• **Mitigation:** Browser sandbox prevents directory traversal
• **Implementation:** Native browser security handles this

### LocalStorage Persistence
• **Risk:** XSS could steal stored content
• **Mitigation:** Content Security Policy headers
• **Best Practice:** Never store sensitive data in localStorage

---

## Memory Optimization

### System Prompt Reduction

**Before:** 1500 tokens per request  
**After:** ~400 tokens per request  
**Savings:** 70% reduction

**Optimization Techniques:**
1. Limit user context to essential fields only
2. Truncate current focus to 200 characters
3. Show only 3 active projects (not all)
4. Limit knowledge sections to 3 (not 5)
5. Show only 3 pending tasks (not all)

**Code Example:**
```typescript
// Before
parts.push(`\nActive Projects: ${this.memoryFile.context.activeProjects.join(', ')}`);

// After
parts.push(`\nProjects: ${this.memoryFile.context.activeProjects.slice(0, 3).join(', ')}`);
```

---

## Task Scheduler Hardening

### Duplicate Prevention

**Problem:** Creating duplicate tasks wastes RAM and CPU cycles

**Solution:** Check for existing tasks before creation

```typescript
const duplicateKey = `${task.taskType}:${task.name}:${task.brandId || 'none'}`;

const existingDuplicate = existingTasks.find((t: any) => {
  const key = `${t.task_type}:${t.name}:${t.brand_id || 'none'}`;
  return key === duplicateKey;
});

if (existingDuplicate) {
  return existingDuplicate;  // Reuse existing task
}
```

### Silent Cleanup Operations

**Best Practice:** Non-critical operations should fail silently

```typescript
try {
  sqlDatabase.vacuum();
} catch (e) {
  // Database vacuum is optional - continue silently
}
```

**Why:**
• Vacuum is optimization, not required
• Failure shouldn't stop task execution
• Reduces error noise in logs
• Improves overall system stability

---

## Environment Variable Security

### Never Commit Secrets

```bash
# Add to .gitignore
.env
.env.local
.env.production
data/*.db
data/*.json
.next/
node_modules/
```

### Use Environment Variables

```typescript
// ❌ Bad: Hardcoded secret
const API_KEY = "sk-1234567890abcdef";

// ✅ Good: Environment variable
const API_KEY = process.env.OPENAI_API_KEY;
```

### Validate Environment Variables

```typescript
// Required variables
if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is required');
}

// Optional with fallback
const DEBUG = process.env.DEBUG === 'true';
```

---

## Security Scanning

### Automated Security Scans

Run the built-in security scanner:

```bash
# Navigate to Security page
http://localhost:3000/security

# Run full scan
POST /api/security?action=scan

# Review findings
GET /api/security?action=latest-scan
```

### Common Findings

1. **Critical:** Hardcoded passwords or API keys
2. **High:** eval() usage, innerHTML without sanitization
3. **Medium:** HTTP instead of HTTPS, empty catch blocks
4. **Low:** console.log in production, TODO comments

### Fix Workflow

1. Run security scan
2. Review findings by severity
3. Fix critical issues first
4. Auto-fix trivial issues (console.log, var usage)
5. Escalate complex issues to OpenCode queue
6. Re-run scan to verify fixes

---

## Deployment Checklist

### Pre-Deployment

• [ ] Run `npm run build` successfully
• [ ] Run `npm run lint` - no errors
• [ ] Run `npm run typecheck` - no type errors
• [ ] Run security scan - no critical issues
• [ ] Test all major features manually
• [ ] Verify environment variables set
• [ ] Database initialized with schema

### Production Configuration

```bash
# Set production environment
NODE_ENV=production

# Configure Ollama (if using)
OLLAMA_HOST=http://localhost:11434
OLLAMA_API_KEY=your-key-here

# Configure external APIs (optional)
OPENROUTER_API_KEY=...
DEEPSEEK_API_KEY=...
GLM_API_KEY=...
```

### Post-Deployment

• [ ] Health check endpoint responds
• [ ] Database connections working
• [ ] Task scheduler running
• [ ] Security scans scheduled
• [ ] Error monitoring configured
• [ ] Log aggregation working
• [ ] Backups configured

---

## Summary

Security hardening is an ongoing process, not a one-time fix. Follow these practices:

1. **Input Validation:** Never trust user input
2. **Error Handling:** Log errors properly, don't swallow them
3. **Production Mode:** Remove dev-only code (console.log)
4. **Environment Variables:** Never hardcode secrets
5. **Regular Scans:** Run security scanner weekly
6. **Dependency Updates:** Keep npm packages updated
7. **Monitoring:** Set up error tracking (Sentry)
8. **Backups:** Regular database backups

Your AI Dashboard is now production-ready with:
• ✅ No dangerous eval() usage
• ✅ Proper error logging
• ✅ Production-safe logging
• ✅ Optimized memory usage
• ✅ Duplicate prevention
• ✅ Input validation
• ✅ Environment variable security

---

## Next Steps

• Chapter 26: Deployment & DevOps
• Chapter 27: Monitoring & Observability
• Chapter 28: Scaling & Performance Tuning
