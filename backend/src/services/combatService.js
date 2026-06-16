import { getPanelPool } from '../db/pool.js';
import { getFivemPool, tableExists } from '../db/pool.js';
import { parseJsonSafe } from '../utils/jsonSafe.js';
import { stripCombatFromMetadata, canViewCombatLogs } from '../utils/combatAccess.js';

export async function getCombatLogs({ citizenid, limit = 50, offset = 0 } = {}) {
  const pool = getPanelPool();
  const params = { limit, offset };
  let where = '1=1';

  if (citizenid) {
    where = '(citizenid = :citizenid OR attacker_citizenid = :citizenid)';
    params.citizenid = citizenid;
  }

  const [rows] = await pool.query(
    `SELECT id, citizenid, victim_name, attacker_citizenid, attacker_name, weapon,
            event_type, location, details, occurred_at
     FROM panel_combat_logs
     WHERE ${where}
     ORDER BY occurred_at DESC
     LIMIT :limit OFFSET :offset`,
    params
  );

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM panel_combat_logs WHERE ${where}`,
    citizenid ? { citizenid } : {}
  );

  return {
    logs: rows.map((row) => ({
      ...row,
      details: typeof row.details === 'string' ? parseJsonSafe(row.details, {}) : row.details,
    })),
    total,
  };
}

export async function getPlayerCombatStats(citizenid) {
  const pool = getFivemPool();
  if (!(await tableExists(pool, 'players'))) {
    return { installed: false, stats: null };
  }

  const [rows] = await pool.query('SELECT metadata FROM players WHERE citizenid = :citizenid LIMIT 1', {
    citizenid,
  });
  if (!rows[0]) return { installed: true, stats: null };

  const meta = parseJsonSafe(rows[0].metadata, {});
  const kills = Number(meta.kills || 0);
  const deaths = Number(meta.deaths || 0);

  return {
    installed: true,
    stats: {
      kills,
      deaths,
      kdRatio: deaths > 0 ? Number((kills / deaths).toFixed(2)) : kills,
      weaponKills: meta.weapon_kills || meta.weapongkills || meta.weaponkills || {},
      combatLogs: meta.combatlog || meta.combat_log || meta.combatlogs || [],
    },
  };
}

export async function getCombatLeaderboard(type, limit = 50, offset = 0) {
  const pool = getFivemPool();
  if (!(await tableExists(pool, 'players'))) {
    return { installed: false, entries: [] };
  }

  let orderExpr = 'CAST(JSON_UNQUOTE(JSON_EXTRACT(metadata, "$.kills")) AS UNSIGNED) DESC';
  let valueKey = 'kills';

  if (type === 'deaths' || type === 'most_deaths') {
    orderExpr = 'CAST(JSON_UNQUOTE(JSON_EXTRACT(metadata, "$.deaths")) AS UNSIGNED) DESC';
    valueKey = 'deaths';
  } else if (type === 'kd' || type === 'kd_ratio' || type === 'kdr') {
    orderExpr = `(CAST(JSON_UNQUOTE(JSON_EXTRACT(metadata, "$.kills")) AS UNSIGNED) /
      GREATEST(CAST(JSON_UNQUOTE(JSON_EXTRACT(metadata, "$.deaths")) AS UNSIGNED), 1)) DESC`;
    valueKey = 'kdRatio';
  }

  const [rows] = await pool.query(
    `SELECT citizenid, name, charinfo, metadata
     FROM players
     ORDER BY ${orderExpr}
     LIMIT :limit OFFSET :offset`,
    { limit, offset }
  );

  return {
    installed: true,
    entries: rows.map((row, index) => {
      const meta = parseJsonSafe(row.metadata, {});
      const charinfo = parseJsonSafe(row.charinfo, {});
      const kills = Number(meta.kills || 0);
      const deaths = Number(meta.deaths || 0);
      return {
        rank: offset + index + 1,
        citizenid: row.citizenid,
        name: row.name || `${charinfo.firstname || ''} ${charinfo.lastname || ''}`.trim(),
        kills,
        deaths,
        kdRatio: deaths > 0 ? Number((kills / deaths).toFixed(2)) : kills,
        value: valueKey === 'deaths' ? deaths : valueKey === 'kdRatio' ? (deaths > 0 ? kills / deaths : kills) : kills,
      };
    }),
  };
}

export function getSanitizedMetadataForRole(metadata, role) {
  if (canViewCombatLogs(role)) return metadata;
  return stripCombatFromMetadata(metadata);
}
