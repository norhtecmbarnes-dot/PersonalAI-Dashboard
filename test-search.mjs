// Test search APIs directly
const tavilyKey = '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';

console.log('Testing Tavily API...');
const tavilyRes = await fetch('https://api.tavily.com/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'test',
    api_key: tavilyKey,
    max_results: 3
  })
});
console.log('Tavily status:', tavilyRes.status);
const tavilyData = await tavilyRes.text();
console.log('Tavily response:', tavilyData.substring(0, 300));
