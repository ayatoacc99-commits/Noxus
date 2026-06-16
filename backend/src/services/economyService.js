import { getFivemPool, tableExists } from '../db/pool.js';
import { getPanelPool } from '../db/pool.js';
import { parseJsonSafe } from '../utils/jsonSafe.js';

export async function getEconomyOverview() {
  const pool = getFivemPool();
  if (!(await tableExists(pool, 'players'))) {
    return { installed: false };
  }

  const [rows] = await pool.query('SELECT money, gang FROM players');
  let totalCash = 0;
  let totalBank = 0;
  const gangWealth = {};

  for (const row of rows) {
    const money = parseJsonSafe(row.money, {});
    totalCash += Number(money.cash || 0);
    totalBank += Number(money.bank || 0);
    const gang = parseJsonSafe(row.gang, {});
    const gangName = gang.name || 'none';
    if (!gangWealth[gangName]) gangWealth[gangName] = 0;
    gangWealth[gangName] += Number(money.cash || 0) + Number(money.bank || 0);
  }

  const richestPlayers = await getTopRichest(10);
  const richestGangs = Object.entries(gangWealth)
    .filter(([name]) => name !== 'none')
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, wealth], i) => ({ rank: i + 1, name, wealth }));

  await saveEconomySnapshot({ totalCash, totalBank, totalPlayers: rows.length });

  return {
    installed: true,
    totalCash,
    totalBank,
    totalCirculation: totalCash + totalBank,
    richestPlayers,
    richestGangs,
    richestBusinesses: [],
  };
}

async function getTopRichest(limit) {
  const pool = getFivemPool();
  const [rows] = await pool.query(
    `SELECT citizenid, name, charinfo, money FROM players
     ORDER BY (CAST(JSON_UNQUOTE(JSON_EXTRACT(money, '$.cash')) AS UNSIGNED) + CAST(JSON_UNQUOTE(JSON_EXTRACT(money, '$.bank')) AS UNSIGNED)) DESC
     LIMIT :limit`,
    { limit }
  );
  return rows.map((row, i) => {
    const money = parseJsonSafe(row.money, {});
    const charinfo = parseJsonSafe(row.charinfo, {});
    return {
      rank: i + 1,
      citizenid: row.citizenid,
      name: row.name || `${charinfo.firstname || ''} ${charinfo.lastname || ''}`.trim(),
      total: (money.cash || 0) + (money.bank || 0),
    };
  });
}

async function saveEconomySnapshot({ totalCash, totalBank, totalPlayers }) {
  const panelPool = getPanelPool();
  try {
    const fivemPool = getFivemPool();
    let totalVehicles = 0;
    let totalHouses = 0;
    if (await tableExists(fivemPool, 'player_vehicles')) {
      const [[v]] = await fivemPool.query('SELECT COUNT(*) AS cnt FROM player_vehicles');
      totalVehicles = v.cnt;
    }
    if (await tableExists(fivemPool, 'player_houses')) {
      const [[h]] = await fivemPool.query('SELECT COUNT(*) AS cnt FROM player_houses');
      totalHouses = h.cnt;
    }
    await panelPool.query(
      `INSERT INTO panel_economy_snapshots (total_cash, total_bank, total_players, total_vehicles, total_houses)
       VALUES (:totalCash, :totalBank, :totalPlayers, :totalVehicles, :totalHouses)`,
      { totalCash, totalBank, totalPlayers, totalVehicles, totalHouses }
    );
  } catch {
    // table may not exist yet
  }
}

export async function getEconomyHistory(limit = 30) {
  const panelPool = getPanelPool();
  try {
    const [rows] = await panelPool.query(
      `SELECT * FROM panel_economy_snapshots ORDER BY snapshot_at DESC LIMIT :limit`,
      { limit }
    );
    return rows.reverse().map((r) => ({
      time: r.snapshot_at,
      circulation: Number(r.total_cash) + Number(r.total_bank),
      cash: Number(r.total_cash),
      bank: Number(r.total_bank),
      vehicles: r.total_vehicles,
      houses: r.total_houses,
    }));
  } catch {
    return [];
  }
}

export async function adminInjectMoney(citizenid, amount, type, auditContext) {
  const { updatePlayerMoney } = await import('./playerService.js');
  const { player } = await import('./playerService.js').then((m) => m.getPlayerByCitizenId(citizenid));
  if (!player?.player) throw new Error('Player not found');
  const current = player.player.money[type] || 0;
  return updatePlayerMoney(citizenid, { [type]: current + amount }, auditContext);
}

export async function adminRemoveMoney(citizenid, amount, type, auditContext) {
  const { updatePlayerMoney, getPlayerByCitizenId } = await import('./playerService.js');
  const { player } = await getPlayerByCitizenId(citizenid);
  if (!player) throw new Error('Player not found');
  const current = player.money[type] || 0;
  return updatePlayerMoney(citizenid, { [type]: Math.max(0, current - amount) }, auditContext);
}
