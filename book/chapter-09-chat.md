# Chapter 9: Getting Your First Chat Working

Now that you understand prompts and the project structure, it's time to build something real. In this chapter, we'll create your first working chat interface — a simple page where you can type messages and get AI responses.

## What You'll Learn

• Creating a basic **chat UI** with React
• Connecting to the **AI model API**
• Handling **user input** and **AI responses**
• Displaying a **conversation history**
• Adding simple **styling** with Tailwind CSS
• Understanding **state management** basics

---

## The Big Picture

A chat interface has three main parts:

1. **Message Display** — Shows the conversation
2. **Input Area** — Where you type messages
3. **Send Button** — Triggers the AI response

```
┌─────────────────────────────┐
│  Welcome! How can I help?    │  ← AI Message
│                              │
│  Can you explain APIs?       │  ← User Message
│                              │
│  [Sure! An API is like...]   │  ← AI Response
│                              │
├─────────────────────────────┤
│  Type your message...      [Send] │  ← Input Area
└─────────────────────────────┘
```

---

## Step 1: Create the Chat Page

Create a new file: `src/app/chat/page.tsx`

```tsx
export default function ChatPage() {
  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-blue-600 text-white p-4">
        <h1 className="text-xl font-bold">AI Chat</h1>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4">
        <p className="text-gray-500 text-center">
          Welcome! Start typing to chat with AI.
        </p>
      </main>

      {/* Input Area */}
      <footer className="bg-white border-t p-4">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Type your message..."
            className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
            Send
          </button>
        </div>
      </footer>
    </div>
  );
}
```

**What's happening:**
• `flex flex-col h-screen` — Makes the page fill the screen vertically
• `flex-1` — Chat area takes up remaining space
• `overflow-y-auto` — Allows scrolling when messages overflow
• Tailwind classes handle all the styling

---

## Step 2: Add State Management

Now let's make it interactive using React's `useState`:

```tsx
'use client';

import { useState } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function ChatPage() {
  // State for messages
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! How can I help you today?',
      timestamp: new Date(),
    },
  ]);

  // State for input value
  const [input, setInput] = useState('');

  // Generate unique ID
  const generateId = () => Math.random().toString(36).substring(2, 9);

  // Handle send
  const handleSend = () => {
    if (!input.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    // Simulate AI response (we'll replace this with real AI later)
    setTimeout(() => {
      const aiMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: 'This is a simulated response. Connect to real AI next!',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    }, 1000);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <header className="bg-blue-600 text-white p-4">
        <h1 className="text-xl font-bold">AI Chat</h1>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[70%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-800 shadow'
              }`}
            >
              <p>{message.content}</p>
              <p className="text-xs opacity-70 mt-1">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
      </main>

      <footer className="bg-white border-t p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type your message..."
            className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSend}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            disabled={!input.trim()}
          >
            Send
          </button>
        </div>
      </footer>
    </div>
  );
}
```

**What's happening:**
• `'use client'` — This tells Next.js this is a client component
• `useState` — Stores data that changes (messages, input)
• `messages.map()` — Renders each message
• Conditional styling — User messages are blue (right), AI messages are white (left)
• `onKeyDown` — Allows pressing Enter to send

---

## Step 3: Connect to Real AI

Now let's replace the simulated response with real AI. We'll create an API route:

Create: `src/app/api/chat/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // For now, we'll use a simple mock response
    // In Chapter 15, we'll connect to Ollama/GLM/OpenRouter
    const response = {
      content: `You said: "${message}"\n\nI'm a mock AI response. In Chapter 15, we'll connect to real AI models like Ollama!`,
    };

    return NextResponse.json({ response });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
}
```

Now update the chat page to use this API:

```tsx
'use client';

import { useState } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! How can I help you today?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const generateId = () => Math.random().toString(36).substring(2, 9);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Call our API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage.content }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const aiMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: data.response.content,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error('Failed to get AI response:', error);
      
      // Show error message
      const errorMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <header className="bg-blue-600 text-white p-4">
        <h1 className="text-xl font-bold">AI Chat</h1>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[70%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-800 shadow'
              }`}
            >
              <p>{message.content}</p>
              <p className="text-xs opacity-70 mt-1">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white text-gray-500 rounded-lg p-3 shadow">
              <p>Thinking...</p>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-white border-t p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={isLoading}
            placeholder="Type your message..."
            className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </footer>
    </div>
  );
}
```

