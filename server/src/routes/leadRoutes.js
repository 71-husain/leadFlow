import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { list, getOne, moveStage } from '../controllers/leadController.js';

const router = Router();

router.use(authenticate, authorize('brokerage_admin', 'advisor'));

router.get('/', list);
router.get('/:id', getOne);
router.patch('/:id/stage', moveStage);

export default router;