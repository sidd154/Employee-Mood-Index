import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { query } from '../config/db';
import { logAudit } from '../utils/audit';

function getCurrentCheckinWindowStart(today: Date = new Date()): Date {
  const dayOfWeek = today.getDay(); // 0 = Sun, 1 = Mon, ..., 5 = Fri, 6 = Sat
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  
  if (dayOfWeek === 5) { // Friday
    return start;
  } else if (dayOfWeek === 6) { // Saturday
    start.setDate(start.getDate() - 1);
    return start;
  } else if (dayOfWeek === 0) { // Sunday
    start.setDate(start.getDate() - 2);
    return start;
  } else {
    // Monday to Thursday (1 to 4): subtract (dayOfWeek + 2) days to go back to previous Friday
    const daysToSubtract = dayOfWeek + 2;
    start.setDate(start.getDate() - daysToSubtract);
    return start;
  }
}

export const getTodayStatus = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1-4 = Mon-Thu, 5-6 = Fri-Sat
    let isBlockedDay = dayOfWeek >= 1 && dayOfWeek <= 4;

    if (isBlockedDay) {
      const extendRes = await query("SELECT value FROM settings WHERE key = 'extend_data_entry'");
      const isExtended = extendRes.rows.length > 0 && extendRes.rows[0].value === 'true';
      if (isExtended) {
        isBlockedDay = false;
      }
    }

    const windowStart = getCurrentCheckinWindowStart(today);

    const checkinRes = await query(
      `SELECT id, mood_score, journal_text, created_at 
       FROM mood_entries 
       WHERE user_id = $1 AND created_at >= $2
       ORDER BY created_at DESC LIMIT 1`,
      [req.user.id, windowStart]
    );

    const completed = checkinRes.rows.length > 0;

    const lastCheckinRes = await query(
      `SELECT mood_score 
       FROM mood_entries 
       WHERE user_id = $1
       ORDER BY created_at DESC LIMIT 1`,
      [req.user.id]
    );
    const lastWeekScore = lastCheckinRes.rows.length > 0 ? lastCheckinRes.rows[0].mood_score : null;

    res.json({
      completed,
      isBlockedDay,
      lastWeekScore,
      checkin: completed ? checkinRes.rows[0] : null,
    });
  } catch (error: any) {
    console.error('Get today status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createCheckin = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1-4 = Mon-Thu, 5-6 = Fri-Sat
  let isBlockedDay = dayOfWeek >= 1 && dayOfWeek <= 4;

  if (isBlockedDay) {
    const extendRes = await query("SELECT value FROM settings WHERE key = 'extend_data_entry'");
    const isExtended = extendRes.rows.length > 0 && extendRes.rows[0].value === 'true';
    if (isExtended) {
      isBlockedDay = false;
    }
  }

  if (isBlockedDay) {
    return res.status(400).json({ error: 'Check-ins are only allowed Friday through Sunday.' });
  }

  const { moodScore, feelings, contributors } = req.body;

  if (!moodScore || moodScore < 1 || moodScore > 10) {
    return res.status(400).json({ error: 'Valid mood score (1-10) is required' });
  }

  try {
    const windowStart = getCurrentCheckinWindowStart(today);
    const checkinRes = await query(
      `SELECT 1 FROM mood_entries 
       WHERE user_id = $1 AND created_at >= $2`,
      [req.user.id, windowStart]
    );

    if (checkinRes.rows.length > 0) {
      return res.status(400).json({ error: 'You have already checked in this week' });
    }

    await query('BEGIN');

    const insertMoodRes = await query(
      `INSERT INTO mood_entries (user_id, mood_score, journal_text)
       VALUES ($1, $2, $3) RETURNING id, created_at`,
      [req.user.id, moodScore, null]
    );

    const entryId = insertMoodRes.rows[0].id;

    if (feelings && Array.isArray(feelings) && feelings.length > 0) {
      // Map 1-10 mood score to 1-5 database relation for feelings
      const moodScoreRelation = Math.ceil(moodScore / 2);
      const feelingLookup = await query(
        `SELECT id, name FROM feelings WHERE name = ANY($1) AND mood_score_relation = $2`,
        [feelings, moodScoreRelation]
      );

      for (const row of feelingLookup.rows) {
        await query(
          `INSERT INTO entry_feelings (entry_id, feeling_id) VALUES ($1, $2)`,
          [entryId, row.id]
        );
      }
    }

    if (contributors && Array.isArray(contributors) && contributors.length > 0) {
      const contributorLookup = await query(
        `SELECT id, name FROM contributors WHERE name = ANY($1)`,
        [contributors]
      );

      for (const row of contributorLookup.rows) {
        await query(
          `INSERT INTO entry_contributors (entry_id, contributor_id) VALUES ($1, $2)`,
          [entryId, row.id]
        );
      }
    }

    await query('COMMIT');
    await logAudit(req.user.id, 'checkin_created', { moodScore });

    res.status(201).json({
      message: 'Check-in recorded successfully',
      id: entryId,
      createdAt: insertMoodRes.rows[0].created_at,
    });
  } catch (error: any) {
    await query('ROLLBACK');
    console.error('Create checkin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


