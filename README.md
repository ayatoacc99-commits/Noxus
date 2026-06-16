# Noxus Panel

Production-ready web administration panel for **FiveM QB-Core** servers. Manage your server without relying on txAdmin long term.

![Tech Stack](https://img.shields.io/badge/FiveM-QB--Core-blue)
![Node](https://img.shields.io/badge/Node.js-18%2B-green)
![License](https://img.shields.io/badge/License-MIT-lightgrey)

## Features

- **Authentication** — bcrypt passwords, JWT httpOnly cookies, CSRF protection, role-based access (owner/admin/moderator/viewer)
- **Dashboard** — server status, uptime, CPU/RAM/disk, player count, quick actions
- **Process Manager** — start/stop/restart via systemd, PM2, or direct process mode
- **Live Console** — WebSocket log streaming, command input (whitelisted), search/filter, error highlighting
- **Resource Manager** — list resources, ensure/start/stop/restart, QB-Core/OX detection, critical resource warnings
- **server.cfg Editor** — safe editing with auto-backup, validation, masked secrets
- **Player Manager** — QB-Core database integration with safe JSON editing, ban/unban, vehicles, audit backups
- **Backup System** — manual + scheduled daily backups, tar.gz compression, retention policy
- **Audit Logs** — full action trail with IP, role, old/new values
- **Security** — rate limiting, helmet, path traversal prevention, command whitelist, optional IP allowlist, 2FA-ready schema
- **i18n Ready** — English default with Romanian translation structure

## Architecture

```
noxus-panel/
├── backend/          # Express API + Socket.IO
├── frontend/         # Next.js 14 (App Router)
├── migrations/       # Panel database schema
├── deploy/           # systemd + nginx configs
├── install.sh        # Ubuntu VPS installer
└── .env.example
```

## Requirements

- Ubuntu 20.04+ VPS
- Node.js 18+
- MariaDB/MySQL 10.5+
- FiveM artifacts + QB-Core server-data
- nginx (production)
- `mysqldump` (for database backups)

## Quick Start (Development)

### 1. Clone and install

```bash
git clone <your-repo> noxus-panel
cd noxus-panel
npm run install:all
```

### 2. Configure environment

```bash
cp .env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

Edit `backend/.env`:

| Variable | Description |
|----------|-------------|
| `JWT_SECRET` | Random 64+ char string (`openssl rand -hex 64`) |
| `PANEL_DB_*` | Panel MariaDB credentials |
| `FIVEM_DB_*` | QB-Core database credentials |
| `FIVEM_SERVER_DATA_PATH` | Path to your server-data folder |
| `FIVEM_ARTIFACT_PATH` | Path to FiveM artifacts |
| `FIVEM_RCON_PASSWORD` | Must match `rcon_password` in server.cfg |
| `FIVEM_PROCESS_MODE` | `systemd`, `pm2`, or `direct` |

### 3. Create panel database

```sql
CREATE DATABASE noxus_panel CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'noxus'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON noxus_panel.* TO 'noxus'@'localhost';
FLUSH PRIVILEGES;
```

### 4. Run migrations and create owner

```bash
npm run migrate
npm run seed
# Or non-interactive:
SEED_OWNER_USERNAME=owner SEED_OWNER_PASSWORD=YourSecurePass npm run seed
```

### 5. Start development servers

```bash
# Terminal 1 - API (port 3001)
npm run dev:backend

# Terminal 2 - Frontend (port 3000)
npm run dev:frontend
```

Open http://localhost:3000 and log in with your owner account.

## Production Setup (Ubuntu VPS)

### Automated install

```bash
sudo bash install.sh
```

Then follow the printed next-steps to configure `.env`, run migrations, set up SSL, and start services.

### Manual production steps

1. **Copy and configure** panel to `/opt/noxus-panel`
2. **Build frontend**: `cd frontend && npm run build`
3. **Install systemd service**:
   ```bash
   sudo cp deploy/noxus-panel.service /etc/systemd/system/
   sudo systemctl enable --now noxus-panel
   ```
4. **Configure FiveM systemd** (see `deploy/fivem.service`)
5. **Configure nginx** (see `deploy/nginx-noxus-panel.conf`)
6. **SSL with certbot**:
   ```bash
   sudo certbot --nginx -d panel.yourdomain.com
   ```

### Grant panel user FiveM control

Add to `/etc/sudoers.d/noxus-fivem`:

```
noxus ALL=(root) NOPASSWD: /bin/systemctl start fivem, /bin/systemctl stop fivem, /bin/systemctl restart fivem, /bin/systemctl is-active fivem
```

Or run the panel API as a user with systemd permissions.

## Connecting to FiveM

### server.cfg requirements

Add to your `server.cfg`:

```cfg
endpoint_add_tcp "0.0.0.0:30120"
endpoint_add_udp "0.0.0.0:30120"
sv_maxclients 48

# Required for console commands from panel
rcon_password "your_secure_rcon_password"

# QB-Core database
set mysql_connection_string "mysql://user:password@localhost/qbcore?charset=utf8mb4"
```

Set `FIVEM_RCON_PASSWORD` in `.env` to match `rcon_password`.

### Log file

The panel tails `FIVEM_LOG_FILE` (default: `server-data/console.log`). Configure your FiveM systemd service to append stdout/stderr to this file (see `deploy/fivem.service`).

### Process modes

| Mode | When to use |
|------|-------------|
| `systemd` | Recommended for VPS — uses `FIVEM_SYSTEMD_SERVICE` |
| `pm2` | Alternative process manager |
| `direct` | Development only — spawns `run.sh` directly |

## API Routes

| Method | Endpoint | Permission |
|--------|----------|------------|
| POST | `/api/auth/login` | Public |
| POST | `/api/auth/logout` | Authenticated |
| GET | `/api/dashboard/status` | Authenticated |
| POST | `/api/server/start` | owner/admin |
| POST | `/api/server/stop` | owner/admin |
| POST | `/api/server/restart` | owner/admin |
| GET | `/api/console/logs` | Authenticated |
| POST | `/api/console/command` | owner/admin/moderator |
| GET | `/api/resources` | Authenticated |
| POST | `/api/resources/:name/{start,stop,restart}` | owner/admin/moderator |
| GET/PUT | `/api/config/server-cfg` | owner/admin |
| GET/PUT | `/api/players/:citizenid` | viewer/edit per role |
| GET/POST | `/api/backups` | owner/admin |
| GET | `/api/audit` | All roles (viewer: read-only) |

## WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `server:status` | Server → Client | Dashboard metrics (every 5s) |
| `console:line` | Server → Client | Live log line |
| `console:command` | Client → Server | Send console command |
| `backup:progress` | Server → Client | Backup job progress |

## Roles & Permissions

| Action | owner | admin | moderator | viewer |
|--------|-------|-------|-----------|--------|
| Start/stop/restart server | ✅ | ✅ | ❌ | ❌ |
| Edit server.cfg | ✅ | ✅ | ❌ | ❌ |
| Console commands | ✅ | ✅ | ✅ | ❌ |
| Manage resources | ✅ | ✅ | ✅ | ❌ |
| View players | ✅ | ✅ | ✅ | ✅ |
| Edit players / ban | ✅ | ✅ | ✅ | ❌ |
| Backups | ✅ | ✅ | ❌ | ❌ |
| View audit logs | ✅ | ✅ | ✅ | ✅ |

## QB-Core Player Data

JSON fields (`charinfo`, `money`, `job`, `gang`, `metadata`, `position`) are parsed safely. Edits preserve unknown fields and create audit backups before writes. Missing tables show **"Not installed"** instead of crashing.

Helper functions in `backend/src/services/playerService.js`:
- `getPlayerByCitizenId`
- `updatePlayerMoney` / `updatePlayerJob` / `updatePlayerGang` / `updatePlayerMetadata`
- `getPlayerVehicles` / `getPlayerInventory`

## Security Notes

- Never expose `.env` or commit secrets
- Use HTTPS in production (nginx config included)
- Set a strong `JWT_SECRET` and `rcon_password`
- Enable `IP_ALLOWLIST` for extra restriction
- Console commands are whitelist-only — no raw shell from user input
- Paths are validated against configured FiveM directories
- Sensitive server.cfg values are masked in the UI

## Troubleshooting

### Panel won't start
- Check `backend/.env` database credentials
- Run `npm run migrate` to ensure schema exists
- Check logs: `journalctl -u noxus-panel -f`

### Console shows no logs
- Verify `FIVEM_LOG_FILE` exists and FiveM writes to it
- Check file permissions for the `noxus` user

### RCON commands fail
- Ensure server is running and `rcon_password` matches `.env`
- Verify `FIVEM_RCON_PORT` matches your server port

### Resource actions fail
- Server must be online for RCON
- Check resource name spelling (case-sensitive)

### Player search returns "Not installed"
- QB-Core `players` table not found in `FIVEM_DB_NAME`
- Verify database credentials in `.env`

### CSRF errors on API calls
- Frontend must fetch `/api/auth/csrf` before POST/PUT/DELETE
- Ensure cookies are sent (`credentials: 'include'`)

### Permission denied on start/stop
- Configure sudoers for systemd (see above)
- Or run panel as user with systemctl access

## Adding Romanian Translations

Edit `frontend/src/lib/i18n/index.ts` — the `ro` dictionary is pre-structured. Switch locale via a future settings toggle.

## License

MIT — use freely for your FiveM server.
