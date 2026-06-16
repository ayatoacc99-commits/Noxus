import fs from 'fs/promises';
import path from 'path';
import mysql from 'mysql2/promise';
import config from '../config/index.js';

async function runMigrationFile(connection, filePath) {
  const sql = await fs.readFile(filePath, 'utf8');
  const statements = sql.split(';').map((s) => s.trim()).filter(Boolean);
  for (const statement of statements) {
    try {
      await connection.query(statement);
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_TABLE_EXISTS_ERROR' || err.code === 'ER_DUP_ENTRY') {
        console.warn(`Skipping (already applied): ${err.message}`);
      } else {
        throw err;
      }
    }
  }
}

async function migrate() {
  const connection = await mysql.createConnection({
    host: config.panelDb.host,
    port: config.panelDb.port,
    user: config.panelDb.user,
    password: config.panelDb.password,
    multipleStatements: true,
  });

  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${config.panelDb.database}\``);
  await connection.query(`USE \`${config.panelDb.database}\``);

  const files = (await fs.readdir(config.paths.migrations))
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    console.log(`Running migration: ${file}`);
    await runMigrationFile(connection, path.join(config.paths.migrations, file));
  }

  // Safe column adds for 002 if ALTER failed
  const alters = [
    'ALTER TABLE panel_users MODIFY password_hash VARCHAR(255) NULL',
    'ALTER TABLE panel_users ADD COLUMN discord_id VARCHAR(32) NULL UNIQUE',
    'ALTER TABLE panel_users ADD COLUMN discord_username VARCHAR(128) NULL',
    'ALTER TABLE panel_users ADD COLUMN discord_avatar VARCHAR(512) NULL',
    'ALTER TABLE panel_users ADD COLUMN citizenid VARCHAR(64) NULL',
    "ALTER TABLE panel_users ADD COLUMN auth_provider ENUM('local','discord') DEFAULT 'local'",
  ];
  for (const sql of alters) {
    try {
      await connection.query(sql);
    } catch (err) {
      if (err.code !== 'ER_DUP_FIELDNAME') {
        // ignore duplicate column
      }
    }
  }

  console.log('All migrations completed successfully.');
  await connection.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
