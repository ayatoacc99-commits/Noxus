import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import config from '../config/index.js';
import { resolveSafePath } from '../utils/pathValidator.js';
import { validateConsoleCommand } from '../utils/commandWhitelist.js';
import { sendRconCommand } from './rconClient.js';

const MAX_HISTORY = 5000;
const history = [];
let tailWatcher = null;
let emitLine = null;

const ERROR_PATTERNS = [/error/i, /failed/i, /exception/i];
const WARN_PATTERNS = [/warn/i, /warning/i];

function classifyLine(line) {
  if (ERROR_PATTERNS.some((p) => p.test(line))) return 'error';
  if (WARN_PATTERNS.some((p) => p.test(line))) return 'warn';
  return 'info';
}

export function initConsoleService(onLine) {
  emitLine = onLine;
  startTail();
}

function addToHistory(entry) {
  history.push(entry);
  if (history.length > MAX_HISTORY) {
    history.splice(0, history.length - MAX_HISTORY);
  }
}

function startTail() {
  const logPath = resolveSafePath(config.fivem.logFile);
  try {
    if (tailWatcher) tailWatcher.close();
    let position = 0;
    if (fs.existsSync(logPath)) {
      position = fs.statSync(logPath).size;
    }

    tailWatcher = fs.watch(logPath, { persistent: true }, () => {
      fs.stat(logPath, (err, stats) => {
        if (err) return;
        if (stats.size < position) position = 0;
        if (stats.size <= position) return;

        const stream = fs.createReadStream(logPath, { start: position, end: stats.size - 1 });
        let data = '';
        stream.on('data', (chunk) => {
          data += chunk.toString();
        });
        stream.on('end', () => {
          position = stats.size;
          const lines = data.split('\n').filter(Boolean);
          for (const line of lines) {
            const entry = {
              timestamp: new Date().toISOString(),
              line,
              level: classifyLine(line),
            };
            addToHistory(entry);
            emitLine?.(entry);
          }
        });
      });
    });
  } catch {
    // Log file may not exist until server starts
  }
}

export function getConsoleHistory({ limit = 200, search = '', level = null } = {}) {
  let filtered = [...history];
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter((e) => e.line.toLowerCase().includes(q));
  }
  if (level) {
    filtered = filtered.filter((e) => e.level === level);
  }
  return filtered.slice(-limit);
}

export async function sendConsoleCommand(command, user) {
  const safe = validateConsoleCommand(command);
  const entry = {
    timestamp: new Date().toISOString(),
    line: `> ${safe} (by ${user.username})`,
    level: 'command',
  };
  addToHistory(entry);
  emitLine?.(entry);

  try {
    const response = await sendRconCommand(safe);
    if (response) {
      const responseEntry = {
        timestamp: new Date().toISOString(),
        line: response,
        level: 'info',
      };
      addToHistory(responseEntry);
      emitLine?.(responseEntry);
    }
    return { success: true, response };
  } catch (err) {
    const errEntry = {
      timestamp: new Date().toISOString(),
      line: `RCON error: ${err.message}`,
      level: 'error',
    };
    addToHistory(errEntry);
    emitLine?.(errEntry);
    throw err;
  }
}

export async function persistHistory() {
  const dir = config.paths.consoleHistory;
  await fsPromises.mkdir(dir, { recursive: true });
  const file = path.join(dir, `history-${new Date().toISOString().slice(0, 10)}.json`);
  await fsPromises.writeFile(file, JSON.stringify(history.slice(-1000), null, 2));
}
