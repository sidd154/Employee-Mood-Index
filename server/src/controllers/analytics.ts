import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { query } from '../config/db';

function getDateFilterSQL(range: string, paramIndexStart: number = 1): { sql: string; values: any[] } {
  let sql = '';
  const values: any[] = [];

  switch (range) {
    case '7d':
      sql = `created_at >= NOW() - INTERVAL '7 days'`;
      break;
    case '30d':
      sql = `created_at >= NOW() - INTERVAL '30 days'`;
      break;
    case 'ytd':
      sql = `created_at >= DATE_TRUNC('year', NOW())`;
      break;
    case 'custom':
      sql = `created_at >= $${paramIndexStart} AND created_at <= $${paramIndexStart + 1}`;
      break;
    default:
      sql = `created_at >= NOW() - INTERVAL '30 days'`;
  }

  return { sql, values };
}

export const getOverviewStats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const moodRes = await query(`SELECT AVG(mood_score) as avg_score FROM mood_entries`);
    const avgScore = parseFloat(moodRes.rows[0].avg_score || '0');
    const moodIndex = parseFloat((avgScore * 2).toFixed(1));

    const employeeRes = await query(
      `SELECT COUNT(*) as total FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE r.name = 'employee' AND u.full_name IS NOT NULL`
    );
    const totalEmployees = parseInt(employeeRes.rows[0].total || '0');

    const todayCheckinsRes = await query(
      `SELECT COUNT(*) as total FROM mood_entries 
       WHERE created_at >= CURRENT_DATE`
    );
    const checkinsToday = parseInt(todayCheckinsRes.rows[0].total || '0');
    const participationRate = totalEmployees > 0 ? Math.round((checkinsToday / totalEmployees) * 100) : 0;

    res.json({ moodIndex, totalEmployees, participationRate, checkinsToday });
  } catch (error: any) {
    console.error('Get overview stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMoodTrends = async (req: AuthenticatedRequest, res: Response) => {
  const { range, startDate, endDate } = req.query;

  try {
    let dateFilter = '';
    const values: any[] = [];

    if (range === 'custom' && startDate && endDate) {
      dateFilter = 'WHERE created_at >= $1 AND created_at <= $2';
      values.push(new Date(startDate as string), new Date(endDate as string));
    } else {
      const filter = getDateFilterSQL(range as string);
      dateFilter = `WHERE ${filter.sql}`;
    }

    const trendsRes = await query(
      `SELECT 
         created_at::date as date, 
         ROUND(AVG(mood_score) * 2, 1) as score,
         COUNT(*) as count
       FROM mood_entries
       ${dateFilter}
       GROUP BY created_at::date
       ORDER BY date ASC`,
      values
    );

    res.json(trendsRes.rows);
  } catch (error: any) {
    console.error('Get mood trends error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMoodDistribution = async (req: AuthenticatedRequest, res: Response) => {
  const { range, startDate, endDate } = req.query;

  try {
    let dateFilter = '';
    const values: any[] = [];

    if (range === 'custom' && startDate && endDate) {
      dateFilter = 'WHERE created_at >= $1 AND created_at <= $2';
      values.push(new Date(startDate as string), new Date(endDate as string));
    } else {
      const filter = getDateFilterSQL(range as string);
      dateFilter = `WHERE ${filter.sql}`;
    }

    const distRes = await query(
      `SELECT 
         mood_score,
         COUNT(*) as count
       FROM mood_entries
       ${dateFilter}
       GROUP BY mood_score
       ORDER BY mood_score DESC`,
      values
    );

    const moodMapping: { [key: number]: string } = {
      5: 'Great', 4: 'Good', 3: 'Okay', 2: 'Bad', 1: 'Awful',
    };

    const distribution = [5, 4, 3, 2, 1].map((score) => {
      const row = distRes.rows.find((r) => r.mood_score === score);
      return {
        score,
        name: moodMapping[score],
        count: parseInt(row?.count || '0'),
      };
    });

    res.json(distribution);
  } catch (error: any) {
    console.error('Get mood distribution error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getDepartmentAnalytics = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const deptRes = await query(
      `SELECT 
         d.id, 
         d.name,
         COUNT(DISTINCT u.id) as employee_count,
         ROUND(AVG(m.mood_score) * 2, 1) as mood_index,
         COUNT(DISTINCT CASE WHEN m.created_at >= CURRENT_DATE THEN u.id END) as checked_in_today
       FROM departments d
       LEFT JOIN users u ON u.department_id = d.id AND u.role_id = (SELECT id FROM roles WHERE name = 'employee')
       LEFT JOIN mood_entries m ON m.user_id = u.id AND m.created_at >= NOW() - INTERVAL '30 days'
       GROUP BY d.id, d.name
       ORDER BY d.name ASC`
    );

    const depts = deptRes.rows.map((row) => {
      const employeeCount = parseInt(row.employee_count || '0');
      const checkedInToday = parseInt(row.checked_in_today || '0');
      const participationRate = employeeCount > 0 ? Math.round((checkedInToday / employeeCount) * 100) : 0;

      return {
        id: row.id,
        name: row.name,
        employeeCount,
        moodIndex: parseFloat(row.mood_index || '0'),
        participationRate,
      };
    });

    res.json(depts);
  } catch (error: any) {
    console.error('Get department analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getDepartmentDetails = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { range, startDate, endDate } = req.query;

  try {
    const deptInfo = await query(`SELECT name FROM departments WHERE id = $1`, [id]);
    if (deptInfo.rows.length === 0) {
      return res.status(404).json({ error: 'Department not found' });
    }

    const deptName = deptInfo.rows[0].name;
    let dateFilter = '';
    if (range === '7d') {
      dateFilter = `AND m.created_at >= NOW() - INTERVAL '7 days'`;
    } else if (range === 'ytd') {
      dateFilter = `AND m.created_at >= DATE_TRUNC('year', NOW())`;
    } else {
      dateFilter = `AND m.created_at >= NOW() - INTERVAL '30 days'`;
    }
    const values: any[] = [id];

    if (range === 'custom' && startDate && endDate) {
      dateFilter = 'AND m.created_at >= $2 AND m.created_at <= $3';
      values.push(new Date(startDate as string), new Date(endDate as string));
    }

    const trends = await query(
      `SELECT 
         m.created_at::date as date, 
         ROUND(AVG(m.mood_score) * 2, 1) as score,
         COUNT(*) as count
       FROM mood_entries m
       JOIN users u ON m.user_id = u.id
       WHERE u.department_id = $1 ${dateFilter}
       GROUP BY m.created_at::date
       ORDER BY date ASC`,
      values
    );

    const dist = await query(
      `SELECT 
         m.mood_score,
         COUNT(*) as count
       FROM mood_entries m
       JOIN users u ON m.user_id = u.id
       WHERE u.department_id = $1 ${dateFilter}
       GROUP BY m.mood_score`,
      values
    );

    const moodMapping: { [key: number]: string } = { 5: 'Great', 4: 'Good', 3: 'Okay', 2: 'Bad', 1: 'Awful' };
    const distribution = [5, 4, 3, 2, 1].map((score) => {
      const row = dist.rows.find((r) => r.mood_score === score);
      return {
        score,
        name: moodMapping[score],
        count: parseInt(row?.count || '0'),
      };
    });

    const feelings = await query(
      `SELECT f.name, COUNT(*) as count
       FROM entry_feelings ef
       JOIN feelings f ON ef.feeling_id = f.id
       JOIN mood_entries m ON ef.entry_id = m.id
       JOIN users u ON m.user_id = u.id
       WHERE u.department_id = $1 ${dateFilter}
       GROUP BY f.name
       ORDER BY count DESC LIMIT 10`,
      values
    );

    const contributors = await query(
      `SELECT c.name, COUNT(*) as count
       FROM entry_contributors ec
       JOIN contributors c ON ec.contributor_id = c.id
       JOIN mood_entries m ON ec.entry_id = m.id
       JOIN users u ON m.user_id = u.id
       WHERE u.department_id = $1 ${dateFilter}
       GROUP BY c.name
       ORDER BY count DESC LIMIT 10`,
      values
    );

    const employees = await query(
      `SELECT 
         u.id, 
         u.full_name as name, 
         u.email,
         ROUND(AVG(m.mood_score) * 2, 1) as mood_index,
         COUNT(DISTINCT m.created_at::date) as check_in_count,
         MAX(m.created_at) as last_check_in
       FROM users u
       LEFT JOIN mood_entries m ON m.user_id = u.id
       WHERE u.department_id = $1 AND u.full_name IS NOT NULL
       GROUP BY u.id, u.full_name, u.email
       ORDER BY u.full_name ASC`,
      [id]
    );

    res.json({
      departmentName: deptName,
      trends: trends.rows,
      distribution,
      topFeelings: feelings.rows,
      topContributors: contributors.rows,
      employees: employees.rows.map(emp => ({
        ...emp,
        moodIndex: parseFloat(emp.mood_index || '0'),
        checkInCount: parseInt(emp.check_in_count || '0'),
      })),
    });
  } catch (error: any) {
    console.error('Get department details error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getEmployeeExplorer = async (req: AuthenticatedRequest, res: Response) => {
  const { search, departmentId } = req.query;

  try {
    let whereClause = `WHERE r.name = 'employee' AND u.full_name IS NOT NULL`;
    const params: any[] = [];

    if (search) {
      params.push(`%${search}%`);
      whereClause += ` AND (u.full_name ILIKE $${params.length} OR u.email ILIKE $${params.length})`;
    }

    if (departmentId) {
      params.push(departmentId);
      whereClause += ` AND u.department_id = $${params.length}`;
    }

    const employeesRes = await query(
      `SELECT 
         u.id,
         u.full_name as name,
         d.name as department,
         ROUND(AVG(m.mood_score) * 2, 1) as mood_index,
         MAX(m.created_at) as last_check_in,
         COUNT(DISTINCT m.created_at::date) as check_ins_count
       FROM users u
       JOIN roles r ON u.role_id = r.id
       LEFT JOIN departments d ON u.department_id = d.id
       LEFT JOIN mood_entries m ON m.user_id = u.id
       ${whereClause}
       GROUP BY u.id, u.full_name, d.name, u.created_at
       ORDER BY u.full_name ASC`,
      params
    );

    const processedEmployees = employeesRes.rows.map((row) => {
      const count = parseInt(row.check_ins_count || '0');
      const participationRate = count > 0 ? Math.min(Math.round((count / 30) * 100), 100) : 0;

      return {
        id: row.id,
        name: row.name,
        department: row.department || 'Other',
        moodIndex: row.mood_index ? parseFloat(row.mood_index) : null,
        participationRate,
        lastCheckIn: row.lastCheckIn,
      };
    });

    res.json(processedEmployees);
  } catch (error: any) {
    console.error('Get employee explorer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getEmployeeDetails = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const profileRes = await query(
      `SELECT u.id, u.full_name as name, u.email, d.name as department, u.created_at
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.id = $1`,
      [id]
    );

    if (profileRes.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const profile = profileRes.rows[0];

    const trendsRes = await query(
      `SELECT created_at::date as date, ROUND(mood_score * 2, 1) as score
       FROM mood_entries
       WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
       ORDER BY date ASC`,
      [id]
    );

    const distRes = await query(
      `SELECT mood_score, COUNT(*) as count
       FROM mood_entries
       WHERE user_id = $1
       GROUP BY mood_score`,
      [id]
    );
    const moodMapping: { [key: number]: string } = { 5: 'Great', 4: 'Good', 3: 'Okay', 2: 'Bad', 1: 'Awful' };
    const distribution = [5, 4, 3, 2, 1].map((score) => {
      const row = distRes.rows.find((r) => r.mood_score === score);
      return {
        score,
        name: moodMapping[score],
        count: parseInt(row?.count || '0'),
      };
    });

    const feelingsRes = await query(
      `SELECT f.name, COUNT(*) as count
       FROM entry_feelings ef
       JOIN feelings f ON ef.feeling_id = f.id
       JOIN mood_entries m ON ef.entry_id = m.id
       WHERE m.user_id = $1
       GROUP BY f.name
       ORDER BY count DESC LIMIT 5`,
      [id]
    );

    const contributorsRes = await query(
      `SELECT c.name, COUNT(*) as count
       FROM entry_contributors ec
       JOIN contributors c ON ec.contributor_id = c.id
       JOIN mood_entries m ON ec.entry_id = m.id
       WHERE m.user_id = $1
       GROUP BY c.name
       ORDER BY count DESC LIMIT 5`,
      [id]
    );

    const journalRes = await query(
      `SELECT id, mood_score, journal_text, created_at
       FROM mood_entries
       WHERE user_id = $1 AND journal_text IS NOT NULL AND journal_text != ''
       ORDER BY created_at DESC`,
      [id]
    );

    res.json({
      profile,
      trends: trendsRes.rows,
      distribution,
      commonFeelings: feelingsRes.rows,
      commonContributors: contributorsRes.rows,
      journals: journalRes.rows,
    });
  } catch (error: any) {
    console.error('Get employee details error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getFeelingsAnalytics = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const feelingsRes = await query(
      `SELECT 
         f.name,
         COUNT(ef.feeling_id) as count,
         ROUND(AVG(m.mood_score) * 2, 1) as avg_mood_correlation
       FROM feelings f
       LEFT JOIN entry_feelings ef ON ef.feeling_id = f.id
       LEFT JOIN mood_entries m ON ef.entry_id = m.id
       GROUP BY f.name
       ORDER BY count DESC`
    );

    const deptsRes = await query(
      `SELECT 
         f.name as feeling_name,
         d.name as department_name,
         COUNT(ef.feeling_id) as count
       FROM entry_feelings ef
       JOIN feelings f ON ef.feeling_id = f.id
       JOIN mood_entries m ON ef.entry_id = m.id
       JOIN users u ON m.user_id = u.id
       LEFT JOIN departments d ON u.department_id = d.id
       GROUP BY f.name, d.name`
    );

    const result = feelingsRes.rows.map((row) => {
      const breakdowns = deptsRes.rows
        .filter((d) => d.feeling_name === row.name && d.department_name)
        .map((d) => ({
          department: d.department_name,
          count: parseInt(d.count),
        }));

      return {
        name: row.name,
        count: parseInt(row.count || '0'),
        moodCorrelation: parseFloat(row.avg_mood_correlation || '0'),
        departmentBreakdown: breakdowns,
      };
    });

    res.json(result);
  } catch (error: any) {
    console.error('Get feelings analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getContributorAnalytics = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const contributorsRes = await query(
      `SELECT 
         c.name,
         COUNT(ec.contributor_id) as count,
         ROUND(AVG(m.mood_score) * 2, 1) as avg_mood_correlation
       FROM contributors c
       LEFT JOIN entry_contributors ec ON ec.contributor_id = c.id
       LEFT JOIN mood_entries m ON ec.entry_id = m.id
       GROUP BY c.name
       ORDER BY count DESC`
    );

    const deptsRes = await query(
      `SELECT 
         c.name as contributor_name,
         d.name as department_name,
         COUNT(ec.contributor_id) as count
       FROM entry_contributors ec
       JOIN contributors c ON ec.contributor_id = c.id
       JOIN mood_entries m ON ec.entry_id = m.id
       JOIN users u ON m.user_id = u.id
       LEFT JOIN departments d ON u.department_id = d.id
       GROUP BY c.name, d.name`
    );

    const result = contributorsRes.rows.map((row) => {
      const breakdowns = deptsRes.rows
        .filter((d) => d.contributor_name === row.name && d.department_name)
        .map((d) => ({
          department: d.department_name,
          count: parseInt(d.count),
        }));

      return {
        name: row.name,
        count: parseInt(row.count || '0'),
        moodCorrelation: parseFloat(row.avg_mood_correlation || '0'),
        departmentImpact: breakdowns,
      };
    });

    res.json(result);
  } catch (error: any) {
    console.error('Get contributor analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
