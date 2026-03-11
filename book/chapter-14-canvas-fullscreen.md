# Chapter 14: Canvas Fullscreen Mode - Better Viewing for Your Creations

## What You'll Learn in This Chapter

• **What fullscreen mode is** and why it matters
• **How to implement it** in your Canvas component
• **Device preview modes** - Mobile, tablet, desktop
• **Responsive design** in fullscreen
• **How to customize** the experience

---

## Opening: Why Fullscreen?

Imagine you've just created a beautiful dashboard with the Canvas AI. You want to:
• **Show it to your team** on a big screen
• **Test it on different devices** without distractions
• **See every detail** without squinting at a small preview
• **Present it to clients** professionally

**The small preview box is helpful, but sometimes you need the BIG picture!**

---

## What is Fullscreen Mode?

Fullscreen mode expands your Canvas preview to fill the entire screen. It's like zooming in on a photo, but for your entire UI.

### Before vs After

**Normal Mode:**
```
┌─────────────────────────────────────────────────┐
│  Sidebar    │  Canvas Preview (small box)       │
│  (controls) │  ┌────────────────────────────┐  │
│             │  │                            │  │
│             │  │   Your UI                  │  │
│             │  │   (limited space)          │  │
│             │  └────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

**Fullscreen Mode:**
```
┌──────────────────────────────────────────────────────────────┐
│ Header with controls                                         │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│                                                              │
│                                                              │
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