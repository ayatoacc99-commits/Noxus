#!/usr/bin/env bash
set -euo pipefail

# Noxus Panel - Ubuntu VPS installer
# Run as root: sudo bash install.sh

PANEL_DIR="${PANEL_DIR:-/opt/noxus-panel}"
FIVEM_USER="${FIVEM_USER:-fivem}"
NOXUS_USER="${NOXUS_USER:-noxus}"

echo "=== Noxus Panel Installer ==="

if [[ $EUID -ne 0 ]]; then
  echo "Please run as root (sudo bash install.sh)"
  exit 1
fi

echo "[1/8] Installing system dependencies..."
apt-get update
apt-get install -y curl git nginx mariadb-server build-essential

echo "[2/8] Installing Node.js 20..."
if ! command -v node &>/dev/null || [[ $(node -v | cut -d. -f1 | tr -d v) -lt 18 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

echo "[3/8] Creating users..."
id -u "$NOXUS_USER" &>/dev/null || useradd -r -m -s /bin/bash "$NOXUS_USER"
id -u "$FIVEM_USER" &>/dev/null || useradd -r -m -s /bin/bash "$FIVEM_USER"

echo "[4/8] Setting up panel directory..."
mkdir -p "$PANEL_DIR"
if [[ -d "$(dirname "$0")/backend" ]]; then
  cp -r "$(dirname "$0")"/* "$PANEL_DIR/"
fi
chown -R "$NOXUS_USER:$NOXUS_USER" "$PANEL_DIR"

echo "[5/8] Installing npm packages..."
sudo -u "$NOXUS_USER" bash -c "cd $PANEL_DIR && npm run install:all"

echo "[6/8] Configuring environment..."
if [[ ! -f "$PANEL_DIR/backend/.env" ]]; then
  cp "$PANEL_DIR/.env.example" "$PANEL_DIR/backend/.env"
  JWT_SECRET=$(openssl rand -hex 64)
  sed -i "s/change-this-to-a-long-random-string/$JWT_SECRET/" "$PANEL_DIR/backend/.env"
  echo "Created $PANEL_DIR/backend/.env - EDIT THIS FILE before starting!"
fi

if [[ ! -f "$PANEL_DIR/frontend/.env.local" ]]; then
  cp "$PANEL_DIR/frontend/.env.example" "$PANEL_DIR/frontend/.env.local"
fi

echo "[7/8] Installing systemd services..."
cp "$PANEL_DIR/deploy/noxus-panel.service" /etc/systemd/system/
cp "$PANEL_DIR/deploy/fivem.service" /etc/systemd/system/
systemctl daemon-reload

echo "[8/8] Building frontend..."
sudo -u "$NOXUS_USER" bash -c "cd $PANEL_DIR/frontend && npm run build"

echo ""
echo "=== Installation complete ==="
echo ""
echo "Next steps:"
echo "  1. Configure MariaDB and create databases:"
echo "     mysql -u root -p"
echo "     CREATE DATABASE noxus_panel;"
echo "     CREATE USER 'noxus'@'localhost' IDENTIFIED BY 'your_password';"
echo "     GRANT ALL ON noxus_panel.* TO 'noxus'@'localhost';"
echo ""
echo "  2. Edit $PANEL_DIR/backend/.env with your FiveM paths and DB credentials"
echo ""
echo "  3. Run migrations and seed owner account:"
echo "     cd $PANEL_DIR/backend && npm run migrate"
echo "     cd $PANEL_DIR/backend && npm run seed"
echo ""
echo "  4. Configure Nginx:"
echo "     cp $PANEL_DIR/deploy/nginx-noxus-panel.conf /etc/nginx/sites-available/noxus-panel"
echo "     ln -sf /etc/nginx/sites-available/noxus-panel /etc/nginx/sites-enabled/"
echo "     certbot --nginx -d panel.yourdomain.com"
echo ""
echo "  5. Start services:"
echo "     systemctl enable --now noxus-panel"
echo "     systemctl enable --now fivem"
echo ""
echo "  6. Grant noxus user permission to control FiveM (if using systemd):"
echo "     usermod -aG systemd-journal $NOXUS_USER"
echo "     # Add sudoers rule for systemctl fivem (see README)"
