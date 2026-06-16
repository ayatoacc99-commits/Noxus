const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

let csrfToken: string | null = null;

export async function fetchCsrf(): Promise<string> {
  const res = await fetch(`${API_BASE}/api/auth/csrf`, { credentials: 'include' });
  const data = await res.json();
  csrfToken = data.csrfToken;
  return csrfToken!;
}

async function apiFetch(path: string, options: RequestInit = {}) {
  if (!csrfToken && !path.includes('/auth/')) {
    await fetchCsrf();
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (csrfToken && options.method && options.method !== 'GET') {
    headers['x-csrf-token'] = csrfToken;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }
  return data;
}

export const api = {
  getCsrf: fetchCsrf,
  login: (username: string, password: string) =>
    apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout: () => apiFetch('/api/auth/logout', { method: 'POST' }),
  me: () => apiFetch('/api/auth/me'),
  discordAuthUrl: () => apiFetch('/api/auth/discord'),
  dashboardStatus: () => apiFetch('/api/dashboard/status'),
  serverStart: () => apiFetch('/api/server/start', { method: 'POST' }),
  serverStop: () => apiFetch('/api/server/stop', { method: 'POST' }),
  serverRestart: () => apiFetch('/api/server/restart', { method: 'POST' }),
  consoleLogs: (params?: { search?: string; level?: string }) => {
    const q = new URLSearchParams(params as Record<string, string>).toString();
    return apiFetch(`/api/console/logs${q ? `?${q}` : ''}`);
  },
  consoleCommand: (command: string) =>
    apiFetch('/api/console/command', { method: 'POST', body: JSON.stringify({ command }) }),
  resources: () => apiFetch('/api/resources'),
  resourceAction: (name: string, action: string, force = false) =>
    apiFetch(`/api/resources/${name}/${action}`, { method: 'POST', body: JSON.stringify({ force }) }),
  resourceEnsure: (name: string, enabled: boolean) =>
    apiFetch(`/api/resources/${name}/ensure`, { method: 'POST', body: JSON.stringify({ enabled }) }),
  getServerCfg: (reveal = false) =>
    apiFetch(`/api/config/server-cfg${reveal ? '?reveal=true' : ''}`),
  saveServerCfg: (content: string) =>
    apiFetch('/api/config/server-cfg', { method: 'PUT', body: JSON.stringify({ content, confirm: true }) }),
  searchPlayers: (q: string) => apiFetch(`/api/players?q=${encodeURIComponent(q)}`),
  getPlayer: (citizenid: string) => apiFetch(`/api/players/${citizenid}`),
  updatePlayer: (citizenid: string, data: Record<string, unknown>) =>
    apiFetch(`/api/players/${citizenid}`, { method: 'PUT', body: JSON.stringify(data) }),
  banPlayer: (citizenid: string, reason: string) =>
    apiFetch(`/api/players/${citizenid}/ban`, { method: 'POST', body: JSON.stringify({ reason }) }),
  addNote: (citizenid: string, note: string) =>
    apiFetch(`/api/players/${citizenid}/notes`, { method: 'POST', body: JSON.stringify({ note }) }),
  backups: () => apiFetch('/api/backups'),
  createBackup: (types?: string[]) =>
    apiFetch('/api/backups/create', { method: 'POST', body: JSON.stringify({ types }) }),
  deleteBackup: (id: number) => apiFetch(`/api/backups/${id}`, { method: 'DELETE' }),
  auditLogs: () => apiFetch('/api/audit'),
  settings: () => apiFetch('/api/settings'),
  playerTables: () => apiFetch('/api/players/tables'),
  notifications: () => apiFetch('/api/notifications'),
  markNotificationRead: (id: number) =>
    apiFetch(`/api/notifications/${id}/read`, { method: 'POST' }),
  // Player portal
  playerDashboard: () => apiFetch('/api/player/dashboard'),
  playerProfile: () => apiFetch('/api/player/profile'),
  playerVehicles: () => apiFetch('/api/player/vehicles'),
  playerProperties: () => apiFetch('/api/player/properties'),
  playerStatistics: () => apiFetch('/api/player/statistics'),
  playerEconomy: () => apiFetch('/api/player/economy'),
  playerLeaderboards: (type = 'richest', limit = 50, offset = 0) =>
    apiFetch(`/api/player/leaderboards?type=${type}&limit=${limit}&offset=${offset}`),
  playerGangs: () => apiFetch('/api/player/gangs'),
  // Admin tools
  liveMonitor: () => apiFetch('/api/admin/monitor/players'),
  monitorAction: (action: string, target: string, data?: Record<string, unknown>) =>
    apiFetch('/api/admin/monitor/action', { method: 'POST', body: JSON.stringify({ action, target, data }) }),
  monitorGiveMoney: (citizenid: string, amount: number, type = 'cash') =>
    apiFetch('/api/admin/monitor/give-money', { method: 'POST', body: JSON.stringify({ citizenid, amount, type }) }),
  monitorSetJob: (citizenid: string, name: string, grade: number) =>
    apiFetch('/api/admin/monitor/set-job', { method: 'POST', body: JSON.stringify({ citizenid, name, grade }) }),
  resourcePerformance: () => apiFetch('/api/admin/performance/resources'),
  adminEconomy: () => apiFetch('/api/admin/economy'),
  adminEconomyInject: (citizenid: string, amount: number, type = 'cash') =>
    apiFetch('/api/admin/economy/inject', { method: 'POST', body: JSON.stringify({ citizenid, amount, type }) }),
  adminEconomyRemove: (citizenid: string, amount: number, type = 'cash') =>
    apiFetch('/api/admin/economy/remove', { method: 'POST', body: JSON.stringify({ citizenid, amount, type }) }),
  adminGangs: () => apiFetch('/api/admin/gangs'),
};

export type UserRole = 'owner' | 'admin' | 'moderator' | 'viewer' | 'player';

export type User = {
  id: number;
  username: string;
  email?: string;
  role: UserRole;
  discordId?: string;
  discordUsername?: string;
  discordAvatar?: string;
  citizenid?: string;
  authProvider?: string;
};

export const ADMIN_ROLES: UserRole[] = ['owner', 'admin', 'moderator', 'viewer'];

export function isAdminRole(role?: string) {
  return ADMIN_ROLES.includes(role as UserRole);
}

export function getRedirectForRole(role?: string) {
  return isAdminRole(role) ? '/dashboard' : '/player/dashboard';
}
