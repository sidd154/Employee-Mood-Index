import { Router } from 'express';
import { getSettings, updateSettings, addDomain, deleteDomain } from '../controllers/settings';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, getSettings);
router.put('/', authenticateToken, requireRole(['super_admin']), updateSettings);
router.post('/domains', authenticateToken, requireRole(['super_admin']), addDomain);
router.delete('/domains/:id', authenticateToken, requireRole(['super_admin']), deleteDomain);

export default router;
