import { getPanelPool } from '../db/pool.js';

export async function getNotifications(userId, role, limit = 50) {
  const pool = getPanelPool();
  try {
    const audience = role === 'player' ? ['all', 'player'] : ['all', 'admin'];
    const [rows] = await pool.query(
      `SELECT * FROM panel_notifications
       WHERE (user_id IS NULL OR user_id = :userId)
         AND audience IN (:audience)
         AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY created_at DESC
       LIMIT :limit`,
      { userId, audience, limit }
    );
    return rows;
  } catch {
    return [];
  }
}

export async function createNotification({ title, message, type = 'info', audience = 'all', userId = null }) {
  const pool = getPanelPool();
  const [result] = await pool.query(
    `INSERT INTO panel_notifications (title, message, type, audience, user_id)
     VALUES (:title, :message, :type, :audience, :userId)`,
    { title, message, type, audience, userId }
  );
  return result.insertId;
}

export async function markNotificationRead(id, userId) {
  const pool = getPanelPool();
  await pool.query(
    'UPDATE panel_notifications SET is_read = 1 WHERE id = :id AND (user_id IS NULL OR user_id = :userId)',
    { id, userId }
  );
}

export async function broadcastServerEvent(title, message, type = 'info') {
  return createNotification({ title, message, type, audience: 'all' });
}
