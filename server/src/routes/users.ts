import { Router } from 'express';
import { getAllUsers, updateUserRole, deleteUser, registerUser, importUsers, updateOwnProfile, adminUpdateUser } from '../controllers/users';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, requireRole(['admin']), getAllUsers);
router.post('/role', authenticateToken, requireRole(['admin']), updateUserRole);
router.delete('/:id', authenticateToken, requireRole(['admin']), deleteUser);
router.post('/register', authenticateToken, requireRole(['admin']), registerUser);
router.post('/import', authenticateToken, requireRole(['admin']), importUsers);
router.put('/profile', authenticateToken, updateOwnProfile);
router.put('/:id', authenticateToken, requireRole(['admin']), adminUpdateUser);

export default router;
