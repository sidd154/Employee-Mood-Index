import { Router } from 'express';
import { getEmployeeExplorer, getEmployeeDetails } from '../controllers/analytics';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, requireRole(['admin']), getEmployeeExplorer);
router.get('/:id', authenticateToken, requireRole(['admin']), getEmployeeDetails);

export default router;
