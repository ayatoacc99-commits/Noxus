import { Router } from 'express';
import { authenticate, requirePermission, clientIp } from '../middleware/auth.js';
import { PERMISSIONS } from '../services/authService.js';
import {
  listResources,
  resourceAction,
  toggleEnsureInCfg,
  isCriticalResource,
} from '../services/resourceService.js';
import { logAudit } from '../services/auditService.js';

const router = Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const resources = await listResources();
    res.json({ resources });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function handleResourceAction(req, res, action) {
  try {
    const { name } = req.params;
    const { force } = req.body || {};

    if (action === 'stop' && isCriticalResource(name) && !force) {
      return res.status(409).json({
        error: 'Critical resource',
        message: `${name} is a critical resource. Confirm to proceed.`,
        critical: true,
      });
    }

    await resourceAction(name, action);
    await logAudit({
      userId: req.user.id,
      username: req.user.username,
      role: req.user.role,
      action: `resource.${action}`,
      target: name,
      ipAddress: clientIp(req),
    });
    res.json({ success: true, action, resource: name });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

router.post('/:name/start', authenticate, requirePermission(PERMISSIONS.RESOURCE_MANAGE), (req, res) =>
  handleResourceAction(req, res, 'start')
);
router.post('/:name/stop', authenticate, requirePermission(PERMISSIONS.RESOURCE_MANAGE), (req, res) =>
  handleResourceAction(req, res, 'stop')
);
router.post('/:name/restart', authenticate, requirePermission(PERMISSIONS.RESOURCE_MANAGE), (req, res) =>
  handleResourceAction(req, res, 'restart')
);

router.post(
  '/:name/ensure',
  authenticate,
  requirePermission(PERMISSIONS.RESOURCE_MANAGE),
  async (req, res) => {
    try {
      const { name } = req.params;
      const { enabled } = req.body;
      const result = await toggleEnsureInCfg(name, enabled !== false);
      await logAudit({
        userId: req.user.id,
        username: req.user.username,
        role: req.user.role,
        action: enabled !== false ? 'resource.ensure_add' : 'resource.ensure_remove',
        target: name,
        ipAddress: clientIp(req),
      });
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
);

export default router;
