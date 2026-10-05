import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { getDashboard } from '../services/dashboardService.js';

const router = Router();
router.use(authenticate, authorize('brokerage_admin', 'advisor'));
router.get('/', async (req, res) => res.json(await getDashboard(req.user.brokerageId)));

export default router;