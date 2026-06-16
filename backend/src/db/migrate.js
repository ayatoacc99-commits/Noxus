import fs from 'fs/promises';
import path from 'path';
import mysql from 'mysql2/promise';
import config from '../config/index.js';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

  const migrationFile = path.join(config.paths.migrations, '001_initial_schema.sql');
  const sql = await fs.readFile(migrationFile, 'utf8');
  await connection.query(sql);

  console.log('Migrations completed successfully.');
  await connection.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
