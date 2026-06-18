import { Router } from 'express';
import {
  getOverviewStats,
  getMoodTrends,
  getMoodDistribution,
  getDepartmentAnalytics,
  getDepartmentDetails,
  getFeelingsAnalytics,
  getContributorAnalytics,
} from '../controllers/analytics';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

router.get('/overview', authenticateToken, requireRole(['super_admin', 'admin']), getOverviewStats);
router.get('/trends', authenticateToken, requireRole(['super_admin', 'admin']), getMoodTrends);
router.get('/distribution', authenticateToken, requireRole(['super_admin', 'admin']), getMoodDistribution);
router.get('/departments', authenticateToken, requireRole(['super_admin', 'admin']), getDepartmentAnalytics);
router.get('/departments/:id', authenticateToken, requireRole(['super_admin', 'admin']), getDepartmentDetails);
router.get('/feelings', authenticateToken, requireRole(['super_admin', 'admin']), getFeelingsAnalytics);
router.get('/contributors', authenticateToken, requireRole(['super_admin', 'admin']), getContributorAnalytics);

export default router;
