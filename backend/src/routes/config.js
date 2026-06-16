import { Router } from 'express';
import { authenticate, requirePermission, clientIp } from '../middleware/auth.js';
import { PERMISSIONS } from '../services/authService.js';
import { readServerCfg, writeServerCfg, listConfigBackups } from '../services/configService.js';
import { logAudit } from '../services/auditService.js';

const router = Router();

router.get(
  '/server-cfg',
  authenticate,
  requirePermission(PERMISSIONS.SERVER_CONFIG),
  async (req, res) => {
    try {
      const reveal = req.query.reveal === 'true' && req.user.role === 'owner';
      const cfg = await readServerCfg(!reveal);
      res.json(cfg);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.put(
  '/server-cfg',
  authenticate,
  requirePermission(PERMISSIONS.SERVER_CONFIG),
  async (req, res) => {
    try {
      const { content, confirm } = req.body;
      if (!content) return res.status(400).json({ error: 'Content required' });
      if (!confirm) return res.status(400).json({ error: 'Confirmation required' });

      const current = await readServerCfg(false);
      const result = await writeServerCfg(content, req.user.id);

      await logAudit({
        userId: req.user.id,
        username: req.user.username,
        role: req.user.role,
        action: 'config.server_cfg_edit',
        target: 'server.cfg',
        oldValue: { length: current.content.length },
        newValue: { length: content.length, backup: result.backupName },
        ipAddress: clientIp(req),
      });

      res.json({ success: true, ...result });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
);

router.get(
  '/server-cfg/backups',
  authenticate,
  requirePermission(PERMISSIONS.SERVER_CONFIG),
  async (req, res) => {
    try {
      const backups = await listConfigBackups();
      res.json({ backups });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

export default router;
