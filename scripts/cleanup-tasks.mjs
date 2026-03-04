#!/usr/bin/env node
/**
 * Cleanup script for duplicate scheduled tasks
 * Run this to remove duplicate tasks from the database
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function cleanupDuplicateTasks() {
  console.log('Starting scheduled tasks cleanup...');
  
  try {
    // Load sql.js dynamically
    const { default: initSqlJs } = await import('sql.js');
    const SQL = await initSqlJs();
    
    // Open database
    const dbPath = path.join(process.cwd(), 'data', 'assistant.db');
    let db;
    
    if (fs.existsSync(dbPath)) {
      const data = fs.readFileSync(dbPath);
      db = new SQL.Database(data);
      console.log('Database loaded');
    } else {
      console.log('Database not found at:', dbPath);
      process.exit(1);
    }
    
    // Get all tasks
    const result = db.exec('SELECT * FROM scheduled_tasks');
    if (result.length === 0) {
      console.log('No tasks found');
      db.close();
      process.exit(0);
    }
    
    const allTasks = result[0].values.map(values => {
      const row = {};
      result[0].columns.forEach((col, i) => row[col] = values[i]);
      return row;
    });
    
    console.log(`Found ${allTasks.length} total tasks`);
    
    // Track unique tasks by type and name
    const seen = new Map();
    const duplicates = [];
    
    for (const task of allTasks) {
      // Create a unique key based on task type, name, and brand (if exists)
      const key = `${task.task_type}:${task.name}:${task.brand_id || 'none'}`;
      
      if (seen.has(key)) {
        const existing = seen.get(key);
        
        if (task.permanent && !existing.permanent) {
          duplicates.push(existing.id);
          seen.set(key, task);
        } else if (!task.permanent && existing.permanent) {
          duplicates.push(task.id);
        } else if ((task.updated_at || 0) > (existing.updated_at || 0)) {
          duplicates.push(existing.id);
          seen.set(key, task);
        } else if ((task.run_count || 0) > (existing.run_count || 0)) {
          duplicates.push(existing.id);
          seen.set(key, task);
        } else {
          duplicates.push(task.id);
        }
      } else {
        seen.set(key, task);
      }
    }
    
    console.log(`Found ${duplicates.length} duplicate tasks to remove`);
    
    // Delete duplicates
    let deletedCount = 0;
    for (const taskId of duplicates) {
      try {
        db.run('DELETE FROM scheduled_tasks WHERE id = ?', [taskId]);
        deletedCount++;
        console.log(`  Deleted task: ${taskId}`);
      } catch (error) {
        console.error(`  Failed to delete task ${taskId}:`, error);
      }
    }
    
    // Save database
    const data = db.export();
    fs.writeFileSync(dbPath, data);
    db.close();
    
    console.log(`\nCleanup complete! Removed ${deletedCount} duplicate tasks.`);
    console.log(`Remaining unique tasks: ${seen.size}`);
    
    console.log('\nRemaining tasks:');
    for (const [key, task] of seen) {
      console.log(`  - ${task.name} (${task.task_type}): ${task.schedule} ${task.permanent ? '[PERMANENT]' : ''}`);
    }
    
  } catch (error) {
    console.error('Cleanup failed:', error);
    process.exit(1);
  }
}

// Run cleanup
cleanupDuplicateTasks();
