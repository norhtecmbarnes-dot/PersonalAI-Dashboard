/**
 * Server-side file system utilities
 * This module should only be imported in Node.js runtime contexts
 * It uses Node.js APIs that are not available in Edge Runtime
 */

import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const unlink = promisify(fs.unlink);
const rename = promisify(fs.rename);

export interface CleanupResult {
  logsCleaned: number;
  reportsArchived: number;
  errors: string[];
}

/**
 * Clean old log files (>7 days)
 */
export async function cleanOldLogFiles(): Promise<{ count: number; errors: string[] }> {
  const errors: string[] = [];
  const logDirs = ['.next/dev/logs', 'logs'];
  const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  let logsCleaned = 0;
  
  try {
    for (const logDir of logDirs) {
      const fullPath = path.join(process.cwd(), logDir);
      if (fs.existsSync(fullPath)) {
        const files = await readdir(fullPath);
        for (const file of files) {
          if (file.endsWith('.log')) {
            try {
              const filePath = path.join(fullPath, file);
              const stats = await stat(filePath);
              if (stats.mtimeMs < sevenDaysAgo) {
                await unlink(filePath);
                logsCleaned++;
              }
            } catch (e) {
              errors.push(`Failed to clean ${file}: ${e}`);
            }
          }
        }
      }
    }
  } catch (e) {
    errors.push(`Log cleanup error: ${e}`);
  }
  
  return { count: logsCleaned, errors };
}

/**
 * Archive old session reports (>30 days)
 */
export async function archiveOldReports(): Promise<{ count: number; errors: string[] }> {
  const errors: string[] = [];
  const docsPath = path.join(process.cwd(), 'docs');
  const archivePath = path.join(docsPath, 'archive');
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  let reportsArchived = 0;
  
  try {
    if (!fs.existsSync(archivePath)) {
      fs.mkdirSync(archivePath, { recursive: true });
    }
    
    if (fs.existsSync(docsPath)) {
      const files = await readdir(docsPath);
      for (const file of files) {
        if (file.startsWith('SESSION-') || file.includes('CHANGELOG-session') || file.includes('REPORT-')) {
          try {
            const filePath = path.join(docsPath, file);
            const stats = await stat(filePath);
            if (stats.mtimeMs < thirtyDaysAgo) {
              const archiveFilePath = path.join(archivePath, file);
              await rename(filePath, archiveFilePath);
              reportsArchived++;
            }
          } catch (e) {
            errors.push(`Failed to archive ${file}: ${e}`);
          }
        }
      }
    }
  } catch (e) {
    errors.push(`Archive error: ${e}`);
  }
  
  return { count: reportsArchived, errors };
}

/**
 * Run full cleanup
 */
export async function runFileSystemCleanup(): Promise<CleanupResult> {
  const result: CleanupResult = {
    logsCleaned: 0,
    reportsArchived: 0,
    errors: []
  };
  
  try {
    const logResult = await cleanOldLogFiles();
    result.logsCleaned = logResult.count;
    result.errors.push(...logResult.errors);
  } catch (e) {
    result.errors.push(`Log cleanup failed: ${e}`);
  }
  
  try {
    const archiveResult = await archiveOldReports();
    result.reportsArchived = archiveResult.count;
    result.errors.push(...archiveResult.errors);
  } catch (e) {
    result.errors.push(`Archive failed: ${e}`);
  }
  
  return result;
}
