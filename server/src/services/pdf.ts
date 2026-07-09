import PDFDocument from 'pdfkit';
import { Writable } from 'stream';

// Helper function to draw a vector line chart in PDFKit
function drawTrendLineChart(
  doc: any,
  startX: number,
  startY: number,
  width: number,
  height: number,
  trends: { date: string; score: number }[],
  accentColor: string,
  gridColor: string,
  secondaryColor: string
) {
  const yLabels = [0, 2, 4, 6, 8, 10];
  doc.save();

  // 1. Draw grid lines (horizontal dashed lines) and Y-axis labels
  doc.lineWidth(0.5).strokeColor(gridColor).dash(2, { space: 2 });
  yLabels.forEach((val) => {
    const yVal = startY + height - (val / 10) * height;
    doc.moveTo(startX, yVal).lineTo(startX + width, yVal).stroke();
    
    // Draw Y-axis labels (undashed)
    doc.undash();
    doc.fillColor(secondaryColor).fontSize(7).text(val.toString(), startX - 22, yVal - 3, { align: 'right', width: 18 });
    doc.dash(2, { space: 2 }).strokeColor(gridColor);
  });
  doc.undash();

  // 2. Draw chart border box
  doc.lineWidth(1).strokeColor(gridColor).rect(startX, startY, width, height).stroke();

  if (trends.length === 0) {
    doc.fillColor(secondaryColor).fontSize(9).text('No historical data points to display line chart', startX + 10, startY + height / 2 - 5, { align: 'center', width });
    doc.restore();
    return;
  }

  if (trends.length === 1) {
    const t = trends[0];
    const y = startY + height - (t.score / 10) * height;
    
    // Draw horizontal trend line at the score level
    doc.lineWidth(1.5).strokeColor(accentColor);
    doc.moveTo(startX, y).lineTo(startX + width, y).stroke();
    
    // Draw point circle in the middle of the chart
    const centerX = startX + width / 2;
    doc.fillColor(accentColor).circle(centerX, y, 2.5).fill();
    
    // Draw X-axis date label at the center
    const dateStr = 'Wk of ' + new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    doc.fillColor(secondaryColor).fontSize(6).text(dateStr, centerX - 25, startY + height + 5, { align: 'center', width: 50 });
    
    doc.restore();
    return;
  }

  // 3. Map trends data points to absolute coordinates
  const points = trends.map((t, idx) => {
    const xSpacing = width / (trends.length - 1);
    const x = startX + idx * xSpacing;
    const y = startY + height - (t.score / 10) * height;
    return { x, y, score: t.score, date: t.date };
  });

  // 4. Draw trend line
  doc.lineWidth(1.5).strokeColor(accentColor);
  doc.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    doc.lineTo(points[i].x, points[i].y);
  }
  doc.stroke();

  // 5. Draw point circles and X-axis date labels (for first, middle, last to prevent overlaps)
  points.forEach((pt, idx) => {
    doc.fillColor(accentColor).circle(pt.x, pt.y, 2.5).fill();

    const shouldLabel = idx === 0 || idx === Math.floor(points.length / 2) || idx === points.length - 1;
    if (shouldLabel) {
      const dateStr = 'Wk of ' + new Date(pt.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      doc.fillColor(secondaryColor).fontSize(6).text(dateStr, pt.x - 25, startY + height + 5, { align: 'center', width: 50 });
    }
  });

  doc.restore();
}

// Helper to determine mood status
function getMoodStatus(score: number): { label: string; color: string; desc: string } {
  if (score >= 7.6) return { label: 'Optimal Wellbeing', color: '#10b981', desc: '' };
  if (score >= 6.0) return { label: 'Healthy Balance', color: '#3b82f6', desc: '' };
  return { label: 'Support Suggested', color: '#f97316', desc: '' };
}

