import { getFivemPool, tableExists } from '../db/pool.js';
import { parseJsonSafe } from '../utils/jsonSafe.js';
import { stripCombatFromPlayer } from '../utils/combatAccess.js';

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

export function sanitizePlayerForPortal(player) {
  return stripCombatFromPlayer(player);
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

async function getEconomyRank(citizenid) {
  const pool = getFivemPool();
  if (!(await tableExists(pool, 'players'))) return null;

  const [rows] = await pool.query(
    `SELECT citizenid FROM players
     ORDER BY (CAST(JSON_UNQUOTE(JSON_EXTRACT(money, '$.cash')) AS UNSIGNED) +
               CAST(JSON_UNQUOTE(JSON_EXTRACT(money, '$.bank')) AS UNSIGNED)) DESC`
  );

  const index = rows.findIndex((row) => row.citizenid === citizenid);
  return index >= 0 ? index + 1 : null;
}

export async function getPlayerRpStatistics(citizenid) {
  const player = await findPlayerByCitizenId(citizenid);
  if (!player) return null;

  const vehicles = await getPlayerVehicles(citizenid);
  const houses = await getPlayerHouses(citizenid);
  const meta = player.metadata;
  const job = player.job || {};

  const economyRank = await getEconomyRank(citizenid);

  return {
    hoursPlayed: Number(meta.playtime || meta.hours || meta.timeplayed || 0),
    jobsCompleted: Number(meta.jobscompleted || meta.jobs_completed || meta.shifts_completed || 0),
    legalJobLevel: Number(job.grade?.level || 0),
    legalJobName: job.label || job.name || 'Unemployed',
    vehiclesOwned: vehicles.length,
    housesOwned: houses.length,
    businessActivity: Number(meta.business_activity || meta.businessactivity || meta.business_sales || 0),
    economyRank,
    drivingDistance: Number(meta.drivingdistance || meta.driving_distance || meta.distance_driven || 0),
    craftingLevel: Number(meta.craftinglevel || meta.crafting_level || meta.crafting || 0),
    reputation: Number(meta.reputation || meta.jobrep || 0),
    communityScore: meta.community_score ?? meta.communityscore ?? null,
    cash: Number(player.money.cash || 0),
    bank: Number(player.money.bank || 0),
  };
}

/** @deprecated Use getPlayerRpStatistics for player-facing routes */
export async function getPlayerStatistics(citizenid) {
  return getPlayerRpStatistics(citizenid);
}

export async function getGangTerritoryLeaderboard(limit = 50, offset = 0) {
  const pool = getFivemPool();
  if (!(await tableExists(pool, 'players'))) return { installed: false, entries: [] };

  const [rows] = await pool.query('SELECT citizenid, name, charinfo, gang, money FROM players');
  const gangs = {};

  for (const row of rows) {
    const gang = parseJsonSafe(row.gang, {});
    const money = parseJsonSafe(row.money, {});
    const gangName = gang.name || 'none';
    if (gangName === 'none' || !gangName) continue;

    if (!gangs[gangName]) {
      gangs[gangName] = {
        name: gangName,
        label: gang.label || gangName,
        members: 0,
        wealth: 0,
        territories: Number(gang.territories || gang.territory_count || 0),
      };
    }

    gangs[gangName].members += 1;
    gangs[gangName].wealth += Number(money.cash || 0) + Number(money.bank || 0);
    gangs[gangName].territories = Math.max(
      gangs[gangName].territories,
      Number(gang.territories || gang.territory_count || 0)
    );
  }

  const sorted = Object.values(gangs)
    .sort((a, b) => b.territories - a.territories || b.members - a.members || b.wealth - a.wealth)
    .slice(offset, offset + limit);

  return {
    installed: true,
    entries: sorted.map((gang, index) => ({
      rank: offset + index + 1,
      name: gang.label,
      gang: gang.name,
      members: gang.members,
      wealth: gang.wealth,
      territories: gang.territories,
      value: gang.territories || gang.members,
    })),
  };
}

export async function getLeaderboard(type = 'richest', limit = 50, offset = 0) {
  if (type === 'gang_territory') {
    return getGangTerritoryLeaderboard(limit, offset);
  }

  const pool = getFivemPool();
  if (!(await tableExists(pool, 'players'))) return { installed: false, entries: [] };

  const hasVehicles = await tableExists(pool, 'player_vehicles');
  const hasHouses = await tableExists(pool, 'player_houses');

  let orderBy = 'last_updated DESC';
  let selectExtra = '';

  switch (type) {
    case 'richest':
      orderBy = `(CAST(JSON_UNQUOTE(JSON_EXTRACT(money, '$.cash')) AS UNSIGNED) + CAST(JSON_UNQUOTE(JSON_EXTRACT(money, '$.bank')) AS UNSIGNED)) DESC`;
      break;
    case 'hours':
      orderBy = `CAST(JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.playtime')) AS UNSIGNED) DESC`;
      break;
    case 'vehicles':
      if (hasVehicles) {
        selectExtra = `, (SELECT COUNT(*) FROM player_vehicles pv WHERE pv.citizenid = players.citizenid) AS metric_value`;
        orderBy = 'metric_value DESC';
      }
      break;
    case 'houses':
      if (hasHouses) {
        selectExtra = `, (SELECT COUNT(*) FROM player_houses ph WHERE ph.citizenid = players.citizenid) AS metric_value`;
        orderBy = 'metric_value DESC';
      }
      break;
    case 'job_level':
      orderBy = `CAST(JSON_UNQUOTE(JSON_EXTRACT(job, '$.grade.level')) AS UNSIGNED) DESC`;
      break;
    case 'jobs_completed':
      orderBy = `CAST(JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.jobscompleted')) AS UNSIGNED) DESC`;
      break;
    case 'business':
      orderBy = `CAST(JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.business_activity')) AS UNSIGNED) DESC`;
      break;
    default:
      orderBy = 'last_updated DESC';
  }

  const [rows] = await pool.query(
    `SELECT citizenid, name, charinfo, money, job, gang, metadata${selectExtra}
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

      let value = null;
      if (type === 'richest') value = (money.cash || 0) + (money.bank || 0);
      else if (type === 'hours') value = meta.playtime || meta.hours || 0;
      else if (type === 'vehicles') value = Number(row.metric_value || 0);
      else if (type === 'houses') value = Number(row.metric_value || 0);
      else if (type === 'job_level') value = job.grade?.level || 0;
      else if (type === 'jobs_completed') value = meta.jobscompleted || meta.jobs_completed || 0;
      else if (type === 'business') value = meta.business_activity || meta.businessactivity || 0;

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
        value,
        jobLevel: job.grade?.level || 0,
        jobsCompleted: meta.jobscompleted || meta.jobs_completed || 0,
        vehicles: Number(row.metric_value || 0),
        houses: Number(row.metric_value || 0),
        businessActivity: meta.business_activity || meta.businessactivity || 0,
      };
    }),
  };
}

export function getAchievements(stats) {
  const achievements = [];
  const hours = Number(stats?.hoursPlayed || 0);

  if (hours >= 10) {
    achievements.push({
      id: 'hours_10',
      title: 'Getting Started',
      progress: Math.min(100, (hours / 10) * 100),
      target: 10,
      current: hours,
    });
  }
  if (hours >= 100) {
    achievements.push({
      id: 'hours_100',
      title: 'Dedicated Citizen',
      progress: Math.min(100, (hours / 100) * 100),
      target: 100,
      current: hours,
    });
  }
  if (stats?.vehiclesOwned >= 1) {
    achievements.push({
      id: 'first_car',
      title: 'First Ride',
      progress: 100,
      target: 1,
      current: stats.vehiclesOwned,
    });
  }
  if (stats?.housesOwned >= 1) {
    achievements.push({
      id: 'homeowner',
      title: 'Homeowner',
      progress: 100,
      target: 1,
      current: stats.housesOwned,
    });
  }
  if (stats?.jobsCompleted >= 10) {
    achievements.push({
      id: 'worker',
      title: 'Hard Worker',
      progress: Math.min(100, (stats.jobsCompleted / 10) * 100),
      target: 10,
      current: stats.jobsCompleted,
    });
  }
  if (stats?.craftingLevel >= 5) {
    achievements.push({
      id: 'crafter',
      title: 'Skilled Crafter',
      progress: Math.min(100, (stats.craftingLevel / 5) * 100),
      target: 5,
      current: stats.craftingLevel,
    });
  }
  if (stats?.reputation >= 50) {
    achievements.push({
      id: 'reputation',
      title: 'Respected Citizen',
      progress: Math.min(100, (stats.reputation / 50) * 100),
      target: 50,
      current: stats.reputation,
    });
  }

  return achievements;
}
