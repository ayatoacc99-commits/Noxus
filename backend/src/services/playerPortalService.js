import { getFivemPool, tableExists } from '../db/pool.js';
import { parseJsonSafe } from '../utils/jsonSafe.js';

export async function findPlayerByDiscordId(discordId) {
  const pool = getFivemPool();
  if (!(await tableExists(pool, 'players'))) return null;

  const discordSearch = discordId.replace('discord:', '');
  const [rows] = await pool.query(
    `SELECT * FROM players
     WHERE license LIKE :discordLicense
        OR charinfo LIKE :discordJson
        OR JSON_UNQUOTE(JSON_EXTRACT(charinfo, '$.discord')) = :discordId
        OR JSON_UNQUOTE(JSON_EXTRACT(charinfo, '$.discord')) = :discordRaw
     ORDER BY last_updated DESC
     LIMIT 1`,
    {
      discordLicense: `%discord:${discordSearch}%`,
      discordJson: `%${discordId}%`,
      discordId: discordId,
      discordRaw: discordSearch,
    }
  );
  if (!rows[0]) return null;
  return formatPlayerRow(rows[0]);
}

export async function findPlayerByCitizenId(citizenid) {
  const pool = getFivemPool();
  if (!(await tableExists(pool, 'players'))) return null;
  const [rows] = await pool.query('SELECT * FROM players WHERE citizenid = :citizenid LIMIT 1', { citizenid });
  if (!rows[0]) return null;
  return formatPlayerRow(rows[0]);
}

function formatPlayerRow(row) {
  const charinfo = parseJsonSafe(row.charinfo, {});
  const money = parseJsonSafe(row.money, {});
  const job = parseJsonSafe(row.job, {});
  const gang = parseJsonSafe(row.gang, {});
  const metadata = parseJsonSafe(row.metadata, {});
  const position = parseJsonSafe(row.position, {});

  return {
    citizenid: row.citizenid,
    license: row.license,
    name: row.name || `${charinfo.firstname || ''} ${charinfo.lastname || ''}`.trim(),
    charinfo,
    money,
    job,
    gang,
    metadata,
    position,
    lastUpdated: row.last_updated,
    phone: charinfo.phone,
    permanentId: metadata.permanentid || metadata.permanent_id || row.id || null,
  };
}

export async function getPlayerVehicles(citizenid) {
  const pool = getFivemPool();
  if (!(await tableExists(pool, 'player_vehicles'))) return [];
  const [rows] = await pool.query('SELECT * FROM player_vehicles WHERE citizenid = :citizenid', { citizenid });
  return rows.map((v) => ({
    ...v,
    mods: v.mods ? parseJsonSafe(v.mods, {}) : {},
    state: v.state ?? 1,
    fuel: v.fuel ?? 100,
    engine: v.engine ?? 1000,
    body: v.body ?? 1000,
  }));
}

export async function getPlayerHouses(citizenid) {
  const pool = getFivemPool();
  for (const table of ['player_houses', 'houselocations', 'properties']) {
    if (!(await tableExists(pool, table))) continue;
    try {
      const [rows] = await pool.query(`SELECT * FROM ${table} WHERE citizenid = :citizenid`, { citizenid });
      if (rows.length) return rows;
    } catch {
      // table schema may differ
    }
  }
  return [];
}

export async function getServerStats() {
  const pool = getFivemPool();
  const stats = {
    totalPlayers: 0,
    totalVehicles: 0,
    totalHouses: 0,
    onlinePlayers: 0,
    peakPlayers: 0,
  };

  if (await tableExists(pool, 'players')) {
    const [[{ cnt }]] = await pool.query('SELECT COUNT(*) AS cnt FROM players');
    stats.totalPlayers = cnt;
  }
  if (await tableExists(pool, 'player_vehicles')) {
    const [[{ cnt }]] = await pool.query('SELECT COUNT(*) AS cnt FROM player_vehicles');
    stats.totalVehicles = cnt;
  }
  if (await tableExists(pool, 'player_houses')) {
    const [[{ cnt }]] = await pool.query('SELECT COUNT(*) AS cnt FROM player_houses');
    stats.totalHouses = cnt;
  }

  return stats;
}

export async function getPlayerStatistics(citizenid) {
  const player = await findPlayerByCitizenId(citizenid);
  if (!player) return null;

  const vehicles = await getPlayerVehicles(citizenid);
  const houses = await getPlayerHouses(citizenid);
  const meta = player.metadata;

  return {
    hoursPlayed: meta.playtime || meta.hours || meta.timeplayed || 0,
    arrests: meta.arrests || meta.jailtime || 0,
    deaths: meta.deaths || 0,
    kills: meta.kills || 0,
    jobsCompleted: meta.jobscompleted || meta.jobrep || 0,
    vehiclesOwned: vehicles.length,
    housesOwned: houses.length,
    cash: player.money.cash || 0,
    bank: player.money.bank || 0,
  };
}

export async function getLeaderboard(type = 'richest', limit = 50, offset = 0) {
  const pool = getFivemPool();
  if (!(await tableExists(pool, 'players'))) return { installed: false, entries: [] };

  let orderBy = 'last_updated DESC';
  if (type === 'richest') {
    orderBy = `(CAST(JSON_UNQUOTE(JSON_EXTRACT(money, '$.cash')) AS UNSIGNED) + CAST(JSON_UNQUOTE(JSON_EXTRACT(money, '$.bank')) AS UNSIGNED)) DESC`;
  } else if (type === 'hours') {
    orderBy = `CAST(JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.playtime')) AS UNSIGNED) DESC`;
  }

  const [rows] = await pool.query(
    `SELECT citizenid, name, charinfo, money, job, gang, metadata
     FROM players
     ORDER BY ${orderBy}
     LIMIT :limit OFFSET :offset`,
    { limit, offset }
  );

  return {
    installed: true,
    entries: rows.map((row, index) => {
      const money = parseJsonSafe(row.money, {});
      const job = parseJsonSafe(row.job, {});
      const gang = parseJsonSafe(row.gang, {});
      const meta = parseJsonSafe(row.metadata, {});
      const charinfo = parseJsonSafe(row.charinfo, {});
      return {
        rank: offset + index + 1,
        citizenid: row.citizenid,
        name: row.name || `${charinfo.firstname || ''} ${charinfo.lastname || ''}`.trim(),
        cash: money.cash || 0,
        bank: money.bank || 0,
        total: (money.cash || 0) + (money.bank || 0),
        job: job.label || job.name,
        gang: gang.label || gang.name,
        hours: meta.playtime || 0,
      };
    }),
  };
}

export function getAchievements(stats) {
  const achievements = [];
  const hours = Number(stats?.hoursPlayed || 0);

  if (hours >= 10) achievements.push({ id: 'hours_10', title: 'Getting Started', progress: Math.min(100, (hours / 10) * 100), target: 10, current: hours });
  if (hours >= 100) achievements.push({ id: 'hours_100', title: 'Dedicated Citizen', progress: Math.min(100, (hours / 100) * 100), target: 100, current: hours });
  if (stats?.vehiclesOwned >= 1) achievements.push({ id: 'first_car', title: 'First Ride', progress: 100, target: 1, current: stats.vehiclesOwned });
  if (stats?.housesOwned >= 1) achievements.push({ id: 'homeowner', title: 'Homeowner', progress: 100, target: 1, current: stats.housesOwned });
  if (stats?.jobsCompleted >= 10) achievements.push({ id: 'worker', title: 'Hard Worker', progress: Math.min(100, (stats.jobsCompleted / 10) * 100), target: 10, current: stats.jobsCompleted });

  return achievements;
}
