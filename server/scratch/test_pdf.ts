import { generateEmployeeReportPDF, generateAdminReportPDF } from '../src/services/pdf';

async function test() {
  console.log('Testing PDF generation...');
  const start = Date.now();
  try {
    const employeePdf = await generateEmployeeReportPDF('Siddhanth', 'Last 30 Days', {
      moodIndex: 82,
      distribution: [
        { name: 'Great', count: 5 },
        { name: 'Good', count: 12 },
        { name: 'Okay', count: 4 },
        { name: 'Bad', count: 1 },
        { name: 'Awful', count: 0 }
      ],
      trends: [
        { date: '2026-06-01', score: 80 },
        { date: '2026-06-02', score: 85 }
      ],
      feelings: [
        { name: 'Happy', count: 5 },
        { name: 'Calm', count: 3 }
      ],
      contributors: [
        { name: 'Work', count: 4 },
        { name: 'Sleep', count: 2 }
      ]
    });
    console.log(`SUCCESS: Generated Employee PDF in ${Date.now() - start}ms. Buffer size: ${employeePdf.length} bytes`);

    const startAdmin = Date.now();
    const adminPdf = await generateAdminReportPDF('Last 30 Days', {
      moodIndex: 78,
      participationRate: 92,
      totalEmployees: 15,
      checkinsCount: 120,
      distribution: [
        { name: 'Great', count: 40 },
        { name: 'Good', count: 50 },
        { name: 'Okay', count: 20 },
        { name: 'Bad', count: 8 },
        { name: 'Awful', count: 2 }
      ],
      trends: [
        { date: '2026-06-01', score: 75 },
        { date: '2026-06-02', score: 80 }
      ],
      departments: [
        { name: 'Engineering', moodIndex: 84, participationRate: 95 },
        { name: 'Sales', moodIndex: 72, participationRate: 90 }
      ],
      feelings: [
        { name: 'Happy', count: 40, moodCorrelation: 82 },
        { name: 'Stressed', count: 15, moodCorrelation: 40 }
      ],
      contributors: [
        { name: 'Work', count: 45, moodCorrelation: 78 },
        { name: 'Sleep', count: 30, moodCorrelation: 84 }
      ]
    });
    console.log(`SUCCESS: Generated Admin PDF in ${Date.now() - startAdmin}ms. Buffer size: ${adminPdf.length} bytes`);
    process.exit(0);
  } catch (err) {
    console.error('FAILED:', err);
    process.exit(1);
  }
}

test();
