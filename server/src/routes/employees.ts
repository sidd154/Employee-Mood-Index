import { Router } from 'express';
import { getEmployeeExplorer, getEmployeeDetails } from '../controllers/analytics';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, requireRole(['super_admin', 'admin']), getEmployeeExplorer);
router.get('/:id', authenticateToken, requireRole(['super_admin', 'admin']), getEmployeeDetails);

export default router;
