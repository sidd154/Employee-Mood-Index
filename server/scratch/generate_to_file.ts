import { generateEmployeeReportPDF, generateAdminReportPDF } from '../src/services/pdf';
import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';

// We will hook into the PDFDocument prototype to trace page creation
const originalAddPage = PDFDocument.prototype.addPage;
PDFDocument.prototype.addPage = function(...args: any[]) {
  console.log(`[Trace] addPage called! Current page count: ${this.bufferedPageRange() ? this.bufferedPageRange().count : 0}`);
  console.log(new Error().stack);
  return originalAddPage.apply(this, args);
};

async function run() {
  console.log('Generating PDF files to disk with addPage tracing...');

  const employeeData = {
    moodIndex: 7.8,
    distribution: [
      { name: 'Great', count: 8 },
      { name: 'Good', count: 12 },
      { name: 'Okay', count: 6 },
      { name: 'Bad', count: 3 },
      { name: 'Awful', count: 1 },
    ],
    trends: [
      { date: '2026-06-01', score: 6.0 },
      { date: '2026-06-02', score: 8.0 },
      { date: '2026-06-03', score: 7.0 },
      { date: '2026-06-04', score: 9.0 },
      { date: '2026-06-05', score: 10.0 },
      { date: '2026-06-06', score: 8.0 },
      { date: '2026-06-07', score: 6.0 },
      { date: '2026-06-08', score: 7.0 },
      { date: '2026-06-09', score: 8.0 },
      { date: '2026-06-10', score: 8.5 },
      { date: '2026-06-11', score: 7.8 },
    ],
    feelings: [
      { name: 'Focused', count: 8 },
      { name: 'Neutral', count: 6 },
      { name: 'Productive', count: 5 },
      { name: 'Stressed', count: 3 },
    ],
    contributors: [
      { name: 'Work', count: 12 },
      { name: 'Sleep', count: 8 },
      { name: 'Team', count: 7 },
    ],
    departmentName: 'Engineering',
    departmentMoodIndex: 7.4,
  };

  const adminData = {
    moodIndex: 7.2,
    participationRate: 84,
    totalEmployees: 48,
    checkinsCount: 192,
    distribution: [
      { name: 'Great', count: 42 },
      { name: 'Good', count: 88 },
      { name: 'Okay', count: 38 },
      { name: 'Bad', count: 18 },
      { name: 'Awful', count: 6 },
    ],
    trends: [
      { date: '2026-06-01', score: 6.5 },
      { date: '2026-06-02', score: 7.2 },
      { date: '2026-06-03', score: 6.8 },
      { date: '2026-06-04', score: 7.4 },
      { date: '2026-06-05', score: 7.8 },
      { date: '2026-06-06', score: 7.0 },
      { date: '2026-06-07', score: 6.7 },
      { date: '2026-06-08', score: 7.2 },
      { date: '2026-06-09', score: 7.5 },
      { date: '2026-06-10', score: 7.3 },
      { date: '2026-06-11', score: 7.2 },
    ],
    departments: [
      { name: 'Engineering', headcount: 12, overallAvg: 7.4, thisMonthAvg: 7.6, lastMonthAvg: 7.2 },
      { name: 'Sales', headcount: 8, overallAvg: 6.8, thisMonthAvg: 6.5, lastMonthAvg: 7.0 },
      { name: 'HR', headcount: 4, overallAvg: 8.2, thisMonthAvg: 8.4, lastMonthAvg: 8.0 },
      { name: 'Marketing', headcount: 6, overallAvg: 7.1, thisMonthAvg: 7.3, lastMonthAvg: 6.9 },
    ],
    feelings: [
      { name: 'Focused', count: 48, moodCorrelation: 7.8 },
      { name: 'Productive', count: 42, moodCorrelation: 7.2 },
      { name: 'Stressed', count: 28, moodCorrelation: 4.0 },
      { name: 'Anxious', count: 18, moodCorrelation: 3.2 },
    ],
    contributors: [
      { name: 'Work', count: 96, moodCorrelation: 6.4 },
      { name: 'Team', count: 72, moodCorrelation: 7.6 },
      { name: 'Sleep', count: 54, moodCorrelation: 7.0 },
    ],
  };

  console.log('--- EMPLOYEE PDF ---');
  const employeePdf = await generateEmployeeReportPDF('Siddhanth Srinivasan', 'Last 30 Days', employeeData);
  console.log('--- ADMIN PDF ---');
  const adminPdf = await generateAdminReportPDF('Last 30 Days', adminData);

  fs.writeFileSync(path.join(__dirname, '../employee_test.pdf'), employeePdf);
  fs.writeFileSync(path.join(__dirname, '../admin_test.pdf'), adminPdf);

  console.log('PDFs generated successfully.');
}

run().catch(console.error);
