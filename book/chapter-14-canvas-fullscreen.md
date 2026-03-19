# Chapter 14: Builder - Visual Components and Database Forms

## What You'll Learn in This Chapter

• **Builder overview** - Combining Canvas and Forms into one tool
• **Visual Builder** - AI-generated UI components (Canvas)
• **Database Forms** - Create forms connected to SQLite tables
• **Fullscreen mode** - Better viewing for your creations
• **Device preview** - Mobile, tablet, desktop views

---

## Opening: Why Combine Canvas and Forms?

The Builder combines two powerful features into one unified tool:

1. **Visual Builder** (formerly Canvas) - Generate UI components with AI
2. **Database Forms** - Create forms that insert data into your database

**Why combine them?**
• Forms are just another type of visual component
• Both use the same backend (SQLite tables)
• Shared UI patterns (templates, previews, device modes)
• Simpler navigation for users

---

## The Builder Interface

```
┌─────────────────────────────────────────────────────────────┐
│  Builder                                           [Home]  │
├─────────────────────────────────────────────────────────────┤
│  [🎨 Visual Builder]  [📋 Database Forms]                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────┐  ┌────────────────────────────────┐│
│  │  Controls           │  │  Preview                        ││
│  │  ─────────────────  │  │  ──────────────────────────────  ││
│  │  [AI Toggle]       │  │  ┌────────────────────────────┐  ││
│  │  [Table Binding]   │  │  │                            │  ││
│  │  [Description]     │  │  │   Your Generated UI        │  ││
│  │  [Templates]      │  │  │   (or Form Preview)        │  ││
│  │                    │  │  │                            │  ││
│  └─────────────────────┘  └────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

---

## Visual Builder Tab

The Visual Builder generates UI components from natural language descriptions.

### PROMPT: Create Basic Builder Page

```
Create a new page at src/app/builder/page.tsx that:

1. Has two tabs: "Visual Builder" and "Database Forms"
2. Visual Builder tab:
   - AI toggle for LLM generation
   - Description textarea for UI requests
   - Quick templates (Dashboard, Form, Charts, etc.)
   - Device preview toggle (mobile/tablet/desktop)
   - Fullscreen mode button
   - Preview area that renders generated HTML

3. Use Tailwind CSS with slate/purple theme
4. Import PageModelSelector component for model selection
```

### Available Templates

| Template | Description |
|----------|-------------|
| Landing Page | Complete landing page with hero, features, pricing |
| Dashboard | Metrics cards, charts, data tables |
| Sales Pipeline | CRM deal stages, values, probabilities |
| Contact Form | Name, email, subject, message fields |
| Login Form | Email, password, remember me |
| Data Table | Searchable table with sorting |
| Charts | Bar and line charts for analytics |

---

## Database Forms Tab

Create forms that connect directly to SQLite tables.

### PROMPT: Add Forms Tab to Builder

```
Add a "Database Forms" tab to the Builder page with:

1. List View:
   - Show saved forms (name, table, field count)
   - Show available database tables
   - Buttons: Fill Form, Edit, Delete

2. Create View:
   - Table selector dropdown
   - Auto-generate fields from table schema
   - Field editor (name, type, label, required)
   - Live preview on right side

3. Fill View:
   - Form fields from saved form
   - Submit to /api/database/insert
   - Success/error feedback

The forms should:
• Load tables from /api/database/tables
• Load schemas from /api/database/tables/[name]/schema
• Save forms to /api/database/forms
• Insert data to /api/database/insert
```

### Field Types

| SQL Type | Form Field Type |
|----------|----------------|
| TEXT, VARCHAR | text |
| INTEGER, REAL, NUM | number |
| DATE, DATETIME | date |
| BOOLEAN | checkbox |

---

## Fullscreen Mode

Fullscreen mode expands your preview to fill the entire screen.

### PROMPT: Add Fullscreen Mode

```typescript
// In your Builder component
const [isFullscreen, setIsFullscreen] = useState(false);
const containerRef = useRef<HTMLDivElement>(null);

const toggleFullscreen = () => {
  if (!isFullscreen) {
    if (containerRef.current?.requestFullscreen) {
      containerRef.current.requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(console.error);
    }
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch(console.error);
    }
  }
};

