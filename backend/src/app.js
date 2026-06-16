import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import config from './config/index.js';
import { csrfProtection } from './middleware/csrf.js';
import { ipAllowlist } from './middleware/ipAllowlist.js';
import { apiRateLimiter } from './middleware/rateLimit.js';

import { authenticate, requireAdmin } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import dashboardRoutes from './routes/dashboard.js';
import serverRoutes from './routes/server.js';
import consoleRoutes from './routes/console.js';
import resourcesRoutes from './routes/resources.js';
import configRoutes from './routes/config.js';
import playersRoutes from './routes/players.js';
import backupsRoutes from './routes/backups.js';
import auditRoutes from './routes/audit.js';
import settingsRoutes from './routes/settings.js';
import playerPortalRoutes from './routes/playerPortal.js';
import adminToolsRoutes from './routes/adminTools.js';
import notificationsRoutes from './routes/notifications.js';

const adminAuth = [authenticate, requireAdmin];

const app = express();

if (config.security.trustProxy) {
  app.set('trust proxy', 1);
}

app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json({ limit: '2mb' }));
app.use(ipAllowlist);
app.use('/api', apiRateLimiter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', name: 'Noxus Panel', version: '1.0.0' });
});

app.use('/api/auth', authRoutes);

app.use(csrfProtection);

app.use('/api/player', playerPortalRoutes);
app.use('/api/notifications', notificationsRoutes);

app.use('/api/dashboard', ...adminAuth, dashboardRoutes);
app.use('/api/server', ...adminAuth, serverRoutes);
app.use('/api/console', ...adminAuth, consoleRoutes);
app.use('/api/resources', ...adminAuth, resourcesRoutes);
app.use('/api/config', ...adminAuth, configRoutes);
app.use('/api/players', ...adminAuth, playersRoutes);
app.use('/api/backups', ...adminAuth, backupsRoutes);
app.use('/api/audit', ...adminAuth, auditRoutes);
app.use('/api/settings', ...adminAuth, settingsRoutes);
app.use('/api/admin', adminToolsRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
