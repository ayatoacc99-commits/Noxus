import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { authenticate, requirePermission, clientIp } from '../middleware/auth.js';
import { PERMISSIONS } from '../services/authService.js';
import { listBackups, createBackup, deleteBackup } from '../services/backupService.js';
import { logAudit } from '../services/auditService.js';
import { getPanelPool } from '../db/pool.js';

const router = Router();

router.get('/', authenticate, requirePermission(PERMISSIONS.BACKUP_MANAGE), async (req, res) => {
  try {
    const backups = await listBackups();
    res.json({ backups });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post(
  '/create',
  authenticate,
  requirePermission(PERMISSIONS.BACKUP_MANAGE),
  async (req, res) => {
    try {
      const { types } = req.body;
      const io = req.app.get('io');
      const result = await createBackup(
        types || ['server-data', 'resources', 'server-cfg', 'database'],
        req.user.id,
        (progress) => io?.emit('backup:progress', progress)
      );

      await logAudit({
        userId: req.user.id,
        username: req.user.username,
        role: req.user.role,
        action: 'backup.create',
        target: result.filename,
        ipAddress: clientIp(req),
      });

      res.json({ success: true, ...result });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.get(
  '/:id/download',
  authenticate,
  requirePermission(PERMISSIONS.BACKUP_MANAGE),
  async (req, res) => {
    try {
      const pool = getPanelPool();
      const [rows] = await pool.query('SELECT * FROM panel_backups WHERE id = :id', {
        id: req.params.id,
      });
      const backup = rows[0];
      if (!backup || backup.status !== 'completed') {
        return res.status(404).json({ error: 'Backup not found' });
      }
      if (!fs.existsSync(backup.filepath)) {
        return res.status(404).json({ error: 'Backup file missing' });
      }
      res.download(backup.filepath, backup.filename);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.delete(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.BACKUP_MANAGE),
  async (req, res) => {
    try {
      await deleteBackup(req.params.id);
      await logAudit({
        userId: req.user.id,
        username: req.user.username,
        role: req.user.role,
        action: 'backup.delete',
        target: req.params.id,
        ipAddress: clientIp(req),
      });
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
);

export default router;
