import { Router } from 'express';
import config from '../config/index.js';
import { login, revokeSession } from '../services/authService.js';
import { loginRateLimiter } from '../middleware/rateLimit.js';
import { authenticate, clientIp } from '../middleware/auth.js';
import { generateCsrfToken, setCsrfCookie } from '../middleware/csrf.js';

const router = Router();

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
    const { user, accessToken, refreshToken } = await login(
      username,
      password,
      ip,
      req.headers['user-agent']
    );

    const csrfToken = generateCsrfToken();
    setCsrfCookie(res, csrfToken);

    res.cookie(config.jwt.cookieName, accessToken, {
      httpOnly: true,
      secure: config.env === 'production',
      sameSite: 'strict',
      maxAge: 8 * 60 * 60 * 1000,
    });

    res.cookie(config.jwt.refreshCookieName, refreshToken, {
      httpOnly: true,
      secure: config.env === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ user, csrfToken });
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
  const { findUserById, sanitizeUser } = await import('../services/authService.js');
  const user = await findUserById(req.user.id);
  if (!user) return res.status(401).json({ error: 'User not found' });
  res.json({ user: sanitizeUser(user) });
});

export default router;
