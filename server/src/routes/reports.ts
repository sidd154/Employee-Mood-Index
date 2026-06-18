import { Router } from 'express';
import { requestEmployeeReport, requestAdminReport } from '../controllers/reports';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

router.post('/employee', authenticateToken, requireRole(['employee']), requestEmployeeReport);
router.post('/admin', authenticateToken, requireRole(['super_admin', 'admin']), requestAdminReport);

export default router;
