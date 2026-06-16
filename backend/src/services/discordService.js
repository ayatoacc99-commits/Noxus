import config from '../config/index.js';
import { getPanelPool } from '../db/pool.js';
import {
  findUserByDiscordId,
  findUserById,
  createSession,
  signAccessToken,
  sanitizeUser,
} from './authService.js';
import { findPlayerByDiscordId } from './playerPortalService.js';
import { logAudit } from './auditService.js';

const DISCORD_API = 'https://discord.com/api';

export function isDiscordEnabled() {
  return config.discord.enabled && config.discord.clientId && config.discord.clientSecret;
}

export function getDiscordAuthUrl(state) {
  const params = new URLSearchParams({
    client_id: config.discord.clientId,
    redirect_uri: config.discord.redirectUri,
    response_type: 'code',
    scope: 'identify guilds.members.read',
    state,
  });
  return `https://discord.com/api/oauth2/authorize?${params}`;
}

async function exchangeCode(code) {
  const body = new URLSearchParams({
    client_id: config.discord.clientId,
    client_secret: config.discord.clientSecret,
    grant_type: 'authorization_code',
    code,
    redirect_uri: config.discord.redirectUri,
  });

  const res = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error('Discord token exchange failed');
  return res.json();
}

async function getDiscordUser(accessToken) {
  const res = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('Failed to fetch Discord user');
  return res.json();
}

async function getGuildMember(accessToken, userId) {
  if (!config.discord.guildId) return null;
  try {
    const res = await fetch(`${DISCORD_API}/users/@me/guilds/${config.discord.guildId}/member`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function mapDiscordRolesToPanelRole(roleIds) {
  const pool = getPanelPool();
  const [mappings] = await pool.query('SELECT discord_role_id, panel_role FROM panel_discord_role_map');

  const priority = { owner: 4, admin: 3, moderator: 2, player: 1 };
  let bestRole = 'player';

  for (const map of mappings) {
    if (roleIds.includes(map.discord_role_id)) {
      if ((priority[map.panel_role] || 0) > (priority[bestRole] || 0)) {
        bestRole = map.panel_role;
      }
    }
  }

  // Env fallback role IDs
  if (roleIds.includes(config.discord.roleMap.owner)) bestRole = 'owner';
  else if (roleIds.includes(config.discord.roleMap.admin)) bestRole = 'admin';
  else if (roleIds.includes(config.discord.roleMap.moderator)) bestRole = 'moderator';

  return bestRole;
}

async function getRoleIdByName(roleName) {
  const pool = getPanelPool();
  const [rows] = await pool.query('SELECT id FROM panel_roles WHERE name = :name', { name: roleName });
  return rows[0]?.id;
}

function avatarUrl(user) {
  if (!user.avatar) return null;
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`;
}

export async function handleDiscordCallback(code, ipAddress, userAgent) {
  const tokenData = await exchangeCode(code);
  const discordUser = await getDiscordUser(tokenData.access_token);
  const guildMember = await getGuildMember(tokenData.access_token, discordUser.id);
  const roleIds = guildMember?.roles || [];

  const panelRole = await mapDiscordRolesToPanelRole(roleIds);
  const roleId = await getRoleIdByName(panelRole);
  if (!roleId) throw new Error(`Panel role not found: ${panelRole}`);

  const pool = getPanelPool();
  const qbPlayer = await findPlayerByDiscordId(discordUser.id);
  const avatar = avatarUrl(discordUser);
  const username = discordUser.global_name || discordUser.username;

  const [existing] = await pool.query(
    'SELECT * FROM panel_users WHERE discord_id = :discordId',
    { discordId: discordUser.id }
  );

  let userId;
  if (existing[0]) {
    userId = existing[0].id;
    await pool.query(
      `UPDATE panel_users SET discord_username = :username, discord_avatar = :avatar,
       role_id = :roleId, citizenid = :citizenid, last_login_at = NOW()
       WHERE id = :id`,
      {
        username,
        avatar,
        roleId,
        citizenid: qbPlayer?.citizenid || existing[0].citizenid,
        id: userId,
      }
    );
  } else {
    const [result] = await pool.query(
      `INSERT INTO panel_users (username, email, password_hash, role_id, discord_id, discord_username, discord_avatar, citizenid, auth_provider)
       VALUES (:username, :email, NULL, :roleId, :discordId, :discordUsername, :avatar, :citizenid, 'discord')`,
      {
        username: `discord_${discordUser.id}`,
        email: discordUser.email || null,
        roleId,
        discordId: discordUser.id,
        discordUsername: username,
        avatar,
        citizenid: qbPlayer?.citizenid || null,
      }
    );
    userId = result.insertId;
  }

  const user = await findUserById(userId);
  const accessToken = signAccessToken(user);
  const refreshToken = await createSession(user.id, ipAddress, userAgent);

  await logAudit({
    userId: user.id,
    username: user.username,
    role: user.role,
    action: 'auth.discord_login',
    ipAddress,
  });

  return {
    user: {
      ...sanitizeUser(user),
      discordId: discordUser.id,
      discordUsername: username,
      discordAvatar: avatar,
      citizenid: qbPlayer?.citizenid || user.citizenid,
    },
    accessToken,
    refreshToken,
    redirectTo: ['owner', 'admin', 'moderator', 'viewer'].includes(panelRole)
      ? '/dashboard'
      : '/player/dashboard',
  };
}

export async function linkDiscordAccount(userId, code) {
  const tokenData = await exchangeCode(code);
  const discordUser = await getDiscordUser(tokenData.access_token);
  const pool = getPanelPool();
  const qbPlayer = await findPlayerByDiscordId(discordUser.id);

  await pool.query(
    `UPDATE panel_users SET discord_id = :discordId, discord_username = :username,
     discord_avatar = :avatar, citizenid = COALESCE(:citizenid, citizenid) WHERE id = :userId`,
    {
      discordId: discordUser.id,
      username: discordUser.global_name || discordUser.username,
      avatar: avatarUrl(discordUser),
      citizenid: qbPlayer?.citizenid,
      userId,
    }
  );

  return findUserById(userId);
}
