import { Router } from 'express';
import { getSettings, updateSettings, addDomain, deleteDomain, addDepartment, deleteDepartment } from '../controllers/settings';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, getSettings);
router.put('/', authenticateToken, requireRole(['admin']), updateSettings);
router.post('/domains', authenticateToken, requireRole(['admin']), addDomain);
router.delete('/domains/:id', authenticateToken, requireRole(['admin']), deleteDomain);
router.post('/departments', authenticateToken, requireRole(['admin']), addDepartment);
router.delete('/departments/:id', authenticateToken, requireRole(['admin']), deleteDepartment);

export default router;
