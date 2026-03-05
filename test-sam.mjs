// Test SAM.gov API directly
const key = 'SAM-01f810be-c57e-4278-a383-350f2b5045b6';
const baseUrl = 'https://api.sam.gov/opportunities/v2/search';

const params = new URLSearchParams({
  api_key: key,
  limit: '5',
  offset: '0',
  title: 'space'
});

console.log('Testing SAM.gov API...');
console.log('URL:', `${baseUrl}?${params.toString().replace(key, 'REDACTED')}`);

const response = await fetch(`${baseUrl}?${params.toString()}`);
console.log('Status:', response.status);

const data = await response.text();
console.log('Response:', data.substring(0, 500));
