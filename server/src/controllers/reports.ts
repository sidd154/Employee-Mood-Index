import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { query } from '../config/db';
import { generateEmployeeReportPDF, generateAdminReportPDF } from '../services/pdf';
import { sendEmail, buildEmailTemplate } from '../services/email';
import { logAudit } from '../utils/audit';

// Formats human-readable range labels in Indian format
export function getRangeLabel(range?: string, start?: string, end?: string): string {
  if (start && end) {
    const sObj = new Date(start);
    const eObj = new Date(end);
    if (!isNaN(sObj.getTime()) && !isNaN(eObj.getTime())) {
      // Check if it represents an entire calendar month
      const isStartOfMonth = sObj.getDate() === 1 || sObj.getUTCDate() === 1;
      const lastDayOfEndMonth = new Date(eObj.getFullYear(), eObj.getMonth() + 1, 0).getDate();
      const isEndOfMonth = Math.abs(eObj.getDate() - lastDayOfEndMonth) <= 1 || Math.abs(eObj.getUTCDate() - lastDayOfEndMonth) <= 1;
      const isSameMonthAndYear = sObj.getMonth() === eObj.getMonth() && sObj.getFullYear() === eObj.getFullYear();

      if (isStartOfMonth && isEndOfMonth && isSameMonthAndYear) {
        return sObj.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      }

      const sStr = sObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      const eStr = eObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      return `${sStr} – ${eStr}`;
    }
  }

  if (range === '7d') return 'Last 7 Days';
  if (range === '30d') return 'Last 30 Days';
  if (range === '90d') return 'Last 90 Days';
  if (range === 'month') {
    return new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  }
  if (range === 'ytd') {
    return `Year to Date (${new Date().getFullYear()})`;
  }
  return `Year to Date (${new Date().getFullYear()})`;
}

