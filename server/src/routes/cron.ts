import { Router } from 'express';
import { sendMorningReminders, sendAfternoonReminders, sendMonthlyAdminReports } from '../services/scheduler';

const router = Router();

const checkCronAuth = (req: any, res: any): boolean => {
  const cronSecret = process.env.CRON_SECRET;
  if (process.env.NODE_ENV === 'production' || cronSecret) {
    if (!cronSecret) {
      res.status(500).json({ error: 'CRON_SECRET environment variable is not configured' });
      return false;
    }
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${cronSecret}`) {
      res.status(401).json({ error: 'Unauthorized' });
      return false;
    }
  }
  return true;
};

const handleMorning = async (req: any, res: any, next: any) => {
  if (!checkCronAuth(req, res)) return;
  try {
    await sendMorningReminders();
    res.json({ success: true, message: 'Morning reminders triggered successfully' });
  } catch (error: any) {
    next(error);
  }
};

const handleAfternoon = async (req: any, res: any, next: any) => {
  if (!checkCronAuth(req, res)) return;
  try {
    await sendAfternoonReminders();
    res.json({ success: true, message: 'Afternoon reminders triggered successfully' });
  } catch (error: any) {
    next(error);
  }
};

const handleMonthlyReport = async (req: any, res: any, next: any) => {
  if (!checkCronAuth(req, res)) return;
  try {
    await sendMonthlyAdminReports();
    res.json({ success: true, message: 'Monthly admin reports triggered successfully' });
  } catch (error: any) {
    next(error);
  }
};

router.get('/morning', handleMorning);
router.post('/morning', handleMorning);
router.get('/afternoon', handleAfternoon);
router.post('/afternoon', handleAfternoon);
router.get('/monthly-report', handleMonthlyReport);
router.post('/monthly-report', handleMonthlyReport);

export default router;
