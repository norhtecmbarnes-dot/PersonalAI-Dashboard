import Database from 'sql.js';
import fs from 'fs';

const wasmBinary = fs.readFileSync('./node_modules/sql.js/dist/sql-wasm.wasm');
const SQL = await Database.default({ wasmBinary });

const dbPath = './data/assistant.db';
const fileBuffer = fs.readFileSync(dbPath);
const db = new SQL.Database(fileBuffer);

const result = db.exec("SELECT key, value FROM settings WHERE key LIKE 'api_key_%'");
console.log('API Keys in database:');
if (result.length > 0) {
  result[0].values.forEach(([key, value]) => {
    const displayVal = value ? value.substring(0, 12) + '...' : 'NULL';
    console.log(`  ${key}: ${displayVal}`);
  });
} else {
  console.log('  No API keys found in settings table');
}

// Check all tables
const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table'");
console.log('\nTables in database:');
tables[0].values.forEach(([name]) => console.log(`  ${name}`));

db.close();
