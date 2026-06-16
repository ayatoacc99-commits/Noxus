import { getFivemPool, tableExists } from '../db/pool.js';
import { getPanelPool } from '../db/pool.js';
import {
  parseJsonSafe,
  mergeJsonPreserveUnknown,
  stringifyJsonSafe,
} from '../utils/jsonSafe.js';

const PLAYER_TABLE = 'players';

export async function getInstalledTables() {
  const pool = getFivemPool();
  const tables = ['players', 'player_vehicles', 'player_houses', 'bans', 'permissions', 'gang_members'];
  const result = {};
  for (const t of tables) {
    result[t] = await tableExists(pool, t);
  }
  return result;
}

export async function searchPlayers({ q, limit = 50, offset = 0 }) {
  const pool = getFivemPool();
  if (!(await tableExists(pool, PLAYER_TABLE))) {
    return { installed: false, players: [], total: 0 };
  }

  const search = `%${q}%`;
  const [rows] = await pool.query(
    `SELECT citizenid, license, name, charinfo, money, job, gang, last_updated
     FROM players
     WHERE citizenid LIKE :search
        OR license LIKE :search
        OR name LIKE :search
        OR charinfo LIKE :search
        OR JSON_UNQUOTE(JSON_EXTRACT(charinfo, '$.phone')) LIKE :search
        OR JSON_UNQUOTE(JSON_EXTRACT(charinfo, '$.discord')) LIKE :search
     ORDER BY last_updated DESC
     LIMIT :limit OFFSET :offset`,
    { search, limit, offset }
  );

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM players
     WHERE citizenid LIKE :search OR license LIKE :search OR name LIKE :search
        OR charinfo LIKE :search`,
    { search }
  );

  return {
    installed: true,
    players: rows.map(formatPlayerSummary),
    total,
  };
}

function formatPlayerSummary(row) {
  const charinfo = parseJsonSafe(row.charinfo, {});
  const money = parseJsonSafe(row.money, {});
  const job = parseJsonSafe(row.job, {});
  return {
    citizenid: row.citizenid,
    license: row.license,
    name: row.name || `${charinfo.firstname || ''} ${charinfo.lastname || ''}`.trim(),
    phone: charinfo.phone,
    cash: money.cash,
    bank: money.bank,
    job: job.label || job.name,
    lastUpdated: row.last_updated,
  };
}

export async function getPlayerByCitizenId(citizenid) {
  const pool = getFivemPool();
  if (!(await tableExists(pool, PLAYER_TABLE))) {
    return { installed: false, player: null };
  }

  const [rows] = await pool.query('SELECT * FROM players WHERE citizenid = :citizenid LIMIT 1', {
    citizenid,
  });
  if (!rows[0]) return { installed: true, player: null };

  const row = rows[0];
  return {
    installed: true,
    player: {
      citizenid: row.citizenid,
      license: row.license,
      name: row.name,
      charinfo: parseJsonSafe(row.charinfo, {}),
      money: parseJsonSafe(row.money, {}),
      job: parseJsonSafe(row.job, {}),
      gang: parseJsonSafe(row.gang, {}),
      metadata: parseJsonSafe(row.metadata, {}),
      position: parseJsonSafe(row.position, {}),
      inventory: row.inventory ? parseJsonSafe(row.inventory, []) : null,
      lastUpdated: row.last_updated,
    },
    tables: await getInstalledTables(),
  };
}

export async function updatePlayerMoney(citizenid, { cash, bank }, auditContext) {
  const pool = getFivemPool();
  const { player } = await getPlayerByCitizenId(citizenid);
  if (!player) throw new Error('Player not found');

  const oldMoney = { ...player.money };
  const newMoney = mergeJsonPreserveUnknown(player.money, { cash, bank });

  await backupPlayerRow(pool, citizenid, auditContext);
  await pool.query('UPDATE players SET money = :money, last_updated = NOW() WHERE citizenid = :citizenid', {
    money: stringifyJsonSafe(newMoney),
    citizenid,
  });

  return { oldMoney, newMoney };
}

export async function updatePlayerJob(citizenid, { name, label, grade, payment }, auditContext) {
  const pool = getFivemPool();
  const { player } = await getPlayerByCitizenId(citizenid);
  if (!player) throw new Error('Player not found');

  const oldJob = { ...player.job };
  const patch = { name, label };
  if (grade !== undefined) {
    patch.grade = typeof grade === 'object' ? grade : { level: grade, name: `Grade ${grade}` };
  }
  if (payment !== undefined) patch.payment = payment;
  const newJob = mergeJsonPreserveUnknown(player.job, patch);

  await backupPlayerRow(pool, citizenid, auditContext);
  await pool.query('UPDATE players SET job = :job, last_updated = NOW() WHERE citizenid = :citizenid', {
    job: stringifyJsonSafe(newJob),
    citizenid,
  });

  return { oldJob, newJob };
}

export async function updatePlayerGang(citizenid, { name, label, grade }, auditContext) {
  const pool = getFivemPool();
  const { player } = await getPlayerByCitizenId(citizenid);
  if (!player) throw new Error('Player not found');

  const oldGang = { ...player.gang };
  const patch = { name, label };
  if (grade !== undefined) {
    patch.grade = typeof grade === 'object' ? grade : { level: grade, name: `Grade ${grade}` };
  }
  const newGang = mergeJsonPreserveUnknown(player.gang, patch);

  await backupPlayerRow(pool, citizenid, auditContext);
  await pool.query('UPDATE players SET gang = :gang, last_updated = NOW() WHERE citizenid = :citizenid', {
    gang: stringifyJsonSafe(newGang),
    citizenid,
  });

  return { oldGang, newGang };
}

export async function updatePlayerMetadata(citizenid, metadataPatch, auditContext) {
  const pool = getFivemPool();
  const { player } = await getPlayerByCitizenId(citizenid);
  if (!player) throw new Error('Player not found');

  const oldMetadata = { ...player.metadata };
  const newMetadata = mergeJsonPreserveUnknown(player.metadata, metadataPatch);

  await backupPlayerRow(pool, citizenid, auditContext);
  await pool.query('UPDATE players SET metadata = :metadata, last_updated = NOW() WHERE citizenid = :citizenid', {
    metadata: stringifyJsonSafe(newMetadata),
    citizenid,
  });

  return { oldMetadata, newMetadata };
}

export async function resetPlayerMetadata(citizenid, auditContext) {
  return updatePlayerMetadata(citizenid, { hunger: 100, thirst: 100, stress: 0 }, auditContext);
}

export async function wipeCharacter(citizenid, auditContext) {
  const pool = getFivemPool();
  await backupPlayerRow(pool, citizenid, auditContext);
  await pool.query('DELETE FROM players WHERE citizenid = :citizenid', { citizenid });
  if (await tableExists(pool, 'player_vehicles')) {
    await pool.query('DELETE FROM player_vehicles WHERE citizenid = :citizenid', { citizenid });
  }
}

export async function getPlayerVehicles(citizenid) {
  const pool = getFivemPool();
  if (!(await tableExists(pool, 'player_vehicles'))) {
    return { installed: false, vehicles: [] };
  }
  const [rows] = await pool.query(
    'SELECT * FROM player_vehicles WHERE citizenid = :citizenid',
    { citizenid }
  );
  return { installed: true, vehicles: rows };
}

export async function getPlayerInventory(citizenid) {
  const { player } = await getPlayerByCitizenId(citizenid);
  if (!player) return { installed: false, inventory: [] };
  return { installed: true, inventory: player.inventory || [] };
}

export async function banPlayer(citizenid, { reason, expires, bannedBy }) {
  const pool = getFivemPool();
  if (!(await tableExists(pool, 'bans'))) {
    return { installed: false };
  }
  const { player } = await getPlayerByCitizenId(citizenid);
  if (!player) throw new Error('Player not found');

  await pool.query(
    `INSERT INTO bans (name, license, discord, ip, reason, expire, bannedby)
     VALUES (:name, :license, :discord, :ip, :reason, :expire, :bannedby)`,
    {
      name: player.name || citizenid,
      license: player.license,
      discord: player.charinfo?.discord || null,
      ip: null,
      reason,
      expire: expires || 2147483647,
      bannedby: bannedBy,
    }
  );
  return { installed: true };
}

export async function unbanPlayer(license) {
  const pool = getFivemPool();
  if (!(await tableExists(pool, 'bans'))) {
    return { installed: false };
  }
  await pool.query('DELETE FROM bans WHERE license = :license', { license });
  return { installed: true };
}

export async function addAdminNote(citizenid, note, userId) {
  const panelPool = getPanelPool();
  await panelPool.query(
    'INSERT INTO panel_admin_notes (citizenid, note, created_by) VALUES (:citizenid, :note, :userId)',
    { citizenid, note, userId }
  );
}

export async function getAdminNotes(citizenid) {
  const panelPool = getPanelPool();
  const [rows] = await panelPool.query(
    `SELECT n.*, u.username AS author
     FROM panel_admin_notes n
     LEFT JOIN panel_users u ON n.created_by = u.id
     WHERE n.citizenid = :citizenid
     ORDER BY n.created_at DESC`,
    { citizenid }
  );
  return rows;
}

async function backupPlayerRow(pool, citizenid, auditContext) {
  const [rows] = await pool.query('SELECT * FROM players WHERE citizenid = :citizenid', { citizenid });
  if (!rows[0]) return;
  const panelPool = getPanelPool();
  await panelPool.query(
    `INSERT INTO panel_audit_logs (user_id, username, role, action, target, old_value, ip_address)
     VALUES (:userId, :username, :role, 'player.backup', :target, :oldValue, :ip)`,
    {
      userId: auditContext.userId,
      username: auditContext.username,
      role: auditContext.role,
      target: citizenid,
      oldValue: JSON.stringify(rows[0]),
      ip: auditContext.ip,
    }
  );
}

export async function giveMoney(citizenid, amount, type = 'cash', auditContext) {
  const { player } = await getPlayerByCitizenId(citizenid);
  if (!player) throw new Error('Player not found');
  const current = player.money[type] || 0;
  return updatePlayerMoney(citizenid, { [type]: current + amount }, auditContext);
}

export async function removeMoney(citizenid, amount, type = 'cash', auditContext) {
  const { player } = await getPlayerByCitizenId(citizenid);
  if (!player) throw new Error('Player not found');
  const current = player.money[type] || 0;
  return updatePlayerMoney(citizenid, { [type]: Math.max(0, current - amount) }, auditContext);
}
