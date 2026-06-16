import fs from 'fs/promises';
import path from 'path';
import config from '../config/index.js';
import { resolveSafePath } from '../utils/pathValidator.js';
import { maskServerCfgContent } from '../utils/secrets.js';

const VALIDATION_RULES = [
  { key: 'sv_hostname', pattern: /^set\s+sv_hostname\s+".+"$/i, message: 'sv_hostname should be quoted' },
  { key: 'sv_maxclients', pattern: /^sv_maxclients\s+\d+$/i, message: 'sv_maxclients must be a number' },
  { key: 'endpoint_add_tcp', pattern: /^endpoint_add_tcp\s+"[^"]+"$/i, message: 'endpoint_add_tcp format invalid' },
  { key: 'endpoint_add_udp', pattern: /^endpoint_add_udp\s+"[^"]+"$/i, message: 'endpoint_add_udp format invalid' },
  { key: 'mysql_connection_string', pattern: /^set\s+mysql_connection_string\s+".+"$/i, message: 'mysql_connection_string should be quoted' },
  { key: 'sv_licenseKey', pattern: /^sv_licenseKey\s+.+/i, message: 'sv_licenseKey is required' },
];

export async function readServerCfg(masked = true) {
  const cfgPath = resolveSafePath(config.fivem.serverCfgPath);
  const content = await fs.readFile(cfgPath, 'utf8');
  return {
    path: cfgPath,
    content: masked ? maskServerCfgContent(content) : content,
    masked,
  };
}

export function validateServerCfg(content) {
  const warnings = [];
  const lines = content.split('\n');

  for (const rule of VALIDATION_RULES) {
    const found = lines.some((l) => l.trim().toLowerCase().startsWith(rule.key.toLowerCase()) ||
      l.trim().toLowerCase().startsWith(`set ${rule.key.toLowerCase()}`));
    if (!found && ['sv_licenseKey', 'sv_maxclients'].includes(rule.key)) {
      warnings.push({ key: rule.key, message: `Missing recommended variable: ${rule.key}` });
    }
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    for (const rule of VALIDATION_RULES) {
      if (trimmed.toLowerCase().includes(rule.key.toLowerCase()) && !rule.pattern.test(trimmed)) {
        warnings.push({ key: rule.key, message: rule.message, line: trimmed });
      }
    }
  }

  return warnings;
}

export async function writeServerCfg(newContent, userId) {
  const cfgPath = resolveSafePath(config.fivem.serverCfgPath);
  const backupDir = config.paths.configBackups;
  await fs.mkdir(backupDir, { recursive: true });

  const existing = await fs.readFile(cfgPath, 'utf8');
  const backupName = `server.cfg.${Date.now()}.bak`;
  await fs.writeFile(path.join(backupDir, backupName), existing, 'utf8');

  const warnings = validateServerCfg(newContent);
  await fs.writeFile(cfgPath, newContent, 'utf8');

  return { backupName, warnings };
}

export async function listConfigBackups() {
  const backupDir = config.paths.configBackups;
  await fs.mkdir(backupDir, { recursive: true });
  const files = await fs.readdir(backupDir);
  return files.filter((f) => f.endsWith('.bak')).sort().reverse();
}
