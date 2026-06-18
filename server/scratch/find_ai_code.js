const fs = require('fs');

const filePath = 'c:\\Users\\siddh\\Documents\\Mood_Index\\src\\pages\\AdminDashboard.tsx';
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log('Occurrences of AI/ai tab rendering:');
lines.forEach((line, idx) => {
  if (line.includes("'ai'") || line.includes('"ai"') || line.includes('activeTab ===') && line.includes('ai')) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
