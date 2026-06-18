import { Router } from 'express';
import { getTodayStatus, createCheckin } from '../controllers/checkins';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

router.get('/today-status', authenticateToken, requireRole(['employee']), getTodayStatus);
router.post('/', authenticateToken, requireRole(['employee']), createCheckin);

export default router;
