import http from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import config from './config/index.js';
import app from './app.js';
import { initConsoleService } from './services/consoleService.js';
import { getDashboardStatus } from './services/metricsService.js';
import { startBackupScheduler } from './services/backupService.js';

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: config.frontendUrl,
    credentials: true,
  },
});

app.set('io', io);

function authenticateSocket(socket, next) {
  const token =
    socket.handshake.auth?.token ||
    socket.handshake.headers?.cookie?.match(new RegExp(`${config.jwt.cookieName}=([^;]+)`))?.[1];

  if (!token) return next(new Error('Authentication required'));

  try {
    const payload = jwt.verify(token, config.jwt.secret);
    socket.user = { id: payload.sub, username: payload.username, role: payload.role };
    next();
  } catch {
    next(new Error('Invalid token'));
  }
}

io.use(authenticateSocket);

io.on('connection', (socket) => {
  socket.join(`role:${socket.user.role}`);

  socket.on('console:command', async (data) => {
    if (!['owner', 'admin', 'moderator'].includes(socket.user.role)) {
      return socket.emit('error', { message: 'Insufficient permissions' });
    }
    try {
      const { sendConsoleCommand } = await import('./services/consoleService.js');
      await sendConsoleCommand(data.command, socket.user);
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });
});

initConsoleService((entry) => {
  io.emit('console:line', entry);
});

setInterval(async () => {
  try {
    const status = await getDashboardStatus();
    io.emit('server:status', status);
  } catch {
    // ignore polling errors
  }
}, 5000);

startBackupScheduler();

const port = config.port;
const host = config.host;

server.listen(port, host, () => {
  console.log(`Noxus Panel API listening on ${host}:${port}`);
});

process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});
