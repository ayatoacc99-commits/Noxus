import os from 'os';
import fs from 'fs/promises';
import { execFile } from 'child_process';
import { promisify } from 'util';
import config from '../config/index.js';
import { isFivemRunning, getProcessUptime, syncProcessStartTime } from './fivemProcess.js';
import { sendRconCommand } from './rconClient.js';

const execFileAsync = promisify(execFile);

async function getCpuUsage() {
  const cpus = os.cpus();
  let idle = 0;
  let total = 0;
  for (const cpu of cpus) {
    for (const type of Object.values(cpu.times)) {
      total += type;
    }
    idle += cpu.times.idle;
  }
  return Math.round((1 - idle / total) * 100);
}

async function getDiskUsage(path) {
  try {
    const { stdout } = await execFileAsync('df', ['-h', path]);
    const lines = stdout.trim().split('\n');
    if (lines.length < 2) return null;
    const parts = lines[1].split(/\s+/);
    return { total: parts[1], used: parts[2], available: parts[3], percent: parts[4] };
  } catch {
    return null;
  }
}

async function getPlayerCount() {
  try {
    const response = await sendRconCommand('status');
    const match = response.match(/(\d+)\s+players?/i);
    return match ? parseInt(match[1], 10) : 0;
  } catch {
    return null;
  }
}

export async function getDashboardStatus() {
  await syncProcessStartTime();
  const running = await isFivemRunning();
  const mem = process.memoryUsage();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();

  return {
    server: {
      online: running,
      uptime: running ? getProcessUptime() : null,
      ip: config.fivem.serverIp,
      port: config.fivem.serverPort,
      playerCount: running ? await getPlayerCount() : 0,
    },
    system: {
      hostname: os.hostname(),
      cpuPercent: await getCpuUsage(),
      ram: {
        total: totalMem,
        used: totalMem - freeMem,
        percent: Math.round(((totalMem - freeMem) / totalMem) * 100),
      },
      panelMemory: {
        rss: mem.rss,
        heapUsed: mem.heapUsed,
      },
      disk: await getDiskUsage(config.fivem.serverDataPath),
      loadAvg: os.loadavg(),
      platform: os.platform(),
    },
    timestamp: new Date().toISOString(),
  };
}
