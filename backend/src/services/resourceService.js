import fs from 'fs/promises';
import path from 'path';
import config from '../config/index.js';
import { resolveSafePath } from '../utils/pathValidator.js';
import { sendRconCommand } from './rconClient.js';
import { validateResourceName } from '../utils/commandWhitelist.js';

const CRITICAL_RESOURCES = new Set([
  'qb-core',
  'qb-inventory',
  'qb-multicharacter',
  'qb-spawn',
  'qb-management',
  'oxmysql',
  'screenshot-basic',
]);

export function isCriticalResource(name) {
  return CRITICAL_RESOURCES.has(name);
}

function detectResourceType(name, resourcePath) {
  const lower = name.toLowerCase();
  if (lower.startsWith('qb-') || lower === 'qb-core') return 'qb-core';
  if (lower.startsWith('ox_') || lower.startsWith('ox-')) return 'ox';
  if (resourcePath.includes('[standalone]') || resourcePath.includes('[cfx-default]')) {
    return 'standalone';
  }
  return 'custom';
}

async function findResourceDirs(basePath, prefix = '') {
  const results = [];
  try {
    const entries = await fs.readdir(basePath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(basePath, entry.name);
      if (entry.isDirectory()) {
        const manifestPath = path.join(fullPath, 'fxmanifest.lua');
        const legacyManifest = path.join(fullPath, '__resource.lua');
        let hasManifest = false;
        try {
          await fs.access(manifestPath);
          hasManifest = true;
        } catch {
          try {
            await fs.access(legacyManifest);
            hasManifest = true;
          } catch {
            // subfolder category
          }
        }

        if (hasManifest) {
          results.push({ name: entry.name, path: fullPath });
        } else {
          const nested = await findResourceDirs(fullPath, `${prefix}${entry.name}/`);
          results.push(...nested);
        }
      }
    }
  } catch {
    // folder may not exist in dev
  }
  return results;
}

export async function parseServerCfgEnsures() {
  const cfgPath = resolveSafePath(config.fivem.serverCfgPath);
  const content = await fs.readFile(cfgPath, 'utf8');
  const ensures = new Set();
  const starts = new Set();

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    const ensureMatch = trimmed.match(/^ensure\s+([^\s#]+)/i);
    const startMatch = trimmed.match(/^start\s+([^\s#]+)/i);
    if (ensureMatch) ensures.add(ensureMatch[1]);
    if (startMatch) starts.add(startMatch[1]);
  }

  return { ensures, starts, content };
}

export async function listResources() {
  const resourcesPath = resolveSafePath(config.fivem.resourcesPath);
  const resourceDirs = await findResourceDirs(resourcesPath);
  const { ensures, starts } = await parseServerCfgEnsures();

  return resourceDirs.map((r) => ({
    name: r.name,
    path: r.path,
    type: detectResourceType(r.name, r.path),
    ensured: ensures.has(r.name),
    started: starts.has(r.name),
    critical: isCriticalResource(r.name),
  }));
}

export async function resourceAction(name, action) {
  if (!validateResourceName(name)) {
    throw new Error('Invalid resource name');
  }
  const allowed = ['start', 'stop', 'restart', 'ensure'];
  if (!allowed.includes(action)) {
    throw new Error('Invalid action');
  }

  const command = action === 'ensure' ? `ensure ${name}` : `${action} ${name}`;
  return sendRconCommand(command);
}

export async function toggleEnsureInCfg(name, ensure = true) {
  if (!validateResourceName(name)) {
    throw new Error('Invalid resource name');
  }

  const cfgPath = resolveSafePath(config.fivem.serverCfgPath);
  const content = await fs.readFile(cfgPath, 'utf8');
  const lines = content.split('\n');
  const directive = ensure ? 'ensure' : null;

  const filtered = lines.filter((line) => {
    const trimmed = line.trim();
    return !trimmed.match(new RegExp(`^(ensure|start)\\s+${name}(\\s|$)`, 'i'));
  });

  if (ensure) {
    filtered.push(`ensure ${name}`);
  }

  await fs.writeFile(cfgPath, filtered.join('\n'), 'utf8');
  return { name, ensured: Boolean(directive) };
}

export { CRITICAL_RESOURCES };
