const fs = require('fs');

const filePath = 'c:\\Users\\siddh\\Documents\\]Mood_Index\\src\\pages\\AdminDashboard.tsx'; // Wait, let's check spelling
const filePathCorrect = 'c:\\Users\\siddh\\Documents\\Mood_Index\\src\\pages\\AdminDashboard.tsx';
const content = fs.readFileSync(filePathCorrect, 'utf8');
const lines = content.split('\n');

console.log('Occurrences of feelings tab rendering:');
lines.forEach((line, idx) => {
  if (line.includes("'feelings'") || line.includes('"feelings"') || line.includes('activeTab ===') && line.includes('feelings')) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
