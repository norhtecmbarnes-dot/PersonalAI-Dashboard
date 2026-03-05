/**
 * Test script to verify SAM.gov API key storage and retrieval
 * Run with: node test-sam-api-key.mjs
 */

import { sqlDatabase } from './src/lib/database/sqlite.js';

async function testSamApiKey() {
  console.log('Testing SAM.gov API key storage...\n');
  
  try {
    // Initialize database
    await sqlDatabase.initialize();
    console.log('✓ Database initialized');
    
    // Test setting API key
    const testKey = 'test-api-key-12345';
    sqlDatabase.setApiKey('sam', testKey);
    console.log('✓ SAM API key set');
    
    // Test retrieving API key
    const retrievedKey = sqlDatabase.getApiKey('sam');
    console.log('✓ SAM API key retrieved:', retrievedKey === testKey ? 'MATCH' : 'MISMATCH');
    
    if (retrievedKey !== testKey) {
      console.log('  Expected:', testKey);
      console.log('  Got:', retrievedKey);
    }
    
    // Check all API keys
    const allKeys = sqlDatabase.getAllApiKeys();
    console.log('\n✓ All API keys status:');
    allKeys.forEach(k => {
      console.log(`  ${k.provider}: ${k.hasKey ? 'configured' : 'not configured'}`);
    });
    
    // Test SAMGovService
    const { samGovService } = await import('./src/lib/services/sam-gov.ts');
    await samGovService.initialize();
    console.log('\n✓ SAMGovService initialized');
    console.log('  API Key set:', samGovService.apiKey ? 'YES' : 'NO');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testSamApiKey();
