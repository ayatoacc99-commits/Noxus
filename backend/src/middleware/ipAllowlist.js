import config from '../config/index.js';
import { clientIp } from './auth.js';

export function ipAllowlist(req, res, next) {
  const allowlist = config.security.ipAllowlist;
  if (!allowlist.length) return next();

  const ip = clientIp(req);
  const normalized = ip?.replace('::ffff:', '') || '';

  const allowed = allowlist.some((entry) => {
    if (entry.includes('/')) {
      return normalized.startsWith(entry.split('/')[0].slice(0, -1));
    }
    return entry === normalized || entry === ip;
  });

  if (!allowed) {
    return res.status(403).json({ error: 'IP address not allowed' });
  }

  next();
}