**What's happening:**
• `fetch('/api/chat')` — Makes HTTP request to our API
• `isLoading` state — Shows loading indicator
• `try/catch` — Handles errors gracefully
• Error messages appear as AI responses

---

## Step 4: Test Your Chat

1. **Start the server:**
   ```bash
   npm run dev
   ```

2. **Open your browser:**
   Navigate to `http://localhost:3000/chat`

3. **Try it out:**
   - Type a message
   - Press Enter or click Send
   - See the AI response

---

## Understanding the Flow

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│  User Types │───▶│  React State │───▶│   Display   │
│   Message   │    │   Updates    │    │   Update    │
└─────────────┘    └──────────────┘    └─────────────┘
                          │
                          ▼
                   ┌──────────────┐
                   │   API Call   │
                   │   (/api/chat)│
                   └──────────────┘
                          │
                          ▼
                   ┌──────────────┐
                   │   AI Model   │
                   │  (Mock/Real) │
                   └──────────────┘
                          │
                          ▼
                   ┌──────────────┐
                   │   Response   │
                   │   Returned   │
                   └──────────────┘
                          │
                          ▼
                   ┌──────────────┐
                   │   Message    │
                   │   Added to   │
                   │    State     │
                   └──────────────┘
```

---

## Key Concepts Explained

### Client vs Server Components

**Server Components (default):**
• Run on the server
• Can't use browser APIs
• Can't use `useState`, `useEffect`
• Good for: Data fetching, static content

**Client Components (`'use client'`):**
• Run in the browser
• Can use all React hooks
• Can use browser APIs
• Good for: Interactive UI, user input

**Rule:** Use `'use client'` when you need:
• User interaction (clicks, inputs)
• Browser APIs (localStorage, fetch)
• React hooks (useState, useEffect)

### State Management Pattern

```
Event (user action)
    │
    ▼
Update State (setMessages)
    │
    ▼
React Re-renders Component
    │
    ▼
UI Updates Automatically
```

React automatically updates the UI when state changes. You don't manually update the DOM.

### The `async/await` Pattern

```javascript
// Old way (callbacks)
fetch('/api/chat')
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error(error));

// New way (async/await)
try {
  const response = await fetch('/api/chat');
  const data = await response.json();
  console.log(data);
} catch (error) {
  console.error(error);
}
```

**Benefits:**
• Easier to read (looks synchronous)
• Better error handling with try/catch
• No "callback hell"

---

## PROMPT YOU CAN USE

Want to enhance your chat? Try this:

```
Extend the chat interface with these features:
1. Add a "Clear Chat" button that removes all messages
2. Add message timestamps formatted as "2 minutes ago"
3. Add markdown support for AI responses (bold, links, code blocks)
4. Add a loading spinner instead of "Thinking..."
5. Save messages to localStorage so they persist on refresh

Use React hooks and Tailwind CSS for styling.
```

---

## Common Mistakes

### ❌ Mistake: Forgetting 'use client'

```tsx
// This won't work - no interactivity
export default function ChatPage() {
  const [messages, setMessages] = useState([]); // Error!
  // ...
}
```

### ✅ Fix: Add 'use client'

```tsx
'use client';

export default function ChatPage() {
  const [messages, setMessages] = useState([]); // Works!
  // ...
}
```

### ❌ Mistake: Mutating State Directly

```tsx
// Bad - mutates state directly
messages.push(newMessage);
setMessages(messages);
```

### ✅ Fix: Create New Array

```tsx
// Good - creates new array
setMessages([...messages, newMessage]);
```

### ❌ Mistake: Not Handling Errors

```tsx
// Bad - no error handling
const response = await fetch('/api/chat');
const data = await response.json();
setMessages([...messages, data.response]);
```

### ✅ Fix: Add Try/Catch

```tsx
// Good - handles errors
try {
  const response = await fetch('/api/chat');
  if (!response.ok) throw new Error('Failed');
  const data = await response.json();
  setMessages([...messages, data.response]);
} catch (error) {
  console.error(error);
  // Show error to user
}
```

---

## Key Takeaways

✅ **'use client'** — Required for interactive components

✅ **useState** — Stores data that changes over time

✅ **API Routes** — Backend endpoints in `/app/api/`

✅ **fetch()** — Makes HTTP requests from client to server

✅ **State Updates** — Always create new objects/arrays, don't mutate

✅ **Error Handling** — Always wrap API calls in try/catch

✅ **Loading States** — Show users when work is happening

---

**Next: Chapter 10 - Adding Document Upload Features**