// Listen for fullscreen changes
useEffect(() => {
  const handleChange = () => setIsFullscreen(!!document.fullscreenElement);
  document.addEventListener('fullscreenchange', handleChange);
  return () => document.removeEventListener('fullscreenchange', handleChange);
}, []);

// In JSX
<button onClick={toggleFullscreen}>
  {isFullscreen ? 'Exit Fullscreen' : '⛶ Fullscreen'}
</button>
```

---

## Device Preview

Test your components on different screen sizes.

### PROMPT: Add Device Preview

```
Add device preview buttons to the Builder:

1. Three buttons: [Mobile] [Tablet] [Desktop]
2. Mobile: max-w-sm (centered)
3. Tablet: max-w-2xl (centered)  
4. Desktop: full width

CSS for the preview container:
<div className={`
  bg-white rounded-xl overflow-hidden
  ${previewDevice === 'mobile' ? 'max-w-sm mx-auto' :
    previewDevice === 'tablet' ? 'max-w-2xl mx-auto' : ''}
`} style={{ minHeight: '500px' }}>
  {/* Rendered content */}
</div>
```

---

## Integration with Home Page

The Builder is accessible from the top navigation.

### Navigation Update

```tsx
// In TopNav.tsx
<NavLink href="/builder">Builder</NavLink>

// Remove separate Canvas and Forms links
// - Was: /database/forms
// - Was: /canvas  
// - Now: /builder (combines both)
```

---

## API Endpoints Used

| Endpoint | Purpose |
|----------|---------|
| POST /api/canvas | Generate UI from description |
| GET /api/canvas?action=tables | List database tables |
| GET /api/database/tables | List tables for forms |
| GET /api/database/tables/[name]/schema | Get column info |
| GET /api/database/forms | List saved forms |
| POST /api/database/forms | Save/delete form |
| POST /api/database/insert | Insert form data |

---

## Complete Builder Page

### PROMPT: Full Implementation

```
Create a complete Builder page at src/app/builder/page.tsx that:

1. Exports default BuilderPage component
2. Has tabs: "Visual Builder" | "Database Forms"
3. Visual Builder tab includes:
   - AI Contextualization toggle
   - Database Table binding option
   - Description input
   - Quick templates grid
   - Device preview toggle
   - Fullscreen button
   - Copy HTML button

4. Database Forms tab includes:
   - Form list view
   - Create form view  
   - Fill form view
   - Table selection
   - Auto-generate fields from schema

5. Import PageModelSelector from '@/components/PageModelSelector'
6. Use Tailwind CSS with slate-900 gradient background
7. Make it responsive and user-friendly

8. Remove the old pages:
   - Delete src/app/canvas/page.tsx
   - Delete src/app/database/forms/page.tsx
   - Update navigation in TopNav.tsx
```

---

## Key Takeaways

✅ **Builder** = Visual Builder + Database Forms in one page

✅ **Visual Builder** generates UI from text descriptions using AI

✅ **Database Forms** create data-entry forms connected to SQLite

✅ **Fullscreen Mode** expands preview to entire screen

✅ **Device Preview** tests responsive design

✅ **Tabbed Interface** keeps navigation simple

---

## Next Steps

1. Test Visual Builder with different prompts
2. Create a form from a database table
3. Fill out the form and verify data inserts
4. Try fullscreen mode and device preview

---

**Next: Chapter 15 - Presentations and Styling**
│              YOUR UI (fills entire screen)                   │
│                                                              │
│                                                              │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Why It's Useful

1. **Better Testing**: See how your UI looks at full size
2. **Presentations**: Show work to clients/team
3. **Detail Work**: Notice small design issues
4. **Mobile Testing**: See how it looks on actual device sizes
5. **Focus**: No distractions from other UI elements

---

## How Fullscreen Works (The Technical Part)

### The Fullscreen API

Browsers have a built-in Fullscreen API:

```javascript
// Enter fullscreen
element.requestFullscreen();

// Exit fullscreen
document.exitFullscreen();

// Check if in fullscreen
!!document.fullscreenElement;