// Computes how many weekly check-in cycles have started in a given month up to today
export function getExpectedCheckinsInMonth(date: Date = new Date(), startDayOfWeek: number = 5): number {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const now = new Date();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
  const evalEnd = isCurrentMonth ? now : lastDay;

  let count = 0;
  const cur = new Date(firstDay);
  while (cur <= evalEnd) {
    if (cur.getDay() === startDayOfWeek) {
      count++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return Math.max(1, count);
}

// SQL date filter builder
export function getDateFilter(range?: string, start?: string, end?: string, tableAlias: string = 'm', paramStart: number = 1) {
  if (start && end) {
    const sObj = new Date(start);
    const eObj = new Date(end);
    if (!isNaN(sObj.getTime()) && !isNaN(eObj.getTime())) {
      return {
        clause: `AND ${tableAlias}.created_at >= $${paramStart} AND ${tableAlias}.created_at <= $${paramStart + 1}`,
        values: [sObj, eObj],
      };
    }
  }

  if (range === '7d') {
    return { clause: `AND ${tableAlias}.created_at >= NOW() - INTERVAL '7 days'`, values: [] };
  }
  if (range === '30d') {
    return { clause: `AND ${tableAlias}.created_at >= NOW() - INTERVAL '30 days'`, values: [] };
  }
  if (range === '90d') {
    return { clause: `AND ${tableAlias}.created_at >= NOW() - INTERVAL '90 days'`, values: [] };
  }
  if (range === 'month') {
    return { clause: `AND ${tableAlias}.created_at >= DATE_TRUNC('month', NOW())`, values: [] };
  }
  // Default YTD
  return { clause: `AND ${tableAlias}.created_at >= DATE_TRUNC('year', NOW())`, values: [] };
}

// --------------------------------------------------------------------------
// 1. EMPLOYEE PERSONAL REPORT CONTROLLER
// --------------------------------------------------------------------------
export const buildAndEmailEmployeeReport = async (
  targetUserId: string,
  recipientEmail: string,
  range: string,
  startDate?: string,
  endDate?: string
) => {
  try {
    const rangeLabel = getRangeLabel(range, startDate, endDate);
    const filter = getDateFilter(range, startDate, endDate, 'm', 2);

  // Fetch user details & department
  const userProfile = await query(
    `SELECT u.full_name, u.email, u.department_id, COALESCE(d.name, 'General') as department_name 
     FROM users u
     LEFT JOIN departments d ON u.department_id = d.id
     WHERE u.id = $1`,
    [targetUserId]
  );

    if (userProfile.rows.length === 0) {
      throw new Error('User not found');
    }

    const employeeName = userProfile.rows[0].full_name || 'Employee';
    const employeeEmail = userProfile.rows[0].email || recipientEmail;
    const departmentId = userProfile.rows[0].department_id;
    const departmentName = userProfile.rows[0].department_name;

    // Period mood score
    const moodRes = await query(
      `SELECT AVG(mood_score) as avg_score FROM mood_entries m 
       WHERE m.user_id = $1 ${filter.clause}`,
      [targetUserId, ...filter.values]
    );
    const avgScore = parseFloat(moodRes.rows[0]?.avg_score || '0');
    const moodIndex = avgScore > 0 ? parseFloat(avgScore.toFixed(1)) : 7.0;

    // Monthly stats for this employee
    const targetDate = endDate ? new Date(endDate) : new Date();
    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth();
    const targetMonthStart = new Date(targetYear, targetMonth, 1);
    const targetMonthEnd = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);
    const prevMonthStart = new Date(targetYear, targetMonth - 1, 1);
    const prevMonthEnd = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

    const empStatsRes = await query(
      `SELECT 
         ROUND(AVG(CASE WHEN created_at >= $2 AND created_at <= $3 THEN mood_score END), 1) as this_month_avg,
         ROUND(AVG(CASE WHEN created_at >= $4 AND created_at <= $5 THEN mood_score END), 1) as last_month_avg,
         ROUND(AVG(mood_score), 1) as overall_avg,
         COUNT(CASE WHEN created_at >= $2 AND created_at <= $3 THEN id END) as this_month_checkins
       FROM mood_entries
       WHERE user_id = $1`,
      [targetUserId, targetMonthStart, targetMonthEnd, prevMonthStart, prevMonthEnd]
    );
    const empStats = empStatsRes.rows[0];
    const thisMonthAvg = parseFloat(empStats?.this_month_avg || '0') || null;
    const lastMonthAvg = parseFloat(empStats?.last_month_avg || '0') || null;
    const overallAvg = parseFloat(empStats?.overall_avg || '0') || null;
    const thisMonthCheckins = parseInt(empStats?.this_month_checkins || '0', 10);

    const expectedCheckinsThisMonth = getExpectedCheckinsInMonth(targetDate);
    const monthlyCompliance = Math.min(100, Math.round((thisMonthCheckins / expectedCheckinsThisMonth) * 100));

    // Score distribution (1 to 10)
    const distRes = await query(
      `SELECT mood_score, COUNT(*) as count FROM mood_entries m 
       WHERE m.user_id = $1 ${filter.clause}
       GROUP BY mood_score`,
      [targetUserId, ...filter.values]
    );
    const distribution = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((score) => {
      const row = distRes.rows.find((r) => parseInt(r.mood_score) === score);
      return {
        score,
        name: String(score),
        count: parseInt(row?.count || '0', 10),
      };
    });

    // Employee Weekly Trends
    const trendsRes = await query(
      `SELECT DATE_TRUNC('week', m.created_at)::date as date, ROUND(AVG(mood_score), 1) as score
       FROM mood_entries m 
       WHERE m.user_id = $1 ${filter.clause}
       GROUP BY DATE_TRUNC('week', m.created_at)::date
       ORDER BY date ASC`,
      [targetUserId, ...filter.values]
    );

    // Top Feelings
    const feelingsRes = await query(
      `SELECT f.name, COUNT(*) as count 
       FROM entry_feelings ef
       JOIN feelings f ON ef.feeling_id = f.id
       JOIN mood_entries m ON ef.entry_id = m.id
       WHERE m.user_id = $1 ${filter.clause}
       GROUP BY f.name
       ORDER BY count DESC LIMIT 5`,
      [targetUserId, ...filter.values]
    );

    // Top Contributors
    const contributorsRes = await query(
      `SELECT c.name, COUNT(*) as count 
       FROM entry_contributors ec
       JOIN contributors c ON ec.contributor_id = c.id
       JOIN mood_entries m ON ec.entry_id = m.id
       WHERE m.user_id = $1 ${filter.clause}
       GROUP BY c.name
       ORDER BY count DESC LIMIT 5`,
      [targetUserId, ...filter.values]
    );

    // Department Benchmarks & Aggregated Context
    let departmentMoodIndex = null;
    let departmentThisMonthAvg = null;
    let departmentLastMonthAvg = null;
    let departmentOverallAvg = null;
    let departmentHeadcount = 1;
    let departmentThisMonthCheckins = 0;
    let departmentMonthlyParticipation = 0;
    let comparisonHistory: { periodLabel: string; userScore: number | null; deptAvg: number | null }[] = [];

    if (departmentId) {
      const deptMoodRes = await query(
        `SELECT 
           ROUND(AVG(m.mood_score), 1) as range_avg,
           ROUND(AVG(CASE WHEN m.created_at >= $2 AND m.created_at <= $3 THEN m.mood_score END), 1) as this_month_avg,
           ROUND(AVG(CASE WHEN m.created_at >= $4 AND m.created_at <= $5 THEN m.mood_score END), 1) as last_month_avg,
           ROUND(AVG(m.mood_score), 1) as overall_avg,
           COUNT(DISTINCT u.id) as headcount,
           COUNT(CASE WHEN m.created_at >= $2 AND m.created_at <= $3 THEN m.id END) as month_checkins
         FROM users u
         LEFT JOIN mood_entries m ON m.user_id = u.id
         WHERE u.department_id = $1 AND u.role_id = (SELECT id FROM roles WHERE name = 'employee')`,
        [departmentId, targetMonthStart, targetMonthEnd, prevMonthStart, prevMonthEnd]
      );

      const dRow = deptMoodRes.rows[0];
      if (dRow) {
        departmentMoodIndex = parseFloat(dRow.range_avg || '7.0');
        departmentThisMonthAvg = parseFloat(dRow.this_month_avg || '0') || null;
        departmentLastMonthAvg = parseFloat(dRow.last_month_avg || '0') || null;
        departmentOverallAvg = parseFloat(dRow.overall_avg || '0') || null;
        departmentHeadcount = Math.max(1, parseInt(dRow.headcount || '1', 10));
        departmentThisMonthCheckins = parseInt(dRow.month_checkins || '0', 10);
        departmentMonthlyParticipation = Math.min(100, Math.round((departmentThisMonthCheckins / (departmentHeadcount * expectedCheckinsThisMonth)) * 100));
      }

      // Comparison History: weekly ratings for user vs department
      const compRes = await query(
        `SELECT 
           DATE_TRUNC('week', m.created_at)::date as date,
           ROUND(AVG(CASE WHEN m.user_id = $1 THEN m.mood_score END), 1) as user_score,
           ROUND(AVG(m.mood_score), 1) as dept_avg
         FROM mood_entries m
         JOIN users u ON m.user_id = u.id
         WHERE u.department_id = $2 AND m.created_at >= NOW() - INTERVAL '8 weeks'
         GROUP BY DATE_TRUNC('week', m.created_at)::date
         ORDER BY date DESC LIMIT 5`,
        [targetUserId, departmentId]
      );

      comparisonHistory = compRes.rows.map((row) => {
        const dObj = new Date(row.date);
        const endWk = new Date(dObj);
        endWk.setDate(endWk.getDate() + 6);
        const label = `${dObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} – ${endWk.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`;
        return {
          periodLabel: label,
          userScore: row.user_score ? parseFloat(row.user_score) : null,
          deptAvg: row.dept_avg ? parseFloat(row.dept_avg) : null,
        };
      });
    }

    const pdfBuffer = await generateEmployeeReportPDF(employeeName, employeeEmail, rangeLabel, {
      moodIndex,
      thisMonthAvg,
      lastMonthAvg,
      overallAvg,
      thisMonthCheckins,
      expectedCheckinsThisMonth,
      monthlyCompliance,
      distribution,
      trends: trendsRes.rows.map((r) => ({ date: r.date, score: parseFloat(r.score) })),
      feelings: feelingsRes.rows.map((r) => ({ name: r.name, count: parseInt(r.count, 10) })),
      contributors: contributorsRes.rows.map((r) => ({ name: r.name, count: parseInt(r.count, 10) })),
      departmentName,
      departmentMoodIndex,
      departmentThisMonthAvg,
      departmentLastMonthAvg,
      departmentOverallAvg,
      departmentHeadcount,
      departmentThisMonthCheckins,
      departmentExpectedCheckinsThisMonth: departmentHeadcount * expectedCheckinsThisMonth,
      departmentMonthlyParticipation,
      comparisonHistory,
    });

    const targetMonthName = targetMonthStart.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    const targetMonthShort = targetMonthStart.toLocaleDateString('en-IN', { month: 'short' });
    const safeEmpName = employeeName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeMonth = targetMonthShort + '_' + targetYear;
    const filename = `${safeEmpName}_Wellbeing_Report_${safeMonth}.pdf`;

    await sendEmail({
      to: recipientEmail,
      subject: `Wellbeing Report: ${employeeName} — ${targetMonthName} (${rangeLabel})`,
      html: buildEmailTemplate(
        'Your Wellbeing & Benchmark Report',
        `
        <p>Hi ${employeeName},</p>
        <p>The requested wellbeing insights and benchmark report for <strong>${employeeName}</strong> for <strong>${targetMonthName}</strong> (${rangeLabel}) is ready.</p>
        <p>Please find the executive PDF report attached with your check-in analytics and department standings.</p>
      `
      ),
      emailType: 'Report',
      attachments: [
        {
          content: pdfBuffer,
          filename,
        },
      ],
    });

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const validUserId = uuidRegex.test(targetUserId) ? targetUserId : null;
    if (validUserId) {
      try {
        await query(
          `INSERT INTO reports (user_id, type, date_range, file_url) VALUES ($1, 'employee', $2, $3)`,
          [validUserId, rangeLabel, filename]
        );
        await logAudit(validUserId, 'employee_report_sent', { range, rangeLabel });
      } catch (dbErr) {
        console.warn('Could not record employee report log:', dbErr);
      }
    }

    return { pdfBuffer, filename };
  } catch (error: any) {
    console.error('Build employee report error:', error);
    throw error;
  }
};

export const requestEmployeeReport = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const userId = req.user.id;
    const userEmail = req.user.email;
    const { range = 'ytd', startDate, endDate } = req.query;

    await buildAndEmailEmployeeReport(
      userId,
      userEmail,
      range as string,
      startDate as string | undefined,
      endDate as string | undefined
    );

    res.json({ message: 'Personal wellbeing report generated and sent to your email successfully.' });
  } catch (error: any) {
    console.error('Request employee report error:', error);
    res.status(500).json({ error: 'Internal server error while generating employee report' });
  }
};

