import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import config from './config/index.js';
import { csrfProtection } from './middleware/csrf.js';
import { ipAllowlist } from './middleware/ipAllowlist.js';
import { apiRateLimiter } from './middleware/rateLimit.js';

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

app.use('/api/dashboard', dashboardRoutes);
app.use('/api/server', serverRoutes);
app.use('/api/console', consoleRoutes);
app.use('/api/resources', resourcesRoutes);
app.use('/api/config', configRoutes);
app.use('/api/players', playersRoutes);
app.use('/api/backups', backupsRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/settings', settingsRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
