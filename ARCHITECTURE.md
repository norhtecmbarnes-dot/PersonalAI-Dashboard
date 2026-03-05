# Plugin System Architecture

## Overview

The AI Assistant supports two types of features:

### Core Features (Out-of-Box)
Always available, documented in main project:
- Brand Workspace (NotebookLM-style)
- Tool Efficiency & Self-Improvement
- Documents & Notes
- Calendar
- Main Chat (multi-model)

### Personal Plugins (Optional)
User-specific extensions, loaded dynamically:
- Book Writer - Document the AI Assistant project
- SAM.gov Integration - Government contracts
- Custom integrations

---

## Plugin Structure

```
plugins/
├── book-writer/
│   ├── plugin.json        # Plugin manifest
│   ├── index.ts           # Plugin entry point
│   ├── api/
│   │   └── route.ts       # Plugin API routes
│   └── page.tsx           # Plugin UI
├── sam-gov/
│   ├── plugin.json
│   ├── index.ts
│   └── ...
└── plugin-loader.ts       # Plugin discovery and loading
```

---

## Plugin Manifest (plugin.json)

```json
{
  "id": "book-writer",
  "name": "Book Writer",
  "version": "1.0.0",
  "description": "Generate AI Assistant documentation as a Creative Commons book",
  "author": "Michael C. Barnes",
  "license": "CC-BY-SA-4.0",
  "type": "personal",
  "requires": ["chat", "documents"],
  "routes": [
    { "path": "/book-writer", "component": "page.tsx" },
    { "path": "/api/book-writer", "handler": "api/route.ts" }
  ],
  "config": {
    "bookTitle": "Building Your Own AI Research Assistant",
    "license": "Creative Commons BY-SA 4.0",
    "author": "Michael C. Barnes"
  }
}
```

---

## Registering a Plugin

Add to `src/config/plugins.ts`:

```typescript
export const PLUGINS = {
  'book-writer': {
    enabled: true,
    personal: true,  // Not "out-of-box"
    name: 'Book Writer',
    route: '/book-writer',
    description: 'Generate documentation as a CC-licensed book',
  },
  'sam-gov': {
    enabled: true,
    personal: true,
    name: 'SAM.gov Integration',
    route: '/sam',
    description: 'Government contract opportunities',
  },
};
```

---

## Personal vs Core Features

| Type | Location | Documentation | User Control |
|------|----------|---------------|--------------|
| Core | `src/app/`, `src/lib/` | In main README | Always on |
| Personal | `src/plugins/` | Plugin README | Enable/disable |

---

## Book Writer Plugin Purpose

The Book Writer is designed to:

1. **Document this Project**
   - Read project source files
   - Analyze architecture and patterns
   - Generate educational content

2. **Create a Beginner's Guide**
   - Take novices from zero to building their own AI Assistant
   - Explain each component in plain language
   - Include code examples and explanations

3. **Publish Under Creative Commons**
   - CC BY-SA 4.0 license
   - Free to share and adapt
   - Attribution required

---

## Current Status

- [x] Plugin architecture designed
- [ ] Plugin loader implemented
- [ ] Book Writer refactored as plugin
- [ ] SAM.gov moved to plugin
- [ ] Plugin enable/disable UI