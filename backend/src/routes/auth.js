import { Router } from 'express';
import crypto from 'crypto';
import config from '../config/index.js';
import { login, revokeSession, getRedirectForRole, canViewCombatLogs } from '../services/authService.js';
import { loginRateLimiter } from '../middleware/rateLimit.js';
import { authenticate, clientIp } from '../middleware/auth.js';
import { generateCsrfToken, setCsrfCookie } from '../middleware/csrf.js';
import { isDiscordEnabled, getDiscordAuthUrl, handleDiscordCallback } from '../services/discordService.js';

const router = Router();
const oauthStates = new Map();

function setAuthCookies(res, accessToken, refreshToken) {
  const csrfToken = generateCsrfToken();
  setCsrfCookie(res, csrfToken);
  res.cookie(config.jwt.cookieName, accessToken, {
    httpOnly: true,
    secure: config.env === 'production',
    sameSite: 'lax',
    maxAge: 8 * 60 * 60 * 1000,
  });
  res.cookie(config.jwt.refreshCookieName, refreshToken, {
    httpOnly: true,
    secure: config.env === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  return csrfToken;
}

router.get('/csrf', (req, res) => {
  const token = generateCsrfToken();
  setCsrfCookie(res, token);
  res.json({ csrfToken: token });
});

router.post('/login', loginRateLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const ip = clientIp(req);
    const { user, accessToken, refreshToken, redirectTo } = await login(
      username,
      password,
      ip,
      req.headers['user-agent']
    );

    const csrfToken = setAuthCookies(res, accessToken, refreshToken);

    res.json({ user: { ...user, canViewCombatLogs: canViewCombatLogs(user.role) }, csrfToken, redirectTo });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

router.post('/logout', authenticate, async (req, res) => {
  const refreshToken = req.cookies?.[config.jwt.refreshCookieName];
  await revokeSession(refreshToken);
  res.clearCookie(config.jwt.cookieName);
  res.clearCookie(config.jwt.refreshCookieName);
  res.json({ success: true });
});

router.get('/me', authenticate, async (req, res) => {
  const { findUserById, sanitizeUser, getRedirectForRole, canViewCombatLogs } = await import('../services/authService.js');
  const user = await findUserById(req.user.id);
  if (!user) return res.status(401).json({ error: 'User not found' });
  res.json({
    user: {
      ...sanitizeUser(user),
      canViewCombatLogs: canViewCombatLogs(user.role),
    },
    redirectTo: getRedirectForRole(user.role),
  });
});

router.get('/discord', (req, res) => {
  if (!isDiscordEnabled()) {
    return res.status(503).json({ error: 'Discord OAuth is not configured' });
  }
  const state = crypto.randomBytes(16).toString('hex');
  oauthStates.set(state, Date.now());
  res.json({ url: getDiscordAuthUrl(state) });
});

router.get('/discord/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code) return res.status(400).send('Missing authorization code');

    if (state && oauthStates.has(state)) {
      oauthStates.delete(state);
    }

    const ip = clientIp(req);
    const result = await handleDiscordCallback(code, ip, req.headers['user-agent']);
    setAuthCookies(res, result.accessToken, result.refreshToken);

    res.redirect(`${config.frontendUrl}${result.redirectTo}?discord=success`);
  } catch (err) {
    res.redirect(`${config.frontendUrl}/login?error=${encodeURIComponent(err.message)}`);
  }
});

export default router;
