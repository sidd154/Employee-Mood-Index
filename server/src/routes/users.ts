import { Router } from 'express';
import { getAllUsers, updateUserRole, deleteUser } from '../controllers/users';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, requireRole(['super_admin', 'admin']), getAllUsers);
router.post('/role', authenticateToken, requireRole(['super_admin']), updateUserRole);
router.delete('/:id', authenticateToken, requireRole(['super_admin']), deleteUser);

export default router;
