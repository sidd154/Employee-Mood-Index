import { Router } from 'express';
import { getAllUsers, updateUserRole, deleteUser, registerUser } from '../controllers/users';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, requireRole(['admin']), getAllUsers);
router.post('/role', authenticateToken, requireRole(['admin']), updateUserRole);
router.delete('/:id', authenticateToken, requireRole(['admin']), deleteUser);
router.post('/register', authenticateToken, requireRole(['admin']), registerUser);

export default router;
