import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { receiveTallyLead } from '../controllers/webhookController.js';

const router = Router();

// Limit PER BROKERAGE (keyed by slug), so one brokerage flooding can't use up everyone else's allowance
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 100,
  keyGenerator: (req) => req.params.slug,
  validate: { keyGeneratorIpFallback: false },
});

router.post('/tally/:slug', webhookLimiter, receiveTallyLead);

export default router;