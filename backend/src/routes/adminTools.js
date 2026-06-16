import { Router } from 'express';
import { authenticate, requireAdmin, requirePermission, clientIp } from '../middleware/auth.js';
import { PERMISSIONS } from '../services/authService.js';
import { getLivePlayers, enrichLivePlayers, adminPlayerAction } from '../services/liveMonitorService.js';
import { getResourcePerformance } from '../services/resourcePerformanceService.js';
import { getEconomyOverview, getEconomyHistory, adminInjectMoney, adminRemoveMoney } from '../services/economyService.js';
import { getGangOverview, getGangProfile } from '../services/gangService.js';
import { logAudit } from '../services/auditService.js';
import { updatePlayerJob, updatePlayerGang } from '../services/playerService.js';

const router = Router();
router.use(authenticate, requireAdmin);

router.get('/monitor/players', requirePermission(PERMISSIONS.LIVE_MONITOR), async (req, res) => {
  try {
    const live = await getLivePlayers();
    const enriched = await enrichLivePlayers(live);
    res.json({ players: enriched });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/monitor/action', requirePermission(PERMISSIONS.LIVE_MONITOR), async (req, res) => {
  try {
    const { action, target, data } = req.body;
    const result = await adminPlayerAction(action, target, data);
    await logAudit({
      userId: req.user.id,
      username: req.user.username,
      role: req.user.role,
      action: `monitor.${action}`,
      target,
      newValue: data,
      ipAddress: clientIp(req),
    });
    res.json({ success: true, result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/monitor/give-money', requirePermission(PERMISSIONS.PLAYER_EDIT), async (req, res) => {
  try {
    const { citizenid, amount, type } = req.body;
    const auditContext = { userId: req.user.id, username: req.user.username, role: req.user.role, ip: clientIp(req) };
    const { giveMoney } = await import('../services/playerService.js');
    await giveMoney(citizenid, amount, type || 'cash', auditContext);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/monitor/set-job', requirePermission(PERMISSIONS.PLAYER_EDIT), async (req, res) => {
  try {
    const { citizenid, name, grade } = req.body;
    const auditContext = { userId: req.user.id, username: req.user.username, role: req.user.role, ip: clientIp(req) };
    await updatePlayerJob(citizenid, { name, grade }, auditContext);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/monitor/set-gang', requirePermission(PERMISSIONS.PLAYER_EDIT), async (req, res) => {
  try {
    const { citizenid, name, grade } = req.body;
    const auditContext = { userId: req.user.id, username: req.user.username, role: req.user.role, ip: clientIp(req) };
    await updatePlayerGang(citizenid, { name, grade }, auditContext);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/performance/resources', async (req, res) => {
  try {
    const resources = await getResourcePerformance();
    res.json({ resources });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/economy', requirePermission(PERMISSIONS.ECONOMY_MANAGE), async (req, res) => {
  try {
    const [overview, history] = await Promise.all([getEconomyOverview(), getEconomyHistory(60)]);
    res.json({ overview, history });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/economy/inject', requirePermission(PERMISSIONS.ECONOMY_MANAGE), async (req, res) => {
  try {
    const { citizenid, amount, type } = req.body;
    const auditContext = { userId: req.user.id, username: req.user.username, role: req.user.role, ip: clientIp(req) };
    const result = await adminInjectMoney(citizenid, amount, type || 'cash', auditContext);
    await logAudit({
      userId: req.user.id,
      username: req.user.username,
      role: req.user.role,
      action: 'economy.inject',
      target: citizenid,
      newValue: { amount, type },
      ipAddress: clientIp(req),
    });
    res.json({ success: true, result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/economy/remove', requirePermission(PERMISSIONS.ECONOMY_MANAGE), async (req, res) => {
  try {
    const { citizenid, amount, type } = req.body;
    const auditContext = { userId: req.user.id, username: req.user.username, role: req.user.role, ip: clientIp(req) };
    const result = await adminRemoveMoney(citizenid, amount, type || 'cash', auditContext);
    await logAudit({
      userId: req.user.id,
      username: req.user.username,
      role: req.user.role,
      action: 'economy.remove',
      target: citizenid,
      newValue: { amount, type },
      ipAddress: clientIp(req),
    });
    res.json({ success: true, result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/gangs', requirePermission(PERMISSIONS.GANG_MANAGE), async (req, res) => {
  try {
    const overview = await getGangOverview();
    res.json(overview);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/gangs/:name', requirePermission(PERMISSIONS.GANG_MANAGE), async (req, res) => {
  try {
    const gang = await getGangProfile(req.params.name);
    if (!gang) return res.status(404).json({ error: 'Gang not found' });
    res.json(gang);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
