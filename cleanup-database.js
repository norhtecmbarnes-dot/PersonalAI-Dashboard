/**
 * Database Cleanup Script
 * Removes duplicate tasks and resets the database to a clean state
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'assistant.db');

console.log('🔧 AI Dashboard Database Cleanup\n');

// 1. Stop any running Node.js processes
console.log('Step 1: Stopping any running Node.js processes...');
try {
  if (process.platform === 'win32') {
    require('child_process').execSync('taskkill /F /IM node.exe 2>nul', { stdio: 'ignore' });
    require('child_process').execSync('taskkill /F /IM npm.exe 2>nul', { stdio: 'ignore' });
  } else {
    require('child_process').execSync('pkill -f "node.*next" 2>/dev/null || true', { stdio: 'ignore' });
  }
  console.log('✅ Processes stopped\n');
} catch (e) {
  console.log('⚠️  No processes to stop (or already stopped)\n');
}

// Wait a moment
setTimeout(() => {
  // 2. Backup and clear the database
  console.log('Step 2: Backing up and clearing database...');
  
  if (fs.existsSync(DB_FILE)) {
    const backupFile = path.join(DATA_DIR, `assistant_backup_${Date.now()}.db`);
    try {
      fs.copyFileSync(DB_FILE, backupFile);
      console.log(`✅ Database backed up to: ${backupFile}`);
      
      // Delete the database file
      fs.unlinkSync(DB_FILE);
      console.log('✅ Database cleared\n');
    } catch (e) {
      console.error('❌ Error backing up database:', e.message);
      process.exit(1);
    }
  } else {
    console.log('ℹ️  No existing database found\n');
  }

  // 3. Clear logs
  console.log('Step 3: Clearing log files...');
  const logDirs = [
    path.join(__dirname, '.next', 'dev', 'logs'),
    path.join(__dirname, 'logs'),
  ];
  
  for (const logDir of logDirs) {
    if (fs.existsSync(logDir)) {
      try {
        const files = fs.readdirSync(logDir);
        let cleared = 0;
        for (const file of files) {
          if (file.endsWith('.log')) {
            fs.unlinkSync(path.join(logDir, file));
            cleared++;
          }
        }
        console.log(`✅ Cleared ${cleared} log files from ${logDir}`);
      } catch (e) {
        console.log(`⚠️  Could not clear logs in ${logDir}: ${e.message}`);
      }
    }
  }
  console.log();

  // 4. Summary
  console.log('========================================');
  console.log('✅ Cleanup Complete!');
  console.log('========================================');
  console.log();
  console.log('The database has been reset. On next start:');
  console.log('  • Only 7 default tasks will be created');
  console.log('  • External Research task is disabled by default');
  console.log('  • Task scheduler will prevent duplicate initialization');
  console.log();
  console.log('To start the server:');
  console.log('  npm run dev');
  console.log();
  console.log('Or use the quiet startup script:');
  console.log('  start-quiet.bat   (Windows CMD)');
  console.log('  .\\start-quiet.ps1  (PowerShell)');
  console.log();
  console.log('Backup location:');
  console.log(`  ${DATA_DIR}/assistant_backup_*.db`);
  console.log();
  
}, 2000);
