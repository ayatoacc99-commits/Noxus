const SENSITIVE_KEYS = [
  'sv_licenseKey',
  'steam_webApiKey',
  'mysql_connection_string',
  'rcon_password',
  'sv_tebexSecret',
];

export function maskSecret(value) {
  if (!value || typeof value !== 'string') return '********';
  if (value.length <= 8) return '********';
  return `${value.slice(0, 4)}${'*'.repeat(Math.min(12, value.length - 8))}${value.slice(-4)}`;
}

export function maskServerCfgContent(content) {
  return content
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return line;

      for (const key of SENSITIVE_KEYS) {
        if (trimmed.toLowerCase().startsWith(`set ${key.toLowerCase()}`) ||
            trimmed.toLowerCase().startsWith(`${key.toLowerCase()}`)) {
          const parts = line.split(/\s+/);
          const prefix = parts.slice(0, 2).join(' ');
          return `${prefix} ${maskSecret(parts.slice(2).join(' '))}`;
        }
        if (trimmed.toLowerCase().includes('password') && trimmed.includes(' ')) {
          const eqIdx = line.indexOf('=');
          if (eqIdx !== -1) {
            return `${line.slice(0, eqIdx + 1)} ${maskSecret(line.slice(eqIdx + 1).trim())}`;
          }
        }
      }
      return line;
    })
    .join('\n');
}

export function isSensitiveKey(key) {
  return SENSITIVE_KEYS.some((k) => k.toLowerCase() === key.toLowerCase());
}

export { SENSITIVE_KEYS };
