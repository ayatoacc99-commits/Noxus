import { Router } from 'express';
import { authenticate, requirePermission, clientIp } from '../middleware/auth.js';
import { PERMISSIONS } from '../services/authService.js';
import { getSanitizedMetadataForRole } from '../services/combatService.js';
import {
  searchPlayers,
  getPlayerByCitizenId,
  updatePlayerMoney,
  updatePlayerJob,
  updatePlayerGang,
  updatePlayerMetadata,
  resetPlayerMetadata,
  wipeCharacter,
  getPlayerVehicles,
  getPlayerInventory,
  banPlayer,
  unbanPlayer,
  addAdminNote,
  getAdminNotes,
  giveMoney,
  removeMoney,
  getInstalledTables,
} from '../services/playerService.js';
import { logAudit } from '../services/auditService.js';

const router = Router();

router.get('/tables', authenticate, async (req, res) => {
  try {
    const tables = await getInstalledTables();
    res.json({ tables });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.PLAYER_VIEW),
  async (req, res) => {
    try {
      const { q = '', limit, offset } = req.query;
      const result = await searchPlayers({
        q,
        limit: parseInt(limit || '50', 10),
        offset: parseInt(offset || '0', 10),
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.get(
  '/:citizenid',
  authenticate,
  requirePermission(PERMISSIONS.PLAYER_VIEW),
  async (req, res) => {
    try {
      const result = await getPlayerByCitizenId(req.params.citizenid);
      if (!result.installed) {
        return res.json({ installed: false, message: 'Not installed' });
      }
      if (!result.player) return res.status(404).json({ error: 'Player not found' });

      const notes = await getAdminNotes(req.params.citizenid);
      const vehicles = await getPlayerVehicles(req.params.citizenid);
      const inventory = await getPlayerInventory(req.params.citizenid);

      const player = {
        ...result.player,
        metadata: getSanitizedMetadataForRole(result.player.metadata, req.user.role),
      };

      res.json({ ...result, player, notes, vehicles, inventory });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.put(
  '/:citizenid',
  authenticate,
  requirePermission(PERMISSIONS.PLAYER_EDIT),
  async (req, res) => {
    try {
      const { citizenid } = req.params;
      const auditContext = {
        userId: req.user.id,
        username: req.user.username,
        role: req.user.role,
        ip: clientIp(req),
      };

      const results = {};

      if (req.body.money) {
        results.money = await updatePlayerMoney(citizenid, req.body.money, auditContext);
        await logAudit({
          ...auditContext,
          userId: req.user.id,
          action: 'player.money_edit',
          target: citizenid,
          oldValue: results.money.oldMoney,
          newValue: results.money.newMoney,
          ipAddress: auditContext.ip,
        });
      }

      if (req.body.job) {
        results.job = await updatePlayerJob(citizenid, req.body.job, auditContext);
        await logAudit({
          userId: req.user.id,
          username: req.user.username,
          role: req.user.role,
          action: 'player.job_edit',
          target: citizenid,
          oldValue: results.job.oldJob,
          newValue: results.job.newJob,
          ipAddress: auditContext.ip,
        });
      }

      if (req.body.gang) {
        results.gang = await updatePlayerGang(citizenid, req.body.gang, auditContext);
        await logAudit({
          userId: req.user.id,
          username: req.user.username,
          role: req.user.role,
          action: 'player.gang_edit',
          target: citizenid,
          oldValue: results.gang.oldGang,
          newValue: results.gang.newGang,
          ipAddress: auditContext.ip,
        });
      }

      if (req.body.metadata) {
        results.metadata = await updatePlayerMetadata(citizenid, req.body.metadata, auditContext);
        await logAudit({
          userId: req.user.id,
          username: req.user.username,
          role: req.user.role,
          action: 'player.metadata_edit',
          target: citizenid,
          oldValue: results.metadata.oldMetadata,
          newValue: results.metadata.newMetadata,
          ipAddress: auditContext.ip,
        });
      }

      res.json({ success: true, results });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
);

router.post(
  '/:citizenid/ban',
  authenticate,
  requirePermission(PERMISSIONS.PLAYER_BAN),
  async (req, res) => {
    try {
      const { reason, expires } = req.body;
      const result = await banPlayer(req.params.citizenid, {
        reason,
        expires,
        bannedBy: req.user.username,
      });
      if (!result.installed) return res.json({ installed: false, message: 'Not installed' });

      await logAudit({
        userId: req.user.id,
        username: req.user.username,
        role: req.user.role,
        action: 'player.ban',
        target: req.params.citizenid,
        newValue: { reason, expires },
        ipAddress: clientIp(req),
      });
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
);

router.post(
  '/:citizenid/unban',
  authenticate,
  requirePermission(PERMISSIONS.PLAYER_BAN),
  async (req, res) => {
    try {
      const { license } = req.body;
      const result = await unbanPlayer(license);
      if (!result.installed) return res.json({ installed: false, message: 'Not installed' });

      await logAudit({
        userId: req.user.id,
        username: req.user.username,
        role: req.user.role,
        action: 'player.unban',
        target: license,
        ipAddress: clientIp(req),
      });
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
);

router.post(
  '/:citizenid/notes',
  authenticate,
  requirePermission(PERMISSIONS.PLAYER_EDIT),
  async (req, res) => {
    try {
      const { note } = req.body;
      await addAdminNote(req.params.citizenid, note, req.user.id);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
);

router.post(
  '/:citizenid/give-money',
  authenticate,
  requirePermission(PERMISSIONS.PLAYER_EDIT),
  async (req, res) => {
    try {
      const { amount, type } = req.body;
      const auditContext = {
        userId: req.user.id,
        username: req.user.username,
        role: req.user.role,
        ip: clientIp(req),
      };
      const result = await giveMoney(req.params.citizenid, amount, type, auditContext);
      await logAudit({
        userId: req.user.id,
        username: req.user.username,
        role: req.user.role,
        action: 'player.give_money',
        target: req.params.citizenid,
        newValue: { amount, type },
        ipAddress: clientIp(req),
      });
      res.json({ success: true, result });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
);

router.post(
  '/:citizenid/remove-money',
  authenticate,
  requirePermission(PERMISSIONS.PLAYER_EDIT),
  async (req, res) => {
    try {
      const { amount, type } = req.body;
      const auditContext = {
        userId: req.user.id,
        username: req.user.username,
        role: req.user.role,
        ip: clientIp(req),
      };
      const result = await removeMoney(req.params.citizenid, amount, type, auditContext);
      await logAudit({
        userId: req.user.id,
        username: req.user.username,
        role: req.user.role,
        action: 'player.remove_money',
        target: req.params.citizenid,
        newValue: { amount, type },
        ipAddress: clientIp(req),
      });
      res.json({ success: true, result });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
);

router.post(
  '/:citizenid/reset-metadata',
  authenticate,
  requirePermission(PERMISSIONS.PLAYER_EDIT),
  async (req, res) => {
    try {
      const auditContext = {
        userId: req.user.id,
        username: req.user.username,
        role: req.user.role,
        ip: clientIp(req),
      };
      const result = await resetPlayerMetadata(req.params.citizenid, auditContext);
      res.json({ success: true, result });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
);

router.post(
  '/:citizenid/wipe',
  authenticate,
  requirePermission(PERMISSIONS.PLAYER_EDIT),
  async (req, res) => {
    try {
      if (req.user.role !== 'owner' && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only owner/admin can wipe characters' });
      }
      const auditContext = {
        userId: req.user.id,
        username: req.user.username,
        role: req.user.role,
        ip: clientIp(req),
      };
      await wipeCharacter(req.params.citizenid, auditContext);
      await logAudit({
        userId: req.user.id,
        username: req.user.username,
        role: req.user.role,
        action: 'player.wipe',
        target: req.params.citizenid,
        ipAddress: clientIp(req),
      });
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
);

export default router;
