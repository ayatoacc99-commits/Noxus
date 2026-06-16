import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import config from '../config/index.js';
import { registerAllowedRoot, resolveSafePath } from '../utils/pathValidator.js';

const execFileAsync = promisify(execFile);

registerAllowedRoot(config.fivem.serverDataPath);
registerAllowedRoot(config.fivem.resourcesPath);
registerAllowedRoot(config.fivem.backupFolder);
registerAllowedRoot(config.fivem.artifactPath);
registerAllowedRoot(path.dirname(config.fivem.serverCfgPath));

let processStartTime = null;

async function runSystemctl(action) {
  const service = config.fivem.systemdService;
  if (!/^[a-zA-Z0-9@._-]+$/.test(service)) {
    throw new Error('Invalid systemd service name');
  }
  await execFileAsync('systemctl', [action, service], { timeout: 60000 });
}

async function runPm2(action) {
  const name = config.fivem.pm2Name;
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    throw new Error('Invalid PM2 process name');
  }
  if (action === 'start') {
    const runScript = path.join(config.fivem.artifactPath, 'run.sh');
    await fs.access(runScript);
    await execFileAsync('pm2', ['start', runScript, '--name', name, '--', '+exec', 'server.cfg'], {
      cwd: config.fivem.serverDataPath,
      timeout: 60000,
    });
  } else {
    await execFileAsync('pm2', [action, name], { timeout: 60000 });
  }
}

async function isSystemdRunning() {
  try {
    const { stdout } = await execFileAsync('systemctl', ['is-active', config.fivem.systemdService]);
    return stdout.trim() === 'active';
  } catch {
    return false;
  }
}

async function isPm2Running() {
  try {
    const { stdout } = await execFileAsync('pm2', ['jlist']);
    const list = JSON.parse(stdout);
    const proc = list.find((p) => p.name === config.fivem.pm2Name);
    return proc?.pm2_env?.status === 'online';
  } catch {
    return false;
  }
}

async function isDirectRunning() {
  try {
    const { stdout } = await execFileAsync('pgrep', ['-f', 'FXServer']);
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

export async function isFivemRunning() {
  switch (config.fivem.processMode) {
    case 'systemd':
      return isSystemdRunning();
    case 'pm2':
      return isPm2Running();
    case 'direct':
      return isDirectRunning();
    default:
      return false;
  }
}

export async function startFivem() {
  switch (config.fivem.processMode) {
    case 'systemd':
      await runSystemctl('start');
      break;
    case 'pm2':
      await runPm2('start');
      break;
    case 'direct': {
      const runScript = resolveSafePath(path.join(config.fivem.artifactPath, 'run.sh'));
      await execFileAsync(runScript, ['+exec', 'server.cfg'], {
        cwd: config.fivem.serverDataPath,
        detached: true,
        timeout: 30000,
      });
      break;
    }
    default:
      throw new Error(`Unknown process mode: ${config.fivem.processMode}`);
  }
  processStartTime = Date.now();
}

export async function stopFivem() {
  switch (config.fivem.processMode) {
    case 'systemd':
      await runSystemctl('stop');
      break;
    case 'pm2':
      await runPm2('stop');
      break;
    case 'direct':
      await execFileAsync('pkill', ['-f', 'FXServer']);
      break;
    default:
      throw new Error(`Unknown process mode: ${config.fivem.processMode}`);
  }
  processStartTime = null;
}

export async function restartFivem() {
  switch (config.fivem.processMode) {
    case 'systemd':
      await runSystemctl('restart');
      break;
    case 'pm2':
      await runPm2('restart');
      break;
    case 'direct':
      await stopFivem();
      await new Promise((r) => setTimeout(r, 3000));
      await startFivem();
      break;
    default:
      throw new Error(`Unknown process mode: ${config.fivem.processMode}`);
  }
  processStartTime = Date.now();
}

export function getProcessUptime() {
  if (!processStartTime) return null;
  return Math.floor((Date.now() - processStartTime) / 1000);
}

export async function syncProcessStartTime() {
  const running = await isFivemRunning();
  if (running && !processStartTime) {
    processStartTime = Date.now();
  }
  if (!running) {
    processStartTime = null;
  }
}

export function getFivemPaths() {
  return {
    artifactPath: config.fivem.artifactPath,
    serverDataPath: config.fivem.serverDataPath,
    serverCfgPath: config.fivem.serverCfgPath,
    resourcesPath: config.fivem.resourcesPath,
    backupFolder: config.fivem.backupFolder,
    processMode: config.fivem.processMode,
  };
}
