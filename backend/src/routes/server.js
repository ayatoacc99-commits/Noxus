import { Router } from 'express';
import { authenticate, requirePermission, clientIp } from '../middleware/auth.js';
import { PERMISSIONS } from '../services/authService.js';
import { startFivem, stopFivem, restartFivem, getFivemPaths } from '../services/fivemProcess.js';
import { logAudit } from '../services/auditService.js';

const router = Router();

router.get('/paths', authenticate, (req, res) => {
  res.json(getFivemPaths());
});

router.post(
  '/start',
  authenticate,
  requirePermission(PERMISSIONS.SERVER_CONTROL),
  async (req, res) => {
    try {
      await startFivem();
      await logAudit({
        userId: req.user.id,
        username: req.user.username,
        role: req.user.role,
        action: 'server.start',
        ipAddress: clientIp(req),
      });
      res.json({ success: true, message: 'Server start initiated' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.post(
  '/stop',
  authenticate,
  requirePermission(PERMISSIONS.SERVER_CONTROL),
  async (req, res) => {
    try {
      await stopFivem();
      await logAudit({
        userId: req.user.id,
        username: req.user.username,
        role: req.user.role,
        action: 'server.stop',
        ipAddress: clientIp(req),
      });
      res.json({ success: true, message: 'Server stop initiated' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.post(
  '/restart',
  authenticate,
  requirePermission(PERMISSIONS.SERVER_CONTROL),
  async (req, res) => {
    try {
      await restartFivem();
      await logAudit({
        userId: req.user.id,
        username: req.user.username,
        role: req.user.role,
        action: 'server.restart',
        ipAddress: clientIp(req),
      });
      res.json({ success: true, message: 'Server restart initiated' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

export default router;
