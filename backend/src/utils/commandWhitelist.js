const ALLOWED_CONSOLE_PREFIXES = [
  'status',
  'refresh',
  'restart',
  'start',
  'stop',
  'ensure',
  'txa',
  'say',
  'kick',
  'ban',
  'unban',
  'add_principal',
  'remove_principal',
  'add_ace',
  'remove_ace',
  'load_server_icon',
  'sv_',
  'setr ',
  'set ',
  'exec',
];

const BLOCKED_PATTERNS = [
  /[;&|`$]/,
  /\.\./,
  />/,
  /</,
  /\n/,
  /\r/,
];

export function validateConsoleCommand(command) {
  if (!command || typeof command !== 'string') {
    throw new Error('Command is required');
  }

  const trimmed = command.trim();
  if (trimmed.length === 0 || trimmed.length > 512) {
    throw new Error('Invalid command length');
  }

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(trimmed)) {
      throw new Error('Command contains blocked characters');
    }
  }

  const lower = trimmed.toLowerCase();
  const allowed = ALLOWED_CONSOLE_PREFIXES.some((prefix) => lower.startsWith(prefix));
  if (!allowed) {
    throw new Error('Command not in whitelist');
  }

  return trimmed;
}

export function validateResourceName(name) {
  if (!name || typeof name !== 'string') return false;
  return /^[a-zA-Z0-9_-]+$/.test(name) && name.length <= 64;
}
