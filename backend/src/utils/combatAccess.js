export const COMBAT_ACCESS_ROLES = ['owner', 'developer'];

export const COMBAT_METADATA_KEYS = [
  'kills',
  'deaths',
  'kill',
  'death',
  'weapon_kills',
  'weapongkills',
  'weaponkills',
  'combatlog',
  'combat_log',
  'combatlogs',
  'murders',
  'murder_count',
  'pvp_kills',
  'pvp_deaths',
];

export const COMBAT_LEADERBOARD_TYPES = [
  'kills',
  'deaths',
  'kd',
  'kd_ratio',
  'kdr',
  'weapons',
  'weapon_kills',
  'top_killers',
  'most_deaths',
  'killers',
];

export const PUBLIC_LEADERBOARD_TYPES = [
  'richest',
  'hours',
  'vehicles',
  'houses',
  'job_level',
  'jobs_completed',
  'business',
  'gang_territory',
];

export function canViewCombatLogs(role) {
  return COMBAT_ACCESS_ROLES.includes(role);
}

export function isCombatLeaderboardType(type) {
  return COMBAT_LEADERBOARD_TYPES.includes(String(type || '').toLowerCase());
}

export function stripCombatFromMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') return metadata || {};
  const cleaned = { ...metadata };
  for (const key of COMBAT_METADATA_KEYS) {
    delete cleaned[key];
  }
  return cleaned;
}

export function stripCombatFromPlayer(player) {
  if (!player) return player;
  return {
    ...player,
    metadata: stripCombatFromMetadata(player.metadata),
  };
}
