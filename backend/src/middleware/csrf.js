import crypto from 'crypto';
import config from '../config/index.js';

export function generateCsrfToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function csrfProtection(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const cookieToken = req.cookies?.[config.csrf.cookieName];
  const headerToken = req.headers[config.csrf.headerName];

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ error: 'CSRF validation failed' });
  }

  next();
}

export function setCsrfCookie(res, token) {
  res.cookie(config.csrf.cookieName, token, {
    httpOnly: false,
    secure: config.env === 'production',
    sameSite: 'strict',
    maxAge: 8 * 60 * 60 * 1000,
  });
}
