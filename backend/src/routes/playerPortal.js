import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { findUserById } from '../services/authService.js';
import {
  findPlayerByCitizenId,
  findPlayerByDiscordId,
  getPlayerVehicles,
  getPlayerHouses,
  getServerStats,
  getPlayerRpStatistics,
  getLeaderboard,
  getAchievements,
  sanitizePlayerForPortal,
} from '../services/playerPortalService.js';
import { getEconomyOverview, getEconomyHistory } from '../services/economyService.js';
import { getGangOverview } from '../services/gangService.js';
import { getDashboardStatus } from '../services/metricsService.js';
import { formatUptime } from '../utils/format.js';
import { isCombatLeaderboardType, PUBLIC_LEADERBOARD_TYPES } from '../utils/combatAccess.js';

const router = Router();
router.use(authenticate);

async function resolveCitizenId(req) {
  const user = await findUserById(req.user.id);
  if (user?.citizenid) return user.citizenid;
  if (user?.discordId) {
    const player = await findPlayerByDiscordId(user.discordId);
    return player?.citizenid;
  }
  return null;
}

router.get('/dashboard', async (req, res) => {
  try {
    const citizenid = await resolveCitizenId(req);
    if (!citizenid) {
      return res.json({ linked: false, message: 'No QB-Core character linked to your account' });
    }

    const [player, stats, serverStats, status] = await Promise.all([
      findPlayerByCitizenId(citizenid),
      getPlayerRpStatistics(citizenid),
      getServerStats(),
      getDashboardStatus(),
    ]);

    res.json({
      linked: true,
      character: sanitizePlayerForPortal(player),
      statistics: stats,
      server: {
        ...serverStats,
        onlinePlayers: status.server.playerCount,
        uptime: formatUptime(status.server.uptime),
        online: status.server.online,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/profile', async (req, res) => {
  try {
    const citizenid = await resolveCitizenId(req);
    if (!citizenid) return res.json({ linked: false });
    const player = await findPlayerByCitizenId(citizenid);
    const stats = await getPlayerRpStatistics(citizenid);
    res.json({
      linked: true,
      player: sanitizePlayerForPortal(player),
      achievements: getAchievements(stats),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/vehicles', async (req, res) => {
  try {
    const citizenid = await resolveCitizenId(req);
    if (!citizenid) return res.json({ linked: false, vehicles: [] });
    const vehicles = await getPlayerVehicles(citizenid);
    const totalValue = vehicles.reduce((s, v) => s + (Number(v.price) || 0), 0);
    res.json({
      linked: true,
      vehicles,
      stats: {
        total: vehicles.length,
        totalValue,
        mostExpensive: vehicles.sort((a, b) => (b.price || 0) - (a.price || 0))[0] || null,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/properties', async (req, res) => {
  try {
    const citizenid = await resolveCitizenId(req);
    if (!citizenid) return res.json({ linked: false, properties: [] });
    const properties = await getPlayerHouses(citizenid);
    res.json({ linked: true, properties });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/statistics', async (req, res) => {
  try {
    const citizenid = await resolveCitizenId(req);
    if (!citizenid) return res.json({ linked: false });
    const stats = await getPlayerRpStatistics(citizenid);
    res.json({ linked: true, statistics: stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/economy', async (req, res) => {
  try {
    const [overview, history] = await Promise.all([
      getEconomyOverview(),
      getEconomyHistory(30),
    ]);
    res.json({ overview, history });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/leaderboards', async (req, res) => {
  try {
    const { type = 'richest', limit = 50, offset = 0 } = req.query;
    const boardType = String(type).toLowerCase();

    if (isCombatLeaderboardType(boardType)) {
      return res.status(403).json({ error: 'Combat leaderboards are not publicly available' });
    }

    if (!PUBLIC_LEADERBOARD_TYPES.includes(boardType)) {
      return res.status(400).json({ error: 'Invalid leaderboard type' });
    }

    const data = await getLeaderboard(boardType, parseInt(limit, 10), parseInt(offset, 10));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/gangs', async (req, res) => {
  try {
    const overview = await getGangOverview();
    res.json(overview);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
