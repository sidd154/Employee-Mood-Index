require('dotenv').config();
const { buildAndEmailAdminReport } = require('./dist/controllers/reports.js');
async function run() { 
  try { 
    await buildAndEmailAdminReport('test-id', 'test@test.com', 'custom', '2026-09-01T00:00:00.000Z', '2026-10-01T00:00:00.000Z', 'pdf', 'weeks', { departments: 'specific', deptId: 'Engineering' }); 
    console.log('Success'); 
  } catch (err) { 
    console.error('ERROR', err); 
  } 
  process.exit(0); 
} 
run();
