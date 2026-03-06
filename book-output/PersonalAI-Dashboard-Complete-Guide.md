# PersonalAI Dashboard: The Complete Guide

## Building Your Own AI Assistant - From Zero to Production

*By Michael C. Barnes*

**Byte-Sized AI Series: Keeping You Relevant in an AI World**

---

## Table of Contents

# Building Your AI Dashboard: The Complete Beginner's Guide

## From Zero to Enterprise-Grade AI — On Your Own Server

*By Michael C. Barnes*

---

**Dedication:**  
To Randolph (Randy) Hill, Founder & CTO of GovBotics — your vision of AI as a tool manager rather than a knowledge repository now empowers individuals, not just enterprises.

**Credits:**  
Key enterprise AI concepts adapted from Randolph Hill, Founder & CTO of GovBotics. This project demonstrates that sophisticated AI systems don't require massive resources — just smart architecture.

---

## Byte-Sized AI: Keeping You Relevant in an AI World

This book is part of the **Byte-Sized AI** series — short, practical guides designed to keep you relevant in an AI world. The goal isn't to overwhelm you with theory, but to give you practical skills that make AI work for you.

**Why This Matters:** While big companies will have access to large models they control, this book gives power to anyone with a simple computer and internet connection. You don't need enterprise budgets or data centers. You need the right approach.

---

## The Philosophy: AI as Tool Manager, Not Oracle

Before writing this book, I worked with Randolph Hill on how enterprises would use AI. We both understood something critical: **existing systems harness data, but databases don't understand data.** They require unique skills to access their information.

Randy conceptualized a system where the human communicates what they want to accomplish, and the AI uses available tools to gather information. We treat the AI as a **manager of tools**, not a repository of knowledge.

**The Core Insight:** Think of an LLM as a highly compressed representation of knowledge. Just like a compressed photo or video, detail gets lost in compression. LLMs are the most compressed version of knowledge we have. When you compress something that much, holes appear in the memory. The LLM might struggle to come up with the right answer because information has been lost.

**The Solution:** Don't ask the LLM to know everything. Assign it a task and give it tools to perform that task:
- **SQL databases** for structured data
- **Vector stores** for semantic search
- **Web search** for current information
- **Document processing** for your files

This approach — using small, efficient models backed by tools — is what makes this system possible on modest hardware. We've tested this using models as small as **2 billion parameters** because the system doesn't rely on the LLM having all the information.

---

## Why This Approach Changes Everything

When I first saw OpenCode (Claude Code), I recognized some of these ideas being implemented. However, OpenCode wasn't constrained in ways that organizations could scale:
- Security wasn't integrated
- It wasn't efficient in resource usage
- It relied too heavily on expensive foundational models

Because Randy had mapped out how to build a scalable enterprise solution, I developed this approach integrating security and efficiencies into the system. Most importantly, this project uses small, open-source models that anyone can run on modest hardware.

**The Key Advantages:**

1. **Accessibility** — Run on a laptop, not a server farm
2. **Privacy** — Your data never leaves your machine
3. **Cost** — Free to run, not $20-200/month subscriptions
4. **Control** — You own the system, not renting access
5. **Customization** — Teach it your specific needs

---

## Your Options: From Tiny to Titan

This book shows you ONE implementation, but you have options:

**The Minimal Setup (What We Build):**
- Small local models (2B-14B parameters)
- SQLite database
- Vector store for documents
- Ollama for model management
- Optional: Free cloud tokens for heavy tasks

**The Enterprise Upgrade:**
- vLLM for high-throughput serving
- Larger models (27B-70B+ parameters)
- GPU acceleration
- Multi-user support
- Advanced security features

**The Cloud Hybrid:**
- Local models for speed and privacy
- Cloud APIs for specific tasks
- Best of both worlds

**You Choose:** Start minimal, scale up as needed. The architecture supports all approaches.

---

## Table of Contents

[Rest of table of contents remains the same...]

