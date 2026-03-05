// Test SAM.gov API with proper params
const key = 'SAM-01f810be-c57e-4278-a383-350f2b5045b6';
const baseUrl = 'https://api.sam.gov/opportunities/v2/search';

const today = new Date().toISOString().split('T')[0];
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

const params = new URLSearchParams({
  api_key: key,
  limit: '5',
  offset: '0',
  postedFrom: thirtyDaysAgo,
  postedTo: today,
});

console.log('Testing SAM.gov API with dates...');
console.log('postedFrom:', thirtyDaysAgo);
console.log('postedTo:', today);

const response = await fetch(`${baseUrl}?${params.toString()}`);
console.log('Status:', response.status);

const data = await response.text();
console.log('Response:', data.substring(0, 1000));
