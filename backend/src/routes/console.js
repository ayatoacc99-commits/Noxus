import { Router } from 'express';
import { authenticate, requirePermission, clientIp } from '../middleware/auth.js';
import { PERMISSIONS } from '../services/authService.js';
import { getConsoleHistory, sendConsoleCommand } from '../services/consoleService.js';
import { logAudit } from '../services/auditService.js';

const router = Router();

router.get('/logs', authenticate, (req, res) => {
  const { limit, search, level } = req.query;
  const logs = getConsoleHistory({
    limit: parseInt(limit || '200', 10),
    search: search || '',
    level: level || null,
  });
  res.json({ logs });
});

router.post(
  '/command',
  authenticate,
  requirePermission(PERMISSIONS.CONSOLE_COMMAND),
  async (req, res) => {
    try {
      const { command } = req.body;
      const result = await sendConsoleCommand(command, req.user);
      await logAudit({
        userId: req.user.id,
        username: req.user.username,
        role: req.user.role,
        action: 'console.command',
        target: command,
        ipAddress: clientIp(req),
      });
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
);

export default router;
