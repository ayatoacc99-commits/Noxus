import { getFivemPool, tableExists } from '../db/pool.js';
import { parseJsonSafe } from '../utils/jsonSafe.js';

export async function getGangOverview() {
  const pool = getFivemPool();
  if (!(await tableExists(pool, 'players'))) {
    return { installed: false, gangs: [] };
  }

  const [rows] = await pool.query('SELECT citizenid, name, charinfo, gang, money FROM players');
  const gangs = {};

  for (const row of rows) {
    const gang = parseJsonSafe(row.gang, {});
    const money = parseJsonSafe(row.money, {});
    const charinfo = parseJsonSafe(row.charinfo, {});
    const gangName = gang.name || 'none';
    if (gangName === 'none' || !gangName) continue;

    if (!gangs[gangName]) {
      gangs[gangName] = {
        name: gangName,
        label: gang.label || gangName,
        members: [],
        wealth: 0,
        vehicles: 0,
        territories: 0,
      };
    }

    const member = {
      citizenid: row.citizenid,
      name: row.name || `${charinfo.firstname || ''} ${charinfo.lastname || ''}`.trim(),
      grade: gang.grade?.level || 0,
      gradeName: gang.grade?.name || 'Member',
      isboss: gang.isboss || false,
    };

    gangs[gangName].members.push(member);
    gangs[gangName].wealth += Number(money.cash || 0) + Number(money.bank || 0);

    if (gang.isboss) gangs[gangName].leader = member.name;
  }

  const gangList = Object.values(gangs).map((g) => ({
    ...g,
    memberCount: g.members.length,
    leader: g.leader || g.members.find((m) => m.isboss)?.name || g.members[0]?.name,
    coLeaders: g.members.filter((m) => m.grade >= 2 && !m.isboss).slice(0, 3),
  }));

  return {
    installed: true,
    totalGangs: gangList.length,
    totalMembers: gangList.reduce((s, g) => s + g.memberCount, 0),
    totalTerritories: gangList.reduce((s, g) => s + g.territories, 0),
    totalWealth: gangList.reduce((s, g) => s + g.wealth, 0),
    gangs: gangList.sort((a, b) => b.wealth - a.wealth),
  };
}

export async function getGangProfile(gangName) {
  const overview = await getGangOverview();
  if (!overview.installed) return null;
  return overview.gangs.find((g) => g.name === gangName) || null;
}
