import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseList(value) {
  if (!value || value.trim() === '') return [];
  return value.split(',').map((s) => s.trim()).filter(Boolean);
}

function parseBool(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  host: process.env.HOST || '127.0.0.1',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

  jwt: {
    secret: process.env.JWT_SECRET || 'change-me-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    cookieName: process.env.JWT_COOKIE_NAME || 'noxus_token',
    refreshCookieName: process.env.JWT_REFRESH_COOKIE_NAME || 'noxus_refresh',
  },

  csrf: {
    cookieName: process.env.CSRF_COOKIE_NAME || 'noxus_csrf',
    headerName: 'x-csrf-token',
  },

  panelDb: {
    host: process.env.PANEL_DB_HOST || '127.0.0.1',
    port: parseInt(process.env.PANEL_DB_PORT || '3306', 10),
    user: process.env.PANEL_DB_USER || 'noxus',
    password: process.env.PANEL_DB_PASSWORD || '',
    database: process.env.PANEL_DB_NAME || 'noxus_panel',
  },

  fivemDb: {
    host: process.env.FIVEM_DB_HOST || process.env.PANEL_DB_HOST || '127.0.0.1',
    port: parseInt(process.env.FIVEM_DB_PORT || process.env.PANEL_DB_PORT || '3306', 10),
    user: process.env.FIVEM_DB_USER || 'root',
    password: process.env.FIVEM_DB_PASSWORD || '',
    database: process.env.FIVEM_DB_NAME || 'qbcore',
  },

  fivem: {
    processMode: process.env.FIVEM_PROCESS_MODE || 'systemd',
    systemdService: process.env.FIVEM_SYSTEMD_SERVICE || 'fivem',
    pm2Name: process.env.FIVEM_PM2_NAME || 'fivem',
    artifactPath: process.env.FIVEM_ARTIFACT_PATH || '/opt/fivem/artifacts',
    serverDataPath: process.env.FIVEM_SERVER_DATA_PATH || '/opt/fivem/server-data',
    serverCfgPath: process.env.FIVEM_SERVER_CFG_PATH || '',
    resourcesPath: process.env.FIVEM_RESOURCES_PATH || '',
    backupFolder: process.env.FIVEM_BACKUP_FOLDER || '/opt/fivem/backups',
    logFile: process.env.FIVEM_LOG_FILE || '',
    rconHost: process.env.FIVEM_RCON_HOST || '127.0.0.1',
    rconPort: parseInt(process.env.FIVEM_RCON_PORT || '30120', 10),
    rconPassword: process.env.FIVEM_RCON_PASSWORD || '',
    serverIp: process.env.FIVEM_SERVER_IP || '0.0.0.0',
    serverPort: parseInt(process.env.FIVEM_SERVER_PORT || '30120', 10),
  },

  backup: {
    retentionCount: parseInt(process.env.BACKUP_RETENTION_COUNT || '7', 10),
    scheduleCron: process.env.BACKUP_SCHEDULE_CRON || '0 3 * * *',
    enabled: parseBool(process.env.BACKUP_SCHEDULE_ENABLED, true),
  },

  security: {
    ipAllowlist: parseList(process.env.IP_ALLOWLIST),
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
    loginRateLimitWindowMs: parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || '900000', 10),
    loginRateLimitMax: parseInt(process.env.LOGIN_RATE_LIMIT_MAX || '10', 10),
    trustProxy: parseBool(process.env.TRUST_PROXY, true),
  },

  paths: {
    migrations: path.resolve(__dirname, '../../../migrations'),
    configBackups: path.resolve(__dirname, '../../../data/config-backups'),
    consoleHistory: path.resolve(__dirname, '../../../data/console-history'),
  },
};

config.fivem.serverCfgPath =
  config.fivem.serverCfgPath || path.join(config.fivem.serverDataPath, 'server.cfg');
config.fivem.resourcesPath =
  config.fivem.resourcesPath || path.join(config.fivem.serverDataPath, 'resources');
config.fivem.logFile =
  config.fivem.logFile || path.join(config.fivem.serverDataPath, 'console.log');

export default config;
