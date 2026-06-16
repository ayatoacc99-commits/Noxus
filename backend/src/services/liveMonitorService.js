import { sendRconCommand } from './rconClient.js';
import { findPlayerByCitizenId } from './playerPortalService.js';
import { getFivemPool, tableExists } from '../db/pool.js';
import { parseJsonSafe } from '../utils/jsonSafe.js';

export async function getLivePlayers() {
  try {
    const response = await sendRconCommand('status');
    return parseStatusOutput(response);
  } catch {
    return [];
  }
}

function parseStatusOutput(output) {
  const players = [];
  const lines = output.split('\n');
  let inPlayers = false;

  for (const line of lines) {
    if (line.includes('id name')) {
      inPlayers = true;
      continue;
    }
    if (!inPlayers || !line.trim()) continue;
    if (line.startsWith('--')) break;

    const parts = line.trim().split(/\s+/);
    if (parts.length >= 3) {
      players.push({
        serverId: parts[0],
        name: parts.slice(1, -1).join(' '),
        ping: parseInt(parts[parts.length - 1], 10) || 0,
      });
    }
  }

  return players;
}

export async function enrichLivePlayers(livePlayers) {
  const pool = getFivemPool();
  const enriched = [];

  for (const lp of livePlayers) {
    let dbPlayer = null;
    if (await tableExists(pool, 'players')) {
      const [rows] = await pool.query(
        `SELECT * FROM players WHERE name LIKE :name LIMIT 1`,
        { name: `%${lp.name}%` }
      );
      if (rows[0]) {
        const charinfo = parseJsonSafe(rows[0].charinfo, {});
        const job = parseJsonSafe(rows[0].job, {});
        const gang = parseJsonSafe(rows[0].gang, {});
        const meta = parseJsonSafe(rows[0].metadata, {});
        dbPlayer = {
          citizenid: rows[0].citizenid,
          permanentId: meta.permanentid || meta.permanent_id,
          job: job.label || job.name,
          gang: gang.label || gang.name,
          playtime: meta.playtime || 0,
          discord: charinfo.discord,
        };
      }
    }

    enriched.push({
      ...lp,
      ...dbPlayer,
      characterName: lp.name,
    });
  }

  return enriched;
}

export async function adminPlayerAction(action, target, data = {}) {
  const allowed = ['kick', 'ban', 'freeze', 'teleport', 'spectate'];
  if (!allowed.includes(action)) {
    throw new Error('Action not allowed');
  }

  const commands = {
    kick: `kick ${target} ${data.reason || 'Kicked by admin'}`,
    ban: `ban ${target} ${data.reason || 'Banned by admin'}`,
    freeze: `freeze ${target}`,
    teleport: `teleport ${target} ${data.x || 0} ${data.y || 0} ${data.z || 0}`,
    spectate: `spectate ${target}`,
  };

  if (!commands[action]) throw new Error('Invalid action');
  return sendRconCommand(commands[action]);
}

export async function getPlayerForMonitor(citizenid) {
  const player = await findPlayerByCitizenId(citizenid);
  if (!player) return null;
  return player;
}
