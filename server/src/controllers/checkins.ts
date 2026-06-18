import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { query } from '../config/db';
import { logAudit } from '../utils/audit';

export const getTodayStatus = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const checkinRes = await query(
      `SELECT id, mood_score, journal_text, created_at 
       FROM mood_entries 
       WHERE user_id = $1 AND created_at >= CURRENT_DATE
       ORDER BY created_at DESC LIMIT 1`,
      [req.user.id]
    );

    const completed = checkinRes.rows.length > 0;

    res.json({
      completed,
      checkin: completed ? checkinRes.rows[0] : null,
    });
  } catch (error: any) {
    console.error('Get today status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createCheckin = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const { moodScore, feelings, contributors } = req.body;

  if (!moodScore || moodScore < 1 || moodScore > 5) {
    return res.status(400).json({ error: 'Valid mood score (1-5) is required' });
  }

  try {
    const checkinRes = await query(
      `SELECT 1 FROM mood_entries 
       WHERE user_id = $1 AND created_at >= CURRENT_DATE`,
      [req.user.id]
    );

    if (checkinRes.rows.length > 0) {
      return res.status(400).json({ error: 'You have already checked in today' });
    }

    await query('BEGIN');

    const insertMoodRes = await query(
      `INSERT INTO mood_entries (user_id, mood_score, journal_text)
       VALUES ($1, $2, $3) RETURNING id, created_at`,
      [req.user.id, moodScore, null]
    );

    const entryId = insertMoodRes.rows[0].id;

    if (feelings && Array.isArray(feelings) && feelings.length > 0) {
      const feelingLookup = await query(
        `SELECT id, name FROM feelings WHERE name = ANY($1) AND mood_score_relation = $2`,
        [feelings, moodScore]
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
