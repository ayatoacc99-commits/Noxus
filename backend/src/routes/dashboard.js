import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getDashboardStatus } from '../services/metricsService.js';

const router = Router();

router.get('/status', authenticate, async (req, res) => {
  try {
    const status = await getDashboardStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