// Listen for changes
document.addEventListener('fullscreenchange', handler);
```

### Your Implementation

**File:** `src/app/canvas/page.tsx`

```typescript
// 1. Add state
const [isFullscreen, setIsFullscreen] = useState(false);
const canvasContainerRef = useRef<HTMLDivElement>(null);

// 2. Toggle function
const toggleFullscreen = () => {
  if (!isFullscreen) {
    // Enter fullscreen
    canvasContainerRef.current?.requestFullscreen();
  } else {
    // Exit fullscreen
    document.exitFullscreen();
  }
};

// 3. Listen for changes
useEffect(() => {
  const handleFullscreenChange = () => {
    setIsFullscreen(!!document.fullscreenElement);
  };
  
  document.addEventListener('fullscreenchange', handleFullscreenChange);
  return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
}, []);
```

### The Smart Part: Dynamic Height

In fullscreen, your iframe needs to resize:

```typescript
<iframe
  srcDoc={html}
  className={`w-full bg-white ${
    isFullscreen 
      ? 'h-[calc(100vh-120px)]'  // Full height minus header
      : previewDevice === 'mobile' 
        ? 'h-[667px]' 
        : 'h-96'  // Normal height
  }`}
/>
```

**What this means:**
• Normal mode: Fixed height (h-96 = 24rem)
• Fullscreen mode: Takes up all available space minus the header

---

## Device Preview Modes

Even in fullscreen, you can test different device sizes:

### The Three Modes

| Mode | Width | Height | Use Case |
|------|-------|--------|----------|
| Mobile | 375px | 667px | Phone screens |
| Tablet | 768px | 1024px | iPad/tablets |
| Desktop | 100% | 100% | Full computer |

### How It Works

```typescript
const [previewDevice, setPreviewDevice] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

// The container changes size based on selection
<div className={`
  ${previewDevice === 'mobile' ? 'w-[375px]' : ''}
  ${previewDevice === 'tablet' ? 'w-[768px]' : ''}
  ${previewDevice === 'desktop' ? 'w-full' : ''}
`}>
  <iframe ... />
</div>
```

### Visual Frame

In device modes (mobile/tablet), the preview gets a device frame:

```typescript
<iframe
  className={`
    ${previewDevice === 'mobile' 
      ? 'rounded-[30px] border-4 border-slate-800'  // iPhone frame
      : ''}
    ${previewDevice === 'tablet' 
      ? 'rounded-[20px] border-4 border-slate-800'  // iPad frame
      : ''}
  `}
  style={{
    boxShadow: previewDevice !== 'desktop' 
      ? '0 0 50px rgba(0,0,0,0.5)'  // Device shadow
      : 'none'
  }}
/>
```

---

## The User Interface

### Fullscreen Toggle Button

```typescript
<button
  onClick={toggleFullscreen}
  className="px-3 py-1 bg-slate-600 text-white rounded hover:bg-slate-500"
>
  {isFullscreen ? (
    <>⤓ Exit</>
  ) : (
    <>⛶ Fullscreen</>
  )}
</button>
```

### Smart Device Toggle Hiding

In fullscreen, device toggles are hidden to maximize space:

```typescript
{!isFullscreen && (
  <div className="device-toggle">
    <button>📱 Mobile</button>
    <button>📱 Tablet</button>
    <button>💻 Desktop</button>
  </div>
)}
```

---

## PROMPT YOU CAN USE

### Prompt 1: Add Fullscreen to Any Component

**Where to use:** Any React component

```typescript
import { useState, useRef, useEffect } from 'react';

function MyComponent() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  return (
    <div ref={containerRef}>
      <button onClick={toggleFullscreen}>
        {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
      </button>
      {/* Your content */}
    </div>
  );
}
```

### Prompt 2: Keyboard Shortcut for Fullscreen

**Where to use:** Add to canvas page

```typescript
useEffect(() => {
  const handleKeyPress = (e: KeyboardEvent) => {
    // Press 'F' for fullscreen
    if (e.key === 'f' && !e.ctrlKey && !e.metaKey) {
      toggleFullscreen();
    }
  };
  
  window.addEventListener('keydown', handleKeyPress);
  return () => window.removeEventListener('keydown', handleKeyPress);
}, []);
```

### Prompt 3: Custom Fullscreen Styles

**Where to use:** CSS or Tailwind

```css
/* Fullscreen-specific styles */
:fullscreen {
  background: #0f172a;  /* Dark background */
  padding: 20px;
}

