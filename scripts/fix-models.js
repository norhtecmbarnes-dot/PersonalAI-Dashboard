const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src', 'app', 'api', 'office-ai', 'route.ts');

// Read the file
let content = fs.readFileSync(filePath, 'utf-8');

// Count occurrences
const occurrences1 = (content.match(/model: 'glm-4\.7-flash',/g) || []).length;
const occurrences2 = (content.match(/model: 'glm-5:cloud',/g) || []).length;

console.log(`Found ${occurrences1} occurrences of 'glm-4.7-flash'`);
console.log(`Found ${occurrences2} occurrences of 'glm-5:cloud'`);

// Replace all occurrences
content = content.replace(/model: 'glm-4\.7-flash',/g, 'model: selectedModel,');
content = content.replace(/model: 'glm-5:cloud',/g, 'model: selectedModel,');

// Verify replacements
const remaining1 = (content.match(/model: 'glm-4\.7-flash',/g) || []).length;
const remaining2 = (content.match(/model: 'glm-5:cloud',/g) || []).length;

console.log(`\nAfter replacement:`);
console.log(`${remaining1} occurrences of 'glm-4.7-flash' remaining`);
console.log(`${remaining2} occurrences of 'glm-5:cloud' remaining`);

// Check that selectedModel is used
const selectedModelCount = (content.match(/model: selectedModel,/g) || []).length;
console.log(`\nNow using 'selectedModel' in ${selectedModelCount} places`);

// Write the file back
fs.writeFileSync(filePath, content, 'utf-8');

console.log('\n✅ File updated successfully!');
