import Database from 'sql.js';
import fs from 'fs';

const wasmBinary = fs.readFileSync('./node_modules/sql.js/dist/sql-wasm.wasm');
const SQL = await Database.default({ wasmBinary });

const dbPath = './data/assistant.db';
const fileBuffer = fs.readFileSync(dbPath);
const db = new SQL.Database(fileBuffer);

const result = db.exec("SELECT key, value FROM settings WHERE key LIKE 'api_key_%'");
console.log('API Keys in database:');
result[0].values.forEach(([key, value]) => {
  console.log(`  ${key}: ${value ? value.substring(0, 20) + '... (length: ' + value.length + ')' : 'NULL'}`);
});

db.close();
