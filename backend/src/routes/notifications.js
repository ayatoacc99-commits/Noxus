import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getNotifications, markNotificationRead } from '../services/notificationService.js';
import { findUserById } from '../services/authService.js';

const router = Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const user = await findUserById(req.user.id);
    const notifications = await getNotifications(user.id, user.role);
    res.json({ notifications });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/read', authenticate, async (req, res) => {
  try {
    await markNotificationRead(req.params.id, req.user.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
