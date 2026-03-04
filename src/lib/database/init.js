const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

async function initDatabase() {
  const dbPath = path.join(process.cwd(), 'data', 'assistant.db');
  const dataDir = path.dirname(dbPath);

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const SQL = await initSqlJs();
  
  let db;
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  console.log('Initializing database tables...');

  db.run(`
    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      company TEXT,
      title TEXT,
      notes TEXT,
      tags TEXT,
      source TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      start_date INTEGER NOT NULL,
      end_date INTEGER,
      location TEXT,
      attendees TEXT,
      reminder INTEGER,
      status TEXT DEFAULT 'pending',
      source TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      due_date INTEGER,
      priority TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'pending',
      assignee TEXT,
      tags TEXT,
      source TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT,
      category TEXT DEFAULT 'general',
      tags TEXT,
      linked_contacts TEXT,
      linked_events TEXT,
      linked_tasks TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      participants TEXT,
      date INTEGER NOT NULL,
      duration INTEGER,
      outcome TEXT,
      tags TEXT,
      source TEXT,
      raw_data TEXT,
      created_at INTEGER NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS raw_data (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      sender TEXT,
      recipients TEXT,
      date INTEGER,
      metadata TEXT,
      processed INTEGER DEFAULT 0,
      processing_result TEXT,
      created_at INTEGER NOT NULL
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts(name)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_events_start ON events(start_date)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_date)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_activities_date ON activities(date)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_raw_processed ON raw_data(processed)`);

  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);

  console.log('Database initialized successfully!');
  console.log(`Database location: ${dbPath}`);

  db.close();
}

initDatabase().catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
