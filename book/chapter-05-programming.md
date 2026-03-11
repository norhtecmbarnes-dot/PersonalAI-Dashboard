# Chapter 5: What is Programming? (Learning to Give Instructions)

Programming is just giving instructions to computers. But unlike humans, computers are extremely literal. This chapter will teach you how to think like a programmer.

## What You'll Learn

• What **programming** actually means
• Why computers need precise instructions
• Basic programming concepts
• Your first lines of code
• How to think algorithmically
• Debugging basics

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

```typescript
// Creating variables (TypeScript style)
const name: string = 'Alice';           // Text (string)
const age: number = 30;                 // Number
const isStudent: boolean = true;        // Boolean (true/false)
const hobbies: string[] = ['reading', 'coding'];  // Array

// Using variables
console.log(name);        // Alice
console.log(age);         // 30
console.log(hobbies[0]);  // reading
```

**Key Type Annotations:**
• `: string` - Text
• `: number` - Numbers (integers and decimals)
• `: boolean` - True or false
• `: string[]` - Array of strings
• `: any` - Any type (avoid when possible)

### 2. Functions (Reusable Instructions)

Functions are like recipes — instructions you can use over and over:

```typescript
// Define a function with types
function greet(name: string): string {
  return `Hello, ${name}!`;
}

// Arrow function syntax (common in this project)
const greetArrow = (name: string): string => {
  return `Hello, ${name}!`;
};

// Use the function
console.log(greet('Alice'));  // Hello, Alice!
console.log(greet('Bob'));    // Hello, Bob!
```

**Real Example from the Dashboard:**

```typescript
// Location: src/lib/utils/validation.ts

export function sanitizePrompt(input: string, maxLength: number = 4000): string {
  if (!input || typeof input !== 'string') return '';
  
  // Truncate to max length
  let sanitized = input.slice(0, maxLength);
  
  // Remove potential injection patterns
  const patterns = [
    /ignore\s+previous\s+instructions/gi,
    /system\s*:/gi,
  ];
  
  for (const pattern of patterns) {
    sanitized = sanitized.replace(pattern, '');
  }
  
  return sanitized.trim();
}

// Usage
const safeInput = sanitizePrompt(userInput, 1000);
```

### 3. Conditionals (Making Decisions)

```typescript
function checkAge(age: number): string {
  if (age >= 18) {
    return 'You are an adult';
  } else if (age >= 13) {
    return 'You are a teenager';
  } else {
    return 'You are a child';
  }
}

// Using ternary operator (shorthand)
const status = age >= 18 ? 'adult' : 'minor';

console.log(checkAge(25));  // You are an adult
console.log(checkAge(15));  // You are a teenager
```

### 4. Loops (Doing Things Repeatedly)

```typescript
// For loop
for (let i = 1; i <= 5; i++) {
  console.log(i);
}

// For...of loop (iterate over array)
const fruits = ['apple', 'banana', 'orange'];
for (const fruit of fruits) {
  console.log(fruit);
}

// ForEach method
fruits.forEach((fruit, index) => {
  console.log(`${index + 1}. ${fruit}`);
});

// Map (transform each item)
const upperFruits = fruits.map(fruit => fruit.toUpperCase());
// ['APPLE', 'BANANA', 'ORANGE']

// Filter (keep items that pass test)
const longFruits = fruits.filter(fruit => fruit.length > 5);
// ['banana', 'orange']
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
• The user doesn't type anything?
• The AI service is down?
• The response takes too long?
• The user sends 1000 messages at once?

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
• **TypeError:** Wrong type of data
• **Cannot read property:** Tried to access something that doesn't exist
• **app.js:15:23:** File, line 15, column 23

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
