// Test SAM.gov API with correct date format
const key = 'SAM-01f810be-c57e-4278-a383-350f2b5045b6';
const baseUrl = 'https://api.sam.gov/opportunities/v2/search';

const formatDate = (date) => {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
};

const toDate = new Date();
const fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

const params = new URLSearchParams({
  api_key: key,
  limit: '5',
  offset: '0',
  postedFrom: formatDate(fromDate),
  postedTo: formatDate(toDate),
});

console.log('Testing SAM.gov API with MM/dd/yyyy format...');
console.log('postedFrom:', formatDate(fromDate));
console.log('postedTo:', formatDate(toDate));

const response = await fetch(`${baseUrl}?${params.toString()}`);
console.log('Status:', response.status);

const data = await response.json();
console.log('Opportunities found:', data?.opportunitiesData?.length || data?.opportunities?.length || 0);
if (data?.opportunitiesData?.[0]) {
  console.log('First result:', data.opportunitiesData[0].title);
}
