import PDFDocument from 'pdfkit';
import { Writable } from 'stream';

// Color Palette Constants
const PRIMARY_COLOR = '#0f172a'; // Slate-900 (High contrast text)
const SECONDARY_COLOR = '#475569'; // Slate-600 (Muted text)
const MUTED_COLOR = '#94a3b8'; // Slate-400 (Subtle text / footers)
const CARD_BG = '#f8fafc'; // Slate-50 (Card fill)
const CARD_BORDER = '#e2e8f0'; // Slate-200 (Borders)
const BRAND_BLUE = '#2563eb'; // Blue-600 (Primary accent)
const BRAND_LIGHT = '#eff6ff'; // Blue-50 (Accent tint)
const SUCCESS_GREEN = '#10b981'; // Emerald-500
const SUCCESS_LIGHT = '#ecfdf5'; // Emerald-50
const BALANCED_BLUE = '#3b82f6'; // Blue-500
const BALANCED_LIGHT = '#eff6ff';
const WARNING_ORANGE = '#f59e0b'; // Amber-500
const WARNING_LIGHT = '#fffbeb';
const DANGER_RED = '#ef4444'; // Red-500
const DANGER_LIGHT = '#fef2f2';

// Helper to determine mood status
function getMoodStatus(score: number | null | undefined): { label: string; color: string; bg: string } {
  if (score === null || score === undefined || score === 0) {
    return { label: 'No Data', color: MUTED_COLOR, bg: '#f1f5f9' };
  }
  if (score >= 7.6) return { label: 'Optimal Wellbeing', color: SUCCESS_GREEN, bg: SUCCESS_LIGHT };
  if (score >= 6.0) return { label: 'Healthy Balance', color: BALANCED_BLUE, bg: BALANCED_LIGHT };
  return { label: 'Support Suggested', color: WARNING_ORANGE, bg: WARNING_LIGHT };
}

// Helper to draw clean vector line chart
function drawTrendLineChart(
  doc: PDFKit.PDFDocument,
  startX: number,
  startY: number,
  width: number,
  height: number,
  data: { date: string; score: number }[],
  accentColor: string = BRAND_BLUE
) {
  doc.save();

  // Background and border
  doc.roundedRect(startX, startY, width, height, 6).fillAndStroke('#ffffff', CARD_BORDER);

  // Y-axis gridlines (scores 2, 4, 6, 8, 10)
  const ySteps = [2, 4, 6, 8, 10];
  doc.fontSize(6.5).font('Helvetica').fillColor(MUTED_COLOR);
  ySteps.forEach((val) => {
    const yPos = startY + height - 15 - ((val - 1) / 9) * (height - 30);
    doc.strokeColor('#f1f5f9').lineWidth(0.6).moveTo(startX + 28, yPos).lineTo(startX + width - 15, yPos).stroke();
    doc.text(val.toString(), startX + 8, yPos - 3, { width: 16, align: 'right' });
  });

  if (!data || data.length === 0) {
    doc.fillColor(SECONDARY_COLOR).fontSize(9).text('No trend records available for this period.', startX + 40, startY + height / 2 - 5);
    doc.restore();
    return;
  }

  const chartAreaX = startX + 32;
  const chartAreaW = width - 48;
  const chartAreaY = startY + 12;
  const chartAreaH = height - 28;

  const points = data.map((d, i) => {
    const x = data.length === 1 ? chartAreaX + chartAreaW / 2 : chartAreaX + (i / (data.length - 1)) * chartAreaW;
    const clamped = Math.max(1, Math.min(10, d.score));
    const y = chartAreaY + chartAreaH - ((clamped - 1) / 9) * chartAreaH;
    return { x, y, date: d.date, score: d.score };
  });

  // Area under curve
  doc.save();
  doc.moveTo(points[0].x, chartAreaY + chartAreaH);
  points.forEach((pt) => doc.lineTo(pt.x, pt.y));
  doc.lineTo(points[points.length - 1].x, chartAreaY + chartAreaH);
  doc.closePath();
  doc.fillColor(BRAND_LIGHT).fillOpacity(0.4).fill();
  doc.restore();

  // Stroke line
  doc.strokeColor(accentColor).lineWidth(1.8);
  doc.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    doc.lineTo(points[i].x, points[i].y);
  }
  doc.stroke();

  // Draw points and labels
  points.forEach((pt, idx) => {
    doc.fillColor('#ffffff').circle(pt.x, pt.y, 3).fill();
    doc.strokeColor(accentColor).lineWidth(1.5).circle(pt.x, pt.y, 3).stroke();

    // Print label for start, middle, and end points to avoid overlap
    const shouldLabel = idx === 0 || idx === Math.floor(points.length / 2) || idx === points.length - 1;
    if (shouldLabel) {
      const dObj = new Date(pt.date);
      const dateStr = !isNaN(dObj.getTime())
        ? dObj.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
        : pt.date;
      doc.fillColor(SECONDARY_COLOR).font('Helvetica').fontSize(6.5).text(dateStr, pt.x - 25, startY + height + 3, { align: 'center', width: 50 });
    }
  });

  doc.restore();
}

// Apply dynamic page footers across all generated pages
function applyPageFooters(doc: PDFKit.PDFDocument) {
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(i);
    doc.strokeColor(CARD_BORDER).lineWidth(0.5).moveTo(45, 785).lineTo(550, 785).stroke();
    doc.fillColor(MUTED_COLOR).fontSize(7.5).font('Helvetica').text(
      `Employee Wellness Index • Confidential Report • Page ${i + 1} of ${range.count}`,
      45,
      795,
      { align: 'center', width: 505 }
    );
  }
}

