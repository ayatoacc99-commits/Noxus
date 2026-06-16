import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { PERMISSIONS } from '../services/authService.js';
import { getPanelPool } from '../db/pool.js';
import config from '../config/index.js';
import { getFivemPaths } from '../services/fivemProcess.js';

const router = Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const pool = getPanelPool();
    const [rows] = await pool.query('SELECT `key`, value, is_secret FROM panel_settings');
    const settings = {};
    for (const row of rows) {
      settings[row.key] = row.is_secret ? '********' : row.value;
    }
    res.json({
      settings,
      env: {
        processMode: config.fivem.processMode,
        backupRetention: config.backup.retentionCount,
        ipAllowlistEnabled: config.security.ipAllowlist.length > 0,
      },
      paths: getFivemPaths(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.SETTINGS_MANAGE),
  async (req, res) => {
    try {
      const pool = getPanelPool();
      const { settings } = req.body;
      for (const [key, value] of Object.entries(settings || {})) {
        if (!/^[a-z0-9_]+$/.test(key)) continue;
        await pool.query(
          `INSERT INTO panel_settings (\`key\`, value) VALUES (:key, :value)
           ON DUPLICATE KEY UPDATE value = :value`,
          { key, value: String(value) }
        );
      }
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
);

export default router;
