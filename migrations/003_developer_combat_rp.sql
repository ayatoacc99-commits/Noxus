-- Noxus Panel Migration 003: Developer role, combat logs, RP permissions
-- Run via: npm run migrate

-- Developer role (admin access + combat log visibility)
INSERT INTO panel_roles (name, permissions) VALUES
('developer', JSON_OBJECT(
  'server_control', true,
  'server_config', true,
  'console_command', true,
  'resource_manage', true,
  'player_view', true,
  'player_edit', true,
  'player_ban', true,
  'backup_manage', true,
  'audit_view', true,
  'economy_manage', true,
  'gang_manage', true,
  'live_monitor', true,
  'view_combat_logs', true
))
ON DUPLICATE KEY UPDATE permissions = VALUES(permissions);

-- Combat log visibility for owner only (developer set above)
UPDATE panel_roles
SET permissions = JSON_SET(permissions, '$.view_combat_logs', true)
WHERE name = 'owner';

-- Ensure admin/moderator/player cannot view combat logs
UPDATE panel_roles
SET permissions = JSON_REMOVE(permissions, '$.view_combat_logs')
WHERE name IN ('admin', 'moderator', 'viewer', 'player');

CREATE TABLE IF NOT EXISTS panel_combat_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  citizenid VARCHAR(64) NULL,
  victim_name VARCHAR(128) NULL,
  attacker_citizenid VARCHAR(64) NULL,
  attacker_name VARCHAR(128) NULL,
  weapon VARCHAR(128) NULL,
  event_type ENUM('kill', 'death', 'combat') DEFAULT 'kill',
  location VARCHAR(255) NULL,
  details JSON NULL,
  occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_citizenid (citizenid),
  INDEX idx_attacker (attacker_citizenid),
  INDEX idx_occurred (occurred_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO panel_discord_role_map (discord_role_id, discord_role_name, panel_role) VALUES
('DEV_ROLE_ID', 'Developer', 'developer')
ON DUPLICATE KEY UPDATE panel_role = VALUES(panel_role);
