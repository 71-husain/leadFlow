import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { list, getOne, moveStage } from '../controllers/leadController.js';
import { convert } from '../controllers/leadController.js';
import { leadDocuments } from '../controllers/documentController.js';

const router = Router();

router.use(authenticate, authorize('brokerage_admin', 'advisor'));

router.get('/', list);
router.get('/:id', getOne);
router.patch('/:id/stage', moveStage);

router.post('/:id/convert', convert);
router.get('/:id/documents', leadDocuments);

export default router;