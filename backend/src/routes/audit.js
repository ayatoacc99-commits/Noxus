import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { PERMISSIONS } from '../services/authService.js';
import { getAuditLogs } from '../services/auditService.js';

const router = Router();

router.get('/', authenticate, requirePermission(PERMISSIONS.AUDIT_VIEW), async (req, res) => {
  try {
    const { limit, offset, action } = req.query;
    const logs = await getAuditLogs({
      limit: parseInt(limit || '100', 10),
      offset: parseInt(offset || '0', 10),
      action: action || null,
    });
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
