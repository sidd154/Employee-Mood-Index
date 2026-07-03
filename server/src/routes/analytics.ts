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

router.get('/overview', authenticateToken, requireRole(['admin']), getOverviewStats);
router.get('/trends', authenticateToken, requireRole(['admin']), getMoodTrends);
router.get('/distribution', authenticateToken, requireRole(['admin']), getMoodDistribution);
router.get('/departments', authenticateToken, requireRole(['admin']), getDepartmentAnalytics);
router.get('/departments/:id', authenticateToken, requireRole(['admin']), getDepartmentDetails);
router.get('/feelings', authenticateToken, requireRole(['admin']), getFeelingsAnalytics);
router.get('/contributors', authenticateToken, requireRole(['admin']), getContributorAnalytics);

export default router;
