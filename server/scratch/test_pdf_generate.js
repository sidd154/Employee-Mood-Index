const { generateEmployeeReportPDF } = require('../dist/services/pdf');

async function test() {
  console.log('Starting PDF generation test...');
  const start = Date.now();
  try {
    const data = {
      moodIndex: 75,
      distribution: [
        { name: 'Great', count: 5 },
        { name: 'Good', count: 10 },
        { name: 'Okay', count: 3 },
        { name: 'Bad', count: 1 },
        { name: 'Awful', count: 0 }
      ],
      trends: [
        { date: '2026-06-01', score: 70 },
        { date: '2026-06-02', score: 80 }
      ],
      feelings: [
        { name: 'Happy', count: 5 },
        { name: 'Calm', count: 3 }
      ],
      contributors: [
        { name: 'Work', count: 4 },
        { name: 'Sleep', count: 2 }
      ]
    };
    
    // Test the TS-compiled code or require the ts file directly
    // Since we are running in node, we can run a simple ts-node test or compile the project first.
  } catch (err) {
    console.error(err);
  }
}
