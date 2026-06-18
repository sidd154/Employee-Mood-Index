import { Router } from 'express';
import { getSettings, updateSettings, addDomain, deleteDomain, addDepartment, deleteDepartment } from '../controllers/settings';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, getSettings);
router.put('/', authenticateToken, requireRole(['super_admin']), updateSettings);
router.post('/domains', authenticateToken, requireRole(['super_admin']), addDomain);
router.delete('/domains/:id', authenticateToken, requireRole(['super_admin']), deleteDomain);
router.post('/departments', authenticateToken, requireRole(['super_admin', 'admin']), addDepartment);
router.delete('/departments/:id', authenticateToken, requireRole(['super_admin', 'admin']), deleteDepartment);

export default router;
