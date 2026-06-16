import mysql from 'mysql2/promise';
import config from '../config/index.js';

let panelPool = null;
let fivemPool = null;

export function getPanelPool() {
  if (!panelPool) {
    panelPool = mysql.createPool({
      host: config.panelDb.host,
      port: config.panelDb.port,
      user: config.panelDb.user,
      password: config.panelDb.password,
      database: config.panelDb.database,
      waitForConnections: true,
      connectionLimit: 10,
      namedPlaceholders: true,
    });
  }
  return panelPool;
}

export function getFivemPool() {
  if (!fivemPool) {
    fivemPool = mysql.createPool({
      host: config.fivemDb.host,
      port: config.fivemDb.port,
      user: config.fivemDb.user,
      password: config.fivemDb.password,
      database: config.fivemDb.database,
      waitForConnections: true,
      connectionLimit: 10,
      namedPlaceholders: true,
    });
  }
  return fivemPool;
}

export async function tableExists(pool, tableName) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS cnt FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = ?`,
    [tableName]
  );
  return rows[0].cnt > 0;
}