:-webkit-full-screen {
  background: #0f172a;
  padding: 20px;
}

:-moz-full-screen {
  background: #0f172a;
  padding: 20px;
}
```

---

## How to Personalize This for YOUR Dashboard

### Option 1: Change the Keyboard Shortcut

**File:** `src/app/canvas/page.tsx`

```typescript
// Change from 'f' to 'F11'
if (e.key === 'F11') {
  e.preventDefault();  // Prevent browser default
  toggleFullscreen();
}
```

### Option 2: Add Fullscreen to Other Pages

**Example: Add to Office AI page**

```typescript
// In src/app/office/ai/page.tsx
const [isFullscreen, setIsFullscreen] = useState(false);
const resultRef = useRef<HTMLDivElement>(null);

// Add fullscreen button next to results
<div ref={resultRef}>
  <button onClick={toggleFullscreen}>⛶ Fullscreen Results</button>
  <pre>{result}</pre>
</div>
```

### Option 3: Fullscreen with Specific Dimensions

```typescript
const enterCustomFullscreen = () => {
  // Request specific size
  containerRef.current?.requestFullscreen({
    navigationUI: 'hide'
  });
  
  // Force specific dimensions
  containerRef.current?.style.setProperty('width', '1920px');
  containerRef.current?.style.setProperty('height', '1080px');
};
```

### Option 4: Add Exit Fullscreen Button in Preview

```typescript
// Inside the iframe or preview area
{isFullscreen && (
  <button 
    onClick={toggleFullscreen}
    className="absolute top-4 right-4 z-50 bg-slate-800 text-white px-3 py-1 rounded"
  >
    Exit Fullscreen ⤓
  </button>
)}
```

---

## Common Pitfalls & How to Avoid Them

### Pitfall 1: "Fullscreen button doesn't work"

**Problem:** Browser security restriction

**Solution:** Fullscreen must be triggered by user interaction:

```typescript
// ✅ Good: Inside click handler
<button onClick={toggleFullscreen}>Fullscreen</button>

// ❌ Bad: Automatic
useEffect(() => {
  toggleFullscreen();  // Browser will block this
}, []);
```

### Pitfall 2: "Content doesn't resize in fullscreen"

**Problem:** Fixed height CSS

**Solution:** Use responsive height:

```typescript
// ❌ Bad: Fixed height
<div className="h-96">...</div>

// ✅ Good: Responsive height
<div className={isFullscreen ? 'h-[calc(100vh-120px)]' : 'h-96'}>
  ...
</div>
```

### Pitfall 3: "Fullscreen shows blank page"

**Problem:** Iframe srcDoc not set

**Solution:** Check that HTML content exists:

```typescript
{html ? (
  <iframe srcDoc={html} ... />
) : (
  <div className="text-slate-500">No content generated yet</div>
)}
```

### Pitfall 4: "Can't exit fullscreen with ESC key"

**Problem:** Browser handles ESC differently

**Solution:** This is actually browser behavior - users can always press ESC to exit. Don't try to prevent it.

---

## Key Takeaways

1. **Fullscreen API** is built into browsers
2. **Toggle button** lets users enter/exit fullscreen
3. **Dynamic height** adjusts content to fill screen
4. **Device modes** still work in fullscreen
5. **Event listener** keeps state synchronized

---

## Next Steps

**You can now view your creations at full size!**

• Click the fullscreen button to see your Canvas work in full glory
• Test on different "devices" to see responsive design
• Present to clients without distractions

**What's next?**
• Chapter 15: Presentation Styling - Beautiful, branded presentations
• Chapter 16: Edge Runtime Optimization - Fast, secure deployment

**Or try:**
• Press 'F' in Canvas to toggle fullscreen
• Generate a complex dashboard and view it fullscreen
• Test mobile responsiveness in fullscreen mode

---

*Remember: Great design deserves a great view. Fullscreen mode shows your work the way it's meant to be seen!*

---

**End of Chapter 14**

**Questions?** Check the Canvas page in your Dashboard and experiment!

**Code reference:** `src/app/canvas/page.tsx`