export const generateEmployeeReportPDF = (
  employeeName: string,
  dateRangeText: string,
  data: {
    moodIndex: number;
    thisMonthAvg?: number | null;
    lastMonthAvg?: number | null;
    overallAvg?: number | null;
    distribution: { name: string; count: number }[];
    trends: { date: string; score: number }[];
    feelings: { name: string; count: number }[];
    contributors: { name: string; count: number }[];
    departmentName?: string;
    departmentMoodIndex?: number | null;
    departmentThisMonthAvg?: number | null;
    departmentLastMonthAvg?: number | null;
    departmentOverallAvg?: number | null;
    departmentHeadcount?: number | null;
  }
): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];
    const bufferStream = new Writable({
      write(chunk, encoding, callback) {
        chunks.push(chunk);
        callback();
      },
    });

    bufferStream.on('finish', () => {
      resolve(Buffer.concat(chunks));
    });

    bufferStream.on('error', (err) => {
      reject(err);
    });

    doc.pipe(bufferStream);

    const primaryColor = '#1c1917'; // Stone-900
    const secondaryColor = '#78716c'; // Stone-500
    const lightGray = '#f5f5f4'; // Stone-100
    const accentColor = '#2563eb'; // Blue-600
    const gridColor = '#e7e5e4'; // Stone-200

    // --- PAGE 1: EXECUTIVE SUMMARY & BREAKDOWNS ---
    
    // Header Banner
    doc.fillColor(accentColor).rect(50, 45, 8, 45).fill();
    doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(22).text('WELLBEING INSIGHTS REPORT', 68, 46);
    doc.fontSize(10).font('Helvetica').fillColor(secondaryColor).text(`Prepared for: ${employeeName}`, 68, 68);
    doc.text(`Period: ${dateRangeText}`, 68, 80);
    doc.moveDown(2);

    doc.strokeColor(gridColor).lineWidth(1).moveTo(50, 105).lineTo(545, 105).stroke();
    doc.moveDown(1.5);

    // KPI Cards Block (Side by side)
    const cardY = 125;
    // Card 1: Your Score
    doc.roundedRect(50, cardY, 235, 95, 8).fillAndStroke(lightGray, gridColor);
    // Card 2: Dept Score
    doc.roundedRect(300, cardY, 245, 95, 8).fillAndStroke(lightGray, gridColor);

    // Populate Card 1
    doc.fillColor(secondaryColor).font('Helvetica-Bold').fontSize(7).text('YOUR WELLBEING INDEX', 62, cardY + 12);
    doc.fillColor(accentColor).font('Helvetica-Bold').fontSize(26).text(`${data.moodIndex.toFixed(1)}`, 62, cardY + 22);
    const status = getMoodStatus(data.moodIndex);
    doc.fillColor(status.color).font('Helvetica-Bold').fontSize(7.5).text(status.label, 62, cardY + 54);

    // Right Column of Card 1 (Trends)
    const col1X = 165;
    doc.fillColor(secondaryColor).font('Helvetica').fontSize(7);
    doc.text(`This Month: ${data.thisMonthAvg ? data.thisMonthAvg.toFixed(1) : '—'}`, col1X, cardY + 22);
    doc.text(`Last Month: ${data.lastMonthAvg ? data.lastMonthAvg.toFixed(1) : '—'}`, col1X, cardY + 38);
    doc.text(`Overall Avg: ${data.overallAvg ? data.overallAvg.toFixed(1) : '—'}`, col1X, cardY + 54);

    // Populate Card 2
    const deptName = data.departmentName || 'Organization';
    const deptScore = data.departmentMoodIndex || 7.0;
    doc.fillColor(secondaryColor).font('Helvetica-Bold').fontSize(7).text('DEPARTMENT COMPARISON', 312, cardY + 12);
    doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(26).text(`${deptScore.toFixed(1)}`, 312, cardY + 22);
    doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(7.5).text(`${deptName} Avg`, 312, cardY + 54);
    
    const countText = `${data.departmentHeadcount || 0} members`;
    doc.fillColor(secondaryColor).font('Helvetica').fontSize(7).text(countText, 312, cardY + 68);

    // Right Column of Card 2 (Trends)
    const col2X = 425;
    doc.fillColor(secondaryColor).font('Helvetica').fontSize(7);
    doc.text(`This Month: ${data.departmentThisMonthAvg ? data.departmentThisMonthAvg.toFixed(1) : '—'}`, col2X, cardY + 22);
    doc.text(`Last Month: ${data.departmentLastMonthAvg ? data.departmentLastMonthAvg.toFixed(1) : '—'}`, col2X, cardY + 38);
    doc.text(`Overall Avg: ${data.departmentOverallAvg ? data.departmentOverallAvg.toFixed(1) : '—'}`, col2X, cardY + 54);

    doc.y = cardY + 115;

    // Most Logged Score Section
    doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(12).text('Most Logged Wellbeing Score', 50);
    doc.font('Helvetica').fontSize(8).fillColor(secondaryColor).text('The individual score number logged most frequently', 50);
    doc.moveDown(0.5);

    const distStartY = doc.y;
    let maxScoreEntry = data.distribution && data.distribution.length > 0 ? data.distribution[0] : null;
    if (data.distribution) {
      data.distribution.forEach(item => {
        if (maxScoreEntry && item.count > maxScoreEntry.count) {
          maxScoreEntry = item;
        }
      });
    }

    if (!maxScoreEntry || maxScoreEntry.count === 0) {
      doc.fillColor(secondaryColor).font('Helvetica').fontSize(9.5).text('No check-ins logged in this period.', 50, distStartY);
      doc.y = distStartY + 20;
    } else {
      doc.fillColor(accentColor).font('Helvetica-Bold').fontSize(18).text(`${maxScoreEntry.name} / 10`, 50, distStartY);
      doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(9.5).text(`Logged ${maxScoreEntry.count} times`, 110, distStartY + 2);
      doc.fillColor(secondaryColor).font('Helvetica').fontSize(8).text('This number represents your most frequent weekly check-in rating.', 110, distStartY + 13);
      doc.y = distStartY + 30;
    }

    // Top Feelings & Contributors
    doc.strokeColor(gridColor).lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1.5);

    const sectY = doc.y;
    // Feelings column
    doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(12).text('Top Logged Feelings', 50, sectY);
    doc.fillColor(secondaryColor).font('Helvetica').fontSize(8).text('Emotions reported most frequently', 50);
    doc.moveDown(0.6);
    
    let feelY = doc.y;
    if (data.feelings.length === 0) {
      doc.fillColor(secondaryColor).fontSize(9.5).text('No feelings recorded.', 50, feelY);
    } else {
      data.feelings.forEach((f) => {
        doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(9).text(f.name, 50, feelY, { continued: true });
        doc.fillColor(secondaryColor).font('Helvetica').text(`  (${f.count} occurrences)`, { underline: false });
        feelY += 16;
      });
    }

    // Contributors column
    doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(12).text('Primary Influence Factors', 300, sectY);
    doc.fillColor(secondaryColor).font('Helvetica').fontSize(8).text('Core contributors to your wellbeing', 300);
    doc.moveDown(0.6);
    
    let contribY = doc.y;
    if (data.contributors.length === 0) {
      doc.fillColor(secondaryColor).fontSize(9.5).text('No contributors recorded.', 300, contribY);
    } else {
      data.contributors.forEach((c) => {
        doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(9).text(c.name, 300, contribY, { continued: true });
        doc.fillColor(secondaryColor).font('Helvetica').text(`  (${c.count} occurrences)`, { underline: false });
        contribY += 16;
      });
    }

    // Footer Page 1
    doc.fillColor('#94a3b8').fontSize(7.5).text('Generated by Employee Wellness Index • Page 1 of 2', 50, 760, { align: 'center' });

    // --- PAGE 2: TRENDS & ACTIONABLE SUGGESTIONS ---
    doc.addPage();

    doc.fillColor(accentColor).rect(50, 45, 8, 25).fill();
    doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(16).text('Weekly Wellbeing Timeline', 68, 47);
    doc.moveDown(1.5);

    if (data.trends.length === 0) {
      doc.fillColor(secondaryColor).fontSize(10).text('No timeline details available for this range.');
    } else {
      // Draw the line chart
      const chartWidth = 450;
      const chartHeight = 120;
      const chartX = 75;
      const chartY = doc.y;

      drawTrendLineChart(doc, chartX, chartY, chartWidth, chartHeight, data.trends, accentColor, gridColor, secondaryColor);
      
      doc.y = chartY + chartHeight + 35;
    }

    // Footer Page 2
    doc.fillColor('#94a3b8').fontSize(7.5).text('Generated by Employee Wellness Index • Page 2 of 2', 50, 760, { align: 'center' });

    doc.end();
  });
};