// --------------------------------------------------------------------------
// 1. REWRITTEN EMPLOYEE REPORT PDF
// --------------------------------------------------------------------------
export const generateEmployeeReportPDF = (
  employeeName: string,
  employeeEmail: string,
  dateRangeText: string,
  data: {
    moodIndex: number;
    thisMonthAvg?: number | null;
    lastMonthAvg?: number | null;
    overallAvg?: number | null;
    thisMonthCheckins: number;
    expectedCheckinsThisMonth: number;
    monthlyCompliance: number;
    distribution: { name: string; count: number }[];
    trends: { date: string; score: number }[];
    feelings: { name: string; count: number }[];
    contributors: { name: string; count: number }[];
    departmentName: string;
    departmentMoodIndex: number | null;
    departmentThisMonthAvg: number | null;
    departmentLastMonthAvg: number | null;
    departmentOverallAvg: number | null;
    departmentHeadcount: number;
    departmentThisMonthCheckins: number;
    departmentExpectedCheckinsThisMonth: number;
    departmentMonthlyParticipation: number;
    comparisonHistory?: {
      periodLabel: string;
      userScore: number | null;
      deptAvg: number | null;
    }[];
  }
): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 45, size: 'A4', bufferPages: true });
    const chunks: Buffer[] = [];
    const bufferStream = new Writable({
      write(chunk, encoding, callback) {
        chunks.push(chunk);
        callback();
      },
    });

    bufferStream.on('finish', () => resolve(Buffer.concat(chunks)));
    bufferStream.on('error', (err) => reject(err));
    doc.pipe(bufferStream);

    // =========================================================================
    // PAGE 1: EXECUTIVE WELLBEING & DEPARTMENT BENCHMARK
    // =========================================================================
    
    // Header Banner
    doc.fillColor(BRAND_BLUE).rect(45, 45, 6, 48).fill();
    doc.fillColor(PRIMARY_COLOR).font('Helvetica-Bold').fontSize(20).text('WELLBEING INSIGHTS & BENCHMARK', 60, 45);
    doc.fillColor(SECONDARY_COLOR).font('Helvetica').fontSize(9.5).text(
      `Prepared for: ${employeeName} (${employeeEmail || 'Employee'}) • Department: ${data.departmentName || 'General'}`,
      60,
      68
    );
    doc.fillColor(MUTED_COLOR).fontSize(8).text(`Evaluation Period: ${dateRangeText} • Generated on ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, 60, 81);

    doc.strokeColor(CARD_BORDER).lineWidth(0.8).moveTo(45, 105).lineTo(550, 105).stroke();

    // -------------------------------------------------------------------------
    // 3 Executive Benchmark KPI Cards (X=45, 218, 391; Width=159; Height=95)
    // -------------------------------------------------------------------------
    const cardY = 118;
    const cardW = 159;
    const cardH = 95;

    // Card 1: Your Wellbeing Index
    doc.roundedRect(45, cardY, cardW, cardH, 8).fillAndStroke(CARD_BG, CARD_BORDER);
    doc.fillColor(SECONDARY_COLOR).font('Helvetica-Bold').fontSize(7.5).text('YOUR WELLBEING INDEX', 55, cardY + 10);
    doc.fillColor(BRAND_BLUE).font('Helvetica-Bold').fontSize(24).text(`${data.moodIndex.toFixed(1)}`, 55, cardY + 22);

    const userStatus = getMoodStatus(data.moodIndex);
    doc.fillColor(userStatus.color).font('Helvetica-Bold').fontSize(7.5).text(userStatus.label, 55, cardY + 54);

    doc.fillColor(SECONDARY_COLOR).font('Helvetica').fontSize(6.8);
    doc.text(`This Month: ${data.thisMonthAvg ? data.thisMonthAvg.toFixed(1) : '—'}`, 112, cardY + 22);
    doc.text(`Last Month: ${data.lastMonthAvg ? data.lastMonthAvg.toFixed(1) : '—'}`, 112, cardY + 36);
    doc.text(`Overall Avg: ${data.overallAvg ? data.overallAvg.toFixed(1) : '—'}`, 112, cardY + 50);

    // Card 2: Department Benchmark
    const deptScore = data.departmentMoodIndex || 7.0;
    doc.roundedRect(218, cardY, cardW, cardH, 8).fillAndStroke(CARD_BG, CARD_BORDER);
    doc.fillColor(SECONDARY_COLOR).font('Helvetica-Bold').fontSize(7.5).text('DEPARTMENT BENCHMARK', 228, cardY + 10);
    doc.fillColor(PRIMARY_COLOR).font('Helvetica-Bold').fontSize(24).text(`${deptScore.toFixed(1)}`, 228, cardY + 22);
    doc.fillColor(PRIMARY_COLOR).font('Helvetica-Bold').fontSize(7.5).text(`${data.departmentName} Avg`, 228, cardY + 54);
    doc.fillColor(MUTED_COLOR).font('Helvetica').fontSize(6.8).text(`${data.departmentHeadcount || 1} Team Members`, 228, cardY + 68);

    doc.fillColor(SECONDARY_COLOR).font('Helvetica').fontSize(6.8);
    doc.text(`This Month: ${data.departmentThisMonthAvg ? data.departmentThisMonthAvg.toFixed(1) : '—'}`, 288, cardY + 22);
    doc.text(`Last Month: ${data.departmentLastMonthAvg ? data.departmentLastMonthAvg.toFixed(1) : '—'}`, 288, cardY + 36);
    doc.text(`Overall Avg: ${data.departmentOverallAvg ? data.departmentOverallAvg.toFixed(1) : '—'}`, 288, cardY + 50);

    // Card 3: Monthly Check-in Consistency
    doc.roundedRect(391, cardY, cardW, cardH, 8).fillAndStroke(CARD_BG, CARD_BORDER);
    doc.fillColor(SECONDARY_COLOR).font('Helvetica-Bold').fontSize(7.5).text('CHECK-IN CONSISTENCY', 401, cardY + 10);
    doc.fillColor(data.monthlyCompliance >= 75 ? SUCCESS_GREEN : WARNING_ORANGE).font('Helvetica-Bold').fontSize(24).text(`${data.thisMonthCheckins}/${data.expectedCheckinsThisMonth}`, 401, cardY + 22);
    doc.fillColor(PRIMARY_COLOR).font('Helvetica-Bold').fontSize(7.5).text(`${data.monthlyCompliance}% Monthly Completion`, 401, cardY + 54);
    
    const delta = data.moodIndex - deptScore;
    const deltaText = delta >= 0 ? `+${delta.toFixed(1)} vs Dept Avg` : `${delta.toFixed(1)} vs Dept Avg`;
    const deltaColor = delta >= 0 ? SUCCESS_GREEN : WARNING_ORANGE;
    doc.fillColor(deltaColor).font('Helvetica-Bold').fontSize(7).text(deltaText, 401, cardY + 68);

    // -------------------------------------------------------------------------
    // Section: Department vs Personal Check-in Cadence History
    // -------------------------------------------------------------------------
    let currentY = cardY + cardH + 18;
    doc.fillColor(PRIMARY_COLOR).font('Helvetica-Bold').fontSize(11).text('Recent Check-in Timeline & Department Standing', 45, currentY);
    doc.fillColor(SECONDARY_COLOR).font('Helvetica').fontSize(7.5).text('Your weekly ratings compared directly with the department average', 45, currentY + 14);
    currentY += 28;

    // Table Header
    doc.fillColor(CARD_BG).rect(45, currentY, 505, 18).fill();
    doc.fillColor(SECONDARY_COLOR).font('Helvetica-Bold').fontSize(7.5);
    doc.text('Check-in Period', 55, currentY + 5);
    doc.text('Your Rating', 200, currentY + 5);
    doc.text('Department Avg', 300, currentY + 5);
    doc.text('Variance', 400, currentY + 5);
    doc.text('Participation Status', 470, currentY + 5);
    doc.strokeColor(CARD_BORDER).lineWidth(0.8).moveTo(45, currentY + 18).lineTo(550, currentY + 18).stroke();
    currentY += 19;

    const compHistory = data.comparisonHistory && data.comparisonHistory.length > 0
      ? data.comparisonHistory.slice(0, 5)
      : [];

    if (compHistory.length === 0) {
      doc.fillColor(MUTED_COLOR).font('Helvetica').fontSize(8).text('No recent weekly check-in comparison points recorded.', 55, currentY + 6);
      currentY += 22;
    } else {
      compHistory.forEach((item, index) => {
        if (index % 2 === 0) {
          doc.fillColor('#fafafa').rect(45, currentY, 505, 17).fill();
        }
        doc.fillColor(PRIMARY_COLOR).font('Helvetica').fontSize(7.5).text(item.periodLabel, 55, currentY + 4, { width: 140, lineBreak: false });
        
        if (item.userScore !== null) {
          doc.fillColor(item.userScore >= 7.5 ? SUCCESS_GREEN : (item.userScore >= 6.0 ? BALANCED_BLUE : WARNING_ORANGE))
            .font('Helvetica-Bold').fontSize(8).text(`${item.userScore.toFixed(1)} / 10`, 200, currentY + 4);
        } else {
          doc.fillColor(DANGER_RED).font('Helvetica').fontSize(7.5).text('Missed Check-in', 200, currentY + 4);
        }

        const dAvg = item.deptAvg !== null ? item.deptAvg.toFixed(1) : '—';
        doc.fillColor(SECONDARY_COLOR).font('Helvetica').fontSize(7.5).text(`${dAvg} / 10`, 300, currentY + 4);

        if (item.userScore !== null && item.deptAvg !== null) {
          const diff = item.userScore - item.deptAvg;
          const diffText = diff >= 0 ? `+${diff.toFixed(1)}` : `${diff.toFixed(1)}`;
          const diffCol = diff >= 0 ? SUCCESS_GREEN : WARNING_ORANGE;
          doc.fillColor(diffCol).font('Helvetica-Bold').fontSize(7.5).text(diffText, 400, currentY + 4);
        } else {
          doc.fillColor(MUTED_COLOR).font('Helvetica').fontSize(7.5).text('—', 400, currentY + 4);
        }

        const statusLabel = item.userScore !== null ? 'Completed' : 'Pending/Missed';
        const statusCol = item.userScore !== null ? SUCCESS_GREEN : DANGER_RED;
        doc.fillColor(statusCol).font('Helvetica').fontSize(7.5).text(statusLabel, 470, currentY + 4);

        currentY += 17;
      });
    }

    // -------------------------------------------------------------------------
    // Emotional Drivers & Workplace Influences (Side-by-side cards)
    // -------------------------------------------------------------------------
    currentY += 14;
    doc.strokeColor(CARD_BORDER).lineWidth(0.8).moveTo(45, currentY).lineTo(550, currentY).stroke();
    currentY += 14;

    const colW = 245;
    const secBoxH = 105;

    // Left Box: Feelings
    doc.roundedRect(45, currentY, colW, secBoxH, 6).fillAndStroke(CARD_BG, CARD_BORDER);
    doc.fillColor(PRIMARY_COLOR).font('Helvetica-Bold').fontSize(9).text('Top Logged Feelings', 55, currentY + 10);
    doc.fillColor(MUTED_COLOR).font('Helvetica').fontSize(6.8).text('Emotions recorded during weekly check-ins', 55, currentY + 22);

    let feelY = currentY + 35;
    if (!data.feelings || data.feelings.length === 0) {
      doc.fillColor(MUTED_COLOR).fontSize(7.5).text('No feeling entries recorded in this period.', 55, feelY);
    } else {
      data.feelings.slice(0, 4).forEach((f) => {
        doc.fillColor(PRIMARY_COLOR).font('Helvetica-Bold').fontSize(7.8).text(f.name, 55, feelY, { continued: true });
        doc.fillColor(MUTED_COLOR).font('Helvetica').fontSize(7.2).text(`  (${f.count} check-ins)`, { underline: false });
        feelY += 15;
      });
    }

    // Right Box: Contributors
    doc.roundedRect(305, currentY, colW, secBoxH, 6).fillAndStroke(CARD_BG, CARD_BORDER);
    doc.fillColor(PRIMARY_COLOR).font('Helvetica-Bold').fontSize(9).text('Primary Influence Factors', 315, currentY + 10);
    doc.fillColor(MUTED_COLOR).font('Helvetica').fontSize(6.8).text('Key workplace contributors to your wellbeing', 315, currentY + 22);

    let contribY = currentY + 35;
    if (!data.contributors || data.contributors.length === 0) {
      doc.fillColor(MUTED_COLOR).fontSize(7.5).text('No contributor tags recorded in this period.', 315, contribY);
    } else {
      data.contributors.slice(0, 4).forEach((c) => {
        doc.fillColor(PRIMARY_COLOR).font('Helvetica-Bold').fontSize(7.8).text(c.name, 315, contribY, { continued: true });
        doc.fillColor(MUTED_COLOR).font('Helvetica').fontSize(7.2).text(`  (${c.count} check-ins)`, { underline: false });
        contribY += 15;
      });
    }

    // -------------------------------------------------------------------------
    // PAGE 2: TREND TIMELINE & PERSONALIZED ANALYSIS
    // -------------------------------------------------------------------------
    doc.addPage();

    doc.fillColor(BRAND_BLUE).rect(45, 45, 6, 26).fill();
    doc.fillColor(PRIMARY_COLOR).font('Helvetica-Bold').fontSize(16).text('Wellbeing Timeline & Analytical Reflections', 60, 45);
    doc.fillColor(SECONDARY_COLOR).font('Helvetica').fontSize(8.5).text('Longitudinal trend monitoring and tailored workplace observations', 60, 62);

    doc.strokeColor(CARD_BORDER).lineWidth(0.8).moveTo(45, 82).lineTo(550, 82).stroke();

    // Line Chart
    let p2Y = 95;
    doc.fillColor(PRIMARY_COLOR).font('Helvetica-Bold').fontSize(10).text('Weekly Wellbeing Trajectory', 45, p2Y);
    doc.fillColor(MUTED_COLOR).font('Helvetica').fontSize(7.5).text('Trend trajectory plotted across active check-in cycles (Scale: 1 Awful to 10 Great)', 45, p2Y + 12);
    p2Y += 26;

    const chartW = 505;
    const chartH = 120;
    drawTrendLineChart(doc, 45, p2Y, chartW, chartH, data.trends || [], BRAND_BLUE);
    p2Y += chartH + 25;

    // Wellbeing Rating Distribution
    doc.fillColor(PRIMARY_COLOR).font('Helvetica-Bold').fontSize(10).text('Rating Distribution (1 - 10 Scale)', 45, p2Y);
    doc.fillColor(MUTED_COLOR).font('Helvetica').fontSize(7.5).text('Total number of times each rating score was recorded', 45, p2Y + 12);
    p2Y += 26;

    const distW = 505;
    const distH = 45;
    doc.roundedRect(45, p2Y, distW, distH, 6).fillAndStroke(CARD_BG, CARD_BORDER);

    const distItems = data.distribution || [];
    const maxCount = Math.max(1, ...distItems.map(d => d.count));
    const slotW = distW / 10;

    distItems.forEach((d, idx) => {
      const slotX = 45 + idx * slotW;
      const count = d.count || 0;
      doc.fillColor(PRIMARY_COLOR).font('Helvetica-Bold').fontSize(8.5).text(d.name, slotX, p2Y + 8, { width: slotW, align: 'center' });
      doc.fillColor(count > 0 ? BRAND_BLUE : MUTED_COLOR).font(count > 0 ? 'Helvetica-Bold' : 'Helvetica').fontSize(8).text(`${count}x`, slotX, p2Y + 24, { width: slotW, align: 'center' });
    });

    p2Y += distH + 25;

    // Narrative Synthesis & Actionable Reflection
    doc.roundedRect(45, p2Y, 505, 115, 8).fillAndStroke(BRAND_LIGHT, '#bfdbfe');
    doc.fillColor(BRAND_BLUE).font('Helvetica-Bold').fontSize(10.5).text('Department Context & Reflection Summary', 58, p2Y + 12);

    const standingDesc = delta > 0.3
      ? `Your wellbeing index of ${data.moodIndex.toFixed(1)} is tracking positively above your department average of ${deptScore.toFixed(1)}. You have maintained strong wellbeing momentum.`
      : delta < -0.3
      ? `Your wellbeing index of ${data.moodIndex.toFixed(1)} is currently tracking lower than your department average of ${deptScore.toFixed(1)}. You may be facing higher workload pressure or project deadlines.`
      : `Your wellbeing index of ${data.moodIndex.toFixed(1)} is closely aligned with the ${data.departmentName} department benchmark (${deptScore.toFixed(1)}).`;

    const checkinDesc = data.monthlyCompliance >= 75
      ? `Your check-in consistency of ${data.thisMonthCheckins}/${data.expectedCheckinsThisMonth} (${data.monthlyCompliance}%) is excellent. Consistent weekly reflection provides accurate organizational visibility.`
      : `You completed ${data.thisMonthCheckins}/${data.expectedCheckinsThisMonth} (${data.monthlyCompliance}%) check-ins this month. Prioritize taking 60 seconds on Friday to record your weekly mood rating.`;

    const reflectionText = `${standingDesc} ${checkinDesc} Continuous feedback helps leadership tailor workload distributions, promote positive workplace drivers, and address stressors early.`;

    doc.fillColor(PRIMARY_COLOR).font('Helvetica').fontSize(8.5).text(reflectionText, 58, p2Y + 30, { width: 480, lineGap: 3 });

    doc.fillColor(SECONDARY_COLOR).font('Helvetica-Bold').fontSize(7.5).text('Recommended Actions:', 58, p2Y + 80);
    doc.fillColor(SECONDARY_COLOR).font('Helvetica').fontSize(7.5).text(
      '• Review your top influence factors to identify what boosts your energy.\n• Communicate workload constraints with your team leader during 1-on-1s.',
      145,
      p2Y + 80,
      { lineGap: 2 }
    );

    // Apply running footers
    applyPageFooters(doc);
    doc.end();
  });
};

// --------------------------------------------------------------------------
// 2. REWRITTEN ADMIN / OVERALL REPORT PDF
// --------------------------------------------------------------------------
export const generateAdminReportPDF = (
  dateRangeText: string,
  data: {
    departmentName?: string; // If filtered to a specific department
    moodIndex: number;
    thisMonthAvg?: number | null;
    lastMonthAvg?: number | null;
    overallAvg?: number | null;
    participationRate: number;
    totalEmployees: number;
    checkinsCount: number;
    monthCheckinsTotal: number;
    monthExpectedTotal: number;
    monthComplianceRate: number;
    monthActiveEmployees: number;
    distribution: { name: string; count: number }[];
    trends: { date: string; score: number }[];
    departments: {
      name: string;
      headcount: number;
      thisMonthCheckins: number;
      expectedCheckins: number;
      complianceRate: number;
      activeMembers: number;
      thisMonthAvg: number | null;
      lastMonthAvg: number | null;
      overallAvg: number | null;
    }[];
    feelings: { name: string; count: number; moodCorrelation: number }[];
    contributors: { name: string; count: number; moodCorrelation: number }[];
    employeeDetails?: {
      name: string;
      email: string;
      department: string;
      thisMonthCheckins: number;
      expectedThisMonth: number;
      monthlyCompliance: number;
      thisMonthAvg: number | null;
      overallAvg: number | null;
      scores: (number | null)[];
    }[];
    reportPeriods?: { label: string; start: string; end: string }[];
    sections?: {
      summary?: boolean;
      trends?: boolean;
      departments?: boolean;
      employees?: boolean;
    };
  }
): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 45, size: 'A4', bufferPages: true });
    const chunks: Buffer[] = [];
    const bufferStream = new Writable({
      write(chunk, encoding, callback) {
        chunks.push(chunk);
        callback();
      },
    });

    bufferStream.on('finish', () => resolve(Buffer.concat(chunks)));
    bufferStream.on('error', (err) => reject(err));
    doc.pipe(bufferStream);

    const isSpecificDept = Boolean(data.departmentName);
    const reportTitle = isSpecificDept
      ? `${data.departmentName!.toUpperCase()} WELLBEING & CHECK-IN REPORT`
      : 'ORGANIZATIONAL WELLBEING & CHECK-IN REPORT';

    const reportSubtitle = isSpecificDept
      ? `Departmental Health Analytics, Check-in Compliance & Employee Breakdown`
      : `Company-Wide Wellbeing Index, Monthly Check-in Compliance & Department Breakdown`;

    // =========================================================================
    // PAGE 1: EXECUTIVE KPI & DEPARTMENT BREAKDOWNS
    // =========================================================================

    // Header Banner
    doc.fillColor(BRAND_BLUE).rect(45, 45, 6, 48).fill();
    doc.fillColor(PRIMARY_COLOR).font('Helvetica-Bold').fontSize(19).text(reportTitle, 60, 45);
    doc.fillColor(SECONDARY_COLOR).font('Helvetica').fontSize(9).text(reportSubtitle, 60, 68);
    doc.fillColor(MUTED_COLOR).fontSize(8).text(
      `Period: ${dateRangeText} • Scope: ${data.departmentName || 'All Departments'} (${data.totalEmployees} Members) • Exported: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`,
      60,
      81
    );

    doc.strokeColor(CARD_BORDER).lineWidth(0.8).moveTo(45, 105).lineTo(550, 105).stroke();

    let currentY = 118;

    // -------------------------------------------------------------------------
    // 1. Executive Summary Cards (Row 1)
    // -------------------------------------------------------------------------
    if (!data.sections || data.sections.summary !== false) {
      const cardW = 159;
      const cardH = 95;

      // Card 1: Wellbeing Index
      doc.roundedRect(45, currentY, cardW, cardH, 8).fillAndStroke(CARD_BG, CARD_BORDER);
      doc.fillColor(SECONDARY_COLOR).font('Helvetica-Bold').fontSize(7.5).text(
        isSpecificDept ? 'DEPT WELLBEING INDEX' : 'ORGANIZATION MOOD INDEX',
        55,
        currentY + 10
      );
      doc.fillColor(BRAND_BLUE).font('Helvetica-Bold').fontSize(24).text(`${data.moodIndex.toFixed(1)}`, 55, currentY + 22);

      const status = getMoodStatus(data.moodIndex);
      doc.fillColor(status.color).font('Helvetica-Bold').fontSize(7.5).text(status.label, 55, currentY + 54);

      doc.fillColor(SECONDARY_COLOR).font('Helvetica').fontSize(6.8);
      doc.text(`This Month: ${data.thisMonthAvg ? data.thisMonthAvg.toFixed(1) : '—'}`, 112, currentY + 22);
      doc.text(`Last Month: ${data.lastMonthAvg ? data.lastMonthAvg.toFixed(1) : '—'}`, 112, currentY + 36);
      doc.text(`Overall Avg: ${data.overallAvg ? data.overallAvg.toFixed(1) : '—'}`, 112, currentY + 50);

      // Card 2: Monthly Check-in Performance (The key user request!)
      doc.roundedRect(218, currentY, cardW, cardH, 8).fillAndStroke(CARD_BG, CARD_BORDER);
      doc.fillColor(SECONDARY_COLOR).font('Helvetica-Bold').fontSize(7.5).text('THIS MONTH CHECK-INS', 228, currentY + 10);
      doc.fillColor(data.monthComplianceRate >= 75 ? SUCCESS_GREEN : (data.monthComplianceRate >= 50 ? BALANCED_BLUE : WARNING_ORANGE))
        .font('Helvetica-Bold').fontSize(24).text(`${data.monthCheckinsTotal}/${data.monthExpectedTotal}`, 228, currentY + 22);
      
      doc.fillColor(PRIMARY_COLOR).font('Helvetica-Bold').fontSize(7.5).text(`${data.monthComplianceRate}% Monthly Compliance`, 228, currentY + 54);
      doc.fillColor(MUTED_COLOR).font('Helvetica').fontSize(6.8).text(`${data.monthActiveEmployees} of ${data.totalEmployees} Employees Active`, 228, currentY + 68);

      // Card 3: Total Submissions & Period Coverage
      doc.roundedRect(391, currentY, cardW, cardH, 8).fillAndStroke(CARD_BG, CARD_BORDER);
      doc.fillColor(SECONDARY_COLOR).font('Helvetica-Bold').fontSize(7.5).text('TOTAL PERIOD SUBMISSIONS', 401, currentY + 10);
      doc.fillColor(PRIMARY_COLOR).font('Helvetica-Bold').fontSize(24).text(`${data.checkinsCount}`, 401, currentY + 22);
      doc.fillColor(PRIMARY_COLOR).font('Helvetica-Bold').fontSize(7.5).text(`${data.participationRate}% Period Participation`, 401, currentY + 54);
      doc.fillColor(MUTED_COLOR).font('Helvetica').fontSize(6.8).text(`${data.totalEmployees} Total Headcount`, 401, currentY + 68);

      currentY += cardH + 20;
    }

    // -------------------------------------------------------------------------
    // 2. Department Breakdown Table (Spaced generously with NO overlaps)
    // -------------------------------------------------------------------------
    if (!data.sections || data.sections.departments !== false) {
      doc.fillColor(PRIMARY_COLOR).font('Helvetica-Bold').fontSize(11).text('Departmental Check-in & Rating Breakdown', 45, currentY);
      doc.fillColor(SECONDARY_COLOR).font('Helvetica').fontSize(7.5).text('Monthly check-in compliance, headcount, and longitudinal ratings across departments', 45, currentY + 13);
      currentY += 26;

      // Table Header Row
      const tblH = 18;
      doc.fillColor(CARD_BG).rect(45, currentY, 505, tblH).fill();
      doc.fillColor(SECONDARY_COLOR).font('Helvetica-Bold').fontSize(7.5);
      doc.text('Department', 55, currentY + 5);
      doc.text('Headcount', 170, currentY + 5);
      doc.text('This Month Check-ins', 230, currentY + 5);
      doc.text('This Month', 340, currentY + 5);
      doc.text('Last Month', 410, currentY + 5);
      doc.text('Overall Avg', 480, currentY + 5);
      doc.strokeColor(CARD_BORDER).lineWidth(0.8).moveTo(45, currentY + tblH).lineTo(550, currentY + tblH).stroke();
      currentY += tblH + 1;

      const deptList = data.departments || [];
      if (deptList.length === 0) {
        doc.fillColor(MUTED_COLOR).font('Helvetica').fontSize(8).text('No department check-in records available.', 55, currentY + 6);
        currentY += 20;
      } else {
        deptList.forEach((dept, index) => {
          // If page overflow would occur, start a clean page
          if (currentY > 740) {
            doc.addPage();
            currentY = 50;
            // Draw continued header
            doc.fillColor(CARD_BG).rect(45, currentY, 505, tblH).fill();
            doc.fillColor(SECONDARY_COLOR).font('Helvetica-Bold').fontSize(7.5);
            doc.text('Department (Continued)', 55, currentY + 5);
            doc.text('Headcount', 170, currentY + 5);
            doc.text('This Month Check-ins', 230, currentY + 5);
            doc.text('This Month', 340, currentY + 5);
            doc.text('Last Month', 410, currentY + 5);
            doc.text('Overall Avg', 480, currentY + 5);
            doc.strokeColor(CARD_BORDER).lineWidth(0.8).moveTo(45, currentY + tblH).lineTo(550, currentY + tblH).stroke();
            currentY += tblH + 1;
          }

          if (index % 2 === 0) {
            doc.fillColor('#fafafa').rect(45, currentY, 505, 17).fill();
          }

          // Department Name
          doc.fillColor(PRIMARY_COLOR).font('Helvetica-Bold').fontSize(8).text(dept.name, 55, currentY + 4, { width: 110, lineBreak: false });
          // Headcount
          doc.fillColor(SECONDARY_COLOR).font('Helvetica').fontSize(7.5).text(`${dept.headcount} members`, 170, currentY + 4);
          
          // This Month Check-ins with compliance %
          const compText = `${dept.thisMonthCheckins}/${dept.expectedCheckins} (${dept.complianceRate}%)`;
          const compColor = dept.complianceRate >= 75 ? SUCCESS_GREEN : (dept.complianceRate >= 50 ? BALANCED_BLUE : WARNING_ORANGE);
          doc.fillColor(compColor).font('Helvetica-Bold').fontSize(7.5).text(compText, 230, currentY + 4);

          // This Month Avg
          doc.fillColor(BRAND_BLUE).font('Helvetica-Bold').fontSize(7.5).text(dept.thisMonthAvg ? dept.thisMonthAvg.toFixed(1) : '—', 340, currentY + 4);
          // Last Month Avg
          doc.fillColor(PRIMARY_COLOR).font('Helvetica').fontSize(7.5).text(dept.lastMonthAvg ? dept.lastMonthAvg.toFixed(1) : '—', 410, currentY + 4);
          // Overall Avg
          doc.fillColor(PRIMARY_COLOR).font('Helvetica-Bold').fontSize(7.5).text(dept.overallAvg ? dept.overallAvg.toFixed(1) : '—', 480, currentY + 4);

          currentY += 17;
        });
      }

      currentY += 15;
    }

    // -------------------------------------------------------------------------
    // 3. Most Logged Wellbeing Score Section
    // -------------------------------------------------------------------------
    if (currentY <= 670 && (!data.sections || data.sections.summary !== false)) {
      doc.strokeColor(CARD_BORDER).lineWidth(0.8).moveTo(45, currentY).lineTo(550, currentY).stroke();
      currentY += 12;

      let maxEntry = data.distribution && data.distribution.length > 0 ? data.distribution[0] : null;
      if (data.distribution) {
        data.distribution.forEach((item) => {
          if (maxEntry && item.count > maxEntry.count) maxEntry = item;
        });
      }

      doc.fillColor(PRIMARY_COLOR).font('Helvetica-Bold').fontSize(10).text('Most Logged Wellbeing Score', 45, currentY);
      doc.fillColor(SECONDARY_COLOR).font('Helvetica').fontSize(7.5).text('The individual rating number logged most frequently across check-in submissions', 45, currentY + 12);
      currentY += 24;

      if (!maxEntry || maxEntry.count === 0) {
        doc.fillColor(MUTED_COLOR).font('Helvetica').fontSize(8).text('No check-in submissions recorded in this period.', 45, currentY);
        currentY += 18;
      } else {
        doc.roundedRect(45, currentY, 505, 36, 6).fillAndStroke(CARD_BG, CARD_BORDER);
        doc.fillColor(BRAND_BLUE).font('Helvetica-Bold').fontSize(18).text(`${maxEntry.name} / 10`, 55, currentY + 8);
        doc.fillColor(PRIMARY_COLOR).font('Helvetica-Bold').fontSize(8.5).text(`Recorded ${maxEntry.count} times`, 125, currentY + 8);
        doc.fillColor(SECONDARY_COLOR).font('Helvetica').fontSize(7.5).text('This rating represents the dominant weekly sentiment across all completed check-ins.', 125, currentY + 20);
        currentY += 46;
      }
    }

    // =========================================================================
    // PAGE 2: TRENDS, DRIVERS & DETRACTORS
    // =========================================================================
    if (!data.sections || data.sections.trends !== false) {
      doc.addPage();

      doc.fillColor(BRAND_BLUE).rect(45, 45, 6, 26).fill();
      doc.fillColor(PRIMARY_COLOR).font('Helvetica-Bold').fontSize(16).text('Trends, Boosters & Stressors', 60, 45);
      doc.fillColor(SECONDARY_COLOR).font('Helvetica').fontSize(8.5).text(
        isSpecificDept
          ? `${data.departmentName} weekly trajectory and impact factors`
          : 'Longitudinal organizational mood trajectory and key impact drivers',
        60,
        62
      );

      doc.strokeColor(CARD_BORDER).lineWidth(0.8).moveTo(45, 82).lineTo(550, 82).stroke();

      let p2Y = 95;
      doc.fillColor(PRIMARY_COLOR).font('Helvetica-Bold').fontSize(10).text('Weekly Mood Trajectory', 45, p2Y);
      doc.fillColor(MUTED_COLOR).font('Helvetica').fontSize(7.5).text('Aggregated weekly rating averages across all completed employee submissions', 45, p2Y + 12);
      p2Y += 26;

      drawTrendLineChart(doc, 45, p2Y, 505, 120, data.trends || [], BRAND_BLUE);
      p2Y += 145;

      // Positive Drivers vs Negative Stressors (Side-by-side cards)
      doc.strokeColor(CARD_BORDER).lineWidth(0.8).moveTo(45, p2Y).lineTo(550, p2Y).stroke();
      p2Y += 14;

      doc.fillColor(PRIMARY_COLOR).font('Helvetica-Bold').fontSize(10.5).text('Workplace Impact Drivers & Stressors', 45, p2Y);
      doc.fillColor(SECONDARY_COLOR).font('Helvetica').fontSize(7.5).text('Factors with the strongest positive (Boosters) and negative (Stressors) correlation to wellbeing ratings', 45, p2Y + 12);
      p2Y += 26;

      const colW = 245;
      const boxH = 135;

      // Left Box: Positive Drivers
      doc.roundedRect(45, p2Y, colW, boxH, 6).fillAndStroke(SUCCESS_LIGHT, '#a7f3d0');
      doc.fillColor(SUCCESS_GREEN).font('Helvetica-Bold').fontSize(9).text('Positive Drivers (Boosters)', 55, p2Y + 10);
      doc.fillColor(SECONDARY_COLOR).font('Helvetica').fontSize(7).text('Associated with high wellbeing weeks (Mood >= 6.0)', 55, p2Y + 22);

      let dY = p2Y + 36;
      const positiveDrivers = (data.feelings || [])
        .filter((f) => f.moodCorrelation >= 6.0)
        .slice(0, 4)
        .concat(
          (data.contributors || [])
            .filter((c) => c.moodCorrelation >= 6.0)
            .slice(0, 4)
        );

      if (positiveDrivers.length === 0) {
        doc.fillColor(MUTED_COLOR).fontSize(7.5).text('Insufficient driver correlation records.', 55, dY);
      } else {
        positiveDrivers.slice(0, 5).forEach((item) => {
          doc.fillColor(PRIMARY_COLOR).font('Helvetica-Bold').fontSize(7.8).text(item.name, 55, dY);
          doc.fillColor(SUCCESS_GREEN).font('Helvetica-Bold').fontSize(7.2).text(`Avg: ${item.moodCorrelation.toFixed(1)} (${item.count} tags)`, 160, dY);
          dY += 17;
        });
      }

      // Right Box: Negative Detractors
      doc.roundedRect(305, p2Y, colW, boxH, 6).fillAndStroke(WARNING_LIGHT, '#fde68a');
      doc.fillColor(WARNING_ORANGE).font('Helvetica-Bold').fontSize(9).text('Workplace Stressors (Detractors)', 315, p2Y + 10);
      doc.fillColor(SECONDARY_COLOR).font('Helvetica').fontSize(7).text('Associated with low wellbeing weeks (Mood < 6.0)', 315, p2Y + 22);

      let sY = p2Y + 36;
      const negativeDetractors = (data.feelings || [])
        .filter((f) => f.moodCorrelation < 6.0)
        .slice(0, 4)
        .concat(
          (data.contributors || [])
            .filter((c) => c.moodCorrelation < 6.0)
            .slice(0, 4)
        );

      if (negativeDetractors.length === 0) {
        doc.fillColor(MUTED_COLOR).fontSize(7.5).text('No significant negative stressor correlation detected.', 315, sY);
      } else {
        negativeDetractors.slice(0, 5).forEach((item) => {
          doc.fillColor(PRIMARY_COLOR).font('Helvetica-Bold').fontSize(7.8).text(item.name, 315, sY);
          doc.fillColor(WARNING_ORANGE).font('Helvetica-Bold').fontSize(7.2).text(`Avg: ${item.moodCorrelation.toFixed(1)} (${item.count} tags)`, 420, sY);
          sY += 17;
        });
      }
    }

    // =========================================================================
    // PAGE 3+: EMPLOYEE DETAILS BY DEPARTMENT
    // (Explicitly showing: "their checkin how much for the month they have done")
    // =========================================================================
    if (!data.sections || data.sections.employees !== false) {
      if (data.employeeDetails && data.employeeDetails.length > 0) {
        type EmpList = NonNullable<typeof data.employeeDetails>;
        const byDept = data.employeeDetails.reduce((acc, emp) => {
          const d = emp.department || 'Unassigned';
          if (!acc[d]) acc[d] = [];
          acc[d].push(emp);
          return acc;
        }, {} as Record<string, EmpList>);

        const periods = data.reportPeriods || [];
        const maxCols = Math.min(periods.length, 4); // Show up to 4 historical check-in periods

        for (const dept of Object.keys(byDept).sort()) {
          doc.addPage();

          // Department Banner
          doc.fillColor(BRAND_BLUE).rect(45, 45, 6, 26).fill();
          doc.fillColor(PRIMARY_COLOR).font('Helvetica-Bold').fontSize(16).text(`Employee Details: ${dept}`, 60, 45);
          doc.fillColor(SECONDARY_COLOR).font('Helvetica').fontSize(8.5).text(
            `${byDept[dept].length} Total Team Members • Monthly Check-in Compliance & Historical Period Ratings`,
            60,
            62
          );

          doc.strokeColor(CARD_BORDER).lineWidth(0.8).moveTo(45, 80).lineTo(550, 80).stroke();

          let rowY = 92;

          const renderEmployeeTableHeader = (y: number) => {
            doc.fillColor(CARD_BG).rect(45, y, 505, 20).fill();
            doc.fillColor(SECONDARY_COLOR).font('Helvetica-Bold').fontSize(7.2);
            doc.text('Employee / Email', 55, y + 6);
            doc.text('Month Check-ins', 185, y + 6);
            doc.text('Month Avg', 270, y + 6);
            doc.text('Overall', 320, y + 6);

            // Period columns (newest to oldest or oldest to newest)
            const pStartX = 365;
            const pWidth = 180 / Math.max(1, maxCols);
            for (let i = 0; i < maxCols; i++) {
              const p = periods[i];
              const pLabel = p ? p.label.split(' - ')[0] : `P${i + 1}`;
              doc.text(pLabel, pStartX + i * pWidth, y + 6, { width: pWidth, align: 'center' });
            }

            doc.strokeColor(CARD_BORDER).lineWidth(0.8).moveTo(45, y + 20).lineTo(550, y + 20).stroke();
          };

          renderEmployeeTableHeader(rowY);
          rowY += 21;

          byDept[dept].forEach((emp, index) => {
            // Check for page break
            if (rowY > 735) {
              doc.addPage();
              doc.fillColor(BRAND_BLUE).rect(45, 45, 6, 20).fill();
              doc.fillColor(PRIMARY_COLOR).font('Helvetica-Bold').fontSize(13).text(`Employee Details: ${dept} (Continued)`, 60, 48);
              rowY = 75;
              renderEmployeeTableHeader(rowY);
              rowY += 21;
            }

            if (index % 2 === 0) {
              doc.fillColor('#fafafa').rect(45, rowY, 505, 19).fill();
            }

            // Employee Name & Email (Two lines inside cell for maximum clarity)
            doc.fillColor(PRIMARY_COLOR).font('Helvetica-Bold').fontSize(7.5).text(emp.name, 55, rowY + 2, { width: 125, lineBreak: false });
            doc.fillColor(MUTED_COLOR).font('Helvetica').fontSize(6.5).text(emp.email || '', 55, rowY + 11, { width: 125, lineBreak: false });

            // Month Check-ins: "how much for the month they have done"
            const chkText = `${emp.thisMonthCheckins}/${emp.expectedThisMonth} (${emp.monthlyCompliance}%)`;
            const chkColor = emp.monthlyCompliance >= 75
              ? SUCCESS_GREEN
              : emp.monthlyCompliance >= 50
              ? BALANCED_BLUE
              : emp.monthlyCompliance > 0
              ? WARNING_ORANGE
              : DANGER_RED;
            doc.fillColor(chkColor).font('Helvetica-Bold').fontSize(7.5).text(chkText, 185, rowY + 5);

            // Month Avg Mood
            doc.fillColor(BRAND_BLUE).font('Helvetica-Bold').fontSize(7.5).text(emp.thisMonthAvg ? emp.thisMonthAvg.toFixed(1) : '—', 270, rowY + 5);

            // Overall Avg Mood
            doc.fillColor(PRIMARY_COLOR).font('Helvetica').fontSize(7.5).text(emp.overallAvg ? emp.overallAvg.toFixed(1) : '—', 320, rowY + 5);

            // Period Historical Scores
            const pStartX = 365;
            const pWidth = 180 / Math.max(1, maxCols);
            for (let i = 0; i < maxCols; i++) {
              const score = emp.scores && emp.scores[i] !== undefined ? emp.scores[i] : null;
              const cellX = pStartX + i * pWidth;
              if (score !== null) {
                const sColor = score >= 7.5 ? SUCCESS_GREEN : (score >= 6.0 ? BALANCED_BLUE : WARNING_ORANGE);
                doc.fillColor(sColor).font('Helvetica-Bold').fontSize(7.5).text(score.toString(), cellX, rowY + 5, { width: pWidth, align: 'center' });
              } else {
                doc.fillColor(DANGER_RED).font('Helvetica').fontSize(7.5).text('—', cellX, rowY + 5, { width: pWidth, align: 'center' });
              }
            }

            rowY += 19;
          });
        }
      }
    }

    // Apply running dynamic footers across all generated pages
    applyPageFooters(doc);
    doc.end();
  });
};
