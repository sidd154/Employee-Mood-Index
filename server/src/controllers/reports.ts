import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { query } from '../config/db';
import { generateEmployeeReportPDF, generateAdminReportPDF } from '../services/pdf';
import { sendEmail, buildEmailTemplate } from '../services/email';
import { logAudit } from '../utils/audit';

function getRangeLabel(range: string, start?: string, end?: string): string {
  return 'From January';
}

function getDateFilter(range: string, start?: string, end?: string, tableAlias: string = 'm') {
  const clause = `AND ${tableAlias}.created_at >= DATE_TRUNC('year', NOW())`;
  const values: any[] = [];
  return { clause, values };
}

export const requestEmployeeReport = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const { range } = req.body;
  const userId = req.user.id;

  try {
    const rangeLabel = getRangeLabel(range);
    const filter = getDateFilter(range, undefined, undefined, 'm');

    const moodRes = await query(
      `SELECT AVG(mood_score) as avg_score FROM mood_entries m 
       WHERE m.user_id = $1 ${filter.clause}`,
      [userId]
    );
    const avgScore = parseFloat(moodRes.rows[0].avg_score || '0');
    const moodIndex = parseFloat(avgScore.toFixed(1));

    // Fetch this month, last month, and overall averages for the employee
    const empStatsRes = await query(
      `SELECT 
         ROUND(AVG(CASE WHEN created_at >= DATE_TRUNC('month', NOW()) THEN mood_score END), 1) as this_month_avg,
         ROUND(AVG(CASE WHEN created_at >= DATE_TRUNC('month', NOW() - INTERVAL '1 month') AND created_at < DATE_TRUNC('month', NOW()) THEN mood_score END), 1) as last_month_avg,
         ROUND(AVG(mood_score), 1) as overall_avg
       FROM mood_entries
       WHERE user_id = $1`,
      [userId]
    );
    const empStats = empStatsRes.rows[0];
    const thisMonthAvg = parseFloat(empStats.this_month_avg || '0') || null;
    const lastMonthAvg = parseFloat(empStats.last_month_avg || '0') || null;
    const overallAvg = parseFloat(empStats.overall_avg || '0') || null;

    const distRes = await query(
      `SELECT mood_score, COUNT(*) as count FROM mood_entries m 
       WHERE m.user_id = $1 ${filter.clause}
       GROUP BY mood_score`,
      [userId]
    );
    const distribution = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((score) => {
      const row = distRes.rows.find((r) => parseInt(r.mood_score) === score);
      return {
        score,
        name: String(score),
        count: parseInt(row?.count || '0'),
      };
    });

    const trendsRes = await query(
      `SELECT DATE_TRUNC('week', m.created_at)::date as date, ROUND(AVG(mood_score), 1) as score
       FROM mood_entries m 
       WHERE m.user_id = $1 ${filter.clause}
       GROUP BY DATE_TRUNC('week', m.created_at)::date
       ORDER BY date ASC`,
      [userId]
    );

    const feelingsRes = await query(
      `SELECT f.name, COUNT(*) as count 
       FROM entry_feelings ef
       JOIN feelings f ON ef.feeling_id = f.id
       JOIN mood_entries m ON ef.entry_id = m.id
       WHERE m.user_id = $1 ${filter.clause}
       GROUP BY f.name
       ORDER BY count DESC LIMIT 5`,
      [userId]
    );

    const contributorsRes = await query(
      `SELECT c.name, COUNT(*) as count 
       FROM entry_contributors ec
       JOIN contributors c ON ec.contributor_id = c.id
       JOIN mood_entries m ON ec.entry_id = m.id
       WHERE m.user_id = $1 ${filter.clause}
       GROUP BY c.name
       ORDER BY count DESC LIMIT 5`,
      [userId]
    );

    const userProfile = await query(
      `SELECT u.full_name, u.department_id, d.name as department_name 
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.id = $1`,
      [userId]
    );
    const employeeName = userProfile.rows[0].full_name || 'Employee';
    const departmentId = userProfile.rows[0].department_id;
    const departmentName = userProfile.rows[0].department_name || 'Other';

    let departmentMoodIndex = null;
    let departmentThisMonthAvg = null;
    let departmentLastMonthAvg = null;
    let departmentOverallAvg = null;
    let departmentHeadcount = null;

    if (departmentId) {
      const deptMoodRes = await query(
        `SELECT 
           ROUND(AVG(m.mood_score), 1) as range_avg,
           ROUND(AVG(CASE WHEN m.created_at >= DATE_TRUNC('month', NOW()) THEN m.mood_score END), 1) as this_month_avg,
           ROUND(AVG(CASE WHEN m.created_at >= DATE_TRUNC('month', NOW() - INTERVAL '1 month') AND m.created_at < DATE_TRUNC('month', NOW()) THEN m.mood_score END), 1) as last_month_avg,
           ROUND(AVG(m.mood_score), 1) as overall_avg,
           COUNT(DISTINCT u.id) as headcount
         FROM users u
         LEFT JOIN mood_entries m ON m.user_id = u.id
         WHERE u.department_id = $1 AND u.role_id = (SELECT id FROM roles WHERE name = 'employee')`,
        [departmentId]
      );
      const row = deptMoodRes.rows[0];
      if (row.range_avg) {
        departmentMoodIndex = parseFloat(row.range_avg);
        departmentThisMonthAvg = parseFloat(row.this_month_avg || '0') || null;
        departmentLastMonthAvg = parseFloat(row.last_month_avg || '0') || null;
        departmentOverallAvg = parseFloat(row.overall_avg || '0') || null;
        departmentHeadcount = parseInt(row.headcount || '0');
      }
    }

    const pdfBuffer = await generateEmployeeReportPDF(employeeName, rangeLabel, {
      moodIndex,
      thisMonthAvg,
      lastMonthAvg,
      overallAvg,
      distribution,
      trends: trendsRes.rows.map(row => ({ date: row.date, score: parseFloat(row.score) })),
      feelings: feelingsRes.rows.map(row => ({ name: row.name, count: parseInt(row.count) })),
      contributors: contributorsRes.rows.map(row => ({ name: row.name, count: parseInt(row.count) })),
      departmentName,
      departmentMoodIndex,
      departmentThisMonthAvg,
      departmentLastMonthAvg,
      departmentOverallAvg,
      departmentHeadcount,
    });

    await sendEmail({
      to: req.user.email,
      subject: 'Your Wellbeing Report',
      html: buildEmailTemplate('Your Wellbeing Report', `
        <p>Hi ${employeeName},</p>
        <p>Your requested wellbeing report for the period <strong>${rangeLabel}</strong> is ready. Please find the PDF attached to this email.</p>
      `),
      emailType: 'Report',
      attachments: [
        {
          content: pdfBuffer,
          filename: `Employee_Wellness_Report_${range}.pdf`,
        },
      ],
    });

    await query(
      `INSERT INTO reports (user_id, type, date_range) 
       VALUES ($1, 'employee', $2)`,
      [userId, rangeLabel]
    );

    await logAudit(userId, 'employee_report_sent', { range });

    res.json({ message: 'Report generated and sent to your email successfully.' });
  } catch (error: any) {
    console.error('Request employee report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const buildAndEmailAdminReport = async (userId: string, userEmail: string, range: string, startDate?: string, endDate?: string, exportType: 'pdf' | 'csv' = 'pdf') => {
  const rangeLabel = getRangeLabel(range, startDate, endDate);
  
  let filterClause = '';
  const filterValues: any[] = [];
  if (range === 'custom' && startDate && endDate) {
    filterClause = `AND m.created_at >= $1 AND m.created_at <= $2`;
    filterValues.push(new Date(startDate), new Date(endDate));
  } else {
    const tempFilter = getDateFilter(range, undefined, undefined, 'm');
    filterClause = tempFilter.clause;
  }

  const moodRes = await query(
    `SELECT AVG(mood_score) as avg_score FROM mood_entries m WHERE 1=1 ${filterClause}`,
    filterValues
  );
  const avgScore = parseFloat(moodRes.rows[0].avg_score || '0');
  const moodIndex = parseFloat(avgScore.toFixed(1));

  // Fetch company stats for this month, last month, overall
  const compStatsRes = await query(
    `SELECT 
       ROUND(AVG(CASE WHEN created_at >= DATE_TRUNC('month', NOW()) THEN mood_score END), 1) as this_month_avg,
       ROUND(AVG(CASE WHEN created_at >= DATE_TRUNC('month', NOW() - INTERVAL '1 month') AND created_at < DATE_TRUNC('month', NOW()) THEN mood_score END), 1) as last_month_avg,
       ROUND(AVG(mood_score), 1) as overall_avg
     FROM mood_entries`
  );
  const compStats = compStatsRes.rows[0];
  const thisMonthAvg = parseFloat(compStats.this_month_avg || '0') || null;
  const lastMonthAvg = parseFloat(compStats.last_month_avg || '0') || null;
  const overallAvg = parseFloat(compStats.overall_avg || '0') || null;

  const checkinCountRes = await query(
    `SELECT COUNT(*) as count FROM mood_entries m WHERE 1=1 ${filterClause}`,
    filterValues
  );
  const checkinsCount = parseInt(checkinCountRes.rows[0].count || '0');

  const empCountRes = await query(
    `SELECT COUNT(*) as count FROM users u 
     JOIN roles r ON u.role_id = r.id 
     WHERE r.name = 'employee' AND u.full_name IS NOT NULL`
  );
  const totalEmployees = parseInt(empCountRes.rows[0].count || '0');
  
  let expectedCheckinsPerEmployee = 4; // default for 30d
  if (range === '7d') {
    expectedCheckinsPerEmployee = 1;
  } else if (range === 'ytd') {
    const startOfYear = new Date(new Date().getFullYear(), 0, 1);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - startOfYear.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    expectedCheckinsPerEmployee = Math.max(1, Math.round(diffDays / 7));
  } else if (range === 'custom' && startDate && endDate) {
    const diffTime = Math.abs(new Date(endDate).getTime() - new Date(startDate).getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    expectedCheckinsPerEmployee = Math.max(1, Math.round(diffDays / 7));
  }

  const participationRate = totalEmployees > 0 ? Math.min(100, Math.round((checkinsCount / (totalEmployees * expectedCheckinsPerEmployee)) * 100)) : 0;

  const distRes = await query(
    `SELECT mood_score, COUNT(*) as count FROM mood_entries m 
     WHERE 1=1 ${filterClause}
     GROUP BY mood_score`,
    filterValues
  );
  const distribution = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((score) => {
    const row = distRes.rows.find((r) => parseInt(r.mood_score) === score);
    return {
      score,
      name: String(score),
      count: parseInt(row?.count || '0'),
    };
  });

  const trendsRes = await query(
    `SELECT DATE_TRUNC('week', m.created_at)::date as date, ROUND(AVG(mood_score), 1) as score
     FROM mood_entries m
     WHERE 1=1 ${filterClause}
     GROUP BY DATE_TRUNC('week', m.created_at)::date
     ORDER BY date ASC`,
    filterValues
  );

  // Fetch department conditional trend stats and headcount
  const deptStatsRes = await query(
    `SELECT 
       d.name,
       COUNT(DISTINCT u.id) as headcount,
       COUNT(DISTINCT CASE WHEN 1=1 ${filterClause} THEN u.id END) as checked_in,
       ROUND(AVG(CASE WHEN 1=1 ${filterClause} THEN m.mood_score END), 1) as overall_avg,
       ROUND(AVG(CASE WHEN m.created_at >= DATE_TRUNC('month', NOW()) THEN m.mood_score END), 1) as this_month_avg,
       ROUND(AVG(CASE WHEN m.created_at >= DATE_TRUNC('month', NOW() - INTERVAL '1 month') AND m.created_at < DATE_TRUNC('month', NOW()) THEN m.mood_score END), 1) as last_month_avg
     FROM departments d
     LEFT JOIN users u ON u.department_id = d.id AND u.role_id = (SELECT id FROM roles WHERE name = 'employee')
     LEFT JOIN mood_entries m ON m.user_id = u.id
     GROUP BY d.name
     ORDER BY d.name ASC`,
    filterValues
  );

  const feelRes = await query(
    `SELECT 
       f.name,
       COUNT(ef.feeling_id) as count,
       ROUND(AVG(m.mood_score), 1) as avg_mood
     FROM entry_feelings ef
     JOIN feelings f ON ef.feeling_id = f.id
     JOIN mood_entries m ON ef.entry_id = m.id
     WHERE 1=1 ${filterClause}
     GROUP BY f.name
     ORDER BY count DESC LIMIT 10`,
    filterValues
  );

  const contRes = await query(
    `SELECT 
       c.name,
       COUNT(ec.contributor_id) as count,
       ROUND(AVG(m.mood_score), 1) as avg_mood
     FROM entry_contributors ec
     JOIN contributors c ON ec.contributor_id = c.id
     JOIN mood_entries m ON ec.entry_id = m.id
     WHERE 1=1 ${filterClause}
     GROUP BY c.name
     ORDER BY count DESC LIMIT 10`,
    filterValues
  );

  let reportBuffer: Buffer;
  let filename = '';

  if (exportType === 'pdf') {
    filename = `Admin_Wellness_Report_${range}.pdf`;

    reportBuffer = await generateAdminReportPDF(rangeLabel, {
      moodIndex,
      thisMonthAvg,
      lastMonthAvg,
      overallAvg,
      participationRate: Math.min(participationRate, 100),
      totalEmployees,
      checkinsCount,
      distribution,
      trends: trendsRes.rows.map(row => ({ date: row.date, score: parseFloat(row.score) })),
      departments: deptStatsRes.rows.map(row => ({
        name: row.name,
        headcount: parseInt(row.headcount || '0'),
        checkedIn: parseInt(row.checked_in || '0'),
        overallAvg: parseFloat(row.overall_avg || '0') || null,
        thisMonthAvg: parseFloat(row.this_month_avg || '0') || null,
        lastMonthAvg: parseFloat(row.last_month_avg || '0') || null,
      })),
      feelings: feelRes.rows.map(row => ({
        name: row.name,
        count: parseInt(row.count),
        moodCorrelation: parseFloat(row.avg_mood),
      })),
      contributors: contRes.rows.map(row => ({
        name: row.name,
        count: parseInt(row.count),
        moodCorrelation: parseFloat(row.avg_mood),
      })),
    });
  } else {
    filename = `Admin_Wellness_Report_${range}.csv`;

    let csvText = `Employee Wellness Index Admin Report\nPeriod,${rangeLabel}\nOverall Wellness Index,${moodIndex}\nTotal Checkins,${checkinsCount}\n\n`;
    
    csvText += `Wellness Distribution\nWellness Score,Count\n`;
    distribution.forEach((d) => {
      csvText += `${d.name},${d.count}\n`;
    });

    csvText += `\nDepartment Breakdown\nDepartment,This Month Avg,Last Month Avg,Overall Avg,Team Size\n`;
    deptStatsRes.rows.forEach((d: any) => {
      csvText += `${d.name},${d.this_month_avg || '—'},${d.last_month_avg || '—'},${d.overall_avg || '—'},${d.headcount || 0}\n`;
    });

    csvText += `\nTop Feelings\nFeeling,Count,Wellness Correlation\n`;
    feelRes.rows.forEach((f) => {
      csvText += `${f.name},${f.count},${f.avg_mood}\n`;
    });

    csvText += `\nTop Contributors\nContributor,Count,Wellness Correlation\n`;
    contRes.rows.forEach((c) => {
      csvText += `${c.name},${c.count},${c.avg_mood}\n`;
    });

    reportBuffer = Buffer.from(csvText, 'utf-8');
  }

  await sendEmail({
    to: userEmail,
    subject: `Weekly Wellbeing Export: ${rangeLabel}`,
    html: buildEmailTemplate('Admin Wellbeing Export', `
      <p>The requested analytics report for the period <strong>${rangeLabel}</strong> is ready. Please find the exported <strong>${exportType.toUpperCase()}</strong> file attached to this email.</p>
    `),
    emailType: 'Report',
    attachments: [
      {
        content: reportBuffer,
        filename,
      },
    ],
  });

  await query(
    `INSERT INTO reports (user_id, type, date_range, file_url) 
     VALUES ($1, 'admin', $2, $3)`,
    [userId, rangeLabel, filename]
  );

  await logAudit(userId, 'admin_report_sent', { range, exportType });
};

export const requestAdminReport = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const { range, startDate, endDate, exportType } = req.body;
  const userId = req.user.id;

  try {
    await buildAndEmailAdminReport(userId, req.user.email, range, startDate, endDate, exportType);
    res.json({ message: `Report generated and sent to your email successfully.` });
  } catch (error: any) {
    console.error('Request admin report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
