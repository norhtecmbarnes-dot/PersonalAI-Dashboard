import Database from 'sql.js';
import fs from 'fs';

const wasmBinary = fs.readFileSync('./node_modules/sql.js/dist/sql-wasm.wasm');
const SQL = await Database.default({ wasmBinary });

const dbPath = './data/assistant.db';
const fileBuffer = fs.readFileSync(dbPath);
const db = new SQL.Database(fileBuffer);

// Check sam_api_keys table
const samKeys = db.exec("SELECT * FROM sam_api_keys");
console.log('SAM API Keys table:');
if (samKeys.length > 0) {
  console.log('Columns:', samKeys[0].columns);
  samKeys[0].values.forEach(row => {
    console.log('Row:', row);
  });
} else {
  console.log('  Empty or no table');
}

// Check settings table for sam key
const settingsSam = db.exec("SELECT * FROM settings WHERE key = 'api_key_sam'");
console.log('\nSettings table SAM key:');
if (settingsSam.length > 0) {
  settingsSam[0].values.forEach(row => console.log('  ', row));
} else {
  console.log('  No SAM key in settings');
}

db.close();
