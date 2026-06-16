-- Noxus Panel Migration 002: Dual-role platform + Discord OAuth
-- Run via: npm run migrate

-- Player role (portal access only)
INSERT INTO panel_roles (name, permissions) VALUES
('player', '{"player_portal":true}')
ON DUPLICATE KEY UPDATE permissions = VALUES(permissions);

-- Discord & character linking on panel users
ALTER TABLE panel_users
  MODIFY password_hash VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS discord_id VARCHAR(32) NULL UNIQUE,
  ADD COLUMN IF NOT EXISTS discord_username VARCHAR(128) NULL,
  ADD COLUMN IF NOT EXISTS discord_avatar VARCHAR(512) NULL,
  ADD COLUMN IF NOT EXISTS citizenid VARCHAR(64) NULL,
  ADD COLUMN IF NOT EXISTS auth_provider ENUM('local','discord') DEFAULT 'local';

-- MariaDB < 10.5 may not support IF NOT EXISTS on ADD COLUMN — migration script handles fallback

CREATE TABLE IF NOT EXISTS panel_discord_role_map (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  discord_role_id VARCHAR(32) NOT NULL UNIQUE,
  discord_role_name VARCHAR(128) NULL,
  panel_role VARCHAR(32) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO panel_discord_role_map (discord_role_id, discord_role_name, panel_role) VALUES
('OWNER_ROLE_ID', 'Owner', 'owner'),
('ADMIN_ROLE_ID', 'Admin', 'admin'),
('MOD_ROLE_ID', 'Moderator', 'moderator')
ON DUPLICATE KEY UPDATE panel_role = VALUES(panel_role);

CREATE TABLE IF NOT EXISTS panel_notifications (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('info','warning','success','danger','economy','gang','maintenance') DEFAULT 'info',
  audience ENUM('all','admin','player') DEFAULT 'all',
  is_read TINYINT(1) DEFAULT 0,
  user_id INT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES panel_users(id) ON DELETE CASCADE,
  INDEX idx_audience (audience),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS panel_economy_snapshots (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  total_cash BIGINT UNSIGNED DEFAULT 0,
  total_bank BIGINT UNSIGNED DEFAULT 0,
  total_players INT UNSIGNED DEFAULT 0,
  total_vehicles INT UNSIGNED DEFAULT 0,
  total_houses INT UNSIGNED DEFAULT 0,
  snapshot_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_snapshot (snapshot_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS panel_resource_metrics (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  resource_name VARCHAR(64) NOT NULL,
  current_ms DECIMAL(10,3) DEFAULT 0,
  average_ms DECIMAL(10,3) DEFAULT 0,
  memory_kb INT UNSIGNED DEFAULT 0,
  restart_count INT UNSIGNED DEFAULT 0,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_resource (resource_name),
  INDEX idx_recorded (recorded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Extend admin permissions for new features
UPDATE panel_roles SET permissions = JSON_SET(permissions, '$.economy_manage', true, '$.gang_manage', true, '$.live_monitor', true) WHERE name = 'owner';
UPDATE panel_roles SET permissions = JSON_SET(permissions, '$.economy_manage', true, '$.gang_manage', true, '$.live_monitor', true) WHERE name = 'admin';
UPDATE panel_roles SET permissions = JSON_SET(permissions, '$.live_monitor', true) WHERE name = 'moderator';