// --------------------------------------------------------------------------
// 2. ADMIN / ORGANIZATIONAL REPORT CONTROLLER
// --------------------------------------------------------------------------
export const buildAndEmailAdminReport = async (
  userId: string,
  userEmail: string,
  range: string,
  startDate?: string,
  endDate?: string,
  exportType: 'pdf' | 'csv' = 'pdf',
  groupBy: 'weeks' | 'months' = 'weeks',
  options: any = null
) => {
  // If the admin specifically requested an individual employee report:
  if (options && (options.departments === 'employee' || options.departments === 'specific_employee') && options.employeeId) {
    await buildAndEmailEmployeeReport(options.employeeId, userEmail, range, startDate, endDate);
    return;
  }

  const rangeLabel = getRangeLabel(range, startDate, endDate);
  const filter = getDateFilter(range, startDate, endDate, 'm');

  const isSpecificDept = options && options.departments === 'specific' && Boolean(options.deptId);
  const deptName = isSpecificDept ? options.deptId : undefined;

  // Department filter clauses
  let deptFilterUsers = '';
  let deptFilterEntries = '';
  if (isSpecificDept) {
    deptFilterUsers = ` AND u.department_id = (SELECT id FROM departments WHERE name = '${options.deptId}')`;
    deptFilterEntries = ` AND u.department_id = (SELECT id FROM departments WHERE name = '${options.deptId}')`;
  }

  // 1. Mood Index (Period average scoped to department or company)
  const moodRes = await query(
    `SELECT AVG(m.mood_score) as avg_score 
     FROM mood_entries m 
     JOIN users u ON m.user_id = u.id 
     WHERE 1=1 ${filter.clause}${deptFilterEntries}`,
    filter.values
  );
  const avgScore = parseFloat(moodRes.rows[0]?.avg_score || '0');
  const moodIndex = avgScore > 0 ? parseFloat(avgScore.toFixed(1)) : 7.0;

  // Compute target month boundaries (supports any past or current month!)
  const targetDate = endDate ? new Date(endDate) : new Date();
  const targetYear = targetDate.getFullYear();
  const targetMonth = targetDate.getMonth();

  const targetMonthStart = new Date(targetYear, targetMonth, 1);
  const targetMonthEnd = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);
  const prevMonthStart = new Date(targetYear, targetMonth - 1, 1);
  const prevMonthEnd = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

  const targetMonthName = targetMonthStart.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const targetMonthShort = targetMonthStart.toLocaleDateString('en-IN', { month: 'short' });
  const prevMonthName = prevMonthStart.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const prevMonthShort = prevMonthStart.toLocaleDateString('en-IN', { month: 'short' });

  // 2. Comparison averages: This Month / Last Month / Overall
  const compStatsRes = await query(
    `SELECT 
       ROUND(AVG(CASE WHEN m.created_at >= $1 AND m.created_at <= $2 THEN m.mood_score END), 1) as this_month_avg,
       ROUND(AVG(CASE WHEN m.created_at >= $3 AND m.created_at <= $4 THEN m.mood_score END), 1) as last_month_avg,
       ROUND(AVG(m.mood_score), 1) as overall_avg
     FROM mood_entries m
     JOIN users u ON m.user_id = u.id
     WHERE 1=1 ${deptFilterEntries}`,
    [targetMonthStart, targetMonthEnd, prevMonthStart, prevMonthEnd]
  );
  const compStats = compStatsRes.rows[0];
  const thisMonthAvg = parseFloat(compStats?.this_month_avg || '0') || null;
  const lastMonthAvg = parseFloat(compStats?.last_month_avg || '0') || null;
  const overallAvg = parseFloat(compStats?.overall_avg || '0') || null;

  // 3. Total Checkins in Period
  const checkinCountRes = await query(
    `SELECT COUNT(*) as count 
     FROM mood_entries m 
     JOIN users u ON m.user_id = u.id 
     WHERE 1=1 ${filter.clause}${deptFilterEntries}`,
    filter.values
  );
  const checkinsCount = parseInt(checkinCountRes.rows[0]?.count || '0', 10);

  // 4. Total Employees Scoped
  const empCountRes = await query(
    `SELECT COUNT(*) as count 
     FROM users u 
     JOIN roles r ON u.role_id = r.id 
     WHERE r.name = 'employee' AND u.full_name IS NOT NULL${deptFilterUsers}`
  );
  const totalEmployees = Math.max(1, parseInt(empCountRes.rows[0]?.count || '0', 10));

  // 5. Monthly Check-in Performance for the target month
  const expectedCheckinsThisMonth = getExpectedCheckinsInMonth(targetDate);
  const monthExpectedTotal = totalEmployees * expectedCheckinsThisMonth;

  const monthlyCheckinRes = await query(
    `SELECT 
       COUNT(m.id) as month_checkins,
       COUNT(DISTINCT m.user_id) as active_users
     FROM mood_entries m
     JOIN users u ON m.user_id = u.id
     WHERE m.created_at >= $1 AND m.created_at <= $2 ${deptFilterEntries}`,
    [targetMonthStart, targetMonthEnd]
  );
  const monthCheckinsTotal = parseInt(monthlyCheckinRes.rows[0]?.month_checkins || '0', 10);
  const monthActiveEmployees = parseInt(monthlyCheckinRes.rows[0]?.active_users || '0', 10);
  const monthComplianceRate = monthExpectedTotal > 0 ? Math.min(100, Math.round((monthCheckinsTotal / monthExpectedTotal) * 100)) : 0;

  // Expected checkins in selected period
  let expectedInPeriod = 4;
  if (range === '7d') expectedInPeriod = 1;
  else if (range === '30d') expectedInPeriod = 4;
  else if (range === '90d') expectedInPeriod = 12;
  else if (startDate && endDate) {
    const diffDays = Math.ceil(Math.abs(new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
    expectedInPeriod = Math.max(1, Math.round(diffDays / 7));
  }
  const participationRate = Math.min(100, Math.round((checkinsCount / (totalEmployees * expectedInPeriod)) * 100));

  // 6. Score Distribution (1-10)
  const distRes = await query(
    `SELECT m.mood_score, COUNT(*) as count 
     FROM mood_entries m 
     JOIN users u ON m.user_id = u.id 
     WHERE 1=1 ${filter.clause}${deptFilterEntries}
     GROUP BY mood_score`,
    filter.values
  );
  const distribution = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((score) => {
    const row = distRes.rows.find((r) => parseInt(r.mood_score) === score);
    return {
      score,
      name: String(score),
      count: parseInt(row?.count || '0', 10),
    };
  });

  // 7. Mood Trends
  const trendsRes = await query(
    `SELECT DATE_TRUNC('week', m.created_at)::date as date, ROUND(AVG(mood_score), 1) as score
     FROM mood_entries m
     JOIN users u ON m.user_id = u.id
     WHERE 1=1 ${filter.clause}${deptFilterEntries}
     GROUP BY DATE_TRUNC('week', m.created_at)::date
     ORDER BY date ASC`,
    filter.values
  );

  // 8. Department Breakdown with Monthly Check-ins for target month!
  const deptWhere = isSpecificDept ? `WHERE d.name = '${options.deptId}'` : '';
  const deptStatsRes = await query(
    `SELECT 
       d.name,
       COUNT(DISTINCT u.id) as headcount,
       COUNT(CASE WHEN m.created_at >= $1 AND m.created_at <= $2 THEN m.id END) as this_month_checkins,
       COUNT(DISTINCT CASE WHEN m.created_at >= $1 AND m.created_at <= $2 THEN u.id END) as active_members,
       ROUND(AVG(CASE WHEN m.created_at >= $1 AND m.created_at <= $2 THEN m.mood_score END), 1) as this_month_avg,
       ROUND(AVG(CASE WHEN m.created_at >= $3 AND m.created_at <= $4 THEN m.mood_score END), 1) as last_month_avg,
       ROUND(AVG(m.mood_score), 1) as overall_avg
     FROM departments d
     LEFT JOIN users u ON u.department_id = d.id AND u.role_id = (SELECT id FROM roles WHERE name = 'employee')
     LEFT JOIN mood_entries m ON m.user_id = u.id
     ${deptWhere}
     GROUP BY d.name
     ORDER BY d.name ASC`,
    [targetMonthStart, targetMonthEnd, prevMonthStart, prevMonthEnd]
  );

  const departments = deptStatsRes.rows.map((row) => {
    const headcount = parseInt(row.headcount || '0', 10);
    const thisMonthCheckins = parseInt(row.this_month_checkins || '0', 10);
    const expectedCheckins = headcount * expectedCheckinsThisMonth;
    const complianceRate = expectedCheckins > 0 ? Math.min(100, Math.round((thisMonthCheckins / expectedCheckins) * 100)) : 0;

    return {
      name: row.name,
      headcount,
      thisMonthCheckins,
      expectedCheckins,
      complianceRate,
      activeMembers: parseInt(row.active_members || '0', 10),
      thisMonthAvg: parseFloat(row.this_month_avg || '0') || null,
      lastMonthAvg: parseFloat(row.last_month_avg || '0') || null,
      overallAvg: parseFloat(row.overall_avg || '0') || null,
    };
  });

  // 9. Feelings & Contributors
  const feelRes = await query(
    `SELECT 
       f.name,
       COUNT(ef.feeling_id) as count,
       ROUND(AVG(m.mood_score), 1) as avg_mood
     FROM entry_feelings ef
     JOIN feelings f ON ef.feeling_id = f.id
     JOIN mood_entries m ON ef.entry_id = m.id
     JOIN users u ON m.user_id = u.id
     WHERE 1=1 ${filter.clause}${deptFilterEntries}
     GROUP BY f.name
     ORDER BY count DESC LIMIT 8`,
    filter.values
  );

  const contRes = await query(
    `SELECT 
       c.name,
       COUNT(ec.contributor_id) as count,
       ROUND(AVG(m.mood_score), 1) as avg_mood
     FROM entry_contributors ec
     JOIN contributors c ON ec.contributor_id = c.id
     JOIN mood_entries m ON ec.entry_id = m.id
     JOIN users u ON m.user_id = u.id
     WHERE 1=1 ${filter.clause}${deptFilterEntries}
     GROUP BY c.name
     ORDER BY count DESC LIMIT 8`,
    filter.values
  );

  // 10. Generate Historical Report Periods (for table headers and columns)
  const now = endDate ? new Date(endDate) : new Date();
  const generatePeriods = (count = 4) => {
    const list = [];
    if (groupBy === 'months') {
      for (let i = 0; i < count; i++) {
        const d = new Date(targetYear, targetMonth - i, 1);
        const startM = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
        const endM = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
        list.push({
          label: startM.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
          start: startM.toISOString(),
          end: endM.toISOString(),
        });
      }
      return list;
    }

    const curWeek = new Date(now);
    const day = curWeek.getDay();
    let diff = 0;
    if (day === 5) diff = 0;
    else if (day === 6) diff = -1;
    else diff = -(day + 2);

    curWeek.setDate(curWeek.getDate() + diff);
    curWeek.setHours(0, 0, 0, 0);

    for (let i = 0; i < count; i++) {
      const startWk = new Date(curWeek);
      startWk.setDate(startWk.getDate() - i * 7);
      const endWk = new Date(startWk);
      endWk.setDate(endWk.getDate() + 6);
      endWk.setHours(23, 59, 59, 999);

      const label = `${startWk.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} – ${endWk.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`;
      list.push({
        label,
        start: startWk.toISOString(),
        end: endWk.toISOString(),
      });
    }
    return list;
  };
  const reportPeriods = generatePeriods(4);

  // 11. Employee-level details: "their checkin how much for the month they have done"
  const employeesRes = await query(
    `SELECT 
       u.id, 
       u.full_name as name, 
       u.email, 
       COALESCE(d.name, 'Unassigned') as department,
       COUNT(CASE WHEN m.created_at >= $1 AND m.created_at <= $2 THEN m.id END) as this_month_checkins,
       ROUND(AVG(CASE WHEN m.created_at >= $1 AND m.created_at <= $2 THEN m.mood_score END), 1) as this_month_avg,
       ROUND(AVG(m.mood_score), 1) as overall_avg,
       COALESCE(
         JSON_AGG(
           JSON_BUILD_OBJECT('date', m.created_at, 'score', m.mood_score)
         ) FILTER (WHERE m.id IS NOT NULL),
         '[]'
       ) as history
     FROM users u
     JOIN roles r ON u.role_id = r.id
     LEFT JOIN departments d ON u.department_id = d.id
     LEFT JOIN mood_entries m ON m.user_id = u.id
     WHERE r.name = 'employee' AND u.full_name IS NOT NULL${deptFilterUsers}
     GROUP BY u.id, u.full_name, u.email, d.name
     ORDER BY department ASC, u.full_name ASC`,
    [targetMonthStart, targetMonthEnd]
  );

  const getScoreInPeriod = (hist: any[], startIso: string, endIso: string) => {
    const s = new Date(startIso).getTime();
    const e = new Date(endIso).getTime();
    const matches = hist.filter((h: any) => {
      const t = new Date(h.date).getTime();
      return t >= s && t <= e;
    });
    if (matches.length === 0) return null;
    const sum = matches.reduce((acc: number, m: any) => acc + Number(m.score), 0);
    return Math.round((sum / matches.length) * 10) / 10;
  };

  const employeeDetails = employeesRes.rows.map((row) => {
    const thisMonthCheckins = parseInt(row.this_month_checkins || '0', 10);
    const monthlyCompliance = Math.min(100, Math.round((thisMonthCheckins / expectedCheckinsThisMonth) * 100));
    const hist = Array.isArray(row.history) ? row.history : [];
    const scores = reportPeriods.map((p) => getScoreInPeriod(hist, p.start, p.end));

    return {
      name: row.name,
      email: row.email,
      department: row.department,
      thisMonthCheckins,
      expectedThisMonth: expectedCheckinsThisMonth,
      monthlyCompliance,
      thisMonthAvg: parseFloat(row.this_month_avg || '0') || null,
      overallAvg: parseFloat(row.overall_avg || '0') || null,
      scores,
    };
  });

  let reportBuffer: Buffer;
  let filename = '';

  const safeScope = isSpecificDept ? deptName.replace(/[^a-zA-Z0-9_-]/g, '_') : 'Organization';
  const safeMonth = targetMonthShort + '_' + targetYear;

  if (exportType === 'pdf') {
    filename = `${safeScope}_Wellbeing_Report_${safeMonth}.pdf`;

    reportBuffer = await generateAdminReportPDF(rangeLabel, {
      departmentName: deptName,
      moodIndex,
      thisMonthAvg,
      lastMonthAvg,
      overallAvg,
      participationRate,
      totalEmployees,
      checkinsCount,
      monthCheckinsTotal,
      monthExpectedTotal,
      monthComplianceRate,
      monthActiveEmployees,
      distribution,
      trends: trendsRes.rows.map((r) => ({ date: r.date, score: parseFloat(r.score) })),
      departments,
      feelings: feelRes.rows.map((r) => ({
        name: r.name,
        count: parseInt(r.count, 10),
        moodCorrelation: parseFloat(r.avg_mood || '0'),
      })),
      contributors: contRes.rows.map((r) => ({
        name: r.name,
        count: parseInt(r.count, 10),
        moodCorrelation: parseFloat(r.avg_mood || '0'),
      })),
      employeeDetails,
      reportPeriods,
      targetMonthName,
      targetMonthShort,
      prevMonthName,
      prevMonthShort,
      sections: options?.sections,
    });
  } else {
    filename = `${safeScope}_Wellbeing_Dataset_${safeMonth}.csv`;

    let csv = `Employee Wellness Index Report\n`;
    csv += `Scope,${deptName || 'Entire Organization'}\n`;
    csv += `Evaluation Period,${rangeLabel}\n`;
    csv += `Mood Index,${moodIndex}\n`;
    csv += `Monthly Check-ins Completed,${monthCheckinsTotal} / ${monthExpectedTotal} (${monthComplianceRate}%)\n`;
    csv += `Active Employees This Month,${monthActiveEmployees} / ${totalEmployees}\n`;
    csv += `Total Check-in Submissions in Period,${checkinsCount}\n\n`;

    // Department Breakdown
    if (!options || options?.sections?.departments !== false) {
      csv += `Departmental Breakdown\n`;
      csv += `Department,Headcount,This Month Check-ins,Monthly Compliance %,This Month Avg,Last Month Avg,Overall Avg\n`;
      departments.forEach((d) => {
        csv += `"${d.name}",${d.headcount},"${d.thisMonthCheckins} / ${d.expectedCheckins}",${d.complianceRate}%,${d.thisMonthAvg || '—'},${d.lastMonthAvg || '—'},${d.overallAvg || '—'}\n`;
      });
      csv += `\n`;
    }

    // Trends & Drivers
    if (!options || options?.sections?.trends !== false) {
      csv += `Top Workplace Feelings\nFeeling,Check-in Count,Mood Correlation\n`;
      feelRes.rows.forEach((f) => {
        csv += `"${f.name}",${f.count},${f.avg_mood}\n`;
      });
      csv += `\nTop Workplace Contributors\nContributor,Check-in Count,Mood Correlation\n`;
      contRes.rows.forEach((c) => {
        csv += `"${c.name}",${c.count},${c.avg_mood}\n`;
      });
      csv += `\n`;
    }

    // Employee Level Detail Table
    if (!options || options?.sections?.employees !== false) {
      csv += `Employee Check-in & Wellbeing Details\n`;
      let headers = `Department,Employee Name,Email,Check-ins This Month,Monthly Compliance %,This Month Avg,Overall Avg,`;
      headers += reportPeriods.map((p) => `"${p.label}"`).join(',') + '\n';
      csv += headers;

      employeeDetails.forEach((emp) => {
        let line = `"${emp.department}","${emp.name}","${emp.email}","${emp.thisMonthCheckins} / ${emp.expectedThisMonth}",${emp.monthlyCompliance}%,${emp.thisMonthAvg || '—'},${emp.overallAvg || '—'},`;
        line += emp.scores.map((s) => (s !== null ? s : 'Missed')).join(',') + '\n';
        csv += line;
      });
    }

    reportBuffer = Buffer.from(csv, 'utf-8');
  }

  // Send Email with generated report attachment
  await sendEmail({
    to: userEmail,
    subject: `Wellbeing Export: ${deptName ? `${deptName} Department` : 'Organization'} — ${targetMonthName} (${rangeLabel})`,
    html: buildEmailTemplate(
      'Wellbeing Analytics Report Ready',
      `
      <p>The analytics and check-in compliance report for <strong>${deptName ? `${deptName} Department` : 'the Entire Organization'}</strong> for <strong>${targetMonthName}</strong> (${rangeLabel}) is ready.</p>
      <p>Please find the exported <strong>${exportType.toUpperCase()}</strong> file attached.</p>
      <ul>
        <li><strong>Evaluation Month:</strong> ${targetMonthName}</li>
        <li><strong>Wellbeing Index:</strong> ${moodIndex} / 10</li>
        <li><strong>${targetMonthShort} Check-ins Completed:</strong> ${monthCheckinsTotal} / ${monthExpectedTotal} (${monthComplianceRate}%)</li>
        <li><strong>Active Employees in ${targetMonthShort}:</strong> ${monthActiveEmployees} of ${totalEmployees}</li>
      </ul>
    `
    ),
    emailType: 'Report',
    attachments: [
      {
        content: reportBuffer,
        filename,
      },
    ],
  });

  // Log report generation in database
  // Note: user_id must be a valid UUID. If not valid UUID (e.g. system tests), fallback to null
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const validUserId = uuidRegex.test(userId) ? userId : null;

  if (validUserId) {
    try {
      await query(
        `INSERT INTO reports (user_id, type, date_range, file_url) VALUES ($1, 'admin', $2, $3)`,
        [validUserId, rangeLabel, filename]
      );
      await logAudit(validUserId, 'admin_report_sent', { range, exportType, deptName });
    } catch (dbErr) {
      console.warn('Could not record report log in database:', dbErr);
    }
  }
};

export const requestAdminReport = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const { range, startDate, endDate, exportType, groupBy, options } = req.body;
  const userId = req.user.id;

  try {
    await buildAndEmailAdminReport(
      userId,
      req.user.email,
      range,
      startDate,
      endDate,
      exportType,
      groupBy || 'weeks',
      options
    );
    res.json({ message: 'Report generated and sent to your email successfully.' });
  } catch (error: any) {
    console.error('Request admin report error:', error);
    res.status(500).json({ error: 'Internal server error while generating admin report' });
  }
};
