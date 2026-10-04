import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { downloadFile } from '../controllers/documentController.js';

const router = Router();
router.use(authenticate, authorize('brokerage_admin', 'advisor', 'client'));
router.get('/:id/file', downloadFile);

export default router;