export const generateAdminReportPDF = (
  dateRangeText: string,
  data: {
    moodIndex: number;
    thisMonthAvg?: number | null;
    lastMonthAvg?: number | null;
    overallAvg?: number | null;
    participationRate: number;
    totalEmployees: number;
    checkinsCount: number;
    distribution: { name: string; count: number }[];
    trends: { date: string; score: number }[];
    departments: {
      name: string;
      headcount: number;
      overallAvg: number | null;
      thisMonthAvg: number | null;
      lastMonthAvg: number | null;
    }[];
    feelings: { name: string; count: number; moodCorrelation: number }[];
    contributors: { name: string; count: number; moodCorrelation: number }[];
  }
): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];
    const bufferStream = new Writable({
      write(chunk, encoding, callback) {
        chunks.push(chunk);
        callback();
      },
    });

    bufferStream.on('finish', () => {
      resolve(Buffer.concat(chunks));
    });

    bufferStream.on('error', (err) => {
      reject(err);
    });

    doc.pipe(bufferStream);

    const primaryColor = '#1c1917'; // Stone-900
    const secondaryColor = '#78716c'; // Stone-500
    const lightGray = '#f5f5f4'; // Stone-100
    const accentColor = '#2563eb'; // Blue-600
    const gridColor = '#e7e5e4'; // Stone-200

    // --- PAGE 1: ORGANIZATION KPI & DEPARTMENT BREAKDOWNS ---
    
    // Title header
    doc.fillColor(accentColor).rect(50, 45, 8, 45).fill();
    doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(22).text('ORGANIZATIONAL WELLBEING REPORT', 68, 46);
    doc.fontSize(10).font('Helvetica').fillColor(secondaryColor).text(`Aggregated Organization Analytics`, 68, 68);
    doc.text(`Period: ${dateRangeText}`, 68, 80);
    doc.moveDown(2);

    doc.strokeColor(gridColor).lineWidth(1).moveTo(50, 105).lineTo(545, 105).stroke();
    doc.moveDown(1.5);

    // KPI Cards Block (Three columns)
    const kpiY = 125;
    const cardWidth = 155;
    const cardHeight = 85;

    // Card Backgrounds
    doc.roundedRect(50, kpiY, cardWidth, cardHeight, 6).fillAndStroke(lightGray, gridColor);
    doc.roundedRect(220, kpiY, cardWidth, cardHeight, 6).fillAndStroke(lightGray, gridColor);
    doc.roundedRect(390, kpiY, cardWidth, cardHeight, 6).fillAndStroke(lightGray, gridColor);

    // Card 1
    doc.fillColor(secondaryColor).font('Helvetica-Bold').fontSize(7.5).text('COMPANY MOOD INDEX', 58, kpiY + 12);
    doc.fillColor(accentColor).font('Helvetica-Bold').fontSize(24).text(`${data.moodIndex.toFixed(1)}`, 58, kpiY + 24);
    
    // Add sub-trends inside Card 1 (e.g. This Month / Last Month / Overall)
    doc.fillColor(secondaryColor).font('Helvetica').fontSize(6.5);
    doc.text(`This Month: ${data.thisMonthAvg ? data.thisMonthAvg.toFixed(1) : '—'}`, 122, kpiY + 22);
    doc.text(`Last Month: ${data.lastMonthAvg ? data.lastMonthAvg.toFixed(1) : '—'}`, 122, kpiY + 36);
    doc.text(`Overall: ${data.overallAvg ? data.overallAvg.toFixed(1) : '—'}`, 122, kpiY + 50);

    const companyLvl = getMoodStatus(data.moodIndex);
    doc.fillColor(companyLvl.color).font('Helvetica-Bold').fontSize(7.5).text(companyLvl.label, 58, kpiY + 58);

    // Card 2
    doc.fillColor(secondaryColor).font('Helvetica-Bold').fontSize(7.5).text('PARTICIPATION RATE', 230, kpiY + 12);
    doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(26).text(`${data.participationRate}%`, 230, kpiY + 24);
    doc.fillColor(secondaryColor).font('Helvetica').fontSize(8.5).text(`${data.totalEmployees} Active Members`, 230, kpiY + 58);

    // Card 3
    doc.fillColor(secondaryColor).font('Helvetica-Bold').fontSize(7.5).text('TOTAL SUBMISSIONS', 400, kpiY + 12);
    doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(26).text(`${data.checkinsCount}`, 400, kpiY + 24);
    doc.fillColor(secondaryColor).font('Helvetica').fontSize(8.5).text('Completed Check-Ins', 400, kpiY + 58);

    doc.y = kpiY + 105;

    // Department Breakdown Table
    doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(12).text('Departmental Breakdown', 50);
    doc.fillColor(secondaryColor).font('Helvetica').fontSize(8).text('Wellbeing rating trends and headcount analysis by department', 50);
    doc.moveDown(0.5);

    const tblHeaderY = doc.y;
    doc.fillColor(secondaryColor).font('Helvetica-Bold').fontSize(8);
    doc.text('Department', 55, tblHeaderY);
    doc.text('This Month', 210, tblHeaderY);
    doc.text('Last Month', 300, tblHeaderY);
    doc.text('Overall Avg', 390, tblHeaderY);
    doc.text('Team Size', 480, tblHeaderY);

    doc.strokeColor(gridColor).lineWidth(0.8).moveTo(50, tblHeaderY + 14).lineTo(545, tblHeaderY + 14).stroke();

    let rowY = tblHeaderY + 20;
    
    if (data.departments.length === 0) {
      doc.fillColor(secondaryColor).font('Helvetica').fontSize(9).text('No department check-ins recorded.', 55, rowY);
      rowY += 18;
    } else {
      data.departments.forEach((dept, index) => {
        // Draw zebra stripe
        if (index % 2 === 0) {
          doc.fillColor('#fafafa').rect(50, rowY - 4, 495, 18).fill();
        }
        
        doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(8.5).text(dept.name, 55, rowY);
        doc.fillColor(accentColor).text(dept.thisMonthAvg ? dept.thisMonthAvg.toFixed(1) : '—', 210, rowY);
        doc.fillColor(primaryColor).font('Helvetica').text(dept.lastMonthAvg ? dept.lastMonthAvg.toFixed(1) : '—', 300, rowY);
        doc.fillColor(primaryColor).text(dept.overallAvg ? dept.overallAvg.toFixed(1) : '—', 390, rowY);
        doc.fillColor(secondaryColor).text(`${dept.headcount} people`, 480, rowY);
        rowY += 18;
      });
    }

    doc.y = rowY + 15;

    // Most Logged Score Section
    doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(11).text('Most Logged Wellbeing Score', 50);
    doc.font('Helvetica').fontSize(8).fillColor(secondaryColor).text('The individual score number logged most frequently across the company', 50);
    doc.moveDown(0.5);

    const distY = doc.y;
    let maxScoreEntry = data.distribution && data.distribution.length > 0 ? data.distribution[0] : null;
    if (data.distribution) {
      data.distribution.forEach(item => {
        if (maxScoreEntry && item.count > maxScoreEntry.count) {
          maxScoreEntry = item;
        }
      });
    }

    if (!maxScoreEntry || maxScoreEntry.count === 0) {
      doc.fillColor(secondaryColor).font('Helvetica').fontSize(9.5).text('No check-ins logged in this period.', 50, distY);
      doc.y = distY + 20;
    } else {
      doc.fillColor(accentColor).font('Helvetica-Bold').fontSize(18).text(`${maxScoreEntry.name} / 10`, 50, distY);
      doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(9.5).text(`Logged ${maxScoreEntry.count} times`, 110, distY + 2);
      doc.fillColor(secondaryColor).font('Helvetica').fontSize(8).text('This number represents the most common rating among employees.', 110, distY + 13);
      doc.y = distY + 30;
    }

    // Footer Page 1
    doc.fillColor('#94a3b8').fontSize(7.5).text('Generated by Employee Wellness Index • Page 1 of 2', 50, 760, { align: 'center' });

    // --- PAGE 2: TRENDS & DRIVERS ---
    doc.addPage();

    doc.fillColor(accentColor).rect(50, 45, 8, 25).fill();
    doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(16).text('Company Wellbeing Trends', 68, 47);
    doc.moveDown(1.5);

    if (data.trends.length === 0) {
      doc.fillColor(secondaryColor).fontSize(9.5).text('No trend line details available.');
    } else {
      const chartWidth = 450;
      const chartHeight = 110;
      const chartX = 75;
      const chartY = doc.y;

      drawTrendLineChart(doc, chartX, chartY, chartWidth, chartHeight, data.trends, accentColor, gridColor, secondaryColor);
      
      doc.y = chartY + chartHeight + 35;
    }

    doc.strokeColor(gridColor).lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1.5);

    // Deeper Analytics: Drivers vs Detractors
    doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(12).text('Key Wellbeing Drivers & Detractors', 50);
    doc.fillColor(secondaryColor).font('Helvetica').fontSize(8.5).text('Factors with the strongest positive (Drivers) and negative (Detractors) impact correlations', 50);
    doc.moveDown(0.8);

    const dSectY = doc.y;

    // Left Column: Drivers (Mood Correlation >= 6.0)
    doc.fillColor('#10b981').font('Helvetica-Bold').fontSize(9.5).text('Positive Drivers (Boosters)', 50, dSectY);
    doc.strokeColor('#e6f4ea').lineWidth(0.5).moveTo(50, dSectY + 12).lineTo(280, dSectY + 12).stroke();
    
    let drvY = dSectY + 18;
    const positiveDrivers = data.feelings
      .filter(f => f.moodCorrelation >= 6.0)
      .slice(0, 5)
      .concat(
        data.contributors
          .filter(c => c.moodCorrelation >= 6.0)
          .slice(0, 5)
      );

    if (positiveDrivers.length === 0) {
      doc.fillColor(secondaryColor).font('Helvetica').fontSize(8.5).text('Insufficient correlation data.', 50, drvY);
    } else {
      positiveDrivers.slice(0, 5).forEach((item) => {
        doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(8.5).text(item.name, 50, drvY);
        doc.fillColor(secondaryColor).font('Helvetica').fontSize(7.5).text(`Correlation score: ${item.moodCorrelation.toFixed(1)}`, 160, drvY);
        drvY += 15;
      });
    }

    // Right Column: Detractors (Mood Correlation < 6.0)
    doc.fillColor('#f97316').font('Helvetica-Bold').fontSize(9.5).text('Detractors (Stressors)', 305, dSectY);
    doc.strokeColor('#fdf2e9').lineWidth(0.5).moveTo(305, dSectY + 12).lineTo(545, dSectY + 12).stroke();

    let detY = dSectY + 18;
    const negativeDetractors = data.feelings
      .filter(f => f.moodCorrelation < 6.0)
      .slice(0, 5)
      .concat(
        data.contributors
          .filter(c => c.moodCorrelation < 6.0)
          .slice(0, 5)
      );

    if (negativeDetractors.length === 0) {
      doc.fillColor(secondaryColor).font('Helvetica').fontSize(8.5).text('Insufficient correlation data.', 305, detY);
    } else {
      negativeDetractors.slice(0, 5).forEach((item) => {
        doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(8.5).text(item.name, 305, detY);
        doc.fillColor(secondaryColor).font('Helvetica').fontSize(7.5).text(`Correlation score: ${item.moodCorrelation.toFixed(1)}`, 415, detY);
        detY += 15;
      });
    }

    // Footer Page 2
    doc.fillColor('#94a3b8').fontSize(7.5).text('Generated by Employee Wellness Index • Page 2 of 2', 50, 760, { align: 'center' });

    doc.end();
  });
};
