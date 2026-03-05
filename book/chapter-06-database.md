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
