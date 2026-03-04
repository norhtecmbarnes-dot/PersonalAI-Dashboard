const fs = require('fs');

const filePath = 'C:\\ai_dashboard\\src\\app\\api\\office-ai\\route.ts';
let content = fs.readFileSync(filePath, 'utf-8');

// Count before
const before1 = (content.match(/model: 'glm-4\.7-flash',/g) || []).length;
const before2 = (content.match(/model: 'glm-5:cloud',/g) || []).length;
console.log(`Before: ${before1} x 'glm-4.7-flash', ${before2} x 'glm-5:cloud'`);

// Replace all occurrences
content = content.replace(/model: 'glm-4\.7-flash',/g, 'model: selectedModel,');
content = content.replace(/model: 'glm-5:cloud',/g, 'model: selectedModel,');

// Count after
const after1 = (content.match(/model: 'glm-4\.7-flash',/g) || []).length;
const after2 = (content.match(/model: 'glm-5:cloud',/g) || []).length;
const selectedCount = (content.match(/model: selectedModel,/g) || []).length;

console.log(`After: ${after1} x 'glm-4.7-flash', ${after2} x 'glm-5:cloud'`);
console.log(`Now using 'selectedModel' in ${selectedCount} places`);

// Write back
fs.writeFileSync(filePath, content, 'utf-8');
console.log('✅ File updated successfully!');
