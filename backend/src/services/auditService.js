import { getPanelPool } from '../db/pool.js';

export async function logAudit({
  userId,
  username,
  role,
  action,
  target = null,
  oldValue = null,
  newValue = null,
  ipAddress = null,
}) {
  const pool = getPanelPool();
  await pool.query(
    `INSERT INTO panel_audit_logs
     (user_id, username, role, action, target, old_value, new_value, ip_address)
     VALUES (:userId, :username, :role, :action, :target, :oldValue, :newValue, :ipAddress)`,
    {
      userId,
      username,
      role,
      action,
      target,
      oldValue: oldValue !== null ? JSON.stringify(oldValue) : null,
      newValue: newValue !== null ? JSON.stringify(newValue) : null,
      ipAddress,
    }
  );
}

export async function getAuditLogs({ limit = 100, offset = 0, action = null }) {
  const pool = getPanelPool();
  let sql = `SELECT id, user_id, username, role, action, target, old_value, new_value, ip_address, created_at
             FROM panel_audit_logs`;
  const params = { limit, offset };

  if (action) {
    sql += ' WHERE action = :action';
    params.action = action;
  }

  sql += ' ORDER BY created_at DESC LIMIT :limit OFFSET :offset';
  const [rows] = await pool.query(sql, params);
  return rows.map((row) => ({
    ...row,
    old_value: row.old_value ? JSON.parse(row.old_value) : null,
    new_value: row.new_value ? JSON.parse(row.new_value) : null,
  }));
}
