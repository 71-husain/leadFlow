import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, authorize } from '../middleware/auth.js';
import { uploadSingle } from '../middleware/upload.js';
import { myCase, upload } from '../controllers/documentController.js';

const router = Router();

router.use(authenticate, authorize('client'));

// Per-user limit, so one client can't flood uploads
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  keyGenerator: (req) => req.user.id,
  validate: { keyGeneratorIpFallback: false },
});

router.get('/case', myCase);
router.post('/documents', uploadLimiter, uploadSingle, upload);

export default router;