1. [Introduction - Your Journey Starts Here](#chapter-1-introduction---your-journey-starts-here)
2. [What is an API? (The Foundation)](#chapter-2-what-is-an-api)
3. [What is a Container? (Docker Explained Simply)](#chapter-3-what-is-a-container)
4. [Setting Up Your Computer - Step by Step](#chapter-4-setting-up-your-computer)
5. [What is Programming? (Learning to Give Instructions)](#chapter-5-what-is-programming)
6. [What is a Database? (Storing Information)](#chapter-6-what-is-a-database)
7. [Understanding the Project Structure](#chapter-7-understanding-the-project-structure)
8. [Prompt Templates - How to Talk to AI Tools](#chapter-8-prompt-templates)
9. [Getting Your First Chat Working](#chapter-9-getting-your-first-chat-working)
10. [Adding Document Upload Features](#chapter-10-adding-document-upload)
11. [Creating Your Brand Voice System](#chapter-11-creating-brand-voice)
12. [Building Intelligence Reports](#chapter-12-building-intelligence-reports)
13. [Adding Self-Reflection - Your AI Checks Itself](#chapter-13-adding-self-reflection)
14. [Security Scanning and Problem Detection](#chapter-14-security-scanning)
15. [Connecting to Outside Services](#chapter-15-connecting-to-services)
16. [Docker and Containers - Running Services Safely](#chapter-16-docker-and-containers)
17. [Using OpenCode and AI Development Tools](#chapter-17-using-opencode)
18. [Customizing the Prompts for YOUR Needs](#chapter-18-customizing-prompts)
19. [Troubleshooting - When Things Go Wrong](#chapter-19-troubleshooting)
20. [Appendix: Complete Prompt Library](#chapter-20-appendix)

---

## Chapter 1: Introduction - Your Journey Starts Here

Welcome. You're about to embark on an exciting journey, and I'm going to guide you every step of the way. Don't worry if you've never programmed before — that's exactly who this book is for.

### What You'll Learn in This Chapter

- What an **AI Research Assistant** actually is (and why you want one)
- What you'll build by the end of this book
- What you DON'T need to get started
- How this book works
- What a **prompt** is (this is crucial!)

---

### A Warm Welcome

Let me start with a promise: **you can do this**. It doesn't matter if you're:
- A complete beginner who's never written a line of code
- Someone who tried coding before and got stuck
- A professional from a non-technical field
- Just curious about AI and want to understand it better

This book was written specifically for you. Every concept is explained in plain English. Every technical term is defined when you first encounter it. And most importantly — you don't need to be a "computer person" to build something amazing.

### What IS an AI Research Assistant?

Imagine having a super-smart research assistant who:
- Never gets tired
- Can read and understand thousands of documents
- Remembers everything you tell it
- Works 24/7 without breaks
- Never judges your questions
- Gets smarter the more you use it

That's what you're going to build. But here's the key difference from ChatGPT or other online AI tools: **you will completely control this assistant**. It runs on your computer, not in the cloud. Your data stays private. You decide how it works.

**Think of it like this:** ChatGPT is like using a library where you borrow books. What you're building is having your own personal library — with a librarian who knows exactly where everything is and can help you instantly.

### Why Build Your Own?

Great question! Here are the main reasons:

**1. Privacy** — Your documents, chats, and data never leave your computer. This is crucial if you work with sensitive information (healthcare records, legal documents, proprietary business data).

**2. Customization** — You can teach it YOUR specific needs. Want it to write in your company's brand voice? Done. Need it to understand your industry jargon? Easy.

**3. No Subscription Fees** — Once it's built, it costs you $0 per month to run. Compare that to $20+/month for ChatGPT Plus or hundreds per month for enterprise AI tools.

**4. No Internet Required** — It works even when you're offline (once set up). Perfect for working on planes, remote locations, or secure facilities.

**5. Complete Control** — You decide what features it has, how it behaves, and what it can do. Add new capabilities anytime.

### What You Will Build in This Book

By the end of this book, you'll have created a complete AI Dashboard with these features:

✅ **Chat Interface** — Talk to AI models with streaming responses (like ChatGPT, but faster and private)

✅ **Document Management** — Upload PDFs, Word docs, text files, and chat with them (like having a conversation about the document)

✅ **Brand Workspace** — Organize documents by brand/project and create content in specific voices

✅ **Intelligence Reports** — Automated daily reports on topics you care about (news, opportunities, research)

✅ **Self-Reflection** — Your AI analyzes its own performance and suggests improvements

✅ **Security Scanning** — Automatic vulnerability detection and security checks

✅ **Task Scheduler** — Recurring automated tasks that run without you

✅ **Calendar & Notes** — Integrated planning and note-taking with AI assistance

✅ **Telegram Bot** — Control your AI from your phone via Telegram

✅ **Document Generation** — Create Word, Excel, and PowerPoint files with AI

✅ **Canvas Builder** — Generate interactive UI components with natural language

✅ **OCR & Image Recognition** — Extract text from images and documents

And more! You'll have over 30 integrated features working together seamlessly.

### What You DON'T Need

Let me remove some common fears right now:

❌ **No math required** — Seriously. The most complex math you'll do is counting files.

❌ **No programming experience** — We'll start from absolute zero. I'll explain every concept.

❌ **No expensive software** — Everything we use is free and open-source.

❌ **No special computer** — Works on any modern laptop (Windows, Mac, or Linux).

❌ **No computer science degree** — You don't need to understand algorithms or data structures.

❌ **No networking knowledge** — You don't need to know how the internet works.

What you DO need:

✅ A computer (laptop or desktop) from the last 5-10 years  
✅ Internet connection (for initial setup)  
✅ Patience and willingness to learn  
✅ About 10-20 hours to work through this book  
✅ A sense of curiosity  

### How This Book Works

This book is different from traditional programming books. Here's why:

**1. Plain English First** — Every concept is explained in everyday language before we get technical.

**2. Analogies Everywhere** — We compare technical concepts to things you already understand (restaurants, libraries, cooking, etc.).

**3. Copy-Paste Prompts** — Throughout the book, you'll see boxes like this:

```
PROMPT YOU CAN USE:
"Create a simple webpage with a heading and a button. 
Use HTML and make the button blue."
```

These are actual prompts you can copy and paste into AI coding assistants (like me!) to generate working code.

**4. Build As You Learn** — Each chapter adds features to your AI Dashboard. By the end, you'll have a complete system.

**5. Fork and Customize** — The entire project is open-source. You can copy it, modify it, and make it yours.

### What is a Prompt? (Crucial Concept!)

This is the most important concept in this entire book. Everything else builds on this.

**A prompt is simply instructions you give to AI.**

That's it. Nothing magical. Just instructions.

Think of it like giving directions to a smart intern:
- **Bad prompt:** "Do something with files"
- **Good prompt:** "Create a function that takes a filename as input, reads the file, counts how many words it contains, and returns the count"

The better your instructions, the better the results.

**This book teaches you to write better prompts.**

Every chapter includes example prompts you can use. But more importantly, I explain WHY those prompts work, so you can write your own.

### The Power of Prompt Engineering

Here's a secret: **most of the "coding" you'll do in this book is just writing prompts.**

Modern AI coding assistants (like Claude, GPT-4, and others) can write actual code from your descriptions. You describe what you want in English, and they generate the code.

This means:
- You focus on WHAT you want
- AI handles the HOW
- You learn by seeing working examples
- You gradually understand the code

It's like having an expert programmer pair-programming with you, explaining everything as you go.

### What You'll Need for This Chapter

For this introduction, you just need:
1. This book
2. A comfortable place to read
3. A notebook (physical or digital) for jotting down questions

We won't write any code yet. Just understanding.

### Try It Yourself: Your First Prompt

Here's a prompt you can use right now (if you have access to an AI assistant):

```
PROMPT YOU CAN USE:
"Explain what an API is using three different analogies:
1. A restaurant analogy
2. A TV remote analogy  
3. A real-world business analogy

Make each explanation simple enough for a 10-year-old to understand."
```

This is the format we'll use throughout the book. You copy the prompt, paste it into an AI assistant, and see what you get.

### Key Takeaways

Before you move on, make sure you understand:

✅ An AI Research Assistant is software you control that helps with research and tasks

✅ You're building something private, customizable, and free to run

✅ You don't need any prior technical knowledge

✅ A prompt is just instructions you give to AI

✅ This book teaches you to write better prompts

✅ Most of the work is describing what you want in English

### How to Personalize This for YOUR Dashboard

From the very first chapter, start thinking about:

**What do YOU want your AI Dashboard to do?**

Some ideas:
- Research assistant for your industry
- Writing helper for your blog or business
- Document analyzer for legal/medical/financial documents
- Learning companion for studying new topics
- Creative writing partner
- Code helper for your specific projects

Write down your top 3 use cases. This will help you focus as we build.

### Common Pitfalls & How to Avoid Them

**Pitfall #1:** "I need to understand everything before I start"  
**Solution:** You don't. We'll build as we learn. Understanding comes from doing.

**Pitfall #2:** "I should memorize all the technical terms"  
**Solution:** Don't. I'll remind you of definitions throughout the book. Focus on concepts, not memorization.

**Pitfall #3:** "This seems too simple to be real AI"  
**Solution:** It works! Enterprise companies pay thousands for tools like this. You're building the same thing for free.

**Pitfall #4:** "I need to be online the whole time"  
**Solution:** Once set up, your AI Dashboard works offline. You only need internet for setup and some optional features.

### Chapter Summary

Congratulations! You've made it through Chapter 1. You now know:

- What you're building (a private AI Research Assistant)
- Why you're building it (privacy, customization, cost savings)
- What you need (just a computer and patience)
- What a prompt is (instructions for AI)
- How this book works (plain English + hands-on building)

### Next Steps

In Chapter 2, we'll dive into **APIs** — the foundation of how everything connects. We'll use restaurants, TV remotes, and USB ports to make this crystal clear.

You'll learn:
- What an API actually is
- How different programs talk to each other
- Why APIs are everywhere (even if you can't see them)
- How to read API documentation
- Your first hands-on API call

### Fork This and Make It Yours!

Remember: this entire project is open-source under CC BY-SA 4.0 and MIT License. This means:

✅ You can copy it  
✅ You can modify it  
✅ You can use it commercially  
✅ You can share your changes  
✅ You must give credit (attribution)  
✅ Your changes must also be open  

The only requirement is: **if you improve it, share those improvements.** That's how open source works — we all get better together.

---

**You now hold the roadmap for building real enterprise-grade AI power.** And the best part? You can make this Dashboard completely yours with simple prompts.

Ready for Chapter 2? Let's learn about APIs!

---

*Next: [Chapter 2 - What is an API?](#chapter-2-what-is-an-api)*


# Chapter 2: What is an API? (The Foundation)

API — you'll hear this word a lot. Let's make sure you understand it completely. This chapter is foundational to everything else in this book, so we'll take our time and explore it from multiple angles.

## What You'll Learn in This Chapter

- What an **API** actually is (with multiple analogies)
- **Why APIs exist** and why they're everywhere
- **REST APIs** made simple
- What **JSON** is and why it matters
- The **request/response cycle**
- HTTP methods explained (GET, POST, PUT, DELETE)
- Status codes and what they mean
- Your first hands-on API call

---

## The Restaurant Analogy

Imagine you go to a restaurant. You sit down, open the menu, and decide what you want. But you don't walk into the kitchen and cook the food yourself, right?

Instead, you have a **waiter**.

You tell the waiter:
- "I'd like the chicken parmesan"
- "No onions, please"
- "And a side salad"

The waiter writes this down, walks to the kitchen, and gives the order to the chef. The chef prepares your food. When it's ready, the waiter brings it back to your table.

**This is exactly how an API works.**

### Breaking Down the Analogy

| Restaurant | API World |
|------------|-----------|
| You (the customer) | Your program/app |
| The waiter | The API |
| The kitchen | The server/database |
| Your order | The API request |
| The food | The response/data |
| The menu | API documentation |

**Key insight:** You never need to see the kitchen. You don't know how the chef cooks the chicken. You don't know where the ingredients are stored. You just give your order (request) through the waiter (API) and get your food (response).

This is exactly how software works. Your program (the customer) makes a request to an API (the waiter), which talks to a server (the kitchen), and returns data (the food).

---

## The TV Remote Analogy

Here's another way to think about it:

You have a TV remote control. It has buttons like:
- Power
- Volume up/down
- Channel up/down
- Menu
- Input

When you press the "volume up" button, the TV gets louder. But you don't need to understand:
- How the TV receives the signal
- How the speakers work
- How the sound is amplified
- The electrical circuits inside

**The remote is the API.**

It provides a simple interface to control complex functionality. You press a button (make a request), and something happens (get a response).

### Why This Matters

Without the remote (API), you'd need to:
- Open the TV case
- Find the volume control circuit
- Adjust it manually
- Hope you don't electrocute yourself

With the remote (API), you just press a button.

**This is the power of APIs — they make complex things simple.**

---

## The USB Port Analogy

One more analogy, then we'll get technical:

Think about a USB port on your computer. You can plug in:
- A mouse
- A keyboard
- A phone charger
- A flash drive
- A printer
- A microphone

All of these devices "just work" when you plug them in. Why?

Because they all speak the same "language" through the USB **standard**. The USB port is the **interface** that lets your computer communicate with all these different devices.

**An API is like a USB port for software.**

It provides a standard way for different programs to talk to each other. Just like you can plug any USB device into any USB port, you can connect any program to any API (as long as they speak the same "language").

---

## Why Do APIs Exist?

Now that you understand what APIs are through analogies, let's talk about why they matter:

### 1. So Different Programs Can Communicate

Imagine if every program had to be built from scratch, with no way to share data or functionality. You'd have to rebuild everything every time.

APIs let programs talk to each other:
- Your weather app talks to a weather API
- Your maps app talks to a mapping API
- Your payment app talks to a banking API
- Your AI Dashboard will talk to dozens of APIs

### 2. So You Don't Have to Build Everything Yourself

Want to add maps to your app? You don't need to:
- Launch satellites
- Take photos of the entire Earth
- Build a map database
- Create routing algorithms

You just use the Google Maps API or OpenStreetMap API.

**APIs let you stand on the shoulders of giants.**

### 3. So Companies Can Share Services Safely

A bank doesn't want to give you direct access to their database. That would be a security nightmare!

Instead, they provide an API that:
- Only allows specific actions (check balance, transfer money)
- Requires authentication (proves who you are)
- Has rate limits (prevents spam)
- Logs everything (for security)

You get the functionality you need, and they keep their systems secure.

---

## REST APIs Made Simple

Now let's get a bit more technical. Don't worry — we'll keep it simple.

**REST** stands for "Representational State Transfer." But you don't need to remember that. Just think of it as a set of rules for how APIs should work.

### The Anatomy of an API Request

Every API request has these parts:

#### 1. URL (The Address)

Just like a website has a URL (like `https://google.com`), APIs have URLs:

```
https://api.weather.com/v1/current
https://api.github.com/users/octocat
https://api.example.com/orders
```

Think of the URL as the **address** where you're sending your request.

#### 2. HTTP Method (The Verb)

Just like verbs in English describe actions, HTTP methods describe what you want to do:

| Method | What It Means | Restaurant Analogy |
|--------|---------------|-------------------|
| **GET** | "Give me information" | "What's on the menu?" |
| **POST** | "Create something new" | "I'd like to place an order" |
| **PUT** | "Update something" | "Actually, change my order to fish" |
| **DELETE** | "Remove something" | "Cancel my order" |

**Most of the time, you'll use GET and POST.**

#### 3. Headers (The Metadata)

Headers are like the envelope you put a letter in. They contain information about the request:
- Who's making the request (authentication)
- What format you want the response in
- Special instructions

Example headers:
```
Authorization: Bearer your_api_key_here
Content-Type: application/json
Accept: application/json
```

#### 4. Body (The Payload)

The body contains the actual data you're sending. You only need this for POST and PUT requests (when you're creating or updating something).

---

## What is JSON?

**JSON** stands for "JavaScript Object Notation." But don't let the name fool you — it's used by almost every programming language, not just JavaScript.

JSON is just a **way to structure data**. Think of it like a standardized format for writing information.

### JSON Looks Like This

```json
{
  "name": "John Doe",
  "age": 30,
  "city": "New York",
  "hobbies": ["reading", "coding", "hiking"]
}
```

### Breaking It Down

- **Curly braces `{}`** - Hold an object (a thing with properties)
- **Square brackets `[]`** - Hold a list/array
- **Colons `:`** - Separate the key from the value
- **Commas `,`** - Separate different items
- **Quotes `""`** - Wrap text (strings)
- **Numbers** - Written without quotes

### Real-World API Response Example

Here's what you might get from a weather API:

```json
{
  "location": {
    "city": "Boston",
    "country": "USA"
  },
  "current": {
    "temperature": 72,
    "unit": "Fahrenheit",
    "condition": "Partly Cloudy",
    "humidity": 45
  },
  "forecast": [
    {
      "day": "Tomorrow",
      "high": 75,
      "low": 60
    },
    {
      "day": "Wednesday",
      "high": 78,
      "low": 62
    }
  ]
}
```

See how structured and readable that is? That's why APIs use JSON.

---

## The Request/Response Cycle

Let's put it all together. Here's what happens when your app uses an API:

### Step 1: Your App Makes a Request

```
GET https://api.weather.com/v1/current?city=Boston

Headers:
  Authorization: Bearer abc123xyz
  Accept: application/json
```

**Translation:** "Hey weather API, I'd like the current weather for Boston. I'm authorized to ask, and I want the response in JSON format."

### Step 2: The Server Processes It

The API server:
1. Checks your authentication (are you allowed to ask?)
2. Looks up Boston's weather in the database
3. Formats the data as JSON
4. Prepares the response

### Step 3: The Server Sends a Response

```json
{
  "status": "success",
  "data": {
    "temperature": 72,
    "condition": "Sunny",
    "humidity": 40
  }
}
```

### Step 4: Your App Uses the Data

Your app takes that JSON, extracts the temperature (72 degrees), and displays it on the screen.

**This entire cycle usually happens in milliseconds.**

---

## HTTP Status Codes

When you get a response, it includes a **status code** — a number that tells you what happened:

### Success Codes (2xx)

| Code | Meaning | What It Means |
|------|---------|---------------|
| **200** | OK | Everything worked! |
| **201** | Created | You successfully created something (POST) |
| **204** | No Content | Success, but there's no data to return |

### Client Error Codes (4xx) — Your Mistake

| Code | Meaning | What It Means |
|------|---------|---------------|
| **400** | Bad Request | You sent bad data or malformed request |
| **401** | Unauthorized | You need to log in or provide API key |
| **403** | Forbidden | You're not allowed to do this |
| **404** | Not Found | The thing you're looking for doesn't exist |
| **429** | Too Many Requests | You're asking too fast; slow down |

### Server Error Codes (5xx) — Their Mistake

| Code | Meaning | What It Means |
|------|---------|---------------|
| **500** | Internal Server Error | The API server crashed |
| **502** | Bad Gateway | The API is down or unreachable |
| **503** | Service Unavailable | The API is overloaded or in maintenance |

**The most common codes you'll see are 200 (success), 404 (not found), and 500 (server error).**

---

## Your First Hands-On API Call

Now let's try this for real! Don't worry — this is just an example to show you how it works.

### Example 1: Getting Weather Data

```javascript
// This is JavaScript code that makes an API call

fetch('https://api.weatherapi.com/v1/current.json?key=YOUR_KEY&q=London')
  .then(response => {
    // Check if the request succeeded
    if (response.status === 200) {
      return response.json(); // Parse the JSON response
    } else {
      throw new Error(`API error: ${response.status}`);
    }
  })
  .then(data => {
    // Use the data
    console.log(`Temperature in London: ${data.current.temp_c}°C`);
    console.log(`Condition: ${data.current.condition.text}`);
  })
  .catch(error => {
    console.error('Error:', error);
  });
```

### What's Happening Here?

1. **`fetch()`** — Makes the HTTP request to the API
2. **`response.status`** — Checks if it succeeded (200 = good)
3. **`response.json()`** — Converts the JSON response to JavaScript objects
4. **`data.current.temp_c`** — Accesses the temperature from the structured data
5. **`.catch()`** — Handles any errors that occur

### Example 2: Creating a Resource (POST)

```javascript
// Creating a new user via API

fetch('https://api.example.com/users', {
  method: 'POST', // We're creating something
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your_api_key'
  },
  body: JSON.stringify({
    name: 'John Doe',
    email: 'john@example.com'
  })
})
.then(response => response.json())
.then(data => {
  console.log('User created with ID:', data.id);
});
```

**Key differences from GET:**
- We specify `method: 'POST'`
- We add a `body` with the data we're sending
- We tell the API the format with `Content-Type`

---

## How APIs Fit Into Your AI Dashboard

Now let's connect this to what you're building. Your AI Dashboard will use APIs constantly:

### Internal APIs

Your Dashboard is made of many parts that talk to each other:

```
Chat Interface ←API→ AI Model
Document Upload ←API→ Vector Database
Scheduler ←API→ Task Runner
Brand Voice ←API→ Content Generator
```

### External APIs

Your Dashboard also talks to outside services:

```
Your Dashboard → Weather API (for intelligence reports)
Your Dashboard → SAM.gov API (for government contracts)
Your Dashboard → Telegram API (for bot messaging)
Your Dashboard → Ollama API (for AI chat)
```

### Real Example from Your Dashboard

Here's how your chat feature will work:

```javascript
// When user sends a message
async function sendMessage(userMessage) {
  // Call the Ollama API (the AI model)
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: userMessage,
      model: 'glm-4.7-flash'
    })
  });
  
  const data = await response.json();
  
  // Display the AI's response
  displayMessage(data.message.content);
}
```

**Every feature in your Dashboard uses APIs internally or externally.**

---

## PROMPT YOU CAN USE

Here's a prompt you can paste into an AI coding assistant to generate a simple API client:

```
Create a simple JavaScript function that:
1. Makes a GET request to https://jsonplaceholder.typicode.com/posts/1
2. Logs the title of the post
3. Handles errors gracefully

Include comments explaining each line.
```

This uses a fake API for testing (`jsonplaceholder.typicode.com`) so you can experiment without needing an API key.

---

## Key Takeaways

Before moving on, make sure you understand:

✅ An **API** is like a waiter, TV remote, or USB port — an interface that makes complex things simple

✅ **URLs** are addresses where you send requests

✅ **HTTP methods** (GET, POST, PUT, DELETE) describe what you want to do

✅ **JSON** is a structured format for data that's easy to read

✅ **Status codes** tell you if a request succeeded (200) or failed (404, 500)

✅ The **request/response cycle** happens in milliseconds

✅ Your Dashboard will use **both internal and external APIs**

✅ **Everything in modern software uses APIs**

---

## Try It Yourself

1. Open your web browser
2. Go to: `https://jsonplaceholder.typicode.com/posts/1`
3. You'll see JSON data appear!
4. Change the `1` to `2`, `3`, etc. to see different posts

Congratulations! You just made an API call by visiting a URL.

---

## How to Personalize This for YOUR Dashboard

Start thinking about:

**What APIs do YOU want your Dashboard to use?**

Some ideas:
- **News APIs** — Get articles about your industry
- **Financial APIs** — Track stocks or crypto prices
- **Social Media APIs** — Post to Twitter, LinkedIn, etc.
- **Translation APIs** — Translate documents automatically
- **Email APIs** — Send reports via email
- **Calendar APIs** — Sync with Google Calendar
- **Weather APIs** — Include weather in your intelligence reports

Make a list of 5 APIs you might want to integrate. We'll learn how to do this in Chapter 15.

---

## Common Pitfalls & How to Avoid Them

**Pitfall #1:** "APIs seem too technical, I won't understand them"  
**Solution:** You already do! You use APIs every day when you use apps on your phone.

**Pitfall #2:** "I need to memorize all the HTTP methods"  
**Solution:** Just remember GET (read) and POST (create). That's 90% of what you'll use.

**Pitfall #3:** "JSON looks scary with all those brackets"  
**Solution:** It's just structured text. Use a JSON formatter tool online to make it pretty.

**Pitfall #4:** "API errors are cryptic and hard to debug"  
**Solution:** Check the status code first (404 = not found, 500 = server error, 401 = unauthorized). That tells you where to look.

---

## Chapter Summary

Congratulations! You've learned:

✅ What an API is (waiter/TV remote/USB analogies)

✅ Why APIs exist (communication, reuse, security)

✅ How REST APIs work (URLs, methods, headers, body)

✅ What JSON is and how to read it

✅ The request/response cycle

✅ HTTP status codes and what they mean

✅ How to make your first API call

✅ How APIs fit into your AI Dashboard

**This was Chapter 2 — the foundation. Everything else builds on this.**

---

## Next Steps

In Chapter 3, we'll explore **Containers and Docker** — how to package your application so it runs the same way on any computer.

You'll learn:
- What a container is (lunchbox analogy)
- Why "it works on my machine" is a problem
- How Docker solves this
- Your first Dockerfile
- Running containers

### Preview: The Lunchbox Analogy

Imagine you pack a lunch for work:
- You put everything in a lunchbox
- The lunchbox keeps everything contained
- You can take it anywhere
- It works the same whether you're at home, work, or a park

**A Docker container is like a lunchbox for software.** It packages your app with everything it needs to run.

---

**You now understand the foundation of how all modern software works.** APIs are the glue that connects everything together. Every app you use, every website you visit, every service you interact with — they all use APIs.

Ready for Chapter 3? Let's learn about containers!

---

*Next: [Chapter 3 - What is a Container?](./chapter-03-containers.md)*


# Chapter 3: What is a Container? (Docker Explained Simply)

"But it works on my computer!" You've probably heard this before — maybe even said it yourself. In this chapter, we're going to solve this problem forever using something called **containers**.

## What You'll Learn in This Chapter

- What a **container** actually is (with multiple analogies)
- The "it works on my machine" problem
- Why containers exist and what problems they solve
- **Docker** — the most popular container tool
- Containers vs Virtual Machines (VMs)
- How to think about containers correctly
- Your first hands-on container experience

---

## The Lunchbox Analogy

Imagine you want to bring lunch to work. You have two options:

**Option 1: The Chaos Method**
- Grab a sandwich from your fridge
- Put it on a plate
- Carry the plate, a drink, utensils, napkins separately
- Hope your workplace has a fridge, microwave, table, chairs
- Hope they have the exact same condiments you like
- Hope everything stays together during transport

**Option 2: The Lunchbox Method**
- Put your sandwich, drink, utensils, and napkins in a lunchbox
- The lunchbox keeps everything together
- Close the lid
- Take it anywhere
- Open it anywhere
- Everything is exactly as you packed it

**A container is like a lunchbox for software.**

It packages your application with everything it needs to run:
- The code
- The runtime (like Node.js or Python)
- System tools
- Libraries
- Dependencies
- Configuration files

And it keeps everything isolated, secure, and portable.

---

## PROMPT YOU CAN USE

Here's a prompt to generate a Dockerfile for a simple Node.js app:

```
Create a Dockerfile for a Node.js application with these requirements:
1. Use Node.js version 18
2. Set the working directory to /app
3. Copy package.json first (for better caching)
4. Install dependencies with npm install
5. Copy the rest of the application code
6. Expose port 3000
7. Start the app with "node server.js"

Include comments explaining each line.
```

---

## Key Takeaways

✅ A **container** is like a lunchbox — it packages everything your app needs

✅ **Docker** is the most popular tool for creating and running containers

✅ Containers solve the "it works on my machine" problem

✅ Containers are lighter than VMs

✅ A **Dockerfile** is a recipe for building a container

---

**Next: Chapter 4 - Setting Up Your Computer**


# Chapter 4: Setting Up Your Computer - Step by Step

Before we build anything, we need the right tools. Think of this like setting up a kitchen before cooking. In this chapter, we'll install everything you need — step by step, with screenshots described.

## What You'll Learn

- Installing **VS Code** (your code editor)
- Understanding the **terminal/command line**
- Basic navigation commands (cd, ls, mkdir)
- Installing **Node.js** and **npm**
- What **environment variables** are
- Setting up your project folder
- Verifying everything works
- **What GitHub is and how to use it**
- **Cloning and running this project's code**
- **Setting up AI-assisted development** with OpenCode, GLM-5, and Kimi
- **Why multiple AI models** can improve your code quality

---

## Step 1: Install VS Code

**VS Code** is the most popular code editor. It's free and works on Windows, Mac, and Linux.

### Download
1. Go to: https://code.visualstudio.com
2. Click the big blue "Download" button
3. Run the installer

### What You'll See
When you open VS Code, you'll see:
- **Left sidebar** — File explorer, search, extensions
- **Center** — Where you edit files
- **Top menu** — File, Edit, View, etc.
- **Bottom panel** — Terminal, problems, output

### Extensions to Install
Click the Extensions icon (four squares) on the left, then search for:
- **ES7+ React/Redux/React-Native snippets**
- **Prettier - Code: formatter**
- **TypeScript Importer**

Click "Install" for each.

---

## Step 2: Open the Terminal

The **terminal** (also called command line or console) is where you type commands.

### On Windows
- Press `Win + X`
- Select "Windows Terminal" or "Command Prompt"
- Or press `Win + R`, type `cmd`, press Enter

### On Mac
- Press `Cmd + Space`
- Type "Terminal"
- Press Enter

### What You'll See
A black (or colored) window with something like:
```
C:\Users\YourName>
```
or
```
YourName@ComputerName ~ %
```

This is your **command prompt**. The text before the `>` or `%` shows where you are.

---

## Step 3: Basic Commands

Type these commands and press Enter:

### See where you are (Print Working Directory)
```bash
pwd
```
Shows your current location.

### List files
```bash
ls
```
(on Windows, you can also use `dir`)

Shows files and folders in your current location.

### Change directory
```bash
cd Documents
```
Moves into the Documents folder.

### Go up one level
```bash
cd ..
```

### Make a new folder
```bash
mkdir my-project
```
Creates a new folder called "my-project".

### Practice
Try this sequence:
```bash
pwd                    # See where you are
mkdir projects         # Make a folder
cd projects            # Enter it
pwd                    # Verify you're inside
mkdir ai-dashboard     # Make another folder
cd ai-dashboard        # Enter that
ls                     # See what's inside (empty!)
```

---

## Step 4: Install Node.js

**Node.js** runs JavaScript on your computer (not just in browsers).

### Download
1. Go to: https://nodejs.org
2. Click the green "LTS" (Long Term Support) button
3. Run the installer
4. Click "Next" through all the prompts

### Verify Installation
Open a terminal and type:
```bash
node --version
```

You should see something like:
```
v18.17.0
```

Also check npm:
```bash
npm --version
```

Should show:
```
9.6.7
```

**If you see version numbers, you're good!**

---

## Step 5: What Are Environment Variables?

Think of **environment variables** as settings that programs need. Like "secret notes" your computer keeps.

### Real-World Analogy
Imagine you have a robot assistant. Instead of telling it your address every time, you write it on a sticky note and stick it on the robot. Now the robot always knows where you live.

**Environment variables are like those sticky notes.**

### Common Uses
- **API Keys** — Secret passwords for services
- **Database URLs** — Where your data lives
- **Port Numbers** — Which network port to use
- **Configuration** — Settings that change by computer

### Setting Them (Windows)
1. Open Start Menu
2. Search for "Environment Variables"
3. Click "Edit the system environment variables"
4. Click "Environment Variables" button
5. Click "New" under User variables
6. Name: `MY_VARIABLE`
7. Value: `my_value`
8. Click OK

### Setting Them (Mac/Linux)
In terminal:
```bash
export MY_VARIABLE="my_value"
```

To make it permanent, add to `~/.bashrc` or `~/.zshrc`.

### Using in Code
In your AI Dashboard, you'll create a `.env` file:
```
OLLAMA_API_URL=http://localhost:11434
OPENROUTER_API_KEY=your_key_here
DATABASE_PATH=./data/assistant.db
```

Your code reads these automatically.

---

## Step 6: Set Up Your Project

Now let's create your AI Dashboard project folder.

### Create the Folder Structure
```bash
# Go to your home directory
cd ~

# Create the main folder
mkdir ai-dashboard
cd ai-dashboard

# Create subfolders
mkdir src
mkdir src/app
mkdir src/lib
mkdir src/components
mkdir data
mkdir docs
mkdir public

# Check your work
ls
```

You should see: `data`, `docs`, `public`, `src`

---

## Step 7: Verify Everything Works

Let's create a simple test file.

### Create a Test File
In VS Code:
1. Click "Open Folder" and select your `ai-dashboard` folder
2. Click the "New File" icon in the left sidebar
3. Name it `test.js`
4. Type this code:

```javascript
console.log('Hello, AI Dashboard!');
console.log('Node version:', process.version);
console.log('Current directory:', process.cwd());
```

### Run It
In terminal:
```bash
node test.js
```

**You should see:**
```
Hello, AI Dashboard!
Node version: v18.17.0
Current directory: C:\Users\YourName\ai-dashboard
```

**If you see this output, everything works!**

---

## Step 8: Getting the Code from GitHub

This book comes with a complete, working codebase you can download and run. Let's learn about **GitHub** and how to use it.

### What is GitHub?

**GitHub** is like Google Drive for code, but better:
- Stores code online (cloud backup)
- Tracks all changes (version control)
- Lets many people collaborate
- Shows issues and features (project management)
- Free for open-source projects

**Think of it as:**
- A backup of your code
- A history of every change
- A way to share with others
- A place to report bugs and request features

### What is Git?

**Git** is the tool that tracks changes. GitHub is the website that hosts Git repositories.

**The Difference:**
| Git | GitHub |
|-----|--------|
| The tool | The service |
| Runs locally | Runs in the cloud |
| Tracks changes | Hosts repositories |
| Free software | Freemium service |

You need both: Git for tracking, GitHub for sharing.

---

### Installing Git

#### On Windows
1. Go to: https://git-scm.com/download/win
2. Download the installer
3. Run it and click "Next" through all prompts
4. Git Bash will be installed (a terminal for Git commands)

#### On Mac
1. Open Terminal
2. Type: `git --version`
3. If not installed, macOS will prompt you to install Xcode Tools
4. Click "Install"

#### On Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install git
```

#### Verify Installation
```bash
git --version
```
You should see: `git version 2.x.x`

---

### Getting This Project's Code

The complete code for this book is on GitHub. Here's how to get it:

#### Option 1: Clone with Git (Recommended)

```bash
# Navigate to where you want the project
cd ~/projects

# Clone the repository
git clone https://github.com/norhtecmbarnes-dot/PersonalAI-Dashboard.git

# Enter the project folder
cd PersonalAI-Dashboard

# Install dependencies
npm install

# Copy the example environment file
cp .env.example .env.local

# Start the development server
npm run dev
```

**What Each Command Does:**
- `git clone` — Downloads a copy of the entire project
- `npm install` — Installs all required packages
- `cp .env.example .env.local` — Creates your local settings file
- `npm run dev` — Starts the development server

#### Option 2: Download ZIP

If you don't want to use Git:

1. Go to: https://github.com/norhtecmbarnes-dot/PersonalAI-Dashboard
2. Click the green "Code" button
3. Select "Download ZIP"
4. Extract the ZIP file
5. Open the folder in VS Code
6. Open terminal and run:
```bash
npm install
cp .env.example .env.local
npm run dev
```

#### Option 3: GitHub Desktop

If you prefer a graphical interface:

1. Download GitHub Desktop: https://desktop.github.com
2. Sign in with your GitHub account
3. Click "Clone a repository from the Internet"
4. Paste: `https://github.com/norhtecmbarnes-dot/PersonalAI-Dashboard`
5. Click "Clone"

---

### Understanding the Repository

When you clone this project, you get:

```
personalai-dashboard/
├── src/                  # Source code
│   ├── app/             # Pages and API routes
│   ├── lib/             # Core libraries
│   └── components/      # UI components
├── book/                # This book (lessons)
├── docs/                # Documentation
├── data/                # SQLite database (auto-created)
├── public/              # Static files
├── package.json         # Dependencies list
├── .env.example         # Environment template
├── README.md            # Project overview
└── LICENSE              # MIT License
```

**Key Files to Know:**
- `package.json` — Lists all packages needed
- `.env.example` — Template for environment variables
- `README.md` — Quick start guide
- `src/app/` — Where pages live

---

### Setting Up Environment Variables

This project needs some configuration. Copy the example file:

```bash
cp .env.example .env.local
```

Then edit `.env.local` with your settings:

```bash
# Open in your editor
nano .env.local
# Or in VS Code
code .env.local
```

**What You'll Configure:**
| Variable | What It Does | Required? |
|----------|--------------|-----------|
| `OLLAMA_API_URL` | Where Ollama runs | Yes (default works) |
| `OLLAMA_API_KEY` | For Ollama Cloud web search | Optional |
| `OPENROUTER_API_KEY` | Cloud model access | Optional |
| `GLM_API_KEY` | GLM model access | Optional |
| `DEEPSEEK_API_KEY` | DeepSeek model access | Optional |

**For local-only (free) use:**
You don't need any API keys! Just use local models with Ollama.

**For cloud models:**
1. Get an API key from the provider (OpenRouter, GLM, etc.)
2. Add it to your `.env.local` file
3. Restart the dev server

---

### Installing Dependencies

The `npm install` command downloads all required packages:

```bash
npm install
```

**What It Does:**
1. Reads `package.json` 
2. Downloads all packages listed
3. Creates `node_modules/` folder
4. Creates `package-lock.json` (exact versions)

**If You Get Errors:**
- Make sure Node.js is installed
- Try: `npm cache clean --force`
- Delete `node_modules` and `package-lock.json`, then run `npm install` again

---

### Running the Development Server

```bash
npm run dev
```

**What Happens:**
1. Next.js starts a local server
2. Opens at: http://localhost:3000
3. Watches for file changes
4. Auto-reloads when you save

**Open in Browser:**
```
http://localhost:3000
```

You should see the AI Dashboard interface!

---

### Common Git Commands

Here are the Git commands you'll use most:

| Command | What It Does |
|---------|--------------|
| `git clone [url]` | Download a project |
| `git status` | See what changed |
| `git pull` | Get latest updates |
| `git log` | View history |
| `git diff` | See differences |

**For Contributors:**
| Command | What It Does |
|---------|--------------|
| `git add [file]` | Stage changes |
| `git commit -m "message"` | Save changes |
| `git push` | Upload to GitHub |

---

### Keeping Your Code Updated

As this project improves, you'll want the latest changes:

```bash
# In the project folder
git pull origin master
npm install  # In case new packages were added
npm run dev   # Restart with new code
```

**If You Made Changes:**
```bash
# Save your changes
git stash

# Get updates
git pull origin master

# Restore your changes
git stash pop
```

---

### Reporting Issues and Getting Help

Found a bug? Want a feature?

1. Go to: https://github.com/norhtecmbarnes-dot/PersonalAI-Dashboard/issues
2. Click "New Issue"
3. Describe the problem or feature
4. Submit

**Good Bug Reports Include:**
- What you were trying to do
- What happened instead
- Steps to reproduce
- Your system (Windows/Mac/Linux, Node version)

---

### Forking and Customizing

Want to make your own version?

**What is a Fork?**
A fork is your personal copy of someone else's project. You can modify it without affecting the original.

**How to Fork:**
1. Go to the repository on GitHub
2. Click "Fork" (top-right)
3. GitHub creates your copy
4. Clone your fork:
```bash
git clone https://github.com/YOUR-USERNAME/personalai-dashboard.git
```

**Keep Your Fork Updated:**
```bash
# Add the original as "upstream"
git remote add upstream https://github.com/norhtecmbarnes-dot/PersonalAI-Dashboard.git

# Get updates from upstream
git fetch upstream
git merge upstream/master
```

---

### The License: Open Source Freedom

This project uses dual licensing:

**Code: MIT License**
- ✅ Use commercially
- ✅ Modify freely
- ✅ Distribute
- ✅ No warranty

**Book Content: CC BY-SA 4.0**
- ✅ Share and adapt
- ✅ Commercial use allowed
- ⚠️ Must give attribution
- ⚠️ Changes must use same license

**What This Means:**
You can use this code for anything — personal projects, business products, teaching. Just don't sue us if something breaks!

---

### PROMPT YOU CAN USE

```
Create a README.md file for an open-source project that:
1. Explains what the project does in one sentence
2. Lists prerequisites (Node.js, etc.)
3. Shows installation steps with commands
4. Explains basic usage
5. Links to documentation
6. Includes a "Contributing" section
7. Shows the license and how to attribute

The project is: [your project description]
```

---

## Step 9: AI-Assisted Development Environment

Here's where this book takes a different path. Instead of just using VS Code alone, you'll learn to use **AI assistants** that help you write code. This dramatically speeds up development and helps you learn faster.

### Why AI-Assisted Development?

Remember the philosophy from Chapter 1? We treat AI as a **tool manager**. The same applies here — you're not replacing yourself with AI, you're managing tools that make you more productive.

**The benefits:**
- **Faster learning** — AI explains concepts as you go
- **Fewer errors** — AI catches mistakes before they happen
- **Better code** — AI suggests improvements you might not know about
- **24/7 help** — AI doesn't sleep, take breaks, or get frustrated

### Choosing Your AI Assistant

You have several options for AI-assisted development:

#### Option 1: OpenCode (Used in This Book)

**OpenCode** is a terminal-based AI coding assistant that runs locally with Ollama. This is what I used to write most of this book and the accompanying code.

**Why OpenCode?**
- Runs entirely on your machine (privacy first)
- Works with local models (no subscription required)
- Terminal-based (stays out of your way)
- Can read and edit files directly

**How I Set It Up:**
1. Install Ollama: https://ollama.com
2. Open terminal in your project folder
3. Run: `ollama run opencode`

That's it! Now you have an AI assistant in your terminal.

#### Option 2: VS Code with GitHub Copilot

If you prefer VS Code, GitHub Copilot is a popular choice:
1. Install VS Code
2. Install the GitHub Copilot extension
3. Sign in with your GitHub account (requires subscription)

**Pros:** Deep integration with VS Code
**Cons:** Requires subscription, data sent to cloud

#### Option 3: Cursor IDE

**Cursor** is a VS Code fork with AI built in:
1. Download from: https://cursor.sh
2. Open your project folder
3. Use Cmd+K (Mac) or Ctrl+K (Windows) to invoke AI

**Pros:** Very polished, good context awareness
**Cons:** Requires subscription for best features

---

### My Development Setup: GLM-5 + Kimi 2.5

Here's exactly how I developed this project. I used **two different AI models**, switching between them based on their strengths:

#### Primary Model: GLM-5 (via OpenCode)

**When to use GLM-5:**
- Writing TypeScript and JavaScript code
- Explaining technical concepts
- Debugging complex logic
- Refactoring code structure
- Writing documentation

**Strengths:**
- Excellent at code generation
- Good at explaining *why* something works
- Handles complex multi-file projects well
- Strong reasoning capabilities

**How I used it:**
```bash
ollama run opencode
# At the OpenCode prompt:
> "Create a Next.js API route that handles chat messages with streaming responses"
```

#### Secondary Model: Kimi 2.5 (Moonshot)

**When to use Kimi 2.5:**
- Long context tasks (reading entire files)
- Research and explanations
- Alternative perspective on problems
- When GLM-5 gets stuck

**Strengths:**
- Very long context window (can read more at once)
- Good at summarizing
- Different "thinking style" provides backup opinions
- Often catches things GLM-5 misses

**How I used it:**
```bash
> "Review the database schema we just created. What optimization opportunities do you see?"
```

#### The Workflow

Here's my typical development flow:

1. **Start with GLM-5**
   - Generate initial code
   - Get structure and logic right
   
2. **Switch to Kimi 2.5**
   - Review the code
   - Look for edge cases
   - Get a second opinion
   
3. **Iterate Back and Forth**
   - GLM-5: "Here's what Kimi suggested. Implement these changes."
   - Kimi: "Review the changes. Are there any issues?"
   
4. **Manual Testing**
   - I review and test the code personally
   - Make sure it meets my requirements
   - Adjust as needed

---

### Example Session

Here's a real example of how I developed a feature:

**Step 1: Start OpenCode**
```bash
cd ai-dashboard
ollama run opencode
```

**Step 2: Describe What I Want (GLM-5)**
```
> I need to add a task scheduler to the AI Dashboard. 
> It should:
> 1. Run tasks at scheduled intervals
> 2. Support recurring tasks (daily, weekly, etc.)
> 3. Log task results
> 4. Handle failures gracefully
> 
> Create the scheduler service in src/lib/services/task-scheduler.ts
```

**Step 3: Review with Kimi 2.5**
```
> Switch to kimi-2.5
> Review the task scheduler code. What edge cases might we have missed?
> What error handling should we add?
```

**Step 4: Implement Feedback (back to GLM-5)**
```
> Switch to glm-5
> Kimi suggested adding retry logic and better logging. 
> Implement those changes.
```

**Step 5: Test Manually**
```bash
# Exit OpenCode (Ctrl+D or 'exit')
npm run test
npm run dev
# Test in browser
```

---

### Other AI Models You Can Use

The beauty of this approach is you can use whatever models work best for you:

**Free/Local Models (via Ollama):**
| Model | Size | Best For |
|-------|------|----------|
| `qwen3.5:2b` | 2.3B | Fast responses, simple tasks |
| `qwen2.5:14b` | 14.8B | More capable, better reasoning |
| `llama4:scout` | 108.6B | Very capable (needs GPU) |
| `glm-4.7-flash` | 29.9B | Excellent multilingual |
| `deepseek-r1` | varies | Reasoning and analysis |

**Cloud Models (require API keys):**
| Model | Provider | Best For |
|-------|----------|----------|
| Claude | Anthropic | Complex reasoning, long context |
| GPT-4o | OpenAI | General purpose, multimodal |
| Gemini | Google | Multimodal, long context |
| DeepSeek | DeepSeek | Code generation, reasoning |

---

### Tips for AI-Assisted Development

#### DO:
- ✅ **Be specific** — The more detail you provide, the better the output
- ✅ **Ask for explanations** — "Explain how this works" helps you learn
- ✅ **Request alternatives** — "Show me three ways to do this"
- ✅ **Review code yourself** — Never blindly trust AI output
- ✅ **Use multiple models** — Get different perspectives

#### DON'T:
- ❌ **Copy without understanding** — You won't learn
- ❌ **Ignore security** — AI can produce insecure code
- ❌ **Skip testing** — Always verify AI output works
- ❌ **Ask for malware** — AI assistants refuse harmful code

---

### How This Book Uses AI

Throughout this book, you'll see **"PROMPT YOU CAN USE"** boxes. These are ready-to-paste prompts for AI assistants:

```
PROMPT YOU CAN USE:
"Create a function that validates email addresses. 
Return true if valid, false otherwise. 
Include tests for common edge cases."
```

You can copy these prompts and paste them into:
- OpenCode (terminal)
- Claude (web)
- ChatGPT (web)
- Cursor IDE
- GitHub Copilot chat

The prompts are designed to give you **working code** that you can then study, modify, and learn from.

---

### Why Two Models Works Better Than One

Using multiple AI models is like having a team of consultants:

**GLM-5** is your primary developer:
- Fast and competent
- Good at generating code
- Understands project structure

**Kimi 2.5** is your code reviewer:
- Catches things others miss
- Different perspective
- Good at finding edge cases

**You** are the project manager:
- Make final decisions
- Ensure quality
- Understand business requirements
- Take responsibility

This three-party approach produces better code than any single AI alone.

---

### Setting Up Your AI Environment

**Option A: Free & Private (Recommended for this book)**

```bash
# 1. Install Ollama
# Visit https://ollama.com and download

# 2. Pull the models
ollama pull glm-4.7-flash
ollama pull qwen2.5:14b

# 3. Create your .env file with API keys (optional)
# See .env.example for available options

# 4. Start the AI Dashboard
npm run dev
```

**Option B: Cloud-Based (Requires subscription)**

1. Sign up for Claude (Anthropic) or ChatGPT Plus (OpenAI)
2. Use VS Code with Copilot or Cursor IDE
3. Keep this book open alongside your editor

**Option C: Hybrid (Best of both)**

```bash
# Local models for daily development (free)
ollama run glm-4.7-flash

# Cloud models for complex tasks (paid)
# Use API keys in .env.local for:
# - OPENROUTER_API_KEY (Claude, GPT-4, etc.)
# - GLM_API_KEY (GLM models)
# - DEEPSEEK_API_KEY (DeepSeek)
```

---

### PROMPT YOU CAN USE

Here's a prompt to set up AI-assisted development:

```
I want to set up an AI-assisted development environment.

My setup:
- Operating System: [Windows/Mac/Linux]
- Code Editor: [VS Code/Cursor/Other]
- Goal: Build AI applications locally

Recommend:
1. Which AI models should I use?
2. How do I install them?
3. What's the best workflow for my situation?

Consider: I want privacy (local models preferred) but high quality output.
```

---

Want to generate a setup script? Use this:

```
Create a shell script (setup.sh for Mac/Linux or setup.bat for Windows) that:
1. Creates a project folder structure
2. Creates src/, data/, docs/, public/ folders
3. Creates a README.md with project description
4. Outputs "Setup complete!" when finished

Include comments explaining each command.
```

---

## Key Takeaways

✅ **VS Code** — Your code editor (free and powerful)

✅ **Terminal** — Where you type commands

✅ **Basic commands** — pwd, ls, cd, mkdir

✅ **Node.js** — Runs JavaScript on your computer

✅ **Environment variables** — Settings programs need

✅ **Project structure** — Organized folders for your code

✅ **GitHub** — Cloud storage for code with version control

✅ **Git clone** — Download projects from GitHub

✅ **AI-assisted development** — Use AI as a tool manager, code faster

✅ **Multiple models** — GLM-5 for code, Kimi for review (or your choice)

---

**Next: Chapter 5 - What is Programming?**


# Chapter 5: What is Programming? (Learning to Give Instructions)

Programming is just giving instructions to computers. But unlike humans, computers are extremely literal. This chapter will teach you how to think like a programmer.

## What You'll Learn

- What **programming** actually means
- Why computers need precise instructions
- Basic programming concepts
- Your first lines of code
- How to think algorithmically
- Debugging basics

---

## The Robot Butler Analogy

Imagine you have a robot butler. It's very smart but extremely literal.

**You say:** "Make me a sandwich"

**The robot:** Stands still, confused. Make you a sandwich? How?

**You need to say:**
```
1. Go to the refrigerator
2. Open the refrigerator door
3. Take out bread, ham, cheese, and mustard
4. Close the refrigerator door
5. Go to the counter
6. Place two slices of bread on the counter
7. Put ham on one slice
8. Put cheese on top of the ham
9. Spread mustard on the other slice
10. Put the slices together
11. Cut the sandwich in half
12. Put it on a plate
13. Bring it to me
```

**That's programming.**

You're breaking a task into tiny, specific steps that can't be misunderstood.

---

## Why Computers Are So Literal

Computers don't "fill in the gaps." They do exactly what you tell them — nothing more, nothing less.

### Example of Being Too Vague
```javascript
// This won't work
makeSandwich();

// Error: "makeSandwich is not defined"
```

### Example of Being Specific
```javascript
// Step by step
const bread = getBread();
const ham = getHam();
const cheese = getCheese();
const sandwich = assembleSandwich(bread, ham, cheese);
serve(sandwich);
```

**Every function must be defined. Every variable must be declared. Every step must be explicit.**

---

## Your First Code

Let's write something simple. Open VS Code and create a file called `hello.js`:

```javascript
// This is a comment - computers ignore it
// Comments are for humans

console.log('Hello, World!');
```

Save it and run in terminal:
```bash
node hello.js
```

**Output:**
```
Hello, World!
```

**Congratulations! You just wrote and ran your first program.**

---

## Basic Concepts

### 1. Variables (Storing Data)

Think of variables as labeled boxes where you store things:

```javascript
// Creating variables
const name = 'Alice';           // Text (string)
const age = 30;                 // Number
const isStudent = true;         // Boolean (true/false)
const hobbies = ['reading', 'coding'];  // List (array)

// Using variables
console.log(name);        // Alice
console.log(age);         // 30
console.log(hobbies[0]);  // reading
```

### 2. Functions (Reusable Instructions)

Functions are like recipes — instructions you can use over and over:

```javascript
// Define a function
function greet(name) {
  return 'Hello, ' + name + '!';
}

// Use the function
console.log(greet('Alice'));  // Hello, Alice!
console.log(greet('Bob'));    // Hello, Bob!
```

### 3. Conditionals (Making Decisions)

```javascript
function checkAge(age) {
  if (age >= 18) {
    return 'You are an adult';
  } else {
    return 'You are a minor';
  }
}

console.log(checkAge(25));  // You are an adult
console.log(checkAge(15));  // You are a minor
```

### 4. Loops (Doing Things Repeatedly)

```javascript
// Count from 1 to 5
for (let i = 1; i <= 5; i++) {
  console.log(i);
}

// Output:
// 1
// 2
// 3
// 4
// 5
```

---

## Thinking Like a Programmer

### Break Problems Down

**Big problem:** "Build an AI Dashboard"

**Broken down:**
1. Create a web page
2. Add a text input box
3. Add a send button
4. When clicked, get the text
5. Send it to an AI
6. Get the response
7. Display the response

### Be Specific

**Vague:** "Get user input"

**Specific:**
```javascript
const inputElement = document.getElementById('user-input');
const userMessage = inputElement.value;
inputElement.value = '';  // Clear the input
```

### Handle Edge Cases

What if:
- The user doesn't type anything?
- The AI service is down?
- The response takes too long?
- The user sends 1000 messages at once?

Good programmers think about these scenarios.

---

## Debugging Basics

**Bugs** are mistakes in your code. **Debugging** is finding and fixing them.

### Common Bugs

**Syntax Error** — Code is malformed:
```javascript
console.log('Hello'  // Missing closing parenthesis
// Error: Unexpected end of input
```

**Logic Error** — Code runs but does the wrong thing:
```javascript
function add(a, b) {
  return a - b;  // Should be a + b!
}

console.log(add(2, 3));  // -1 (should be 5)
```

### Debugging Techniques

**1. Console Logging:**
```javascript
function calculate(x, y) {
  console.log('Input x:', x);  // See what x is
  console.log('Input y:', y);  // See what y is
  const result = x * y;
  console.log('Result:', result);  // See the result
  return result;
}
```

**2. Read Error Messages:**
```
TypeError: Cannot read property 'name' of undefined
    at getUserName (app.js:15:23)
```

This tells you:
- **TypeError:** Wrong type of data
- **Cannot read property:** Tried to access something that doesn't exist
- **app.js:15:23:** File, line 15, column 23

**3. Check Your Assumptions:**
What do you think the value is? What is it actually?

```javascript
console.log(typeof myVariable);  // Check the type
console.log(JSON.stringify(myObject, null, 2));  // See the full object
```

---

## PROMPT YOU CAN USE

Want to practice? Try this:

```
Create a JavaScript program that:
1. Asks for the user's name (use a variable)
2. Asks for their birth year
3. Calculates their age
4. Prints a greeting with their name and age
5. If they're 18 or older, say "You're an adult"
6. Otherwise, say "You're still growing!"

Include comments explaining each step.
```

---

## Key Takeaways

✅ **Programming** = Giving precise instructions

✅ **Computers are literal** — They do exactly what you say

✅ **Variables** store data

✅ **Functions** are reusable instructions

✅ **Conditionals** make decisions

✅ **Loops** repeat actions

✅ **Debugging** is finding and fixing mistakes

---

**Next: Chapter 6 - What is a Database?**


# Chapter 6: What is a Database? (Storing Information)

Your AI Dashboard needs to remember things: conversations, documents, user settings. That's where **databases** come in. This chapter explains what they are and why they're essential.

## What You'll Learn

- What a **database** is
- **SQL vs NoSQL** databases
- How data is organized (tables, rows, columns)
- Basic database operations
- **SQLite** — the database we'll use
- Your first database queries

---

## The Filing Cabinet Analogy

Imagine you run a small business. You have customer information to track.

**Without a Database (Chaos):**
- Customer info on sticky notes
- Orders written in different notebooks
- Receipts in shoeboxes
- No organization
- Can't find anything quickly
- Information gets lost

**With a Database (Organized):**
- Everything in a filing cabinet
- Organized by customer
- Each customer has a folder
- Folders contain forms with consistent fields
- Easy to find, update, or remove

**A database is like a super-powered filing cabinet.**

---

## The Spreadsheet Analogy

You've probably used Excel or Google Sheets. A database is similar but more powerful.

### Spreadsheet (Simple)
```
| Name    | Email             | Phone        |
|---------|-------------------|--------------|
| Alice   | alice@email.com   | 555-0100     |
| Bob     | bob@email.com     | 555-0101     |
| Carol   | carol@email.com   | 555-0102     |
```

### Database Table (Powerful)
Same data, but with:
- **Constraints** — Email must be unique
- **Validation** — Phone must be 10 digits
- **Relationships** — Link to orders table
- **Queries** — Find all customers in California
- **Security** — Only certain users can edit
- **Performance** — Find any record in milliseconds

---

## Types of Databases

### 1. SQL Databases (Relational)

Use **Structured Query Language**. Data is organized in tables with relationships.

**Examples:** SQLite, PostgreSQL, MySQL, SQL Server

**Best for:**
- Structured data
- Complex queries
- Data integrity
- Relationships between data

### 2. NoSQL Databases (Non-Relational)

Store data in flexible formats like documents or key-value pairs.

**Examples:** MongoDB, Redis, DynamoDB, Cassandra

**Best for:**
- Unstructured data
- High speed
- Massive scale
- Flexible schemas

### What We'll Use: SQLite

**SQLite** is:
- **File-based** — No separate server needed
- **Lightweight** — Perfect for local apps
- **Serverless** — Runs in your application
- **Zero configuration** — Works out of the box
- **Battle-tested** — Used everywhere (phones, browsers, apps)

---

## Database Concepts

### Tables

A **table** is like a spreadsheet. It has:
- **Columns** (fields) — Name, Email, Phone
- **Rows** (records) — Each customer

```sql
CREATE TABLE customers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Primary Keys

Every row needs a unique identifier:
```sql
id INTEGER PRIMARY KEY
```

This is like a customer number that never changes.

### Relationships

Tables can be connected:

```sql
-- Customers table
CREATE TABLE customers (
  id INTEGER PRIMARY KEY,
  name TEXT
);

-- Orders table (linked to customers)
CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER,
  total DECIMAL,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);
```

Each order "belongs to" a customer.

---

## Basic Operations (CRUD)

### CREATE (Insert Data)
```sql
INSERT INTO customers (name, email) 
VALUES ('Alice', 'alice@email.com');
```

### READ (Query Data)
```sql
-- Get all customers
SELECT * FROM customers;

-- Get specific customer
SELECT * FROM customers WHERE name = 'Alice';

-- Get customers ordered by name
SELECT * FROM customers ORDER BY name;
```

### UPDATE (Modify Data)
```sql
UPDATE customers 
SET email = 'alice.new@email.com' 
WHERE name = 'Alice';
```

### DELETE (Remove Data)
```sql
DELETE FROM customers WHERE name = 'Alice';
```

---

## In Your AI Dashboard

Your Dashboard uses SQLite to store:

### 1. Conversations
```sql
CREATE TABLE chat_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT,
  role TEXT,  -- 'user' or 'assistant'
  content TEXT,
  timestamp INTEGER
);
```

### 2. Documents
```sql
CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  filename TEXT,
  content TEXT,
  file_type TEXT,
  uploaded_at INTEGER
);
```

### 3. Scheduled Tasks
```sql
CREATE TABLE scheduled_tasks (
  id TEXT PRIMARY KEY,
  name TEXT,
  task_type TEXT,
  schedule TEXT,
  enabled BOOLEAN,
  last_run INTEGER
);
```

---

## Your First Query

Let's try a real query. In your project, create a file called `database.js`:

```javascript
// Simple database example
const sqlite3 = require('sqlite3').verbose();

// Create or open database
const db = new sqlite3.Database('./mydata.db');

// Create a table
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT
  )
`);

// Insert data
db.run(
  'INSERT INTO users (name, email) VALUES (?, ?)',
  ['Alice', 'alice@example.com']
);

// Query data
db.all('SELECT * FROM users', [], (err, rows) => {
  if (err) {
    console.error(err);
  } else {
    console.log('Users:', rows);
  }
});

// Close database
db.close();
```

Run it:
```bash
node database.js
```

You'll see:
```
Users: [ { id: 1, name: 'Alice', email: 'alice@example.com' } ]
```

**You just created a database, added data, and read it back!**

---

## PROMPT YOU CAN USE

Practice with this:

```
Create a SQLite database with a "tasks" table that has:
- id (primary key)
- title (text)
- completed (boolean, default false)
- created_at (timestamp)

Write JavaScript code that:
1. Creates the table
2. Adds 3 sample tasks
3. Marks one task as completed
4. Queries and displays all tasks
5. Deletes the completed task
6. Shows the final list

Include comments for each SQL operation.
```

---

## Key Takeaways

✅ **Database** = Organized storage for data

✅ **SQL** = Language for querying databases

✅ **Tables** have rows (records) and columns (fields)

✅ **SQLite** = File-based, perfect for local apps

✅ **CRUD** = Create, Read, Update, Delete

✅ **Primary keys** uniquely identify records

✅ **Relationships** connect tables

---

**Next: Chapter 7 - Understanding the Project Structure**


# Chapter 7: Understanding the Project Structure

When you first see all the folders and files, it can feel overwhelming. Let's break it down, piece by piece. By the end of this chapter, you'll know exactly what each file does.

## What You'll Learn

- The **folder structure** and what each folder means
- Key **configuration files** and their purpose
- The **src/app** directory (Next.js pages)
- The **src/lib** directory (reusable code)
- How files connect to each other
- Understanding imports and exports

---

## The Big Picture

Here's your AI Dashboard structure:

```
ai-dashboard/
├── .env.local              # Secret settings (API keys, passwords)
├── .gitignore              # Files Git should ignore
├── next.config.js          # Next.js configuration
├── package.json            # Project dependencies
├── tsconfig.json           # TypeScript settings
├── README.md               # Project documentation
│
├── src/
│   ├── app/                # Next.js pages (what users see)
│   │   ├── page.tsx        # Home page
│   │   ├── layout.tsx      # Page wrapper
│   │   ├── api/            # API routes
│   │   ├── documents/      # Documents page
│   │   ├── brand-workspace/ # Brand workspace page
│   │   └── ...
│   │
│   ├── lib/                # Shared code and utilities
│   │   ├── agent/          # AI agents (book writer, security, etc.)
│   │   ├── database/       # Database operations
│   │   ├── models/         # AI model integrations
│   │   ├── services/       # Business logic
│   │   └── writing/        # Writing tools
│   │
│   ├── components/         # Reusable UI components
│   │   ├── chat/           # Chat-related components
│   │   ├── documents/      # Document components
│   │   └── ui/             # Generic UI components
│   │
│   └── instrumentation.ts  # Server startup code
│
├── data/                   # Data storage
│   ├── assistant.db        # SQLite database
│   ├── MEMORY.md           # Persistent memory
│   └── ...
│
├── docs/                   # Documentation
├── public/                 # Static files (images, etc.)
└── scripts/                # Utility scripts
```

---

## Key Files Explained

### package.json
Like a shopping list for your project. Lists:
- Dependencies (libraries you use)
- Scripts (commands you can run)
- Project metadata

```json
{
  "name": "ai-dashboard",
  "version": "1.0.0",
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "sqlite3": "^5.1.0"
  },
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  }
}
```

### next.config.js
Settings for Next.js:
```javascript
const nextConfig = {
  experimental: {
    instrumentationHook: true,  // Enable instrumentation
  },
  // ... other settings
};
```

### .env.local
**Secret settings** — never commit this to Git!
```
OLLAMA_API_URL=http://localhost:11434
OPENROUTER_API_KEY=your_secret_key_here
```

### tsconfig.json
TypeScript compiler settings. Don't worry about this for now.

---

## The src/app Directory

This is where your **pages** live. In Next.js:

- **Files = Pages** — Every file becomes a route
- **Folders = Routes** — Folders create URL paths

### How It Works

| File Path | URL Path | What It Does |
|-----------|----------|--------------|
| `src/app/page.tsx` | `/` | Home page |
| `src/app/documents/page.tsx` | `/documents` | Documents page |
| `src/app/brand-workspace/page.tsx` | `/brand-workspace` | Brand workspace |
| `src/app/api/chat/route.ts` | `/api/chat` | Chat API endpoint |

### Example Page

```typescript
// src/app/page.tsx
export default function HomePage() {
  return (
    <div>
      <h1>Welcome to AI Dashboard</h1>
      <p>Your personal AI assistant</p>
    </div>
  );
}
```

### API Routes

Files in `src/app/api/` create backend endpoints:

```typescript
// src/app/api/chat/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json();
  const { message } = body;
  
  // Call AI model...
  const response = await getAIResponse(message);
  
  return NextResponse.json({ response });
}
```

---

## The src/lib Directory

This is where **reusable code** lives.

### src/lib/database/
Database operations:
```typescript
// src/lib/database/sqlite.ts
export function getMessages() {
  // Query database
}

export function saveMessage(msg) {
  // Insert into database
}
```

### src/lib/services/
Business logic:
```typescript
// src/lib/services/task-scheduler.ts
export class TaskScheduler {
  async runTask(task) {
    // Run scheduled tasks
  }
}
```

### src/lib/agent/
AI agents:
```typescript
// src/lib/agent/book-writer.ts
export function writeChapter(chapterNum) {
  // Generate book content
}
```

---

## How Files Talk to Each Other

### Imports

Use `@/` to reference the `src` folder:

```typescript
// In src/app/page.tsx
import { sqlDatabase } from '@/lib/database/sqlite';
import { ChatComponent } from '@/components/chat/ChatComponent';
```

### Exports

```typescript
// In src/lib/utils.ts
export function formatDate(date) {
  return date.toLocaleDateString();
}

// Default export (only one per file)
export default function mainFunction() {
  // ...
}
```

### Using Exports

```typescript
// Named imports
import { formatDate } from '@/lib/utils';

// Default import
import mainFunction from '@/lib/utils';

// Both
import mainFunction, { formatDate } from '@/lib/utils';
```

---

## The One File, One Responsibility Principle

Good code organization means each file does **one thing**:

✅ **Good:**
```
src/
├── lib/
│   ├── database/
│   │   ├── sqlite.ts          # Database connection
│   │   └── queries.ts         # Query functions
│   ├── services/
│   │   ├── chat.ts            # Chat logic
│   │   └── documents.ts       # Document logic
```

❌ **Bad:**
```
src/
├── lib/
│   └── everything.ts          # All code in one file (messy!)
```

---

## PROMPT YOU CAN USE

Want to generate a project structure?

```
Create a Next.js app router structure for an AI dashboard with:
1. Home page (src/app/page.tsx)
2. Documents page (src/app/documents/page.tsx)
3. Chat API (src/app/api/chat/route.ts)
4. Database utilities (src/lib/database/index.ts)
5. Chat component (src/components/chat/Chat.tsx)

Show the folder structure and provide a brief description of each file's purpose.
```

---

## Key Takeaways

✅ **src/app/** — Pages and API routes

✅ **src/lib/** — Shared code and utilities

✅ **src/components/** — Reusable UI components

✅ **data/** — Database and persistent storage

✅ **package.json** — Dependencies and scripts

✅ **.env.local** — Secret settings (never commit!)

✅ **@/** — Shortcut to src folder

---

**Next: Chapter 8 - Prompt Templates**


# Chapter 8: Prompt Templates - How to Talk to AI Tools

You've installed everything and understand the project structure. Now comes the most important skill: **how to communicate with AI tools**. This chapter teaches you the art of prompting — the difference between mediocre results and exceptional ones.

## What You'll Learn

- Why **prompts matter** (garbage in, garbage out)
- The **anatomy of a good prompt**
- **Prompt templates** you can reuse
- **Context windows** and why they matter
- **Chain-of-thought** prompting
- **Role prompting** and persona design
- Common prompting mistakes
- Building your own prompt library

---

## The Waiter Analogy

Imagine you're at a restaurant. The AI is your waiter, and your prompt is your order.

**Bad Order (Vague Prompt):**
"Bring me food."

**What You Get:** Random surprise. Might be good, probably not what you wanted.

**Better Order (Specific Prompt):**
"I'd like a grilled chicken sandwich with lettuce, tomato, and mayo on wheat bread. No onions. Side of fries."

**What You Get:** Exactly what you asked for.

**Best Order (Complete Prompt with Context):**
"I have a gluten allergy. Please bring me a grilled chicken sandwich with lettuce and tomato on a gluten-free bun. No mayo — I'm watching calories. Side salad instead of fries, balsamic dressing on the side. I'm in a hurry — meeting in 20 minutes."

**What You Get:** Safe, appropriate, and timely.

**A good prompt includes:**
- **Role** — Who the AI should be
- **Context** — Background information
- **Task** — What to do specifically
- **Format** — How to structure the output
- **Constraints** — What to avoid or include

---

## The Anatomy of a Great Prompt

Here's a template that works every time:

```
ROLE: [Who should the AI be?]

CONTEXT: [What background does it need?]

TASK: [What specific action should it take?]

FORMAT: [How should the output look?]

CONSTRAINTS: [What to avoid or include?]

EXAMPLE: [Show it what good looks like]
```

### Let's Break This Down

**ROLE:**
- "You are an expert software architect"
- "You are a patient teacher explaining to a beginner"
- "You are a code reviewer focused on security"

**CONTEXT:**
- "This is a Next.js application using TypeScript"
- "The user is a complete beginner who has never programmed"
- "We're building a feature for healthcare compliance"

**TASK:**
- "Write a function that validates email addresses"
- "Explain what a database is using analogies"
- "Review this code for potential bugs"

**FORMAT:**
- "Provide your answer as bullet points"
- "Show code first, then explanation"
- "Use a before/after comparison table"

**CONSTRAINTS:**
- "Do not use external libraries"
- "Keep it under 100 lines"
- "Avoid jargon; explain technical terms"

**EXAMPLE:**
- Show what the output should look like

---

## Real Examples from the AI Dashboard

### Example 1: Code Generation

```
ROLE: You are an expert TypeScript developer specializing in Next.js applications.

CONTEXT: We are building an AI Dashboard with SQLite database. The user needs to 
upload documents and store them in the database with metadata.

TASK: Create a Next.js API route that:
1. Accepts file uploads via POST request
2. Validates file type (PDF, DOCX, TXT only)
3. Saves file to local storage
4. Creates a database record with metadata
5. Returns success/error response

FORMAT: Provide:
- Complete code for src/app/api/documents/upload/route.ts
- Brief comments explaining key parts
- Error handling for edge cases

CONSTRAINTS:
- Use TypeScript with proper types
- Include input validation
- Handle file size limits (max 10MB)
- Return proper HTTP status codes

EXAMPLE:
Success response: { success: true, documentId: "uuid", filename: "report.pdf" }
Error response: { success: false, error: "File too large" }
```

### Example 2: Explanation with Analogies

```
ROLE: You are a patient teacher who explains technical concepts using everyday analogies.

CONTEXT: The reader is a complete beginner who has never programmed before. They 
are learning about APIs for the first time.

TASK: Explain what an API is and why it's useful.

FORMAT: 
- Start with a relatable analogy (restaurant, vending machine, etc.)
- Explain the analogy in detail
- Connect it back to actual APIs
- Provide a simple code example
- End with "Key Takeaways" bullet points

CONSTRAINTS:
- No jargon without explanation
- Keep analogies concrete and relatable
- Use plain English
- Maximum 500 words

EXAMPLE:
"Think of an API like a waiter at a restaurant..."
```

### Example 3: Code Review

```
ROLE: You are a senior code reviewer focused on security, performance, and maintainability.

CONTEXT: This code is from an AI Dashboard application. It handles user authentication 
and database queries. Security is critical.

TASK: Review the following code and provide:
1. Security concerns (if any)
2. Performance issues (if any)
3. Code style improvements
4. Overall grade (A-F) with explanation

FORMAT:
- Use emoji indicators: 🚨 Security, ⚡ Performance, 🎨 Style, ✅ Good
- Group by severity: Critical, Warning, Suggestion
- Provide code examples for fixes

CONSTRAINTS:
- Be direct but constructive
- Explain why each issue matters
- Prioritize security issues first

EXAMPLE:
🚨 CRITICAL: SQL Injection Risk
Current code: db.query(`SELECT * FROM users WHERE id = ${userId}`)
Fix: Use parameterized queries: db.query("SELECT * FROM users WHERE id = ?", [userId])
Why: User input is directly inserted into SQL, allowing malicious injection.
```

---

## Understanding Context Windows

AI models have **context windows** — a limit on how much text they can "remember" at once.

### The Notebook Analogy

Imagine you're solving a math problem, but you can only have one page of notebook paper. You have to fit:
- The problem statement
- Your work
- The answer

If the problem is too long, you run out of space.

**Context Window Sizes:**
- GPT-3.5: ~4,000 tokens (~3,000 words)
- GPT-4: ~8,000-32,000 tokens
- Claude: ~100,000+ tokens
- Local models (Llama, etc.): ~2,000-8,000 tokens

**One token ≈ 0.75 words**

### Implications for Prompting

**What this means:**
1. **Be concise** — Don't repeat yourself
2. **Prioritize** — Most important info first
3. **Summarize** — Replace long examples with summaries
4. **Chunk work** — Break large tasks into smaller ones

**Example: Bad (Wastes Context)**
```
Here is my entire codebase:
[paste 5000 lines of code]
Now I have a question about line 10...
```

**Example: Good (Efficient)**
```
I have a function at src/lib/database.ts line 45 that queries users.

function getUser(id: string) {
  return db.query(`SELECT * FROM users WHERE id = ${id}`);
}

Is this vulnerable to SQL injection? If yes, show me the fix.
```

---

## Chain-of-Thought Prompting

Sometimes you want the AI to **show its work** — not just give an answer, but explain how it got there.

### When to Use It

- Complex logic or calculations
- Debugging mysterious bugs
- Understanding the AI's reasoning
- Learning from the AI's approach

### How to Do It

Add this to your prompt:
```
"Think step by step and explain your reasoning before giving the final answer."
```

### Example

```
TASK: Debug why this function returns the wrong date.

function getNextMonday(date: Date): Date {
  const day = date.getDay();
  const daysUntilMonday = 8 - day;
  const nextMonday = new Date(date);
  nextMonday.setDate(date.getDate() + daysUntilMonday);
  return nextMonday;
}

Think step by step and explain your reasoning before giving the final answer.
```

**Why this helps:**
- You see where the AI's logic might be wrong
- You learn debugging techniques
- The AI catches its own mistakes
- You can correct misunderstandings

---

## Role Prompting and Personas

The AI can adopt different personas. Choose based on what you need:

### Common Personas

| Persona | Use Case |
|---------|----------|
| **Expert Developer** | Code review, architecture decisions |
| **Patient Teacher** | Explaining concepts to beginners |
| **Security Analyst** | Finding vulnerabilities |
| **Technical Writer** | Documentation and guides |
| **DevOps Engineer** | Deployment and infrastructure |
| **Product Manager** | Feature planning and user stories |
| **UX Designer** | Interface and user experience |

### Advanced: Layering Personas

You can combine roles:

```
ROLE: You are a security-focused developer who explains findings like a patient 
teacher. Find vulnerabilities in my code, then explain each one as if I'm a 
beginner who wants to learn why it's dangerous and how to fix it.
```

---

## Common Prompting Mistakes

### ❌ Mistake 1: Being Too Vague

**Bad:** "Make this better"

**Better:** "Refactor this function to use async/await instead of callbacks, 
add input validation, and handle the case where the database returns null"

### ❌ Mistake 2: Not Providing Context

**Bad:** "Fix this error: Cannot read property 'name' of undefined"

**Better:** "I'm getting 'Cannot read property name of undefined' on line 23 
of src/components/UserProfile.tsx. Here's the code: [paste code]. The user 
object comes from an API that sometimes returns null for deleted users. 
How should I handle this?"

### ❌ Mistake 3: Asking for Too Much at Once

**Bad:** "Build me a complete e-commerce website with user auth, payments, 
inventory, and admin dashboard"

**Better:** "Let's start with the user authentication. Create a simple login 
page with email and password fields, and an API route that validates 
credentials against a SQLite database."

### ❌ Mistake 4: Not Providing Examples

**Bad:** "Format this data nicely"

**Better:** "Format this data as a markdown table with columns: Name, Email, 
Role. Example:
| Name | Email | Role |
|------|-------|------|
| Alice | alice@example.com | Admin |"

### ❌ Mistake 5: Ignoring Constraints

**Bad:** "Write a function to process data"

**Better:** "Write a TypeScript function that processes an array of user 
objects. Constraints:
- Must handle up to 10,000 users efficiently
- Should not use external libraries
- Must return results in under 100ms
- Include error handling for malformed data"

---

## Building Your Prompt Library

As you work on the AI Dashboard, you'll reuse prompts. Create a personal library:

### Organize by Purpose

```
prompts/
├── code-generation/
│   ├── api-route.txt
│   ├── react-component.txt
│   ├── database-query.txt
│   └── test-file.txt
├── code-review/
│   ├── security-review.txt
│   ├── performance-review.txt
│   └── general-review.txt
├── explanation/
│   ├── explain-concept.txt
│   ├── debug-error.txt
│   └── compare-approaches.txt
└── documentation/
    ├── api-docs.txt
    ├── readme.txt
    └── changelog.txt
```

### Template Format

Each prompt file should include:

```markdown
# Prompt: Generate API Route

## Purpose
Create a Next.js API route with proper error handling

## Variables
- {ENDPOINT_NAME}: Name of the endpoint (e.g., "users", "documents")
- {HTTP_METHOD}: GET, POST, PUT, DELETE
- {REQUIREMENTS}: Specific functionality needed

## Template
ROLE: You are an expert Next.js developer...

CONTEXT: We are building an AI Dashboard...

TASK: Create an API route for {ENDPOINT_NAME} that handles {HTTP_METHOD} requests. 
Requirements: {REQUIREMENTS}

FORMAT: Provide complete code for src/app/api/{ENDPOINT_NAME}/route.ts

CONSTRAINTS:
- Use TypeScript with proper types
- Include error handling
- Return appropriate HTTP status codes

## Example Usage
Variables:
- ENDPOINT_NAME: documents
- HTTP_METHOD: POST
- REQUIREMENTS: Accept file uploads, validate PDF/DOCX/TXT, save to database

## Version History
- v1.0: Initial template
- v1.1: Added file upload example
```

---

## PROMPT YOU CAN USE

Here's a meta-prompt to help you write better prompts:

```
ROLE: You are an expert prompt engineer who helps others write better prompts.

CONTEXT: I'm building an AI Dashboard with Next.js, TypeScript, and SQLite. 
I need to communicate effectively with AI coding assistants.

TASK: Review this prompt and suggest improvements:

[PASTE YOUR PROMPT HERE]

FORMAT: Provide:
1. What's working well
2. Specific improvements with before/after examples
3. Missing elements (role, context, format, constraints, examples)
4. A rewritten version incorporating all improvements

CONSTRAINTS:
- Be specific and actionable
- Explain why each suggestion helps
- Keep suggestions practical for a busy developer
```

---

## Key Takeaways

✅ **Good prompts have structure**: Role, Context, Task, Format, Constraints

✅ **Be specific**: Vague prompts = vague results

✅ **Provide examples**: Show the AI what good looks like

✅ **Mind the context window**: Be concise, prioritize important info

✅ **Use chain-of-thought**: Ask the AI to show its work for complex tasks

✅ **Choose the right persona**: Different tasks need different roles

✅ **Avoid common mistakes**: Vagueness, missing context, asking for too much

✅ **Build a prompt library**: Reuse and refine prompts over time

✅ **Practice**: Prompting is a skill that improves with practice

---

**Next: Chapter 9 - Getting Your First Chat Working**


# Chapter 9: Getting Your First Chat Working

Now that you understand prompts and the project structure, it's time to build something real. In this chapter, we'll create your first working chat interface — a simple page where you can type messages and get AI responses.

## What You'll Learn

- Creating a basic **chat UI** with React
- Connecting to the **AI model API**
- Handling **user input** and **AI responses**
- Displaying a **conversation history**
- Adding simple **styling** with Tailwind CSS
- Understanding **state management** basics

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
- `flex flex-col h-screen` — Makes the page fill the screen vertically
- `flex-1` — Chat area takes up remaining space
- `overflow-y-auto` — Allows scrolling when messages overflow
- Tailwind classes handle all the styling

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
- `'use client'` — This tells Next.js this is a client component
- `useState` — Stores data that changes (messages, input)
- `messages.map()` — Renders each message
- Conditional styling — User messages are blue (right), AI messages are white (left)
- `onKeyDown` — Allows pressing Enter to send

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
- `fetch('/api/chat')` — Makes HTTP request to our API
- `isLoading` state — Shows loading indicator
- `try/catch` — Handles errors gracefully
- Error messages appear as AI responses

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
- Run on the server
- Can't use browser APIs
- Can't use `useState`, `useEffect`
- Good for: Data fetching, static content

**Client Components (`'use client'`):**
- Run in the browser
- Can use all React hooks
- Can use browser APIs
- Good for: Interactive UI, user input

**Rule:** Use `'use client'` when you need:
- User interaction (clicks, inputs)
- Browser APIs (localStorage, fetch)
- React hooks (useState, useEffect)

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
- Easier to read (looks synchronous)
- Better error handling with try/catch
- No "callback hell"

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


# Chapter 10: Adding Document Upload Features

A chat assistant that only understands text is limited. What if you could upload PDFs, Word documents, or text files and have the AI read and understand them? That's what we'll build in this chapter.

## What You'll Learn

- Handling **file uploads** in Next.js
- Reading **different document formats** (PDF, DOCX, TXT)
- **Storing documents** in your database
- Displaying **document content** to the AI
- Building a **documents page** UI
- Understanding **file streaming** and processing

---

## The Big Picture

Your document upload system needs to:

1. **Accept Files** — Handle user file selection
2. **Validate** — Check file type and size
3. **Process** — Extract text from different formats
4. **Store** — Save to database with metadata
5. **Retrieve** — Show documents in the UI
6. **Use** — Make content available to AI chat

```
User Selects File
        │
        ▼
   ┌────────────┐
   │   Browser   │
   │    Form     │
   └────────────┘
        │
        ▼
   ┌────────────┐
   │   Upload    │
   │   to API    │
   └────────────┘
        │
        ▼
   ┌────────────┐
   │   Extract   │
   │   Content   │
   └────────────┘
        │
        ▼
   ┌────────────┐
   │   Store    │
   │  in SQLite │
   └────────────┘
        │
        ▼
   ┌────────────┐
   │  Display   │
   │  in List   │
   └────────────┘
```

---

## Step 1: Create the Document Upload API

Create: `src/app/api/documents/upload/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { sqlDatabase } from '@/lib/database/sqlite';

export async function POST(request: NextRequest) {
  try {
    // Initialize database
    await sqlDatabase.initialize();

    // Get the form data (includes the file)
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown',
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: PDF, DOCX, TXT, MD' },
        { status: 400 }
      );
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Max size: 10MB' },
        { status: 400 }
      );
    }

    // Read file content
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    let content: string;

    // Extract text based on file type
    if (file.type === 'text/plain' || file.type === 'text/markdown') {
      // Text files - easy!
      content = buffer.toString('utf-8');
    } else if (file.type === 'application/pdf') {
      // PDF - we'll implement this next
      content = await extractTextFromPDF(buffer);
    } else if (file.type.includes('wordprocessingml')) {
      // Word - we'll implement this next
      content = await extractTextFromWord(buffer);
    } else {
      content = '[Binary file content not extractable]';
    }

    // Save to database
    const result = sqlDatabase.addDocument({
      title: file.name,
      content: content,
      type: file.type,
      category: 'uploaded',
      metadata: {
        originalName: file.name,
        size: file.size,
        uploadedAt: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      documentId: result.id,
      title: file.name,
      contentLength: content.length,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to process upload' },
      { status: 500 }
    );
  }
}

// Placeholder functions - we'll implement these
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  // For now, return placeholder
  return '[PDF content - implement with pdf-parse library]';
}

async function extractTextFromWord(buffer: Buffer): Promise<string> {
  // For now, return placeholder
  return '[Word content - implement with mammoth library]';
}
```

**What's happening:**
- `request.formData()` — Gets the uploaded file
- `file.arrayBuffer()` — Reads file as binary data
- File validation — Checks type and size before processing
- `Buffer.from()` — Converts to Node.js Buffer
- `sqlDatabase.addDocument()` — Saves to SQLite

---

## Step 2: Install PDF and Word Libraries

```bash
npm install pdf-parse mammoth
```

Now update the extraction functions:

```typescript
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(buffer);
    return data.text;
  } catch (error) {
    console.error('PDF parsing error:', error);
    return '[Error extracting PDF content]';
  }
}

async function extractTextFromWord(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    console.error('Word parsing error:', error);
    return '[Error extracting Word content]';
  }
}
```

---

## Step 3: Create the Documents Page

Create: `src/app/documents/page.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';

interface Document {
  id: string;
  title: string;
  type: string;
  contentLength: number;
  createdAt: string;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  // Load documents on mount
  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const response = await fetch('/api/documents');
      const data = await response.json();
      if (data.documents) {
        setDocuments(data.documents);
      }
    } catch (error) {
      console.error('Failed to load documents:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(`Uploading ${file.name}...`);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setUploadProgress('Upload complete!');
        // Refresh document list
        await loadDocuments();
      } else {
        setUploadProgress(`Error: ${data.error}`);
      }
    } catch (error) {
      setUploadProgress('Upload failed. Please try again.');
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
      // Clear progress after 3 seconds
      setTimeout(() => setUploadProgress(''), 3000);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (type: string): string => {
    if (type.includes('pdf')) return '📄';
    if (type.includes('word') || type.includes('document')) return '📝';
    if (type.includes('text')) return '📃';
    return '📎';
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Documents</h1>
        <p className="text-gray-600">
          Upload PDFs, Word documents, or text files to use as context for AI chat.
        </p>
      </div>

      {/* Upload Section */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Upload Document</h2>
        
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <input
            type="file"
            accept=".pdf,.docx,.txt,.md"
            onChange={handleFileUpload}
            disabled={isUploading}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="cursor-pointer inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isUploading ? 'Uploading...' : 'Select File'}
          </label>
          <p className="mt-4 text-sm text-gray-500">
            Supported formats: PDF, DOCX, TXT, MD (max 10MB)
          </p>
        </div>

        {uploadProgress && (
          <div className="mt-4 p-3 bg-blue-50 text-blue-700 rounded">
            {uploadProgress}
          </div>
        )}
      </div>

      {/* Documents List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">
            Your Documents ({documents.length})
          </h2>
        </div>

        {documents.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p className="text-4xl mb-4">📂</p>
            <p>No documents yet. Upload your first file above!</p>
          </div>
        ) : (
          <div className="divide-y">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="p-4 hover:bg-gray-50 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{getFileIcon(doc.type)}</span>
                  <div>
                    <h3 className="font-medium text-gray-900">{doc.title}</h3>
                    <p className="text-sm text-gray-500">
                      {formatFileSize(doc.contentLength)} • {new Date(doc.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => viewDocument(doc.id)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  View
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  function viewDocument(id: string) {
    // We'll implement this in the next step
    console.log('View document:', id);
  }
}
```

**What's happening:**
- `useEffect` — Loads documents when page loads
- `FormData` — Packages file for upload
- Hidden file input — Custom styled with label
- Document list — Shows all uploaded files
- File type icons — Visual indicators for different formats

---

## Step 4: Create Documents List API

Create: `src/app/api/documents/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { sqlDatabase } from '@/lib/database/sqlite';

export async function GET() {
  try {
    await sqlDatabase.initialize();
    
    const documents = sqlDatabase.getDocuments('uploaded');
    
    // Format for the frontend
    const formatted = documents?.map((doc) => ({
      id: doc.id,
      title: doc.title,
      type: doc.type || 'unknown',
      contentLength: doc.content?.length || 0,
      createdAt: new Date(doc.createdAt).toISOString(),
    })) || [];

    return NextResponse.json({ documents: formatted });
  } catch (error) {
    console.error('Failed to load documents:', error);
    return NextResponse.json(
      { error: 'Failed to load documents' },
      { status: 500 }
    );
  }
}
```

---

## Step 5: Create Document View Page

Create: `src/app/documents/[id]/page.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface Document {
  id: string;
  title: string;
  content: string;
  type: string;
  createdAt: string;
}

export default function DocumentViewPage() {
  const params = useParams();
  const [document, setDocument] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      loadDocument(params.id as string);
    }
  }, [params.id]);

  const loadDocument = async (id: string) => {
    try {
      const response = await fetch(`/api/documents/${id}`);
      const data = await response.json();
      if (data.document) {
        setDocument(data.document);
      }
    } catch (error) {
      console.error('Failed to load document:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <p>Loading document...</p>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <p className="text-red-600">Document not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <a
          href="/documents"
          className="text-blue-600 hover:text-blue-800 text-sm mb-2 inline-block"
        >
          ← Back to Documents
        </a>
        <h1 className="text-2xl font-bold text-gray-900">{document.title}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {document.type} • Uploaded {new Date(document.createdAt).toLocaleDateString()}
        </p>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="prose max-w-none">
          <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800 bg-gray-50 p-4 rounded overflow-auto max-h-[600px]">
            {document.content}
          </pre>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex gap-4">
        <a
          href="/chat"
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 inline-block"
        >
          Chat About This Document
        </a>
        <button
          onClick={() => navigator.clipboard.writeText(document.content)}
          className="bg-gray-200 text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-300"
        >
          Copy Content
        </button>
      </div>
    </div>
  );
}
```

Create the API: `src/app/api/documents/[id]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { sqlDatabase } from '@/lib/database/sqlite';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await sqlDatabase.initialize();
    
    const document = sqlDatabase.getDocument(params.id);
    
    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ document });
  } catch (error) {
    console.error('Failed to load document:', error);
    return NextResponse.json(
      { error: 'Failed to load document' },
      { status: 500 }
    );
  }
}
```

---

## Step 6: Connect Documents to Chat

Update your chat API to include document context:

```typescript
// In src/app/api/chat/route.ts

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, documentIds } = body;

    // ... validation ...

    let context = '';
    
    // If document IDs provided, get their content
    if (documentIds && documentIds.length > 0) {
      const documents = documentIds.map((id: string) => 
        sqlDatabase.getDocument(id)
      ).filter(Boolean);
      
      context = documents
        .map((doc: any) => `Document "${doc.title}":\n${doc.content}`)
        .join('\n\n---\n\n');
    }

    // Build prompt with context
    const prompt = context 
      ? `Context:\n${context}\n\nUser Question: ${message}`
      : message;

    // ... send to AI ...

  } catch (error) {
    // ... error handling ...
  }
}
```

---

## Understanding File Processing

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Binary    │────▶│   Library    │────▶│    Text     │
│    Data     │     │  (parser)    │     │   Content   │
│   (Buffer)  │     │              │     │             │
└─────────────┘     └──────────────┘     └─────────────┘
                              │
                    PDF: pdf-parse
                    Word: mammoth
                    Text: direct
```

---

## PROMPT YOU CAN USE

Want to enhance document handling?

```
Add these features to the document upload system:
1. Drag-and-drop file upload area
2. Document preview before uploading
3. Search within documents
4. Document categories/tags
5. Export document content as download
6. Delete documents with confirmation

Use React and Tailwind CSS.
```

---

## Key Takeaways

✅ **FormData** — Packages files for HTTP upload

✅ **File Validation** — Always check type and size

✅ **Buffer Processing** — Convert to text for storage

✅ **PDF Parsing** — Use `pdf-parse` library

✅ **Word Parsing** — Use `mammoth` library

✅ **Database Storage** — Store content as text in SQLite

✅ **Dynamic Routes** — `[id]` creates document-specific pages

---

**Next: Chapter 11 - Creating Your Brand Voice System**


# Chapter 11: Creating Your Brand Voice System

One of the most powerful features of your AI Dashboard is the ability to maintain a consistent "brand voice" across all AI-generated content. Whether you're writing proposals, emails, or social media posts, the AI will sound like *your* brand, not generic AI.

## What You'll Learn

- Understanding **brand voice** and why it matters
- Creating **document-based context** (NotebookLM-style)
- Building a **brand workspace** UI
- Linking **documents to brands and projects**
- Using brand context in **AI chat**
- Managing **brand voice profiles**

---

## What is Brand Voice?

Think about how different companies "sound":

- **Apple**: Minimalist, innovative, aspirational
- **Wendy's**: Sassy, humorous, bold
- **IBM**: Professional, trustworthy, technical

Your brand voice is the personality of your written communication. It includes:

- **Tone** — Formal vs casual
- **Vocabulary** — Technical vs simple
- **Structure** — Short vs detailed
- **Values** — What you emphasize

### Why Document-Based Context Works

Instead of trying to describe your brand voice in a few sentences, you **upload documents** that *demonstrate* it:

- Past proposals
- Email templates
- Style guides
- Marketing materials
- Client communications

The AI learns from these examples, just like a new employee would learn by reading your past work.

**This is exactly how NotebookLM works** — upload documents, then chat about them.

---

## The Brand Workspace Architecture

```
┌─────────────────────────────────────────────────┐
│                  BRAND                          │
│         (Company/Organization)                 │
│                                                 │
│  ┌─────────────────────────────────────────┐  │
│  │  Documents (Brand Voice)               │  │
│  │  - Style guides                        │  │
│  │  - Past proposals                      │  │
│  │  - Email templates                     │  │
│  └─────────────────────────────────────────┘  │
│                                                 │
│  ┌─────────────────┐  ┌─────────────────┐     │
│  │    PROJECT 1    │  │    PROJECT 2    │     │
│  │   (Website)     │  │   (Campaign)    │     │
│  │                 │  │                 │     │
│  │ ┌─────────────┐│  │ ┌─────────────┐│     │
│  │ │ Documents   ││  │ │ Documents   ││     │
│  │ │ - Brief     ││  │ │ - Strategy  ││     │
│  │ │ - Research  ││  │ │ - Assets    ││     │
│  │ └─────────────┘│  │ └─────────────┘│     │
│  │                 │  │                 │     │
│  │ ┌─────────────┐│  │ ┌─────────────┐│     │
│  │ │   Chat      ││  │ │   Chat      ││     │
│  │ │  (Context   ││  │ │  (Context   ││     │
│  │ │  aware)     ││  │ │  aware)     ││     │
│  │ └─────────────┘│  │ └─────────────┘│     │
│  └─────────────────┘  └─────────────────┘     │
└─────────────────────────────────────────────────┘
```

**Key insight**: Documents can be at **brand level** (apply to all projects) or **project level** (apply to specific work).

---

## Step 1: Database Schema

First, let's add the database tables:

```sql
-- Brands table
CREATE TABLE IF NOT EXISTS brands (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  voice_profile TEXT, -- JSON with tone, vocabulary, etc.
  created_at INTEGER,
  updated_at INTEGER
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',
  created_at INTEGER,
  updated_at INTEGER,
  FOREIGN KEY (brand_id) REFERENCES brands(id)
);

-- Brand documents table
CREATE TABLE IF NOT EXISTS brand_documents (
  id TEXT PRIMARY KEY,
  brand_id TEXT,
  project_id TEXT,
  title TEXT NOT NULL,
  content TEXT,
  file_type TEXT,
  document_type TEXT, -- 'brand_voice' or 'project'
  metadata TEXT, -- JSON
  created_at INTEGER,
  updated_at INTEGER,
  FOREIGN KEY (brand_id) REFERENCES brands(id),
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- Chat sessions table
CREATE TABLE IF NOT EXISTS brand_chat_sessions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  title TEXT,
  messages TEXT, -- JSON array
  created_at INTEGER,
  updated_at INTEGER,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);
```

---

## Step 2: Brand Service Layer

Create: `src/lib/services/brand-workspace.ts`

```typescript
import { sqlDatabase } from '@/lib/database/sqlite';

export interface Brand {
  id: string;
  name: string;
  description?: string;
  voiceProfile?: VoiceProfile;
}

export interface VoiceProfile {
  tone: string;
  vocabulary: string;
  structure: string;
  values: string[];
}

export interface Project {
  id: string;
  brandId: string;
  name: string;
  description?: string;
  status: 'active' | 'archived' | 'completed';
}

export interface BrandDocument {
  id: string;
  brandId?: string;
  projectId?: string;
  title: string;
  content: string;
  fileType?: string;
  documentType: 'brand_voice' | 'project';
  metadata?: Record<string, any>;
}

export class BrandWorkspaceService {
  // Brand Operations
  async createBrand(name: string, description?: string): Promise<Brand> {
    await sqlDatabase.initialize();
    
    const id = crypto.randomUUID();
    const now = Date.now();
    
    sqlDatabase.run(
      `INSERT INTO brands (id, name, description, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      [id, name, description || '', now, now]
    );
    
    return {
      id,
      name,
      description,
    };
  }

  async getBrands(): Promise<Brand[]> {
    await sqlDatabase.initialize();
    
    const result = sqlDatabase.run('SELECT * FROM brands ORDER BY name');
    return result?.map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      voiceProfile: row.voice_profile ? JSON.parse(row.voice_profile) : undefined,
    })) || [];
  }

  // Project Operations
  async createProject(
    brandId: string,
    name: string,
    description?: string
  ): Promise<Project> {
    await sqlDatabase.initialize();
    
    const id = crypto.randomUUID();
    const now = Date.now();
    
    sqlDatabase.run(
      `INSERT INTO projects (id, brand_id, name, description, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, brandId, name, description || '', now, now]
    );
    
    return {
      id,
      brandId,
      name,
      description,
      status: 'active',
    };
  }

  async getProjects(brandId: string): Promise<Project[]> {
    await sqlDatabase.initialize();
    
    const result = sqlDatabase.run(
      'SELECT * FROM projects WHERE brand_id = ? ORDER BY name',
      [brandId]
    );
    
    return result?.map((row: any) => ({
      id: row.id,
      brandId: row.brand_id,
      name: row.name,
      description: row.description,
      status: row.status,
    })) || [];
  }

  // Document Operations
  async addDocument(doc: Omit<BrandDocument, 'id'>): Promise<string> {
    await sqlDatabase.initialize();
    
    const id = crypto.randomUUID();
    const now = Date.now();
    
    sqlDatabase.run(
      `INSERT INTO brand_documents 
       (id, brand_id, project_id, title, content, file_type, document_type, metadata, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        doc.brandId || null,
        doc.projectId || null,
        doc.title,
        doc.content,
        doc.fileType || null,
        doc.documentType,
        doc.metadata ? JSON.stringify(doc.metadata) : null,
        now,
        now,
      ]
    );
    
    return id;
  }

  async getDocuments(options: {
    brandId?: string;
    projectId?: string;
    documentType?: 'brand_voice' | 'project';
  } = {}): Promise<BrandDocument[]> {
    await sqlDatabase.initialize();
    
    let query = 'SELECT * FROM brand_documents WHERE 1=1';
    const params: any[] = [];
    
    if (options.brandId) {
      query += ' AND (brand_id = ? OR brand_id IS NULL)';
      params.push(options.brandId);
    }
    
    if (options.projectId) {
      query += ' AND (project_id = ? OR project_id IS NULL)';
      params.push(options.projectId);
    }
    
    if (options.documentType) {
      query += ' AND document_type = ?';
      params.push(options.documentType);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = sqlDatabase.run(query, params);
    
    return result?.map((row: any) => ({
      id: row.id,
      brandId: row.brand_id,
      projectId: row.project_id,
      title: row.title,
      content: row.content,
      fileType: row.file_type,
      documentType: row.document_type,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    })) || [];
  }

  // Get context for AI
  async getContextForChat(projectId: string): Promise<string> {
    const project = await this.getProjectById(projectId);
    if (!project) return '';

    // Get brand voice documents
    const brandDocs = await this.getDocuments({
      brandId: project.brandId,
      documentType: 'brand_voice',
    });

    // Get project-specific documents
    const projectDocs = await this.getDocuments({
      projectId: projectId,
      documentType: 'project',
    });

    // Build context string
    const allDocs = [...brandDocs, ...projectDocs];
    
    if (allDocs.length === 0) return '';

    return allDocs
      .map((doc) => `## ${doc.title}\n\n${doc.content}`)
      .join('\n\n---\n\n');
  }

  private async getProjectById(id: string): Promise<Project | null> {
    const result = sqlDatabase.run('SELECT * FROM projects WHERE id = ?', [id]);
    if (!result || result.length === 0) return null;
    
    const row = result[0];
    return {
      id: row.id,
      brandId: row.brand_id,
      name: row.name,
      description: row.description,
      status: row.status,
    };
  }
}

export const brandWorkspace = new BrandWorkspaceService();
```

---

## Step 3: Brand Workspace UI

Create: `src/app/brand-workspace/page.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import { brandWorkspace, Brand, Project } from '@/lib/services/brand-workspace';

export default function BrandWorkspacePage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isCreatingBrand, setIsCreatingBrand] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');

  useEffect(() => {
    loadBrands();
  }, []);

  const loadBrands = async () => {
    const data = await brandWorkspace.getBrands();
    setBrands(data);
  };

  const handleCreateBrand = async () => {
    if (!newBrandName.trim()) return;
    
    await brandWorkspace.createBrand(newBrandName);
    setNewBrandName('');
    setIsCreatingBrand(false);
    await loadBrands();
  };

  const handleSelectBrand = async (brand: Brand) => {
    setSelectedBrand(brand);
    const brandProjects = await brandWorkspace.getProjects(brand.id);
    setProjects(brandProjects);
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Brand Workspace</h1>
        <p className="text-gray-600">
          Manage brands, projects, and documents for context-aware AI chat.
        </p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Brands Sidebar */}
        <div className="col-span-3">
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="font-semibold">Brands</h2>
              <button
                onClick={() => setIsCreatingBrand(true)}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                + New
              </button>
            </div>

            {isCreatingBrand && (
              <div className="p-4 border-b">
                <input
                  type="text"
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  placeholder="Brand name"
                  className="w-full border rounded px-3 py-2 mb-2"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateBrand()}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateBrand}
                    className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => setIsCreatingBrand(false)}
                    className="text-gray-600 px-3 py-1 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="divide-y">
              {brands.map((brand) => (
                <button
                  key={brand.id}
                  onClick={() => handleSelectBrand(brand)}
                  className={`w-full text-left p-4 hover:bg-gray-50 ${
                    selectedBrand?.id === brand.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <h3 className="font-medium">{brand.name}</h3>
                  {brand.description && (
                    <p className="text-sm text-gray-500 truncate">
                      {brand.description}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="col-span-9">
          {selectedBrand ? (
            <BrandDetail 
              brand={selectedBrand} 
              projects={projects}
              onProjectsChange={() => handleSelectBrand(selectedBrand)}
            />
          ) : (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <p className="text-4xl mb-4">🏢</p>
              <p className="text-gray-500">
                Select a brand or create a new one to get started.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Brand Detail Component
function BrandDetail({ 
  brand, 
  projects,
  onProjectsChange 
}: { 
  brand: Brand; 
  projects: Project[];
  onProjectsChange: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'projects' | 'documents'>('projects');
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    
    await brandWorkspace.createProject(brand.id, newProjectName);
    setNewProjectName('');
    setIsCreatingProject(false);
    onProjectsChange();
  };

  return (
    <div>
      {/* Brand Header */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-2xl font-bold">{brand.name}</h2>
        {brand.description && (
          <p className="text-gray-600 mt-2">{brand.description}</p>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <div className="flex">
            <button
              onClick={() => setActiveTab('projects')}
              className={`px-6 py-4 font-medium ${
                activeTab === 'projects'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600'
              }`}
            >
              Projects ({projects.length})
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`px-6 py-4 font-medium ${
                activeTab === 'documents'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600'
              }`}
            >
              Brand Voice Documents
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'projects' ? (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Projects</h3>
                <button
                  onClick={() => setIsCreatingProject(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm"
                >
                  + New Project
                </button>
              </div>

              {isCreatingProject && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Project name"
                    className="w-full border rounded px-3 py-2 mb-2"
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateProject}
                      className="bg-blue-600 text-white px-4 py-2 rounded"
                    >
                      Create
                    </button>
                    <button
                      onClick={() => setIsCreatingProject(false)}
                      className="text-gray-600 px-4 py-2"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {projects.map((project) => (
                  <a
                    key={project.id}
                    href={`/brand-workspace/projects/${project.id}`}
                    className="block p-4 border rounded-lg hover:border-blue-500 hover:shadow-md transition"
                  >
                    <h4 className="font-medium text-lg">{project.name}</h4>
                    {project.description && (
                      <p className="text-sm text-gray-500 mt-1">
                        {project.description}
                      </p>
                    )}
                    <div className="mt-3 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        project.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                      }`} />
                      <span className="text-sm text-gray-600 capitalize">
                        {project.status}
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          ) : (
            <BrandDocuments brandId={brand.id} />
          )}
        </div>
      </div>
    </div>
  );
}

// Brand Documents Component
function BrandDocuments({ brandId }: { brandId: string }) {
  const [documents, setDocuments] = useState<any[]>([]);

  useEffect(() => {
    loadDocuments();
  }, [brandId]);

  const loadDocuments = async () => {
    const docs = await brandWorkspace.getDocuments({
      brandId,
      documentType: 'brand_voice',
    });
    setDocuments(docs);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="font-semibold">Brand Voice Documents</h3>
          <p className="text-sm text-gray-500">
            These documents teach the AI your brand's writing style.
          </p>
        </div>
        <a
          href={`/brand-workspace/brands/${brandId}/upload`}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm"
        >
          Upload Document
        </a>
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-4xl mb-4">📄</p>
          <p>No brand voice documents yet.</p>
          <p className="text-sm mt-2">
            Upload style guides, past proposals, or example content.
          </p>
        </div>
      ) : (
        <div className="divide-y">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="py-4 flex justify-between items-center"
            >
              <div>
                <h4 className="font-medium">{doc.title}</h4>
                <p className="text-sm text-gray-500">
                  {doc.content?.length || 0} characters
                </p>
              </div>
              <span className="text-sm text-blue-600">Brand Voice</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## Step 4: Project Chat with Context

Create: `src/app/brand-workspace/projects/[id]/page.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function ProjectChatPage() {
  const params = useParams();
  const projectId = params.id as string;
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [contextInfo, setContextInfo] = useState({ brand: 0, project: 0 });

  useEffect(() => {
    // Load context info when page loads
    loadContextInfo();
  }, [projectId]);

  const loadContextInfo = async () => {
    try {
      const response = await fetch(`/api/brand-workspace/projects/${projectId}/context`);
      const data = await response.json();
      setContextInfo(data);
    } catch (error) {
      console.error('Failed to load context:', error);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/brand-workspace/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          message: userMessage.content,
          history: messages.slice(-10), // Last 10 messages for context
        }),
      });

      const data = await response.json();

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <a
              href="/brand-workspace"
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              ← Back to Workspace
            </a>
            <h1 className="text-xl font-bold mt-1">Project Chat</h1>
          </div>
          <div className="text-sm text-gray-600">
            Context: {contextInfo.brand} brand docs, {contextInfo.project} project docs
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-4xl mb-4">💬</p>
            <p>Start chatting with AI that knows your brand voice.</p>
            <p className="text-sm mt-2">
              Upload documents to the project for better context.
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[70%] rounded-lg p-4 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-800 shadow'
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              <p className="text-xs opacity-70 mt-2">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white text-gray-500 rounded-lg p-4 shadow">
              <p>Thinking with brand context...</p>
            </div>
          </div>
        )}
      </main>

      {/* Input */}
      <footer className="bg-white border-t p-6">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about your project..."
            disabled={isLoading}
            className="flex-1 border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </footer>
    </div>
  );
}
```

---

## PROMPT YOU CAN USE

Enhance the brand workspace:

```
Add these features to the Brand Workspace:
1. Document upload with drag-and-drop
2. Voice profile editor (tone, vocabulary, examples)
3. Generated content templates (proposals, emails)
4. Export chat history as Markdown
5. Search across all documents
6. Document preview modal

Focus on making the brand voice system feel like NotebookLM.
```

---

## Key Takeaways

✅ **Brand Voice** — Consistent tone through document examples

✅ **NotebookLM-style** — Upload docs, chat with context

✅ **Hierarchy** — Brands → Projects → Documents

✅ **Context Building** — Combine brand + project documents

✅ **Service Layer** — Encapsulate business logic

✅ **Dynamic Routes** — `[id]` for project-specific pages

---

**Next: Chapter 12 - Building Intelligence Reports**


# Chapter 12: Building Intelligence Reports

Imagine starting your day with a comprehensive briefing: overnight news relevant to your industry, competitor moves, emerging trends, and potential opportunities. This is what **Intelligence Reports** do — they automate the research you'd otherwise spend hours doing manually.

## What You'll Learn

- What **intelligence reports** are and why they matter
- Setting up **automated data collection**
- Integrating with **web search APIs**
- Building a **report generation system**
- Creating **scheduled tasks** for automation
- Designing **report templates and formatting**
- Storing and retrieving **historical reports**

---

## What is an Intelligence Report?

An intelligence report is like having a research assistant that works 24/7:

**Traditional Approach (Manual):**
- Wake up, open 10 browser tabs
- Search Google for industry news
- Check competitor websites
- Read Twitter/X for trends
- Compile findings manually
- **Time: 1-2 hours daily**

**AI Dashboard Approach (Automated):**
- System runs scheduled searches
- AI analyzes and summarizes findings
- Delivers formatted report at 8 AM
- **Time: 2 minutes to read**

### Real-World Use Cases

| Use Case | What It Monitors | Value |
|----------|------------------|-------|
| **Market Intelligence** | Industry trends, competitor pricing, new entrants | Strategic decisions |
| **Sales Intel** | Prospect news, trigger events, company changes | Better outreach |
| **Security Intel** | CVEs, threat actors, attack patterns | Proactive defense |
| **GovCon Intel** | SAM.gov opportunities, RFPs, agency news | Bid preparation |
| **Tech Intel** | New frameworks, tool updates, best practices | Staying current |

---

## The Intelligence System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    SCHEDULER                            │
│              (Daily at 8:00 AM)                        │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              DATA COLLECTION                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Web Search   │  │ RSS Feeds    │  │ APIs         │  │
│  │ (Tavily)     │  │ (Industry)   │  │ (Custom)     │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              AI ANALYSIS                                │
│  • Categorize findings                                  │
│  • Identify trends                                      │
│  • Score relevance                                      │
│  • Summarize key points                                 │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              REPORT GENERATION                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Executive    │  │ Detailed     │  │ Raw Data     │  │
│  │ Summary      │  │ Analysis     │  │ Appendix     │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              DELIVERY                                   │
│  • Save to database                                     │
│  • Display in dashboard                                 │
│  • Optional: Email/Telegram                             │
└─────────────────────────────────────────────────────────┘
```

---

## Step 1: Create the Intelligence Service

Create: `src/lib/services/intelligence.ts`

```typescript
import { sqlDatabase } from '@/lib/database/sqlite';
import { performWebSearch } from '@/lib/websearch';
import { chatCompletion } from '@/lib/models/sdk.server';

export interface IntelligenceConfig {
  id: string;
  name: string;
  description?: string;
  searchQueries: string[];
  schedule: 'daily' | 'weekly' | 'hourly';
  enabled: boolean;
  maxResults?: number;
  analysisPrompt?: string;
}

export interface IntelligenceReport {
  id: string;
  configId: string;
  configName: string;
  generatedAt: number;
  summary: string;
  findings: Finding[];
  rawData: any[];
  metadata?: Record<string, any>;
}

export interface Finding {
  id: string;
  category: string;
  title: string;
  content: string;
  source: string;
  url?: string;
  relevanceScore: number;
  timestamp: number;
}

export class IntelligenceService {
  // Create a new intelligence configuration
  async createConfig(config: Omit<IntelligenceConfig, 'id'>): Promise<string> {
    await sqlDatabase.initialize();
    
    const id = crypto.randomUUID();
    const now = Date.now();
    
    sqlDatabase.run(
      `INSERT INTO intelligence_configs 
       (id, name, description, search_queries, schedule, enabled, max_results, analysis_prompt, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        config.name,
        config.description || null,
        JSON.stringify(config.searchQueries),
        config.schedule,
        config.enabled ? 1 : 0,
        config.maxResults || 10,
        config.analysisPrompt || null,
        now,
        now,
      ]
    );
    
    return id;
  }

  // Get all configurations
  async getConfigs(): Promise<IntelligenceConfig[]> {
    await sqlDatabase.initialize();
    
    const result = sqlDatabase.run('SELECT * FROM intelligence_configs ORDER BY name');
    
    return result?.map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      searchQueries: JSON.parse(row.search_queries || '[]'),
      schedule: row.schedule,
      enabled: row.enabled === 1,
      maxResults: row.max_results,
      analysisPrompt: row.analysis_prompt,
    })) || [];
  }

  // Generate a report
  async generateReport(configId: string): Promise<IntelligenceReport> {
    const config = await this.getConfigById(configId);
    if (!config) throw new Error('Config not found');
    
    console.log(`[Intelligence] Generating report: ${config.name}`);
    
    // Collect data from all queries
    const allResults: any[] = [];
    
    for (const query of config.searchQueries) {
      console.log(`[Intelligence] Searching: ${query}`);
      try {
        const results = await performWebSearch(query);
        allResults.push(...results.map(r => ({
          ...r,
          searchQuery: query,
          collectedAt: Date.now(),
        })));
      } catch (error) {
        console.error(`[Intelligence] Search failed for "${query}":`, error);
      }
    }
    
    // Limit results
    const limitedResults = allResults.slice(0, config.maxResults || 10);
    
    // Analyze findings with AI
    const findings = await this.analyzeFindings(limitedResults, config);
    
    // Generate summary
    const summary = await this.generateSummary(findings, config);
    
    // Create report object
    const report: IntelligenceReport = {
      id: crypto.randomUUID(),
      configId: config.id,
      configName: config.name,
      generatedAt: Date.now(),
      summary,
      findings,
      rawData: limitedResults,
    };
    
    // Save to database
    await this.saveReport(report);
    
    return report;
  }

  // Analyze findings using AI
  private async analyzeFindings(
    results: any[],
    config: IntelligenceConfig
  ): Promise<Finding[]> {
    if (results.length === 0) return [];
    
    const defaultPrompt = `
      Analyze these search results and categorize them into key findings.
      For each finding, provide:
      1. Category (e.g., News, Opportunity, Threat, Trend)
      2. Title (brief, specific)
      3. Content (2-3 sentences summarizing)
      4. Relevance score (1-10)
      
      Format as JSON array with keys: category, title, content, relevanceScore
    `;
    
    const prompt = config.analysisPrompt || defaultPrompt;
    
    // Prepare data for AI
    const searchResultsText = results
      .map((r, i) => `${i + 1}. ${r.title}\n   ${r.excerpt || r.content}\n   Source: ${r.url || r.source}`)
      .join('\n\n');
    
    try {
      const aiResponse = await chatCompletion({
        model: 'ollama/qwen2.5-coder',
        messages: [
          { role: 'system', content: 'You are an intelligence analyst. Provide structured, factual analysis.' },
          { role: 'user', content: `${prompt}\n\nSearch Results:\n${searchResultsText}` },
        ],
      });
      
      const content = aiResponse.message?.content || '[]';
      
      // Try to parse JSON from response
      let parsed: any[] = [];
      try {
        // Extract JSON if wrapped in code blocks
        const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || 
                          content.match(/```\n?([\s\S]*?)\n?```/) ||
                          [null, content];
        const jsonStr = jsonMatch[1] || content;
        parsed = JSON.parse(jsonStr);
      } catch {
        // If JSON parsing fails, create single finding
        parsed = [{
          category: 'Analysis',
          title: 'Search Results Summary',
          content: content.substring(0, 500),
          relevanceScore: 5,
        }];
      }
      
      // Map to Finding structure
      return parsed.map((item: any, index: number) => ({
        id: `finding-${index}`,
        category: item.category || 'General',
        title: item.title || 'Untitled',
        content: item.content || item.summary || '',
        source: results[index]?.source || 'Web Search',
        url: results[index]?.url,
        relevanceScore: item.relevanceScore || item.relevance || 5,
        timestamp: Date.now(),
      }));
    } catch (error) {
      console.error('[Intelligence] AI analysis failed:', error);
      return [];
    }
  }

  // Generate executive summary
  private async generateSummary(findings: Finding[], config: IntelligenceConfig): Promise<string> {
    if (findings.length === 0) {
      return `No significant findings for ${config.name} in this reporting period.`;
    }
    
    const findingsText = findings
      .slice(0, 5)
      .map(f => `• ${f.title}: ${f.content}`)
      .join('\n');
    
    try {
      const response = await chatCompletion({
        model: 'ollama/qwen2.5-coder',
        messages: [
          { role: 'system', content: 'You are an executive assistant. Write concise, actionable summaries.' },
          { role: 'user', content: `Write a 3-4 sentence executive summary of these intelligence findings:\n\n${findingsText}` },
        ],
      });
      
      return response.message?.content || 'Summary unavailable.';
    } catch {
      // Fallback summary
      return `${findings.length} findings identified. Key items: ${findings.slice(0, 3).map(f => f.title).join(', ')}.`;
    }
  }

  // Save report to database
  private async saveReport(report: IntelligenceReport): Promise<void> {
    sqlDatabase.run(
      `INSERT INTO intelligence_reports 
       (id, config_id, config_name, generated_at, summary, findings, raw_data, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        report.id,
        report.configId,
        report.configName,
        report.generatedAt,
        report.summary,
        JSON.stringify(report.findings),
        JSON.stringify(report.rawData),
        Date.now(),
      ]
    );
  }

  // Get recent reports
  async getRecentReports(limit: number = 10): Promise<IntelligenceReport[]> {
    await sqlDatabase.initialize();
    
    const result = sqlDatabase.run(
      `SELECT * FROM intelligence_reports ORDER BY generated_at DESC LIMIT ?`,
      [limit]
    );
    
    return result?.map((row: any) => ({
      id: row.id,
      configId: row.config_id,
      configName: row.config_name,
      generatedAt: row.generated_at,
      summary: row.summary,
      findings: JSON.parse(row.findings || '[]'),
      rawData: JSON.parse(row.raw_data || '[]'),
    })) || [];
  }

  private async getConfigById(id: string): Promise<IntelligenceConfig | null> {
    const result = sqlDatabase.run('SELECT * FROM intelligence_configs WHERE id = ?', [id]);
    if (!result || result.length === 0) return null;
    
    const row = result[0];
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      searchQueries: JSON.parse(row.search_queries || '[]'),
      schedule: row.schedule,
      enabled: row.enabled === 1,
      maxResults: row.max_results,
      analysisPrompt: row.analysis_prompt,
    };
  }
}

export const intelligenceService = new IntelligenceService();
```

---

## Step 2: Database Schema

Add these tables to your database initialization:

```sql
-- Intelligence configurations
CREATE TABLE IF NOT EXISTS intelligence_configs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  search_queries TEXT, -- JSON array
  schedule TEXT DEFAULT 'daily',
  enabled INTEGER DEFAULT 1,
  max_results INTEGER DEFAULT 10,
  analysis_prompt TEXT,
  created_at INTEGER,
  updated_at INTEGER
);

-- Intelligence reports
CREATE TABLE IF NOT EXISTS intelligence_reports (
  id TEXT PRIMARY KEY,
  config_id TEXT NOT NULL,
  config_name TEXT NOT NULL,
  generated_at INTEGER,
  summary TEXT,
  findings TEXT, -- JSON
  raw_data TEXT, -- JSON
  created_at INTEGER,
  FOREIGN KEY (config_id) REFERENCES intelligence_configs(id)
);
```

---

## Step 3: Intelligence Dashboard UI

Create: `src/app/intelligence/page.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import { intelligenceService, IntelligenceConfig, IntelligenceReport } from '@/lib/services/intelligence';

export default function IntelligencePage() {
  const [configs, setConfigs] = useState<IntelligenceConfig[]>([]);
  const [reports, setReports] = useState<IntelligenceReport[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [configsData, reportsData] = await Promise.all([
      intelligenceService.getConfigs(),
      intelligenceService.getRecentReports(10),
    ]);
    setConfigs(configsData);
    setReports(reportsData);
  };

  const handleGenerate = async (configId: string) => {
    setGeneratingId(configId);
    try {
      await intelligenceService.generateReport(configId);
      await loadData();
    } catch (error) {
      console.error('Generation failed:', error);
    } finally {
      setGeneratingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Intelligence Reports</h1>
        <p className="text-gray-600">
          Automated research and analysis for your areas of interest.
        </p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Configurations */}
        <div className="col-span-4">
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="font-semibold">Configurations</h2>
              <button
                onClick={() => setIsCreating(true)}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                + New
              </button>
            </div>

            <div className="divide-y">
              {configs.map((config) => (
                <div key={config.id} className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium">{config.name}</h3>
                    <span className={`text-xs px-2 py-1 rounded ${
                      config.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {config.schedule}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mb-3">
                    {config.searchQueries.length} queries
                  </p>
                  <button
                    onClick={() => handleGenerate(config.id)}
                    disabled={generatingId === config.id}
                    className="w-full bg-blue-600 text-white py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                  >
                    {generatingId === config.id ? 'Generating...' : 'Generate Now'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Reports */}
        <div className="col-span-8">
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h2 className="font-semibold">Recent Reports</h2>
            </div>

            <div className="divide-y">
              {reports.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <p className="text-4xl mb-4">📊</p>
                  <p>No reports yet. Generate your first report!</p>
                </div>
              ) : (
                reports.map((report) => (
                  <div key={report.id} className="p-6">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-lg">{report.configName}</h3>
                        <p className="text-sm text-gray-500">
                          {new Date(report.generatedAt).toLocaleString()}
                        </p>
                      </div>
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                        {report.findings.length} findings
                      </span>
                    </div>
                    
                    <p className="text-gray-700 mb-4">{report.summary}</p>
                    
                    {report.findings.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">Key Findings:</h4>
                        {report.findings.slice(0, 3).map((finding) => (
                          <div key={finding.id} className="bg-gray-50 p-3 rounded">
                            <div className="flex justify-between items-start">
                              <h5 className="font-medium text-sm">{finding.title}</h5>
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                finding.relevanceScore >= 7 ? 'bg-green-100 text-green-800' :
                                finding.relevanceScore >= 4 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                Score: {finding.relevanceScore}/10
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{finding.content}</p>
                            {finding.url && (
                              <a
                                href={finding.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline mt-2 inline-block"
                              >
                                Source →
                              </a>
                            )}
                          </div>
                        ))}
                        {report.findings.length > 3 && (
                          <p className="text-sm text-gray-500">
                            + {report.findings.length - 3} more findings
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## Step 4: Create Configuration Form

Create: `src/app/intelligence/new/page.tsx`

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewIntelligenceConfigPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [queries, setQueries] = useState(['']);
  const [schedule, setSchedule] = useState<'daily' | 'weekly' | 'hourly'>('daily');
  const [isSaving, setIsSaving] = useState(false);

  const addQuery = () => setQueries([...queries, '']);
  
  const updateQuery = (index: number, value: string) => {
    const newQueries = [...queries];
    newQueries[index] = value;
    setQueries(newQueries);
  };

  const removeQuery = (index: number) => {
    setQueries(queries.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!name.trim() || queries.filter(q => q.trim()).length === 0) return;
    
    setIsSaving(true);
    
    try {
      const response = await fetch('/api/intelligence/configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          searchQueries: queries.filter(q => q.trim()),
          schedule,
          enabled: true,
        }),
      });
      
      if (response.ok) {
        router.push('/intelligence');
      }
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">New Intelligence Configuration</h1>
      
      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium mb-2">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Competitor Watch"
            className="w-full border rounded-lg px-4 py-2"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium mb-2">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does this intelligence report track?"
            rows={3}
            className="w-full border rounded-lg px-4 py-2"
          />
        </div>

        {/* Search Queries */}
        <div>
          <label className="block text-sm font-medium mb-2">Search Queries</label>
          <p className="text-sm text-gray-500 mb-3">
            Each query will be run to collect data for the report.
          </p>
          
          {queries.map((query, index) => (
            <div key={index} className="flex gap-2 mb-2">
              <input
                type="text"
                value={query}
                onChange={(e) => updateQuery(index, e.target.value)}
                placeholder={`Query ${index + 1}`}
                className="flex-1 border rounded-lg px-4 py-2"
              />
              {queries.length > 1 && (
                <button
                  onClick={() => removeQuery(index)}
                  className="text-red-600 px-3"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          
          <button
            onClick={addQuery}
            className="text-blue-600 text-sm hover:underline"
          >
            + Add another query
          </button>
        </div>

        {/* Schedule */}
        <div>
          <label className="block text-sm font-medium mb-2">Schedule</label>
          <select
            value={schedule}
            onChange={(e) => setSchedule(e.target.value as any)}
            className="w-full border rounded-lg px-4 py-2"
          >
            <option value="hourly">Hourly</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>

        {/* Submit */}
        <div className="flex gap-4 pt-4">
          <button
            onClick={handleSubmit}
            disabled={isSaving || !name.trim()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? 'Creating...' : 'Create Configuration'}
          </button>
          
          <a
            href="/intelligence"
            className="text-gray-600 px-6 py-2 inline-block"
          >
            Cancel
          </a>
        </div>
      </div>
    </div>
  );
}
```

---

## PROMPT YOU CAN USE

Enhance the intelligence system:

```
Add these features to the Intelligence Reports:
1. RSS feed integration for continuous monitoring
2. Email delivery of reports
3. Trend analysis across multiple reports
4. Export reports as PDF
5. Custom branding for reports
6. Alert conditions (notify when specific keywords appear)
7. Report comparison view (see changes over time)

Focus on making it a complete intelligence platform.
```

---

## Key Takeaways

✅ **Intelligence Reports** — Automated research that saves hours daily

✅ **Multi-source Collection** — Web search + RSS + APIs

✅ **AI Analysis** — Categorize, score, and summarize findings

✅ **Scheduled Execution** — Set it and forget it

✅ **Configurable** — Different reports for different needs

✅ **Relevance Scoring** — Focus on what matters most

---

**Next: Chapter 13 - Adding Self-Reflection**


# Chapter 13: Smart Model Selection - Choosing the Right AI Brain

## What You'll Learn in This Chapter

- **How the Model Router works** - Automatic selection of the best AI model
- **Three-tier system** - Housekeeping, capable local, and cloud thinking models
- **Your options** - From 2B to 108B parameters, local to cloud
- **Why tools matter** - How small models + tools beat large models alone
- **How to customize** - Making the system work for YOUR needs

---

## Opening: The Big Question - Does Size Matter?

You've probably heard that "bigger is better" when it comes to AI models. The largest models (GPT-4, Claude, Llama-4) have hundreds of billions of parameters. They're incredibly capable. They're also:

- **Expensive** to run ($0.03-0.20 per 1,000 tokens)
- **Slow** on consumer hardware
- **Resource-hungry** (need expensive GPUs)
- **Overkill** for simple tasks

**But here's the secret:** You don't need a massive model for most tasks. In fact, you can build a system that outperforms large models alone by using **small models + the right tools**.

---

## The Philosophy: Tools Beat Memory

Remember Randy Hill's insight from Chapter 1: **Don't ask the LLM to know everything. Give it tools to find what it needs.**

**The Old Way (Large Models):**
- Model tries to remember everything in its training data
- Information gets compressed and lost
- Asks model: "What was the capital of France in 1850?"
- Model might be wrong or unsure

**The New Way (Small Models + Tools):**
- Model has access to SQL database (perfect memory)
- Model has access to web search (real-time info)
- Model has access to documents (your specific knowledge)
- Asks model: "Use the database to find the capital of France in 1850"
- Model queries database, gets exact answer

**This is why we can use 2B parameter models successfully.** The model doesn't need to know everything—it needs to know HOW to use tools.

---

## The Three-Tier Model System

Your AI Dashboard uses a smart system that automatically picks the right model for each job.

### Tier 1: Housekeeping (Qwen 3.5-2B or Similar)

**Think of this as your efficient intern.**

**What it is:**
- Ultra-lightweight model (only 2 billion parameters)
- Runs on CPU (no expensive GPU needed)
- Completely free to use
- Fast responses (5-15 seconds)

**Perfect for:**
- Scheduled tasks and heartbeats
- System monitoring
- Routine maintenance
- Quick Q&A
- Document summaries

**Models you can use:**
- `qwen3.5:2b` — Our default, near GPT-4 mini performance
- `llama3.2:1b` — Meta's tiny model, very fast
- `gemma2:2b` — Google's efficient model
- `phi3:mini` — Microsoft's compact model

### Tier 2: Capable Local (7B-14B Parameters)

**Think of this as your skilled professional.**

**What it is:**
- Medium-sized local models
- Still runs on CPU (slower but manageable)
- Better reasoning and writing quality
- Good for production work

**Perfect for:**
- Writing and editing
- Document generation
- Analysis tasks
- Code generation
- Reasoning problems

**Models you can use:**
- `qwen2.5:7b` — Excellent balance of speed and quality
- `qwen2.5:14b` — Higher quality for demanding tasks
- `llama3.1:8b` — Meta's capable model
- `gemma2:9b` — Google's strong performer

### Tier 3: Cloud Thinking (27B-70B+ Parameters)

**Think of this as your expert consultant (on speed dial).**

**What it is:**
- Large models via API or Ollama Cloud
- Best quality available
- Costs money per use (or use free tokens)
- Reserved for complex tasks

**Perfect for:**
- Complex reasoning
- Creative writing
- Difficult problems
- Tasks where accuracy is critical

**Models you can use:**
- `qwen3.5:32b` — Very capable, reasonable cost
- `qwen3.5:27b` — High quality via Ollama Cloud
- `llama4:scout` — 108B parameters (requires GPU or patience!)
- `glm-4.7-flash` — 29B parameters, excellent multilingual
- Cloud APIs: GPT-4, Claude, etc.

---

## Your Options: From Minimal to Maximum

### Option A: Minimal Setup (Recommended for Beginners)

**Hardware:** Any modern laptop (4GB+ RAM)
**Models:** 2B-7B parameters only
**Cost:** $0/month
**Speed:** Fast (5-30 second responses)

**Works great for:**
- Personal assistant
- Document chat
- Writing help
- Learning and experimentation

**Models:**
```bash
ollama pull qwen3.5:2b      # Default, 2.3B parameters
ollama pull qwen2.5:7b      # For better quality, 7B parameters
```

### Option B: Balanced Setup (What This Book Demonstrates)

**Hardware:** Laptop with 8GB+ RAM
**Models:** 2B-14B local + occasional cloud
**Cost:** $0-20/month (cloud for heavy tasks)
**Speed:** Fast local, slower cloud

**Works great for:**
- Professional use
- Document processing
- Research assistance
- Content creation

**Models:**
```bash
# Local (free)
ollama pull qwen3.5:2b
ollama pull qwen2.5:14b
ollama pull phi4:14b        # Microsoft's model with reasoning

# Cloud (when needed)
# Uses Ollama Cloud free tokens
# Or API keys for specific providers
```

### Option C: Maximum Capability (Power User)

**Hardware:** Desktop with 16GB+ RAM or GPU
**Models:** Everything up to 108B parameters
**Cost:** $0 (if patient) or $20-100/month
**Speed:** Varies (2B = fast, 108B = very slow on CPU)

**Works great for:**
- Complex analysis
- Professional writing
- Code generation
- Research

**Models:**
```bash
# Large local (slow on CPU)
ollama pull qwen3.5:32b     # 32B parameters
ollama pull llama4:scout    # 108B parameters (very slow!)

# Use smaller models for speed, large for difficult tasks
```

### Option D: Enterprise Setup (Future Chapter)

**Hardware:** Server with GPU(s)
**Backend:** vLLM for serving
**Cost:** Depends on usage
**Speed:** Fast for many users

**Works great for:**
- Teams
- High-throughput APIs
- Production services
- Many concurrent users

**We'll cover this in Chapter 21: Scaling to Enterprise**

---

## Why Not Just Use the Biggest Model?

**The short answer:** You could, but you'd be wasting resources.

**Analogy:**
- Sending a text message? Use your phone (lightweight model)
- Writing a novel? Use your laptop (capable model)
- Calculating rocket trajectories? Use a supercomputer (large model)

**Different tasks need different tools.** Using a 108B parameter model to answer "What time is it?" is like using a nuclear reactor to toast bread.

**The Smart Approach:**
1. Use 2B-7B models for 80% of tasks (fast, free)
2. Use 14B models for 15% of tasks (quality, still free)
3. Use 27B+ models for 5% of tasks (when accuracy matters most)

**Result:** Better performance, lower cost, faster responses.

---

## How the Model Router Works

[Rest of chapter continues with existing content about the implementation...]

**Why it's smart:**
These tasks happen every few hours. Using a big model would waste money and resources. The 2B model is perfect — fast, efficient, and free.

**Real example:**
```
Every 2 hours, your Dashboard checks:
- Is everything running?
- Are there old log files to clean up?
- Should we archive old reports?

Cost: $0
Time: Under 1 second
```

### Tier 2: Capable Local (Best Available)

**Think of this as your skilled professional.**

**What it is:**
- The best model installed on YOUR computer
- Examples: Qwen 3.5-27B, Qwen 2.5-14B, Llama 3.2
- Runs locally (data never leaves your machine)
- Also completely free after installation

**Perfect for:**
- Writing documents
- Coding and debugging
- Chat conversations
- Data analysis
- Research tasks

**Why it's smart:**
These are your day-to-day tasks. The system automatically picks the largest model you have installed, giving you the best quality without cloud costs.

**Real example:**
```
You ask: "Write a Python function to analyze CSV data"

System checks: "What's the best local model available?"
- Found: Qwen 3.5-27B (27 billion parameters)
- Using it for coding task

Response quality: Excellent
Cost: $0
Privacy: ✅ Data never leaves your computer
```

### Tier 3: Cloud Thinking (GLM-5, Kimi-K2.5)

**Think of this as your expert consultant.**

**What it is:**
- Cloud-based models (run on powerful servers)
- Much larger (50+ billion parameters)
- Best reasoning capabilities
- Costs money per use (but only when needed)

**Perfect for:**
- Strategic planning
- Complex problem solving
- System architecture design
- Advanced debugging
- Creative brainstorming

**Why it's smart:**
You only pay when you REALLY need the brainpower. The system uses these sparingly and falls back to local models when possible.

**Real example:**
```
You ask: "Design a complete microservices architecture 
          for a banking application with security requirements"

System thinks: "This needs serious reasoning power"
- Escalating to GLM-5 Cloud
- Will cost approximately $0.02
- But worth it for complex architecture

Response quality: Expert-level
Cost: $0.02
Reasoning: Deep and thorough
```

---

## How the Model Router Decides

The router is like a smart receptionist that knows which "doctor" to send you to:

```typescript
// Behind the scenes, the system does this:

function getModel(taskType, options) {
  // Task: "heartbeat"
  if (taskType === "heartbeat") {
    return "qwen3.5:2b";  // Fast, cheap, efficient
  }
  
  // Task: "coding"
  if (taskType === "coding") {
    return getBestLocalModel();  // qwen3.5:27b if available
  }
  
  // Task: "strategic_planning"
  if (taskType === "strategic_planning") {
    if (budgetAllows()) {
      return "glm-5:cloud";  // Expert model
    } else {
      return getBestLocalModel();  // Fallback
    }
  }
}
```

**You don't need to think about this** — it happens automatically!

---

## Dynamic Model Loading

### The Problem with Hardcoded Models

Old way (bad):
```typescript
const models = [
  "glm-4.7-flash",
  "glm-5:cloud",
  "qwen2.5:14b",  // What if this isn't installed?
];
```

**Problem:** The app crashes if a model isn't installed!

### The Solution: Dynamic Discovery

New way (smart):
```typescript
// System asks Ollama: "What models do you have?"
const response = await fetch('/api/models');
const { models } = await response.json();

// Result: Only shows ACTUALLY available models
// ["qwen3.5:2b", "llama3.2"] - Just what you have!
```

**Benefits:**
- ✅ Never shows models you can't use
- ✅ Automatically detects new models
- ✅ Updates in real-time
- ✅ Works with ANY Ollama model

### The useModels Hook

Your Dashboard includes a powerful React hook:

```typescript
import { useModels } from '@/lib/hooks/useModels';

function MyComponent() {
  const {
    models,              // All available models
    selectedModel,       // Currently selected
    setSelectedModel,    // Change selection
    getCapableModel,     // Get best for task
    ollamaHealthy,       // Is Ollama running?
    loading,             // Still loading?
  } = useModels();

  // Dropdown automatically populated!
  return (
    <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)}>
      {models.map(model => (
        <option key={model.id} value={model.id}>
          {model.name}
        </option>
      ))}
    </select>
  );
}
```

**Magic:** The dropdown fills itself with whatever models you have!

---

## Expert-Based Escalation

### The Idea

When you select an **expert** (like "Researcher" or "Copywriter"), the system knows you want high quality. It automatically escalates to a more powerful model.

### How It Works

```typescript
// You select: "Researcher" expert
const expert = {
  id: "researcher",
  name: "Researcher",
  role: "Research Specialist"
};

// System thinks: "Research needs brainpower!"
if (expert && expert.id !== "general-assistant") {
  // Prioritize best models
  const preferredModels = [
    "qwen3.5:27b",      // Most capable local
    "qwen2.5:14b",      // Second best
    "glm-5:cloud",      // Cloud thinking
  ];
  
  // Use the best available
  modelToUse = preferredModels.find(m => availableModels.includes(m));
}
```

**Real example:**

| Your Selection | Model Used | Why |
|----------------|------------|-----|
| General Assistant | qwen3.5:2b | Simple Q&A |
| Researcher | qwen3.5:27b | Needs deep analysis |
| Marketing Expert | qwen3.5:27b | Creative writing |
| Code Reviewer | qwen3.5:27b | Complex reasoning |

**You don't need to manually select models anymore!**

---

## PROMPT YOU CAN USE

### Prompt 1: Add a New Model to Your System

**Where to use:** Terminal with Ollama

```bash
# Install a new model
ollama pull qwen2.5:14b

# Verify it's available
ollama list

# Refresh your Dashboard - the model appears automatically!
```

### Prompt 2: Check Which Model Was Used

**Where to use:** Browser console

```javascript
// Open browser console (F12) and run:
fetch('/api/models')
  .then(r => r.json())
  .then(data => {
    console.log("Available models:", data.ollama.models);
    console.log("Default model:", data.defaultModel);
  });
```

### Prompt 3: Force a Specific Model

**Where to use:** In your code

```typescript
// If you really want a specific model:
import { useModels } from '@/lib/hooks/useModels';

function ChatComponent() {
  const { models, setSelectedModel } = useModels();
  
  // Override automatic selection
  useEffect(() => {
    setSelectedModel("qwen3.5:27b");
  }, []);
}
```

---

## How to Personalize This for YOUR Dashboard

### Option 1: Adjust the Priority List

**File:** `src/lib/hooks/useModels.ts`

Find this section:
```typescript
const priorityModels = [
  'qwen3.5:27b',
  'qwen2.5:14b', 
  'qwen3.5:2b',
  'llama3.2',
];
```

**Change it to prefer your favorites:**
```typescript
const priorityModels = [
  'llama3.2',         // You prefer Llama
  'mistral:7b',       // Try Mistral
  'qwen3.5:2b',       // Fallback to Qwen
];
```

### Option 2: Change Task-to-Model Mapping

**File:** `src/lib/models/model-router.ts`

Find `TASK_MODEL_MAP` and customize:
```typescript
const TASK_MODEL_MAP = {
  'heartbeat': 'local-fast',           // Keep this - saves money
  'chat': 'local-capable',             // Change to 'cloud-thinking' for better chat
  'coding': 'local-capable',           // Keep local - good for privacy
  'document_generation': 'cloud-thinking', // Add cloud for documents
};
```

### Option 3: Set Your Default Model

**File:** `src/lib/config/app-config.ts`

```typescript
// Change the default when no preference exists
const DEFAULT_MODEL = 'llama3.2';  // Instead of 'glm-4.7-flash'
```

---

## Common Pitfalls & How to Avoid Them

### Pitfall 1: "I selected a model but it's not working"

**Problem:** Model isn't installed in Ollama

**Solution:**
```bash
# Check what's installed
ollama list

# Install the missing model
ollama pull qwen3.5:27b
```

### Pitfall 2: "Everything is using cloud models and costing money"

**Problem:** `cloudForChat` or `cloudForComplex` is enabled

**Solution:**
```typescript
// In your settings or config
config.cloudForChat = false;      // Disable for chat
config.cloudForComplex = false;   // Disable for complex tasks
```

### Pitfall 3: "The model dropdown is empty"

**Problem:** Ollama isn't running

**Solution:**
```bash
# Start Ollama
ollama serve

# Or check if it's running
curl http://localhost:11434/api/tags
```

### Pitfall 4: "Small tasks are using big models"

**Problem:** Task classification is wrong

**Solution:** Check `TASK_MODEL_MAP` in model-router.ts and ensure tasks are categorized correctly.

---

## Key Takeaways

1. **Three-tier system** automatically optimizes cost and quality
2. **Housekeeping** (2B model) for routine tasks — fast and free
3. **Capable local** (largest installed) for daily work — free and private
4. **Cloud thinking** only for complex tasks — pay only when needed
5. **Dynamic loading** shows only available models
6. **Expert escalation** automatically uses better models

---

## Next Steps

**You now hold the key to efficient AI model management!**

- Your system automatically saves money by using small models for simple tasks
- You get expert-level quality when you actually need it
- Everything adapts to whatever models you have installed

**What's next?**
- Chapter 14: Canvas Fullscreen Mode — Better viewing for your generated UIs
- Chapter 15: Presentation Styling — Creating beautiful, branded presentations

**Or explore:**
- Try installing different models and watch them appear in the dropdown
- Test the expert escalation by selecting different experts
- Check your browser console to see which model was used

---

*Remember: The best model is the one that gets the job done efficiently. Let the router do the thinking!*

---

**End of Chapter 13**

**Questions?** Check the SYSTEM_GUIDE.md for detailed API reference.

**Want to dive deeper?** Look at `src/lib/models/model-router.ts` and `src/lib/hooks/useModels.ts` in your codebase.

# Chapter 14: Canvas Fullscreen Mode - Better Viewing for Your Creations

## What You'll Learn in This Chapter

- **What fullscreen mode is** and why it matters
- **How to implement it** in your Canvas component
- **Device preview modes** - Mobile, tablet, desktop
- **Responsive design** in fullscreen
- **How to customize** the experience

---

## Opening: Why Fullscreen?

Imagine you've just created a beautiful dashboard with the Canvas AI. You want to:
- **Show it to your team** on a big screen
- **Test it on different devices** without distractions
- **See every detail** without squinting at a small preview
- **Present it to clients** professionally

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
- Normal mode: Fixed height (h-96 = 24rem)
- Fullscreen mode: Takes up all available space minus the header

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

- Click the fullscreen button to see your Canvas work in full glory
- Test on different "devices" to see responsive design
- Present to clients without distractions

**What's next?**
- Chapter 15: Presentation Styling - Beautiful, branded presentations
- Chapter 16: Edge Runtime Optimization - Fast, secure deployment

**Or try:**
- Press 'F' in Canvas to toggle fullscreen
- Generate a complex dashboard and view it fullscreen
- Test mobile responsiveness in fullscreen mode

---

*Remember: Great design deserves a great view. Fullscreen mode shows your work the way it's meant to be seen!*

---

**End of Chapter 14**

**Questions?** Check the Canvas page in your Dashboard and experiment!

**Code reference:** `src/app/canvas/page.tsx`

# Chapter 15: Presentation Styling - Creating Beautiful, Branded Slides

## What You'll Learn in This Chapter

- **Template system** - 6 professional presentation templates
- **Color schemes** - Match your brand or choose from presets
- **Logo upload** - Automatic branding on every slide
- **Brand integration** - Use your saved brand profiles
- **API integration** - Send styling data to the AI

---

## Opening: Why Presentation Styling Matters

Imagine you've created an amazing presentation with the Office AI. But then you realize:

- **It looks generic** - Like it could be anyone's presentation
- **No branding** - Where's your company logo?
- **Wrong colors** - Your brand uses blue, but the slides are all white
- **Unprofessional** - Clients expect consistent branding

**A great presentation needs great styling!**

---

## The Six Presentation Templates

Your AI Dashboard includes 6 professional templates. Think of them as "starting outfits" for your presentation.

### Template 1: Corporate

**Look and Feel:**
- Clean, professional, business-focused
- White or light gray backgrounds
- Blue or navy accents
- Conservative fonts

**Best For:**
- Business meetings
- Board presentations
- Investor pitches
- Annual reports

**Example Use:**
```
Your company presents Q4 earnings to the board.
The slides look polished and professional.
Investors trust the content because it looks credible.
```

### Template 2: Modern Dark

**Look and Feel:**
- Dark background (slate/near-black)
- White or light gray text
- Sleek, contemporary design
- Subtle gradients

**Best For:**
- Tech presentations
- Developer conferences
- Modern startups
- Product launches

**Example Use:**
```
You're presenting a new software feature.
The dark mode reduces eye strain in dim conference rooms.
It looks cutting-edge and innovative.
```

### Template 3: Minimal

**Look and Feel:**
- Pure white backgrounds
- Maximum whitespace
- Simple, elegant fonts
- Minimal decorations

**Best For:**
- Academic presentations
- Research findings
- Art and design portfolios
- When content speaks loudest

**Example Use:**
```
You're presenting scientific research.
The minimal design keeps focus on your data and findings.
No distractions, just pure information.
```

### Template 4: Creative

**Look and Feel:**
- Bold, vibrant colors
- Dynamic layouts
- Eye-catching elements
- Modern typography

**Best For:**
- Marketing pitches
- Creative agency presentations
- Brand launches
- When you need to stand out

**Example Use:**
```
You're pitching a marketing campaign to a client.
The bold design shows your creativity.
They remember your presentation.
```

### Template 5: Tech

**Look and Feel:**
- Blue gradients
- Modern, innovative aesthetic
- Circuit or network motifs
- Clean lines

**Best For:**
- Developer talks
- Tech startup pitches
- Architecture presentations
- AI/ML conferences

**Example Use:**
```
You're presenting your AI Dashboard at a tech meetup.
The tech template matches your audience.
They feel at home with the design.
```

### Template 6: Elegant

**Look and Feel:**
- Black background
- Gold or bronze accents
- Premium, luxury feel
- Sophisticated typography

**Best For:**
- Executive presentations
- Luxury brand pitches
- High-end client meetings
- When you want to impress

**Example Use:**
```
You're presenting to C-level executives.
The elegant design shows sophistication.
They take your proposal seriously.
```

---

## Color Scheme Overrides

Sometimes you need specific colors. That's where overrides come in.

### The Override Options

| Scheme | Background | Text | Best For |
|--------|------------|------|----------|
| Default | Uses template | Uses template | Trust the template |
| Black/White | Black | White | High contrast, dramatic |
| White/Black | White | Black | Classic, readable |
| Blue/White | Blue | White | Corporate, trustworthy |
| Dark Blue/White | Dark Blue | White | Tech, modern |
| Green/White | Green | White | Nature, growth, finance |

### When to Override vs Use Template

**Use Template When:**
- You want cohesive design
- You're not sure what colors to use
- You want professional results quickly

**Use Override When:**
- You have specific brand colors
- The template colors don't match your needs
- You need accessibility (high contrast)

---

## Logo Upload and Branding

### Why Logos Matter

Your logo appears on:
1. **Title Slide** - First thing people see
2. **Footer** - Subtle branding on every slide
3. **Consistency** - Professional look throughout

### How It Works

**The Process:**
```typescript
// 1. User uploads logo
const [logo, setLogo] = useState<string | null>(null);

// 2. File gets converted to base64
const reader = new FileReader();
reader.onload = (event) => {
  setLogo(event.target?.result as string);
};
reader.readAsDataURL(file);

// 3. Logo sent to API
const styling = {
  template: "corporate",
  logo: logo,  // Base64 encoded image
};

// 4. AI includes logo in generated HTML
// The logo appears on title slide and footer
```

### Supported Formats

- **PNG** - Best for logos with transparency
- **SVG** - Scalable, always crisp
- **JPEG** - Good for photos

**Recommended:** Use PNG or SVG for best quality.

---

## Brand Profile Integration

### The Smart Connection

Your Dashboard already has a **Brand Workspace** (Chapter 11). The presentation tool can use saved brands!

**How It Works:**

```typescript
// 1. Select brand from dropdown
const [selectedBrandId, setSelectedBrandId] = useState('');
const [brands, setBrands] = useState([]);

// 2. Fetch brands from API
useEffect(() => {
  fetch('/api/brand-workspace?action=brands')
    .then(r => r.json())
    .then(data => setBrands(data.brands));
}, []);

// 3. When brand selected, auto-load its logo
const handleBrandChange = (brandId) => {
  setSelectedBrandId(brandId);
  const brand = brands.find(b => b.id === brandId);
  if (brand?.logo) {
    setLogo(brand.logo);  // Auto-load!
  }
};
```

**Benefits:**
- ✅ Consistent branding across all materials
- ✅ No need to re-upload logos
- ✅ Uses your established brand voice

---

## The Complete Styling Panel

### Visual Layout

```
┌─────────────────────────────────────┐
│  Presentation Styling               │
├─────────────────────────────────────┤
│                                     │
│  Template Style                     │
│  ┌────────┬────────┬────────┐    │
│  │Corp    │Modern  │Minimal │    │
│  │Dark    │White   │Elegant │    │
│  │Creative│Tech    │        │    │
│  └────────┴────────┴────────┘    │
│                                     │
│  Color Scheme Override              │
│  [▼ Use Template Colors        ]   │
│                                     │
│  Brand Logo                         │
│  [🖼️ Logo Preview]  [Change Logo]   │
│  Logo appears on title & footer     │
│                                     │
│  Use Brand Profile                  │
│  [▼ No Brand (Custom)            ]   │
│                                     │
└─────────────────────────────────────┘
```

### User Flow

1. **Select Template** - Choose the visual style
2. **Override Colors** (Optional) - Customize if needed
3. **Upload Logo** (Optional) - Add your branding
4. **Select Brand** (Optional) - Use saved brand profile
5. **Generate** - AI creates styled presentation

---

## PROMPT YOU CAN USE

### Prompt 1: Generate Styled Presentation

**Where to use:** Office AI page

```javascript
// Fill in the form:
Template: "Corporate"
Color Scheme: "Blue/White"
Logo: [Upload your-logo.png]
Brand: "My Company"

// Then generate:
Action: "Create outline"
Topic: "Q4 Sales Results"
Audience: "Executives"
Duration: "15 minutes"
Purpose: "Inform"
```

### Prompt 2: API Call with Styling

**Where to use:** Custom API integration

```javascript
const response = await fetch('/api/office-ai', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'presentation',
    action: 'outline',
    data: {
      topic: 'Annual Company Report',
      audience: 'shareholders',
      duration: 30,
      purpose: 'inform'
    },
    styling: {
      template: 'elegant',
      colorScheme: 'black-white',
      logo: 'data:image/png;base64,iVBORw0...',
      brandId: 'brand-123'
    }
  })
});

const result = await response.json();
console.log('Styled presentation:', result.outline);
```

### Prompt 3: Custom Template Definition

**Where to use:** Extend templates

```typescript
// In your code, add a custom template:
const customTemplates = [
  ...defaultTemplates,
  {
    id: 'healthcare',
    name: 'Healthcare',
    desc: 'Medical, clean, trustworthy',
    colors: 'bg-white text-teal-600',
    accent: 'teal'
  }
];

// Use it:
setTemplate('healthcare');
```

---

## How to Personalize This for YOUR Dashboard

### Option 1: Add Custom Templates

**File:** `src/app/office/ai/page.tsx`

Find the templates array and add yours:

```typescript
const templates = [
  // ... existing templates ...
  {
    id: 'my-company',
    name: 'My Company',
    desc: 'Our official brand colors',
    colors: 'bg-blue-900 text-white'
  }
];
```

### Option 2: Change Default Template

**File:** `src/app/office/ai/page.tsx`

```typescript
// Change default
const [colorTheme, setColorTheme] = useState('corporate');  // Was 'default'
```

### Option 3: Add More Color Schemes

**File:** `src/app/office/ai/page.tsx`

```typescript
// Add to the color theme select:
<option value="purple-white">Purple Background / White Text</option>
<option value="orange-white">Orange Background / White Text</option>
<option value="red-white">Red Background / White Text</option>
```

### Option 4: Logo Position Options

**File:** `src/app/api/office-ai/route.ts`

```typescript
// In the prompt, specify logo position:
const prompt = `
  Create a presentation with:
  - Template: ${styling.template}
  - Logo position: ${styling.logoPosition || 'footer'}
  - Logo appears on: ${styling.logoOn || 'all slides'}
`;
```

---

## Common Pitfalls & How to Avoid Them

### Pitfall 1: "Logo doesn't appear on slides"

**Problem:** Logo not included in API call

**Solution:** Ensure styling object includes logo:
```typescript
// ❌ Bad: Missing logo
const styling = { template: 'corporate' };

// ✅ Good: Includes logo
const styling = { 
  template: 'corporate',
  logo: logo  // Base64 string
};
```

### Pitfall 2: "Colors don't match my brand"

**Problem:** Using wrong color scheme

**Solution:** Create custom template or use exact hex codes:
```typescript
// Add custom CSS for exact colors
const customStyles = `
  .slide {
    background-color: #0066CC !important;
    color: #FFFFFF !important;
  }
`;
```

### Pitfall 3: "Template looks different than preview"

**Problem:** AI generates different HTML than expected

**Solution:** Give AI more specific instructions:
```typescript
const prompt = `
  Use EXACTLY this color scheme:
  - Background: #0f172a (slate-900)
  - Text: #ffffff (white)
  - Accents: #fbbf24 (amber-400)
  
  Do not deviate from these colors.
`;
```

### Pitfall 4: "Logo is too big/small"

**Problem:** No size constraints on logo

**Solution:** Add CSS constraints:
```css
.logo {
  max-width: 150px;
  max-height: 50px;
  object-fit: contain;
}
```

---

## Key Takeaways

1. **Six templates** cover most use cases (Corporate, Modern Dark, Minimal, Creative, Tech, Elegant)
2. **Color overrides** let you customize when templates don't match
3. **Logo upload** automatically brands every presentation
4. **Brand profiles** connect to your existing workspace
5. **All styling** sent to API for AI to incorporate

---

## Next Steps

**Your presentations now look professional and branded!**

- Try each template to see which fits your needs
- Upload your company logo
- Save your brand profile for consistent use
- Generate a presentation and see the styling in action

**What's next?**
- Chapter 16: Edge Runtime - Fast, secure deployment
- Chapter 17: Troubleshooting - When things go wrong
- Chapter 20: Complete Prompt Library - Copy-paste prompts

**Or try:**
- Create a presentation with each template
- Upload different logos and see how they look
- Mix templates with color overrides
- Present to a friend and get feedback

---

*Remember: Great content deserves great presentation. Styling makes your work memorable!*

---

**End of Chapter 15**

**Questions?** Experiment with the Office AI page and see what looks best!

**Code reference:** `src/app/office/ai/page.tsx`, `src/app/api/office-ai/route.ts`

# Chapter 16: Edge Runtime Optimization - Fast, Secure Deployment

## What You'll Learn in This Chapter

- **What is Edge Runtime** and why it matters
- **Why we removed Node.js dependencies** (fs, path)
- **How SQLite replaced the file system**
- **What files were changed** and why
- **Benefits for your Dashboard**
- **How to deploy faster and more securely**

---

## Opening: Why Edge Runtime?

Imagine you're building a food truck (your app). You have two options:

**Option 1: Traditional Server (Node.js)**
- You rent a permanent kitchen (server)
- You pay for it 24/7, even when no customers
- It's in one location (slow for distant users)
- You have full control (good for complex tasks)

**Option 2: Edge Runtime**
- Your food truck goes where customers are
- You only pay when serving customers
- It's fast everywhere (runs near users)
- Limited tools (no big kitchen appliances)

**Edge Runtime = Your food truck comes to the customer, not the other way around!**

---

## What Is Edge Runtime?

### The Simple Explanation

Edge Runtime is a **lightweight JavaScript environment** that runs your code close to users, anywhere in the world.

**Traditional servers:**
- One location (e.g., Virginia, USA)
- User in Tokyo waits 200ms for response
- User in London waits 100ms
- Cold starts take 1-3 seconds

**Edge Runtime:**
- Runs in 100+ locations worldwide
- User in Tokyo gets response from Tokyo (20ms)
- User in London gets response from London (20ms)
- Cold starts take 0-50ms

### Why Next.js Uses It

Next.js can run your app in different "runtimes":

| Runtime | Use Case | Speed | Features |
|---------|----------|-------|----------|
| Node.js | Build tools, heavy processing | Slower startup | Full Node.js APIs |
| Edge | API routes, middleware | Instant | Limited APIs |
| Serverless | Most API routes | Medium | Good balance |

**Your Dashboard uses all three smartly!**

---

## The Problem: Node.js in Edge Runtime

### What We Were Doing Wrong

**Before (❌ Bad):**
```typescript
// ❌ Top-level import of Node.js modules
import * as fs from 'fs';
import * as path from 'path';

// ❌ Using in Edge Runtime
export function GET() {
  const data = fs.readFileSync('./data/memory.json');
  return Response.json(data);
}
```

**Result:**
```
ERROR: Cannot find module 'fs'
Edge Runtime doesn't support Node.js built-in modules
```

### Why Edge Runtime Doesn't Have fs/path

**Security:**
- Edge Runtime runs in multiple locations
- File system access could be dangerous
- No filesystem isolation between users

**Portability:**
- Must run the same everywhere
- File paths differ on Windows vs Linux
- Can't guarantee file system exists

**Speed:**
- File I/O is slow
- Network storage is faster
- SQLite is portable

---

## The Solution: SQLite Instead of Files

### The Swap

**Before (File System):**
```typescript
import * as fs from 'fs';
import * as path from 'path';

// Save data
const filePath = path.join(process.cwd(), 'data', 'memory.json');
fs.writeFileSync(filePath, JSON.stringify(data));

// Load data
const content = fs.readFileSync(filePath, 'utf-8');
return JSON.parse(content);
```

**After (SQLite):**
```typescript
import { sqlDatabase } from '@/lib/database/sqlite';

// Save data
sqlDatabase.setSetting('memory_data', JSON.stringify(data));

// Load data
const content = sqlDatabase.getSetting('memory_data');
return JSON.parse(content);
```

### Why SQLite Works in Edge Runtime

1. **No file paths needed** - SQLite handles storage
2. **Portable** - Same database file everywhere
3. **Fast** - In-memory caching
4. **Atomic** - Transactions prevent corruption
5. **Compatible** - Works in both Node.js and Edge

---

## Files We Changed

### 1. Memory File Service

**File:** `src/lib/services/memory-file.ts`

**Before:**
```typescript
import * as fs from 'fs';
import * as path from 'path';

class MemoryFileService {
  private MEMORY_FILE = path.join(process.cwd(), 'data', 'MEMORY.md');
  
  load() {
    if (fs.existsSync(this.MEMORY_FILE)) {
      return fs.readFileSync(this.MEMORY_FILE, 'utf-8');
    }
  }
  
  save(content: string) {
    fs.writeFileSync(this.MEMORY_FILE, content);
  }
}
```

**After:**
```typescript
import { sqlDatabase } from '@/lib/database/sqlite';

class MemoryFileService {
  load() {
    return sqlDatabase.getSetting('memory_file');
  }
  
  save(content: string) {
    sqlDatabase.setSetting('memory_file', content);
  }
}
```

### 2. Metrics Service

**File:** `src/lib/services/metrics.ts`

**Before:**
```typescript
import * as fs from 'fs';

class MetricsService {
  private METRICS_FILE = './data/metrics.json';
  
  loadMetrics() {
    if (fs.existsSync(this.METRICS_FILE)) {
      const data = fs.readFileSync(this.METRICS_FILE, 'utf-8');
      this.metrics = JSON.parse(data);
    }
  }
  
  saveMetrics() {
    fs.writeFileSync(this.METRICS_FILE, JSON.stringify(this.metrics));
  }
}
```

**After:**
```typescript
import { sqlDatabase } from '@/lib/database/sqlite';

class MetricsService {
  loadMetrics() {
    const data = sqlDatabase.getSetting('metrics_data');
    if (data) {
      this.metrics = JSON.parse(data);
    }
  }
  
  saveMetrics() {
    sqlDatabase.setSetting('metrics_data', JSON.stringify(this.metrics));
  }
}
```

### 3. RL Trainer

**File:** `src/lib/agent/rl-trainer.ts`

**Before:**
```typescript
import * as fs from 'fs';
import * as path from 'path';

class RLTrainer {
  private DATA_FILE = path.join(process.cwd(), 'data', 'rl-training.json');
  
  private loadData() {
    if (fs.existsSync(this.DATA_FILE)) {
      const data = fs.readFileSync(this.DATA_FILE, 'utf-8');
      this.conversations = JSON.parse(data);
    }
  }
  
  private saveData() {
    fs.writeFileSync(this.DATA_FILE, JSON.stringify(this.conversations));
  }
}
```

**After:**
```typescript
import { sqlDatabase } from '@/lib/database/sqlite';

class RLTrainer {
  private loadData() {
    const data = sqlDatabase.getSetting('rl_conversations');
    if (data) {
      this.conversations = JSON.parse(data);
    }
  }
  
  private saveData() {
    sqlDatabase.setSetting('rl_conversations', JSON.stringify(this.conversations));
  }
}
```

### 4. Task Scheduler Cleanup

**File:** `src/lib/services/task-scheduler.ts`

**Before:**
```typescript
// File system cleanup
const fs = await import('fs');
const path = await import('path');

const logDirs = ['.next/dev/logs', 'logs'];
for (const logDir of logDirs) {
  const fullPath = path.join(process.cwd(), logDir);
  const files = fs.readdirSync(fullPath);
  // ... cleanup logic
}
```

**After:**
```typescript
// Database-only cleanup
sqlDatabase.vacuum();
// Skip file operations in Edge Runtime
```

**Result:** Cleanup still happens, just uses database instead of files.

---

## The Dynamic Import Pattern

### When You REALLY Need Node.js

Sometimes you need file system operations, but only in specific contexts.

**Solution: Dynamic Imports with Runtime Checks**

```typescript
// Check if we're in Node.js
const isNodeRuntime = typeof process !== 'undefined' && process.cwd !== undefined;

if (isNodeRuntime) {
  // Only import in Node.js context
  const fs = await import('fs');
  const path = await import('path');
  
  // Now safe to use
  const content = fs.readFileSync(path.join(process.cwd(), 'file.txt'));
}
```

**But:** This doesn't work in Edge Runtime, so we avoid it entirely.

---

## Benefits of Edge Runtime

### 1. Speed

**Cold Start Comparison:**

| Runtime | Cold Start | Subsequent |
|---------|------------|------------|
| Node.js Server | 2-5 seconds | 50ms |
| Serverless | 500ms-2s | 50ms |
| Edge | 0-50ms | 0-10ms |

**Your Dashboard:** Instant response, worldwide!

### 2. Global Distribution

**Before (One Server):**
```
User in Sydney ──200ms──> Server in Virginia
User in Tokyo ──150ms──> Server in Virginia
User in London ──80ms──> Server in Virginia
```

**After (Edge Runtime):**
```
User in Sydney ──20ms──> Edge in Sydney
User in Tokyo ──20ms──> Edge in Tokyo
User in London ──20ms──> Edge in London
```

### 3. Security

**No File System Access:**
- ✅ Code can't read your server's files
- ✅ Code can't write malicious files
- ✅ Isolated execution environment

**SQLite is Safe:**
- Single database file
- Transaction-based
- No arbitrary file access

### 4. Cost

**Traditional Server:**
- $5-50/month for 24/7 running
- Pay even when no users

**Edge Runtime:**
- $0 when no requests
- Pay per request (fractions of a cent)
- Scales automatically

---

## PROMPT YOU CAN USE

### Prompt 1: Check Your Runtime

**Where to use:** Browser console

```javascript
// Open console and run:
fetch('/api/heartbeat')
  .then(r => r.json())
  .then(data => {
    console.log('Runtime:', data.runtime || 'unknown');
    console.log('Location:', data.location);
    console.log('Response time:', Date.now() - start + 'ms');
  });
```

### Prompt 2: Convert File-Based to SQLite

**Template for any service:**

```typescript
// ❌ BEFORE: File-based
import * as fs from 'fs';

class OldService {
  save(data: any) {
    fs.writeFileSync('./data/myfile.json', JSON.stringify(data));
  }
  
  load() {
    if (fs.existsSync('./data/myfile.json')) {
      return JSON.parse(fs.readFileSync('./data/myfile.json', 'utf-8'));
    }
  }
}

// ✅ AFTER: SQLite-based
import { sqlDatabase } from '@/lib/database/sqlite';

class NewService {
  save(data: any) {
    sqlDatabase.setSetting('my_service_data', JSON.stringify(data));
  }
  
  load() {
    const data = sqlDatabase.getSetting('my_service_data');
    return data ? JSON.parse(data) : null;
  }
}
```

### Prompt 3: Verify Edge Compatibility

**Where to use:** Build check

```bash
# Check for Node.js imports
grep -r "from 'fs'" src/lib --include="*.ts"
grep -r "from 'path'" src/lib --include="*.ts"

# Should return nothing (or only in safe files)

# Check for process usage
grep -r "process\." src/app/api --include="*.ts"

# These are OK in API routes, not in Edge
```

---

## How to Personalize This for YOUR Dashboard

### Option 1: Keep Backup of Original Files

**File:** `src/lib/services/`

```bash
# Before changing, backup:
cp memory-file.ts memory-file-node.ts
cp metrics.ts metrics-node.ts

# Now safe to modify original
```

### Option 2: Add File-Based Fallback

**For specific features that need files:**

```typescript
// In a Node.js-only API route
export async function POST() {
  // This runs in Node.js, so fs is available
  const fs = await import('fs');
  
  // Do file operations
  const files = fs.readdirSync('./uploads');
  
  return Response.json({ files });
}

// Add to route config
export const runtime = 'nodejs';  // Not edge!
```

### Option 3: Hybrid Approach

**Some data in SQLite, some in files:**

```typescript
class HybridService {
  // Fast data in SQLite
  getSettings() {
    return sqlDatabase.getSetting('settings');
  }
  
  // Large files on disk (Node.js API route only)
  getLargeFile(filename: string) {
    // This would be in a separate API route
    // with 'runtime: nodejs'
  }
}
```

### Option 4: Migration Script

**Move old file data to SQLite:**

```typescript
// One-time migration
async function migrateToSQLite() {
  const fs = await import('fs');
  
  // Read old files
  const files = fs.readdirSync('./data');
  
  for (const file of files) {
    if (file.endsWith('.json')) {
      const content = fs.readFileSync(`./data/${file}`, 'utf-8');
      const key = file.replace('.json', '');
      
      // Save to SQLite
      sqlDatabase.setSetting(key, content);
      
      // Delete old file
      fs.unlinkSync(`./data/${file}`);
    }
  }
  
  console.log('Migration complete!');
}
```

---

## Common Pitfalls & How to Avoid Them

### Pitfall 1: "Module not found: 'fs'"

**Problem:** Edge Runtime doesn't have fs

**Solution:** Remove top-level imports:
```typescript
// ❌ Bad: Top-level import
import * as fs from 'fs';

// ✅ Good: No import, use SQLite
import { sqlDatabase } from '@/lib/database/sqlite';
```

### Pitfall 2: "process is not defined"

**Problem:** process doesn't exist in Edge Runtime

**Solution:** Check before using:
```typescript
// ❌ Bad: Direct usage
const cwd = process.cwd();

// ✅ Good: Check first
if (typeof process !== 'undefined' && process.cwd) {
  const cwd = process.cwd();
}
```

### Pitfall 3: "SQLite database not initialized"

**Problem:** Trying to use SQLite before init

**Solution:** Always initialize first:
```typescript
import { sqlDatabase } from '@/lib/database/sqlite';

// Initialize before use
await sqlDatabase.initialize();

// Now safe to use
sqlDatabase.setSetting('key', 'value');
```

### Pitfall 4: "File cleanup not working"

**Problem:** File operations removed

**Solution:** Accept database-only cleanup:
```typescript
// ❌ Old: File cleanup
await cleanLogFiles();
await archiveOldReports();

// ✅ New: Database cleanup
sqlDatabase.vacuum();
await cleanOldTaskResults();
```

---

## Key Takeaways

1. **Edge Runtime** runs code close to users (fast!)
2. **No Node.js modules** (fs, path) in Edge
3. **SQLite replaces files** - portable and fast
4. **Global distribution** - 20ms response worldwide
5. **Better security** - no file system access
6. **Lower cost** - pay per request, not 24/7

---

## Next Steps

**Your Dashboard now runs faster and more securely!**

- Edge Runtime means instant responses
- SQLite keeps data portable
- No more file system dependencies
- Ready for global deployment

**What's next?**
- Chapter 17: Troubleshooting - When things go wrong
- Chapter 19: Deployment - Going live
- Chapter 20: Complete Prompt Library

**Or try:**
- Check response times in Network tab
- Test from different locations
- Build your own Edge-compatible components
- Deploy to Vercel Edge

---

*Remember: Edge Runtime is like having a food truck that goes to the customer. Fast, efficient, and everywhere!*

---

**End of Chapter 16**

**Questions?** Check the SYSTEM_GUIDE.md for architecture details.

**Code reference:** All Edge-compatible files in `src/lib/`

# Chapter 17: Building with AI - Don't Be Overwhelmed

**Important:** Before you worry about writing code, remember this book's philosophy from Chapter 1: **AI is your tool manager, not your replacement.** You direct, AI builds.

## The Truth About This Code

When you first see this project's codebase — hundreds of files, thousands of lines — it can feel overwhelming. **Don't worry.** Here's the secret:

**You don't need to write all this code yourself.**

The code in this repository is a **sample implementation** — a working reference you can learn from. But the real power is having AI build similar systems for you.

### You Are the Architect, Not the Builder

Think of building software like building a house:

| Your Role | AI's Role |
|-----------|-----------|
| Architect | Construction Worker |
| Decide what to build | Build what you ask |
| Set requirements | Implement features |
| Review and test | Generate code |
| Make decisions | Suggest alternatives |
| Approve changes | Document choices |

**You don't need to lay every brick yourself. You just need to know what you want.**

---

## What You'll Learn

- **Don't panic** — You don't need to understand every line
- **Prompt-driven development** — Describe what you want, AI builds it
- **The master prompt** — A complete prompt to build the system
- **Iterative building** — Start small, add features
- **When to dive deep** — Which parts deserve your attention
- **Learning by reviewing** — How to read AI-generated code

---

## The Master Prompt: Building the Foundation

Here's a prompt you can copy and paste into OpenCode, Claude, ChatGPT, or any AI assistant. This will build the **foundation** of your AI Dashboard from scratch.

### Copy This Prompt:

```
I want to build a Personal AI Dashboard - a privacy-first AI assistant 
that runs entirely on my local machine. Build me the foundation.

## What I Want

A Next.js application with:

1. **Project Structure**
   - src/app/ for pages and API routes (App Router)
   - src/lib/ for shared code and utilities
   - src/components/ for React components
   - data/ for SQLite database storage

2. **Database Foundation**
   - SQLite database (using sql.js for browser/edge compatibility)
   - Tables for: messages, documents, brands, projects, tasks, notes
   - A database service (src/lib/database/sqlite.ts)
   - Save/load from data/assistant.db

3. **Chat System**
   - API route at src/app/api/chat/route.ts
   - Streaming responses (SSE)
   - Support for local models via Ollama
   - Support for cloud models (OpenRouter, GLM API, DeepSeek)
   - Model router that picks the right model for each task

4. **Features to Scaffold**
   - Chat interface (src/app/page.tsx)
   - Document upload and management
   - Brand voice management
   - Task scheduling
   - Memory/notes storage

5. **Core Utilities**
   - Environment variable handling (.env.example)
   - Model configuration (src/lib/models/)
   - ID generation (using uuid)

## Technical Requirements

- TypeScript (strict mode)
- Next.js 15+ (App Router)
- React 18+
- SQLite with sql.js
- Streaming responses
- No authentication (local use)

## Style

- Clean, modular code
- TypeScript types for everything
- Comments explaining key decisions
- Error handling throughout
- Logging for debugging

## Output

1. Create the folder structure
2. Write the core files (package.json, tsconfig.json, etc.)
3. Implement the database service
4. Create the chat API with streaming
5. Add the model router
6. Build a simple chat UI

Start with a working foundation. We'll add features incrementally.

After you create each file, explain briefly what it does and why.
```

---

## How to Use This Prompt

### Option 1: OpenCode (Terminal)
```bash
cd ~/projects
mkdir ai-dashboard
cd ai-dashboard
ollama run opencode

# Paste the prompt above
# Watch AI build the foundation
```

### Option 2: Claude / ChatGPT (Web)
1. Copy the prompt
2. Paste into Claude or ChatGPT
3. Ask for one section at a time if output is too long
4. Copy each file to your project

### Option 3: Cursor IDE
1. Open Cursor in your project folder
2. Press Cmd+K (Mac) or Ctrl+K (Windows)
3. Paste the prompt
4. Accept each file suggestion

---

## Iterative Building: Add One Feature at a Time

The master prompt builds the foundation. After that, add features incrementally:

### Adding Document Management

```
Add document management to the AI Dashboard:

1. Database table for documents (id, title, content, type, tags, metadata)
2. API route at src/app/api/documents/route.ts
   - GET: list documents
   - POST: upload new document
3. API route at src/app/api/documents/[id]/route.ts
   - GET: get document by ID
   - PUT: update document
   - DELETE: remove document
4. A simple document list page at src/app/documents/page.tsx
5. Upload functionality (support PDF, Word, plain text)

Include error handling and types.
```

### Adding Brand Voice System

```
Add a brand voice management system:

1. Database table for brands:
   - id, name, voice_instructions, sample_content, created_at
2. API routes for CRUD operations
3. A page to create and edit brand voices
4. Store brand voice prompts
5. Integrate with chat API (option to use brand voice)

The brand voice should modify how AI responds — tone, style, vocabulary.
```

### Adding Task Scheduling

```
Add a task scheduling system:

1. Database table for scheduled tasks:
   - id, type, schedule (cron), last_run, next_run, enabled, config
2. Task types:
   - intelligence_report: daily summary
   - security_scan: scan for vulnerabilities
   - self_reflection: AI analyzes its own responses
3. A task scheduler service (src/lib/services/task-scheduler.ts)
4. API routes to manage tasks
5. A page to view and manage tasks

Run tasks on schedule, log results to database.
```

---

## When to Pay Attention

You don't need to read every line of code. Focus on these key areas:

### Must Understand

| File/Folder | Why It Matters |
|-------------|----------------|
| `package.json` | What packages are used |
| `src/lib/database/sqlite.ts` | How data is stored |
| `src/app/api/chat/route.ts` | How AI responds |
| `src/lib/models/` | How models are configured |
| `.env.example` | What settings are available |

### Can Skim

| File/Folder | Why You Can Skim |
|-------------|------------------|
| UI Components | Visual only, logic is elsewhere |
| Type definitions | Auto-generated or boilerplate |
| Config files | Standard Next.js setup |
| Utility helpers | Self-explanatory names |

### Never Ignore

| Issue | Why |
|-------|-----|
| Security warnings | Could expose your data |
| Error handling | Prevents crashes |
| API keys | Never commit real keys |
| Database migrations | Data integrity |

---

## Learning by Reviewing AI Code

Even though AI generates most code, **you should review it**. Here's how:

### 1. Read the Function Names

```typescript
// Good: Clear names
async function sendMessageToModel(message: string): Promise<string>
async function saveDocumentToDatabase(doc: Document): Promise<void>
async function loadUserPreferences(userId: string): Promise<Preferences>

// Bad: Unclear names
async function process(input: any): Promise<any>
async function handle(data: any): Promise<void>
async function run(id: string): Promise<any>
```

**If names are unclear, ask AI to rename them:**
```
Refactor these functions to have clearer names:
- `process` → describe what it processes
- `handle` → what does it handle?
- `run` → run what?
```

### 2. Check Types

```typescript
// Good: Explicit types
interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: number;
}

// Bad: No types
function sendMessage(message) { // What type is message?
  return fetch('/api/chat', { body: message })
}
```

**Ask AI to add types:**
```
Add TypeScript types and interfaces for all parameters and return values.
Explain the shape of the data at each step.
```

### 3. Look for Error Handling

```typescript
// Good: Handles errors
try {
  const response = await fetch('/api/chat', { body: message })
  if (!response.ok) {
    throw new Error(`API returned ${response.status}`)
  }
  return await response.json()
} catch (error) {
  console.error('Failed to send message:', error)
  throw error // Re-throw so caller can handle
}

// Bad: No error handling
const response = await fetch('/api/chat', { body: message })
return await response.json() // What if response is not ok?
```

**Ask AI to add error handling:**
```
Add comprehensive error handling to this function. 
Handle: network errors, invalid responses, timeouts.
Log errors appropriately. Re-throw with context.
```

### 4. Comments Matter

```typescript
// Bad: No comments
function processMessage(msg: Message): ProcessedMessage {
  const cleaned = msg.content.trim().toLowerCase()
  const tokens = cleaned.split(/\s+/)
  return { original: msg, cleaned, tokens }
}

// Good: Explains why
/**
 * Prepares a message for AI processing.
 * 
 * Why: AI models perform better with clean, normalized input.
 * - Trim whitespace (avoids empty tokens)
 * - Lowercase (case-insensitive matching)
 * - Split into tokens (for context limiting)
 */
function processMessage(msg: Message): ProcessedMessage {
  const cleaned = msg.content.trim().toLowerCase()
  const tokens = cleaned.split(/\s+/)
  return { original: msg, cleaned, tokens }
}
```

---

## The Sample Code Philosophy

This repository contains a complete, working implementation. Think of it as:

### What the Code Is

- ✅ A **working reference** — Everything runs
- ✅ A **learning tool** — See how features connect
- ✅ A **starting point** — Modify for your needs
- ✅ A **test bed** — Try experiments safely

### What the Code Is NOT

- ❌ The only way to build this
- ❌ Perfect code (no code is perfect)
- ❌ Something you must memorize
- ❌ Something you must write from scratch

### How to Use the Sample

1. **Clone it** — Get it running locally
2. **Explore it** — Click around, see features
3. **Break it** — Change things, see what happens
4. **Learn from it** — Read key files
5. **Build your own** — Use prompts to create your version

---

## Prompt Library: Building Blocks

Here are prompts for common building blocks. Use these as starting points:

### Database Table

```
Create a database table for [PURPOSE] with these fields:
- id: unique identifier (string)
- [field2]: [type] - [description]
- [field3]: [type] - [description]
- created_at: timestamp
- updated_at: timestamp

Add to src/lib/database/sqlite.ts
Include: create, read, update, delete functions
```

### API Route

```
Create a Next.js API route at src/app/api/[NAME]/route.ts

Endpoints:
- GET: [describe what it returns]
- POST: [describe what it accepts and does]

Include:
- Input validation
- Error handling
- TypeScript types
- Database integration
```

### React Component

```
Create a React component for [PURPOSE] at src/components/[NAME].tsx

Props:
- [prop1]: [type] - [description]
- [prop2]: [type] - [description]

Features:
- [feature 1]
- [feature 2]

Style with Tailwind CSS.
Include loading and error states.
```

### Service Class

```
Create a service class for [PURPOSE] at src/lib/services/[NAME].ts

Methods:
- [method1]: [description]
- [method2]: [description]

Include:
- Singleton pattern
- Error handling
- Logging
- TypeScript types
```

---

## Common Patterns Reused

Throughout this codebase, you'll see patterns repeated. Learn these:

### Pattern 1: Database Access

```typescript
// Every database operation follows this pattern
async function getItem(id: string): Promise<Item | null> {
  if (!db) throw new Error('Database not initialized')
  
  const result = db.exec('SELECT * FROM items WHERE id = ?', [id])
  
  if (result.length === 0 || result[0].values.length === 0) {
    return null
  }
  
  return mapRowToItem(result[0].columns, result[0].values[0])
}
```

### Pattern 2: API Route Handler

```typescript
// Every API route follows this pattern
export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Validate input
    if (!body.field) {
      return NextResponse.json({ error: 'Missing field' }, { status: 400 })
    }
    
    // Do work
    const result = await doSomething(body)
    
    // Return success
    return NextResponse.json({ result })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### Pattern 3: Streaming Response

```typescript
// Streaming AI responses
const encoder = new TextEncoder()
const stream = new ReadableStream({
  async start(controller) {
    for await (const chunk of aiResponse) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`))
    }
    controller.close()
  }
})

return new Response(stream, {
  headers: { 'Content-Type': 'text/event-stream' }
})
```

---

## Don't Be Overwhelmed: A Checklist

When you feel overwhelmed by the code:

- [ ] Remember: You're the architect, not the bricklayer
- [ ] Start with the master prompt — let AI build the foundation
- [ ] Add features one at a time with focused prompts
- [ ] Review only what matters: database, API routes, model config
- [ ] Use the sample code as reference, not requirement
- [ ] Break things — that's how you learn
- [ ] Ask AI to explain anything confusing

---

## Key Takeaways

✅ **Don't write from scratch** — Use prompts to generate code

✅ **You're the architect** — Direct, review, approve

✅ **Sample code = reference** — Not the only way

✅ **Key files matter most** — Database, API routes, model config

✅ **Iterative building wins** — One feature at a time

✅ **Learn by reviewing** — Read names, types, error handling

✅ **Break the code** — Experiment safely

---

**Next: Chapter 18 - Connecting to Messaging Systems (Telegram, Slack, Notion)**

# Chapter 18: Connecting to Messaging Systems - Telegram, Slack, Notion, and More

Your AI Dashboard doesn't have to live in a web browser. You can connect it to messaging platforms like Telegram, Slack, Discord, Notion, or any other communication tool. This chapter shows you how.

## What You'll Learn

- **Why messaging integration matters** — Meet users where they are
- **Telegram integration** — Step-by-step bot setup
- **The integration pattern** — Apply to any platform
- **Slack integration** — Adapting the same approach
- **Notion integration** — Document-based AI
- **Security considerations** — Keeping your system safe
- **Multi-platform strategy** — One AI, many channels

---

## The Restaurant Delivery Analogy

Imagine you run a great restaurant (your AI Dashboard).

**Traditional approach:** Customers must come to your restaurant (web interface).

**Messaging integration:** You deliver to where customers are:
- Telegram → Like food delivery to someone's home
- Slack → Like a food truck at their office
- Notion → Like meal prep delivered weekly
- Discord → Like catering their party

**Same kitchen (AI), different delivery methods (integrations).**

---

## Why Messaging Integration?

### Benefits

| Benefit | Explanation |
|---------|-------------|
| **Meet users where they are** | They already use Telegram/Slack |
| **Instant notifications** | Push messages without email |
| **Mobile-friendly** | Messaging apps are mobile-first |
| **Familiar interface** | No new app to learn |
| **Always available** | AI responds 24/7 |

### Use Cases

- **Daily briefings** — AI sends summary each morning
- **Alerts** — Notify when something important happens
- **Chat interface** — Have conversations in your favorite app
- **Commands** — Issue commands via message
- **Document sharing** — Send files to AI for processing

---

## The Integration Pattern

All messaging integrations follow the same pattern:

```
┌─────────────────┐
│   Your AI       │
│   Dashboard     │
│   (The Brain)   │
└────────┬────────┘
         │
         │ API Routes
         │
┌────────┴────────┐
│   Integration   │
│   Service       │
│   (The Bridge)  │
└────────┬────────┘
         │
         │ Webhook/Polling
         │
┌────────┴────────┐
│   Messaging     │
│   Platform      │
│   (Telegram,    │
│    Slack, etc.) │
└─────────────────┘
```

### Key Components

1. **Platform (Messaging App)** — Where users interact
2. **Webhook/Polling** — How messages get to your server
3. **Integration Service** — Translates between platform and AI
4. **API Routes** — Handle incoming messages
5. **AI Dashboard** — Processes and responds

---

## Telegram Integration (Complete Guide)

Telegram is one of the easiest platforms to integrate with. Let's build a complete Telegram bot.

### Step 1: Create a Telegram Bot

1. Open Telegram and search for **@BotFather**
2. Send `/newbot`
3. Give your bot a name (e.g., "MyAI Dashboard")
4. Give your bot a username (e.g., "myai_dashboard_bot")
5. **Save the bot token!** It looks like: `1234567890:ABCdefGHIjk...`

### Step 2: Add Configuration

Add to your `.env.local`:

```env
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_WEBHOOK_URL=https://your-domain.com/api/telegram/webhook
TELEGRAM_ENABLED=true
```

### Step 3: Database Storage for Telegram

The AI Dashboard stores Telegram configuration in SQLite:

```typescript
// Already implemented in src/lib/storage/telegram-config.ts

interface TelegramConfig {
  botToken: string;
  enabled: boolean;
  webhookUrl?: string;
  allowedUsers?: string[];
  chatWithAI: boolean;
}
```

### Step 4: Integration Service

The Telegram service (at `src/lib/integrations/telegram.ts`) handles:

```typescript
class TelegramService {
  // Send a message to a chat
  async sendMessage(chatId: number, text: string): Promise<void>
  
  // Get updates (long polling)
  async getUpdates(timeout: number): Promise<TelegramUpdate[]>
  
  // Set up webhook (alternative to polling)
  async setWebhook(url: string): Promise<void>
  
  // Handle incoming message
  async handleMessage(message: TelegramMessage): Promise<void>
  
  // Register commands
  async setMyCommands(commands: TelegramBotCommand[]): Promise<void>
}
```

### Step 5: API Route for Webhooks

Create `src/app/api/telegram/webhook/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { telegramService } from '@/lib/integrations/telegram';
import { getDatabase } from '@/lib/database/sqlite';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Verify this is a valid Telegram update
    if (!body.update_id) {
      return NextResponse.json({ error: 'Invalid update' }, { status: 400 });
    }
    
    // Process the message
    if (body.message?.text) {
      await handleTelegramMessage(body.message);
    }
    
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

async function handleTelegramMessage(message: any) {
  const chatId = message.chat.id;
  const text = message.text;
  
  // Commands
  if (text.startsWith('/')) {
    await handleCommand(chatId, text, message);
  } else {
    // Chat with AI
    const response = await chatWithAI(text, message.from);
    await telegramService.sendMessage(chatId, response);
  }
}

async function handleCommand(chatId: number, command: string, message: any) {
  const cmd = command.split(' ')[0].toLowerCase();
  
  switch (cmd) {
    case '/start':
      await telegramService.sendMessage(
        chatId,
        'Welcome to AI Dashboard! Send me any message to chat with the AI.'
      );
      break;
      
    case '/help':
      await telegramService.sendMessage(
        chatId,
        'Commands:\n/start - Start the bot\n/help - Show this help\n/schedule - Set up scheduled messages\n/status - Check system status'
      );
      break;
      
    case '/status':
      const status = await getSystemStatus();
      await telegramService.sendMessage(chatId, status);
      break;
      
    default:
      await telegramService.sendMessage(chatId, 'Unknown command. Send /help for available commands.');
  }
}
```

### Step 6: Polling Alternative (Easier for Development)

For local development (no public URL), use long polling:

```typescript
// src/lib/integrations/telegram.ts (excerpt)

async startPolling() {
  if (this.pollingInterval) return;
  
  console.log('[Telegram] Starting polling...');
  
  this.pollingInterval = setInterval(async () => {
    try {
      const updates = await this.getUpdates(30);
      
      for (const update of updates) {
        if (update.message && !this.processedMessages.has(update.message.message_id)) {
          this.processedMessages.add(update.message.message_id);
          
          if (this.onMessageHandler) {
            await this.onMessageHandler(update.message);
          }
        }
      }
    } catch (error) {
      console.error('[Telegram] Polling error:', error);
    }
  }, 1000);
}
```

### Step 7: Telegram Management Page

Create `src/app/telegram/page.tsx` (already in project):

```typescript
// This page lets you:
// - Enable/disable Telegram integration
// - Set bot token
// - Configure allowed users
// - View message history
// - Test the connection
```

### Step 8: Test Your Bot

```bash
# Start your AI Dashboard
npm run dev

# In Telegram, find your bot
# Send: /start

# Send any message
# The AI should respond
```

---

## The Universal Integration Pattern

Notice how Telegram integration works? Here's the pattern you can apply to ANY messaging platform:

### Pattern Components

1. **Configuration Storage**
   - API credentials (tokens, keys)
   - Webhook URLs
   - Enabled/disabled toggles
   - User permissions

2. **Integration Service**
   - Send messages
   - Receive messages (webhook or polling)
   - Parse commands
   - Format responses

3. **API Routes**
   - Receive webhooks from platform
   - Process incoming messages
   - Send responses

4. **User Interface**
   - Configuration page
   - Message history
   - Test functionality

### Code Template for Any Platform

```typescript
// src/lib/integrations/[platform].ts

interface [Platform]Config {
  apiKey: string;
  enabled: boolean;
  webhookUrl?: string;
  allowedUsers?: string[];
}

class [Platform]Service {
  private config: [Platform]Config | null = null;
  
  setConfig(config: [Platform]Config) {
    this.config = config;
  }
  
  async sendMessage(recipientId: string, text: string): Promise<void> {
    // Platform-specific API call
  }
  
  async handleWebhook(payload: any): Promise<void> {
    // Parse platform webhook format
    // Route to appropriate handler
  }
  
  async setWebhook(url: string): Promise<void> {
    // Register webhook with platform
  }
}

export const [platform]Service = new [Platform]Service();
```

---

## Slack Integration

Let's apply the same pattern to Slack.

### Step 1: Create a Slack App

1. Go to https://api.slack.com/apps
2. Click "Create New App"
3. Choose "From a manifest" or "From scratch"
4. Name it (e.g., "AI Dashboard")
5. Add Bot Token Scopes: `chat:write`, `im:history`, `im:read`
6. Install to your workspace
7. **Save the Bot User OAuth Token!**

### Step 2: Add to Configuration

```env
# Slack Bot Configuration
SLACK_BOT_TOKEN=xoxb-your-token-here
SLACK_SIGNING_SECRET=your-signing-secret
SLACK_ENABLED=true
```

### Step 3: Slack Integration Service

```typescript
// src/lib/integrations/slack.ts

interface SlackConfig {
  botToken: string;
  signingSecret: string;
  enabled: boolean;
}

class SlackService {
  private config: SlackConfig | null = null;
  private baseUrl = 'https://slack.com/api';
  
  setConfig(config: SlackConfig) {
    this.config = config;
  }
  
  async sendMessage(channel: string, text: string): Promise<void> {
    if (!this.config?.botToken) throw new Error('Slack not configured');
    
    const response = await fetch(`${this.baseUrl}/chat.postMessage`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ channel, text }),
    });
    
    const data = await response.json();
    if (!data.ok) throw new Error(data.error);
  }
  
  async handleWebhook(payload: any): Promise<void> {
    // Verify signature
    // Parse Slack event format
    // Route to handler
  }
}

export const slackService = new SlackService();
```

### Step 4: Slack API Route

```typescript
// src/app/api/slack/events/route.ts

export async function POST(request: NextRequest) {
  const body = await request.text();
  
  // Verify Slack signature
  const timestamp = request.headers.get('X-Slack-Request-Timestamp');
  const signature = request.headers.get('X-Slack-Signature');
  
  // ... verification logic ...
  
  const payload = JSON.parse(body);
  
  // Handle URL verification
  if (payload.type === 'url_verification') {
    return NextResponse.json({ challenge: payload.challenge });
  }
  
  // Handle events
  if (payload.event?.type === 'message') {
    await handleSlackMessage(payload.event);
  }
  
  return NextResponse.json({ ok: true });
}
```

---

## Notion Integration

Notion is different — it's document-based, not chat-based.

### Use Cases

- **Daily journaling** — AI helps you write
- **Knowledge base** — AI retrieves and summarizes
- **Task management** — AI updates databases
- **Meeting notes** — AI transcribes and organizes

### Step 1: Create Notion Integration

1. Go to https://www.notion.so/my-integrations
2. Click "New integration"
3. Name it, select workspace
4. **Save the Internal Integration Token!**
5. Share pages with your integration

### Step 2: Configuration

```env
# Notion Integration
NOTION_API_KEY=secret_your_key_here
NOTION_ENABLED=true
NOTION_DATABASE_ID=your_database_id
```

### Step 3: Notion Integration Service

```typescript
// src/lib/integrations/notion.ts

interface NotionConfig {
  apiKey: string;
  databaseId?: string;
  enabled: boolean;
}

class NotionService {
  private config: NotionConfig | null = null;
  private baseUrl = 'https://api.notion.com/v1';
  
  async createPage(parentId: string, title: string, content: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/pages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        parent: { database_id: parentId },
        properties: {
          Name: { title: [{ text: { content: title } }] },
        },
        children: [
          {
            object: 'block',
            type: 'paragraph',
            paragraph: { text: [{ text: { content } }] },
          },
        ],
      }),
    });
    
    return response.json();
  }
  
  async queryDatabase(databaseId: string, filter?: any): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/databases/${databaseId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({ filter }),
    });
    
    const data = await response.json();
    return data.results;
  }
  
  async appendBlock(pageId: string, content: string): Promise<void> {
    // Add content to existing page
  }
}

export const notionService = new NotionService();
```

### Step 4: Notion Use Cases

**Daily Journal:**
```typescript
// Create a daily journal entry
await notionService.createPage(
  databaseId,
  new Date().toLocaleDateString(),
  aiGeneratedContent
);
```

**Search Knowledge Base:**
```typescript
// Query Notion database
const pages = await notionService.queryDatabase(databaseId, {
  property: 'Tags',
  contains: 'important'
});

// Summarize for user
const summary = await ai.summarize(pages);
```

---

## Discord Integration

Discord is similar to Telegram but designed for communities.

### Step 1: Create Discord Bot

1. Go to https://discord.com/developers/applications
2. Click "New Application"
3. Navigate to "Bot"
4. Click "Add Bot"
5. **Save the Token!**
6. Enable "Message Content Intent"

### Step 2: Configuration

```env
# Discord Bot
DISCORD_BOT_TOKEN=your_token_here
DISCORD_CLIENT_ID=your_client_id
DISCORD_ENABLED=true
```

### Step 3: Discord Integration Service

```typescript
// src/lib/integrations/discord.ts

class DiscordService {
  private config: DiscordConfig | null = null;
  private baseUrl = 'https://discord.com/api/v10';
  
  async sendMessage(channelId: string, content: string): Promise<void> {
    await fetch(`${this.baseUrl}/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${this.config.botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    });
  }
  
  // Discord uses websockets for real-time, consider discord.js library
}

export const discordService = new DiscordService();
```

---

## Security Considerations

When connecting to external platforms, security is critical.

### 1. Verify Webhook Signatures

```typescript
// Always verify requests come from the platform

function verifyTelegramSignature(token: string, body: string): boolean {
  // Telegram doesn't sign webhooks, but you can verify the bot token
  return true; // In production, add IP whitelist
}

function verifySlackSignature(secret: string, body: string, signature: string, timestamp: string): boolean {
  const crypto = require('crypto');
  const base = `v0:${timestamp}:${body}`;
  const hmac = crypto.createHmac('sha256', secret).update(base).digest('hex');
  return `v0=${hmac}` === signature;
}

function verifyDiscordSignature(publicKey: string, body: string, signature: string, timestamp: string): boolean {
  // Use tweetnacl or similar for Ed25519 verification
}
```

### 2. Authorized Users Only

```typescript
// Only allow specific users

const ALLOWED_USERS = process.env.ALLOWED_TELEGRAM_USERS?.split(',') || [];

async function handleTelegramMessage(message: TelegramMessage) {
  const userId = message.from?.id?.toString();
  
  if (ALLOWED_USERS.length > 0 && !ALLOWED_USERS.includes(userId)) {
    console.log(`[Telegram] Unauthorized user: ${userId}`);
    return; // Ignore unauthorized users
  }
  
  // Process authorized message
}
```

### 3. Never Expose Secrets in Logs

```typescript
// Bad
console.log('Sending message with token:', botToken);

// Good
console.log('Sending message to chat:', chatId);
```

### 4. Rate Limiting

```typescript
// Prevent spam

const MESSAGE_COOLDOWN = 3000; // 3 seconds per user
const lastMessage = new Map<string, number>();

async function handleTelegramMessage(message: TelegramMessage) {
  const userId = message.from?.id?.toString();
  const now = Date.now();
  const last = lastMessage.get(userId) || 0;
  
  if (now - last < MESSAGE_COOLDOWN) {
    return; // Ignore messages during cooldown
  }
  
  lastMessage.set(userId, now);
  
  // Process message
}
```

---

## Multi-Platform Strategy

### Single Brain, Many Channels

Your AI Dashboard can handle all platforms simultaneously:

```
                 ┌─────────────┐
                 │   AI Core   │
                 │  (One Brain) │
                 └──────┬──────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
   ┌────┴───┐    ┌─────┴─────┐    ┌─────┴────┐
   │Telegram│    │  Slack    │    │  Notion  │
   │Service │    │  Service  │    │ Service  │
   └────┬───┘    └─────┬─────┘    └─────┬────┘
        │               │               │
   ┌────┴───┐    ┌─────┴─────┐    ┌─────┴────┐
   │ Bot    │    │  Slack    │    │ Notion   │
   │API     │    │  API      │    │ API      │
   └────────┘    └───────────┘    └──────────┘
```

### Unified Message Handler

```typescript
// src/lib/integrations/unified-handler.ts

interface UnifiedMessage {
  platform: 'telegram' | 'slack' | 'discord' | 'notion';
  userId: string;
  userName: string;
  content: string;
  attachments?: File[];
  timestamp: number;
}

class UnifiedHandler {
  async process(message: UnifiedMessage): Promise<string> {
    // Log incoming message
    await this.logMessage(message);
    
    // Get conversation history
    const history = await this.getHistory(message.userId);
    
    // Generate AI response
    const response = await this.generateAIResponse(message, history);
    
    // Log outgoing message
    await this.logResponse(message.userId, response);
    
    return response;
  }
  
  private async generateAIResponse(message: UnifiedMessage, history: Message[]): Promise<string> {
    // Use your AI Dashboard's model router
    const modelRouter = getModelRouter();
    return await modelRouter.chat(message.content, { history });
  }
}

export const unifiedHandler = new UnifiedHandler();
```

---

## Platform Comparison

| Feature | Telegram | Slack | Discord | Notion |
|---------|----------|-------|---------|--------|
| **Cost** | Free | Free tier | Free | Free tier |
| **Setup Difficulty** | Easy | Medium | Medium | Medium |
| **Real-time Chat** | ✅ | ✅ | ✅ | ❌ |
| **File Support** | ✅ | ✅ | ✅ | ✅ |
| **Rich Formatting** | Markdown | Markdown | Markdown | Rich Text |
| **User Base** | General | Business | Gaming/Community | Productivity |
| **Best For** | Personal bots | Team notifications | Community | Knowledge base |
| **Webhook Security** | Basic | HMAC signatures | Ed25519 | Internal only |

---

## PROMPT YOU CAN USE

Here's a prompt to create a new messaging integration:

```
Create a messaging integration for [PLATFORM NAME] in my AI Dashboard.

## Platform Details
- Name: [PLATFORM NAME]
- API Documentation: [LINK TO API DOCS]
- Authentication: [OAuth / API Key / Token]

## What I Need
1. Integration service at src/lib/integrations/[platform].ts
2. Type definitions for:
   - Configuration
   - Messages
   - Events
3. API route for webhooks at src/app/api/[platform]/route.ts
4. Management page at src/app/[platform]/page.tsx
5. Environment variables in .env.example

## Requirements
- Send messages to platform
- Receive messages via webhook
- Parse commands (/[command] format)
- Route to AI for response
- Log all messages
- Handle errors gracefully
- Support message threading

## Security
- Verify webhook signatures
- Rate limiting per user
- Authorized user whitelist

Include TypeScript types and error handling.
```

---

## Key Takeaways

✅ **Same pattern for all platforms** — Config, Service, API Route, UI

✅ **Telegram is easiest** — Great for learning the pattern

✅ **Slack for business** — Perfect for team notifications

✅ **Notion for documents** — Knowledge base integration

✅ **Security matters** — Verify signatures, rate limit, whitelist

✅ **Unified core** — One AI handles all platforms

✅ **Use the prompt template** — Create new integrations quickly

---

**Next: Chapter 19 - Troubleshooting Common Issues**

# Chapter 19: Knowledge Extraction - Making Documents Searchable

## The Vision: Smart Knowledge Base

When users upload brand documents, we don't just store them as text files. We extract structured knowledge that makes the information searchable, queryable, and immediately useful for AI-powered features.

## Why Knowledge Extraction Matters

### Without Knowledge Extraction
- Documents stored as plain text
- No structure or searchable metadata
- AI must read entire documents every time
- Slow responses, high token usage

### With Knowledge Extraction
- Structured data in a searchable database
- Instant queries: "What products does this brand offer?"
- AI uses extracted knowledge directly
- Fast responses, lower token costs

## The Knowledge Extractor Service

### File: `src/lib/services/knowledge-extractor.ts`

```typescript
interface ExtractedKnowledge {
  keyFacts: string[];
  entities: Array<{ name: string; type: string; description?: string }>;
  products: Array<{ name: string; description: string }>;
  services: Array<{ name: string; description: string }>;
  values: string[];
  tone: string[];
  audience: string[];
  differentiators: string[];
  contactInfo: Array<{ type: string; value: string }>;
  timeline: Array<{ event: string; date?: string }>;
  summary: string;
  brandVoice: {
    tone?: string;
    style?: string;
    keyMessages?: string[];
    avoidPhrases?: string[];
  };
}
```

## How It Works

### Step 1: Document Upload
User uploads a brand document (PDF, DOCX, TXT, MD, HTML, or URL).

### Step 2: Content Processing
The `documentProcessor` extracts clean text:
- Removes HTML tags
- Normalizes whitespace
- Generates summaries
- Extracts metadata

### Step 3: AI Extraction
The knowledge extractor sends content to AI with structure prompt:

```typescript
async extractKnowledge(content: string): Promise<ExtractedKnowledge> {
  const prompt = `Analyze this brand/company document and extract structured knowledge.
  
  Return ONLY valid JSON with this structure:
  {
    "keyFacts": ["fact 1", "fact 2"],
    "entities": [{"name": "...", "type": "person|company|product", "description": "..."}],
    "products": [{"name": "...", "description": "..."}],
    "services": [{"name": "...", "description": "..."}],
    "values": [" value 1", "value 2"],
    "audience": ["segment 1", "segment 2"],
    "differentiators": ["what makes unique 1", "what makes unique 2"],
    "contactInfo": [{"type": "email|phone|website", "value": "..."}],
    "brandVoice": {
      "tone": "...",
      "style": "...",
      "keyMessages": ["message 1", "message 2"],
      "avoidPhrases": ["phrase 1", "phrase 2"]
    }
  }`;
  
  const response = await fetch('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] })
  });
  
  return JSON.parse(response.content);
}
```

### Step 4: Database Storage
Extracted knowledge saved to `brand_knowledge` table:

```sql
CREATE TABLE brand_knowledge (
  id TEXT PRIMARY KEY,
  document_id TEXT,
  brand_id TEXT,
  category TEXT,  -- fact, entity, product, service, value, etc.
  key TEXT,       -- entity name, product name, or identifier
  value TEXT,     -- description or content
  metadata JSON,  -- additional structured data
  created_at INTEGER
);

CREATE INDEX idx_knowledge_brand ON brand_knowledge(brand_id);
CREATE INDEX idx_knowledge_category ON brand_knowledge(category);
CREATE INDEX idx_knowledge_search ON brand_knowledge(key, value);
```

## Usage Examples

### Uploading and Extracting

```typescript
// Upload document
const doc = await brandWorkspace.addDocument(brandId, {
  title: 'Company Overview.pdf',
  content: fileContent,
  type: 'pdf'
});

// Extract knowledge
const knowledge = await knowledgeExtractor.extractKnowledge(doc.content);

// Save to searchable database
await knowledgeExtractor.saveKnowledge(brandId, doc.id, knowledge);
```

### Searching Knowledge

```typescript
// Search across all brand knowledge
const results = await knowledgeExtractor.searchKnowledge(brandId, 'pricing services');

// Get all products
const products = await knowledgeExtractor.getBrandKnowledge(brandId, 'product');

// Get all contact information
const contacts = await knowledgeExtractor.getBrandKnowledge(brandId, 'contact');
```

### Using in Chat Context

```typescript
// Build chat context with extracted knowledge
const knowledge = await knowledgeExtractor.getBrandKnowledge(brandId);
const formatted = knowledge.map(k => `${k.category}: ${k.key} - ${k.value}`).join('\n');

const systemPrompt = `
  You are representing ${brand.name}.
  
  Knowledge Base:
  ${formatted}
  
  Use this knowledge when answering questions about the brand.
`;
```

## Knowledge Categories

### Facts
Important factual statements extracted from documents.

```
fact_0: "Company founded in 2015"
fact_1: "Headquarters in Seattle, WA"
fact_2: "500+ employees worldwide"
```

### Entities
Named entities with types:

```
Microsoft - company - "Technology partner"
John Smith - person - "CEO and founder"
Azure - technology - "Cloud platform used"
```

### Products & Services
Product and service offerings:

```
Product Dashboard Pro - "Real-time analytics dashboard"
Product API Gateway - "Enterprise API management"
Service Consulting - "Implementation support"
```

### Brand Voice
Communication style guidelines:

```
tone: "Professional yet approachable"
style: "Clear, concise, friendly"
keyMessages: ["Innovation", "Reliability", "Security"]
avoidPhrases: ["cheap", "basic", "simplest"]
```

### Audience
Target market segments:

```
segment_0: "Enterprise IT managers"
segment_1: "Software development teams"
segment_2: "CTOs and technical leaders"
```

### Differentiators
What makes the brand unique:

```
diff_0: "Only platform with built-in AI"
diff_1: "10x faster deployment"
diff_2: "99.99% uptime SLA"
```

## Database Migration

Add to your database initialization:

```typescript
await sqlDatabase.run(`
  CREATE TABLE IF NOT EXISTS brand_knowledge (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,
    brand_id TEXT NOT NULL,
    category TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT,
    metadata TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (document_id) REFERENCES brand_documents(id),
    FOREIGN KEY (brand_id) REFERENCES brands_v2(id)
  )
`);

await sqlDatabase.run(`CREATE INDEX IF NOT EXISTS idx_knowledge_brand ON brand_knowledge(brand_id)`);
await sqlDatabase.run(`CREATE INDEX IF NOT EXISTS idx_knowledge_cat ON brand_knowledge(category)`);
await sqlDatabase.run(`CREATE INDEX IF NOT EXISTS idx_knowledge_search ON brand_knowledge(key, value)`);
```

## Integration with Brand Workspace

### API Endpoint

```typescript
// src/app/api/brand-workspace/extract/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { brandWorkspace } from '@/lib/services/brand-workspace';
import { knowledgeExtractor } from '@/lib/services/knowledge-extractor';

export async function POST(request: NextRequest) {
  try {
    const { documentId } = await request.json();
    
    const doc = await brandWorkspace.getDocumentById(documentId);
    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }
    
    const knowledge = await knowledgeExtractor.extractKnowledge(doc.content);
    await knowledgeExtractor.saveKnowledge(doc.brandId, doc.id, knowledge);
    
    const formatted = knowledgeExtractor.formatKnowledgeForSearchable(knowledge);
    
    return NextResponse.json({ 
      success: true, 
      knowledge,
      formatted
    });
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Extraction failed' 
    }, { status: 500 });
  }
}
```

### UI Integration

Add an "Extract Knowledge" button to document cards:

```tsx
<button
  onClick={async () => {
    setIsExtracting(doc.id);
    await fetch('/api/brand-workspace/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId: doc.id })
    });
    setIsExtracting(null);
    loadDocuments(brandId);
  }}
  disabled={isExtracting === doc.id}
  className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs"
>
  {isExtracting === doc.id ? 'Extracting...' : 'Extract Knowledge'}
</button>
```

## Performance Benefits

### Before Knowledge Extraction
- AI reads 10 page document (~4000 tokens)
- Every query scans full document
- Response time: 3-5 seconds per query

### After Knowledge Extraction
- Knowledge extracted once (one-time cost)
- Queries use database index
- Response time: <500ms per query
- Token usage: 90% reduction

## Advanced Features

### Knowledge Statistics

```typescript
const stats = await knowledgeExtractor.getKnowledgeStats(brandId);
// Returns: { fact: 15, product: 3, service: 5, audience: 8, ... }
```

### Delete on Document Removal

```typescript
// When deleting a document, clean up its knowledge
await brandWorkspace.deleteDocument(docId);
await knowledgeExtractor.deleteDocumentKnowledge(docId);
```

### Search by Category

```typescript
// Get all products and services
const offerings = await knowledgeExtractor.searchKnowledge(
  brandId,
  '',
  ['product', 'service']
);
```

## Best Practices

1. **Extract on Upload**: Automatically extract knowledge when documents are uploaded
2. **Index Everything**: Create database indexes for fast searching
3. **Cache Results**: Cache common queries to reduce database load
4. **Validate AI Output**: Always validate JSON structure before saving
5. **Handle Errors**: Provide fallback empty knowledge structure
6. **Batch Processing**: For large documents, extract in chunks

## Error Handling

```typescript
async extractKnowledge(content: string): Promise<ExtractedKnowledge> {
  try {
    const response = await fetch('/api/chat', { ... });
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');
    return this.validateAndFillDefaults(JSON.parse(jsonMatch[0]));
  } catch (error) {
    console.error('Knowledge extraction failed:', error);
    return this.getDefaultKnowledge();
  }
}

private validateAndFillDefaults(data: any): ExtractedKnowledge {
  return {
    keyFacts: Array.isArray(data.keyFacts) ? data.keyFacts : [],
    entities: Array.isArray(data.entities) ? data.entities : [],
    // ... ensure all fields have safe defaults
  };
}
```

## Future Enhancements

1. **Semantic Search**: Use embedding vectors for fuzzy matching
2. **Relationship Mapping**: Extract relationships between entities
3. **Confidence Scoring**: Rate extraction certainty
4. **Multi-language Support**: Extract from documents in different languages
5. **Real-time Updates**: Re-extract when documents change
6. **Visualization**: Display knowledge graphs
7. **Export**: Export knowledge as JSON, CSV, or Excel

## Summary

Knowledge extraction transforms static documents into a dynamic, searchable knowledge base:

- **Fast queries**: Database-powered search instead of scanning documents
- **Structured data**: AI-ready format for consistent results
- **Lower costs**: 90% reduction in token usage
- **Better answers**: AI has instant access to key information
- **Scalable**: Works with hundreds of documents

By extracting knowledge upfront, you avoid repeatedly processing the same information, making your AI assistant faster and more efficient.

# Chapter 20: Memory Tasks & Automated System Maintenance

## The Vision: Self-Maintaining AI

Your AI assistant doesn't just respond to queries — it maintains itself. Memory tasks run automatically to capture knowledge, archive old memories, and keep the system running optimally.

## What You'll Learn

- **Memory Capture** - Extracting knowledge from conversations automatically
- **Memory Archive** - Compressing and storing long-term memories
- **Task Scheduler** - How scheduled tasks work
- **Memory Persistence** - How memories survive across sessions
- **System Health** - Monitoring automated task execution

---

## The Memory System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     User Interaction                          │
│                          ▼                                    │
│                    Chat Messages                              │
│                          ▼                                    │
│         ┌─────────────────────────────────┐                 │
│         │   Memory Capture Task (10 min)   │                 │
│         │  - Analyzes recent messages      │                 │
│         │  - Extracts facts/decisions      │                 │
│         │  - Saves to persistent memory    │                 │
│         └─────────────────────────────────┘                 │
│                          ▼                                    │
│              ┌─────────────────┐                             │
│              │ Active Memory   │ ◄─── Scratchpad (Instant)  │
│              │  - Recent facts  │                             │
│              │  - Decisions     │                             │
│              │  - Preferences   │                             │
│              └─────────────────┘                             │
│                          ▼                                    │
│         ┌─────────────────────────────────┐                 │
│     │   Memory Archive Task (24 hrs)    │                 │
│         │  - Compresses old memories      │                 │
│         │  - Archives low-importance      │                 │
│         │  - Maintains searchability      │                 │
│         └─────────────────────────────────┘                 │
│                          ▼                                    │
│              ┌─────────────────┐                             │
│              │ Long-term Store │                             │
│              │  - Weekly sums  │                             │
│              │  - Compacted    │                             │
│              └─────────────────┘                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Memory Capture Task

### File: `src/lib/services/task-scheduler.ts`

The memory capture task runs every 10 minutes to extract important information from recent conversations:

```typescript
private async executeMemoryCaptureTask(task: ScheduledTask): Promise<TaskExecutionResult> {
  try {
    const { sqlDatabase } = await import('@/lib/database/sqlite');
    const { streamChatCompletion } = await import('@/lib/models/sdk.server');
    
    // Get recent chat messages from last 10 minutes
    const recentMessages = await sqlDatabase.all(`
      SELECT * FROM chat_messages 
      WHERE timestamp > ? 
      ORDER BY timestamp DESC 
      LIMIT 50
    `, [Date.now() - 10 * 60 * 1000]);
    
    if (recentMessages.length === 0) {
      return { success: true, result: 'No recent messages to capture' };
    }
    
    // Analyze with AI to extract important facts
    const prompt = `Analyze these recent chat messages and extract important facts, decisions, and preferences to save to memory.

Messages:
${recentMessages.map(m => `${m.role}: ${m.content}`).join('\n')}

Extract:
1. User facts (name, preferences, interests)
2. Important decisions made
3. Key topics discussed
4. Action items or tasks mentioned

Return JSON array: [{"category": "user|decision|knowledge", "content": "...", "importance": 5}]`;

    const result = await streamChatCompletion({
      model: router.getModelId('memory_capture'),
      messages: [{ role: 'user', content: prompt }],
    });
    
    const response = result.message?.content || String(result.message);
    
    // Parse and save memories
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const memories = JSON.parse(jsonMatch[0]);
        for (const memory of memories.slice(0, 5)) {
          await sqlDatabase.addMemory({
            content: memory.content,
            category: memory.category || 'knowledge',
            importance: memory.importance || 5,
            source: 'memory_capture',
          });
        }
      }
    } catch (e) {
      console.log('[MemoryCapture] Failed to parse memories:', e);
    }
    
    return {
      success: true,
      result: `Captured from ${recentMessages.length} messages`,
      data: { messageCount: recentMessages.length },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Memory capture failed',
    };
  }
}
```

### How It Works

1. **Fetches** last 10 minutes of chat messages
2. **Analyzes** with AI to extract:
   - User facts (name, preferences, interests)
   - Important decisions made
   - Key topics discussed
   - Action items mentioned
3. **Parses** AI response as JSON
4. **Saves** up to 5 memories to database
5. **Returns** success/failure status

### Example Extraction

**User says:** "I prefer Python for backend development and I'm working on a project using FastAPI."

**Memory Capture extracts:**
```json
[
  {
    "category": "user",
    "content": "User prefers Python for backend development",
    "importance": 7
  },
  {
    "category": "knowledge",
    "content": "User is working on a FastAPI project",
    "importance": 6
  }
]
```

---

## Memory Archive Task

### File: `src/lib/services/task-scheduler.ts`

The archive task runs daily to compress old memories:

```typescript
private async executeMemoryArchiveTask(task: ScheduledTask): Promise<TaskExecutionResult> {
  try {
    const { sqlDatabase } = await import('@/lib/database/sqlite');
    const { memoryArchiver } = await import('@/lib/memory/memory-archiver');
    
    // Archive memories older than 30 days with low importance
    const cutoffDate = Date.now() - (30 * 24 * 60 * 60 * 1000);
    
    const oldMemories = await sqlDatabase.all(`
      SELECT * FROM memory 
      WHERE created_at < ? AND importance <= 5
      ORDER BY created_at ASC
      LIMIT 100
    `, [cutoffDate]);
    
    if (oldMemories.length === 0) {
      return { success: true, result: 'No memories to archive' };
    }
    
    // Archive memories
    let archivedCount = 0;
    for (const memory of oldMemories) {
      try {
        await memoryArchiver.archiveMemory(memory.id);
        archivedCount++;
      } catch (e) {
        console.log('[MemoryArchive] Failed to archive:', memory.id, e);
      }
    }
    
    return {
      success: true,
      result: `Archived ${archivedCount} memories`,
      data: { archivedCount },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Memory archive failed',
    };
  }
}
```

### Archive Strategy

| Memory Type | Age Threshold | Importance | Action |
|------------|---------------|------------|--------|
| Active | < 30 days | Any | Keep in active store |
| Low Priority | > 30 days | ≤ 5 | Archive to long-term |
| High Priority | > 30 days | > 5 | Keep in active store |
| Archived | > 90 days | Any | Compact to weekly summary |

---

## Task Scheduler System

### File: `src/lib/services/task-scheduler.ts`

The task scheduler manages all automated tasks:

```typescript
const TASK_TEMPLATES: TaskTemplate[] = [
  {
    type: 'intelligence',
    name: 'Intelligence Report',
    description: 'Generate intelligence report',
    defaultSchedule: 'every:24:hours',
  },
  {
    type: 'memory_capture',
    name: 'Memory Auto-Capture',
    description: 'Analyze recent messages and capture important facts',
    defaultSchedule: 'every:10:minutes',
  },
  {
    type: 'memory_archive',
    name: 'Memory Archive',
    description: 'Compact and archive old memories',
    defaultSchedule: 'every:24:hours',
  },
  {
    type: 'rl_training',
    name: 'RL Training',
    description: 'Learn from conversation feedback',
    defaultSchedule: 'every:30:minutes',
  },
  {
    type: 'security',
    name: 'Security Scan',
    description: 'Scan system for vulnerabilities',
    defaultSchedule: 'every:12:hours',
  },
];
```

### Task Execution Flow

```typescript
async executeTask(task: ScheduledTask): Promise<TaskExecutionResult> {
  try {
    switch (task.taskType) {
      case 'intelligence':
        return await this.executeIntelligenceTask(task);
      case 'security':
        return await this.executeSecurityTask(task);
      case 'memory_capture':
        return await this.executeMemoryCaptureTask(task);
      case 'memory_archive':
        return await this.executeMemoryArchiveTask(task);
      case 'rl_training':
        return await this.executeRLTrainingTask(task);
      default:
        throw new Error(`Unknown task type: ${task.taskType}`);
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

---

## Integration with System Prompt

### File: `src/lib/config/system-prompt.ts`

The AI knows about its scheduled task capabilities:

```typescript
#### 2. create_scheduled_task
Create recurring automated tasks that run on a schedule.
**Parameters:**
- name (required): Task name
- description: What the task does
- prompt (required): The task to execute (natural language description)
- schedule (required): Cron schedule (e.g., "0 9 * * *" for daily at 9 AM)
- task_type: 'intelligence', 'research', 'memory', 'custom'

**When to use:**
- Periodic research updates (e.g., "Check for news about X daily")
- Automated monitoring (e.g., "Check stock prices every hour")
- Recurring reports (e.g., "Generate weekly summary")
- Data collection (e.g., "Fetch competitor prices weekly")

**Example call:**
\`\`\`json
{
  "name": "create_scheduled_task",
  "arguments": {
    "name": "Daily News Check",
    "prompt": "Search for the latest news about AI developments and summarize key points",
    "schedule": "0 9 * * *",
    "task_type": "intelligence"
  }
}
\`\`\`

**You CAN create scheduled tasks!** When users ask for recurring tasks, automated monitoring, periodic updates, or anything that should happen "every X", use this tool.
```

---

## Monitoring Task Health

### Heartbeat Endpoint

File: `src/app/api/heartbeat/route.ts`

```bash
GET /api/heartbeat
```

Response:
```json
{
  "timestamp": 1772694016681,
  "status": "healthy",
  "model": "ollama/qwen2.5-coder",
  "schedulerRunning": true,
  "tasks": {
    "memory_capture": {
      "lastRun": 1772694006245,
      "success": true,
      "runCount": 42,
      "lastError": null
    },
    "memory_archive": {
      "lastRun": 1772694011474,
      "success": true,
      "runCount": 7,
      "lastError": null
    },
    "intelligence": {
      "lastRun": 1772694006084,
      "success": true,
      "runCount": 3,
      "lastError": null
    }
  },
  "totalTasks": 204,
  "enabledTasks": 176
}
```

### Task Results Table

Every task execution is logged to `task_results`:

```sql
CREATE TABLE task_results (
  id TEXT PRIMARY KEY,
  task_id TEXT,
  result TEXT,
  data JSON,
  success INTEGER,
  created_at INTEGER,
  FOREIGN KEY (task_id) REFERENCES scheduled_tasks(id)
);
```

Query recent task results:
```typescript
const results = taskScheduler.getTaskResults(taskId, limit: 10);
const latest = taskScheduler.getLatestTaskResult(taskId);
```

---

## Memory Persistence Layers

### Layer 1: Scratchpad (Instant Access ~1ms)

Loaded every chat, contains:
- User profile (name, preferences)
- Active projects
- Recent decisions (last 5-10)
- Current focus

### Layer 2: Persistent Memory (Fast Search ~50ms)

Hybrid keyword + semantic search:
- Stored facts and knowledge
- Project details
- Brand voice profiles
- Security rules
- User decisions

### Layer 3: Archive (Long-term)

Weekly summaries and compacted knowledge:
- Compressed conversations
- Historical patterns
- Long-term trends

---

## Common Issues and Fixes

### Issue: "Unknown task type: memory_capture"

**Problem:** Task scheduler missing the case for memory tasks.

**Solution:** Add to switch statement:
```typescript
case 'memory_capture':
  return await this.executeMemoryCaptureTask(task);
case 'memory_archive':
  return await this.executeMemoryArchiveTask(task);
```

### Issue: Memory tasks not running

**Problem:** Task scheduler not initialized.

**Solution:** Check heartbeat endpoint:
```bash
curl http://localhost:3000/api/heartbeat
```

If `schedulerRunning: false`, call the init endpoint:
```bash
curl -X POST http://localhost:3000/api/system/start
```

### Issue: AI doesn't know about scheduled tasks

**Problem:** System prompt missing the `create_scheduled_task` tool.

**Solution:** Add to system prompt:
```typescript
You CAN create scheduled tasks! When users ask for recurring tasks,
automated monitoring, periodic updates, or anything that should happen
"every X", use this tool.
```

---

## Best Practices

1. **Set appropriate intervals:**
   - Memory capture: 10 minutes (captures ongoing context)
   - Memory archive: 24 hours (compresses old data)
   - Intelligence reports: 24 hours (news updates)

2. **Use fast models for frequent tasks:**
   ```typescript
   model: router.getModelId('memory_capture')  // Small, fast model
   ```

3. **Limit scope:**
   ```typescript
   LIMIT 50  // Don't process thousands of messages
   ```

4. **Handle errors gracefully:**
   ```typescript
   return {
     success: false,
     error: error.message
   };
   ```

5. **Log task results:**
   ```typescript
   sqlDatabase.addTaskResult(task.id, {
     result: 'Archived 25 memories',
     data: { archivedCount: 25 },
     success: true,
   });
   ```

---

## Summary

Memory tasks are the autonomous workers that keep your AI assistant intelligent:

- **Memory Capture**: Extracts knowledge every 10 minutes
- **Memory Archive**: Compresses old memories daily
- **Task Scheduler**: Manages all automated tasks
- **Health Monitoring**: Check via `/api/heartbeat`
- **Persistence**: Three layers for instant to long-term storage

These tasks run silently in the background, ensuring your AI remembers what matters and forgets what doesn't.

