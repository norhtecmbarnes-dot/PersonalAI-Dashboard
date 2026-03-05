const key = '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'; // truncated
const response = await fetch('https://api.tavily.com/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'test',
    api_key: key,
    max_results: 3
  })
});
const data = await response.json();
console.log('Status:', response.status);
console.log('Response:', JSON.stringify(data, null, 2).substring(0, 500));
