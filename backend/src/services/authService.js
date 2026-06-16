import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import config from '../config/index.js';
import { getPanelPool } from '../db/pool.js';
import { logAudit } from './auditService.js';

const ROLES = ['owner', 'admin', 'moderator', 'viewer'];

export function isValidRole(role) {
  return ROLES.includes(role);
}

export async function findUserByUsername(username) {
  const pool = getPanelPool();
  const [rows] = await pool.query(
    `SELECT u.*, r.name AS role_name, r.permissions
     FROM panel_users u
     JOIN panel_roles r ON u.role_id = r.id
     WHERE u.username = :username AND u.is_active = 1`,
    { username }
  );
  if (!rows[0]) return null;
  return formatUser(rows[0]);
}

export async function findUserById(id) {
  const pool = getPanelPool();
  const [rows] = await pool.query(
    `SELECT u.*, r.name AS role_name, r.permissions
     FROM panel_users u
     JOIN panel_roles r ON u.role_id = r.id
     WHERE u.id = :id AND u.is_active = 1`,
    { id }
  );
  if (!rows[0]) return null;
  return formatUser(rows[0]);
}

function formatUser(row) {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    role: row.role_name,
    permissions: typeof row.permissions === 'string' ? JSON.parse(row.permissions) : row.permissions,
    totpEnabled: Boolean(row.totp_enabled),
    totpSecret: row.totp_secret,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
  };
}

export async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

export async function hashPassword(plain) {
  return bcrypt.hash(plain, config.security.bcryptRounds);
}

export function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, username: user.username, role: user.role },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
}

export async function createSession(userId, ipAddress, userAgent) {
  const pool = getPanelPool();
  const refreshToken = uuidv4();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await pool.query(
    `INSERT INTO panel_sessions (user_id, refresh_token, ip_address, user_agent, expires_at)
     VALUES (:userId, :refreshToken, :ipAddress, :userAgent, :expiresAt)`,
    { userId, refreshToken, ipAddress, userAgent, expiresAt }
  );
  return refreshToken;
}

export async function revokeSession(refreshToken) {
  if (!refreshToken) return;
  const pool = getPanelPool();
  await pool.query('DELETE FROM panel_sessions WHERE refresh_token = :refreshToken', { refreshToken });
}

export async function login(username, password, ipAddress, userAgent) {
  const pool = getPanelPool();
  const [rows] = await pool.query(
    `SELECT u.*, r.name AS role_name, r.permissions
     FROM panel_users u
     JOIN panel_roles r ON u.role_id = r.id
     WHERE u.username = :username AND u.is_active = 1`,
    { username }
  );

  const row = rows[0];
  if (!row) {
    throw new Error('Invalid credentials');
  }

  const valid = await verifyPassword(password, row.password_hash);
  if (!valid) {
    throw new Error('Invalid credentials');
  }

  const user = formatUser(row);
  const accessToken = signAccessToken(user);
  const refreshToken = await createSession(user.id, ipAddress, userAgent);

  await pool.query('UPDATE panel_users SET last_login_at = NOW() WHERE id = :id', { id: user.id });

  await logAudit({
    userId: user.id,
    username: user.username,
    role: user.role,
    action: 'auth.login',
    ipAddress,
  });

  return { user: sanitizeUser(user), accessToken, refreshToken };
}

export function sanitizeUser(user) {
  const { totpSecret, ...safe } = user;
  return safe;
}

export function hasPermission(user, permission) {
  if (!user) return false;
  if (user.role === 'owner') return true;
  return Boolean(user.permissions?.[permission]);
}

export const PERMISSIONS = {
  SERVER_CONTROL: 'server_control',
  SERVER_CONFIG: 'server_config',
  CONSOLE_COMMAND: 'console_command',
  RESOURCE_MANAGE: 'resource_manage',
  PLAYER_VIEW: 'player_view',
  PLAYER_EDIT: 'player_edit',
  PLAYER_BAN: 'player_ban',
  BACKUP_MANAGE: 'backup_manage',
  AUDIT_VIEW: 'audit_view',
  SETTINGS_MANAGE: 'settings_manage',
  USER_MANAGE: 'user_manage',
};

export function roleCan(role, permission) {
  const matrix = {
    owner: Object.values(PERMISSIONS),
    admin: [
      PERMISSIONS.SERVER_CONTROL,
      PERMISSIONS.SERVER_CONFIG,
      PERMISSIONS.CONSOLE_COMMAND,
      PERMISSIONS.RESOURCE_MANAGE,
      PERMISSIONS.PLAYER_VIEW,
      PERMISSIONS.PLAYER_EDIT,
      PERMISSIONS.PLAYER_BAN,
      PERMISSIONS.BACKUP_MANAGE,
      PERMISSIONS.AUDIT_VIEW,
    ],
    moderator: [
      PERMISSIONS.CONSOLE_COMMAND,
      PERMISSIONS.RESOURCE_MANAGE,
      PERMISSIONS.PLAYER_VIEW,
      PERMISSIONS.PLAYER_EDIT,
      PERMISSIONS.PLAYER_BAN,
      PERMISSIONS.AUDIT_VIEW,
    ],
    viewer: [PERMISSIONS.PLAYER_VIEW, PERMISSIONS.AUDIT_VIEW],
  };
  return matrix[role]?.includes(permission) ?? false;
}
