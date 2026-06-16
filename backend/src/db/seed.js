import readline from 'readline';
import mysql from 'mysql2/promise';
import config from '../config/index.js';
import { hashPassword } from '../services/authService.js';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (q) => new Promise((resolve) => rl.question(q, resolve));

async function seed() {
  const username = process.env.SEED_OWNER_USERNAME || (await question('Owner username: '));
  const password = process.env.SEED_OWNER_PASSWORD || (await question('Owner password: '));
  const email = process.env.SEED_OWNER_EMAIL || (await question('Owner email (optional): '));

  const connection = await mysql.createConnection({
    host: config.panelDb.host,
    port: config.panelDb.port,
    user: config.panelDb.user,
    password: config.panelDb.password,
    database: config.panelDb.database,
  });

  const [roles] = await connection.query("SELECT id FROM panel_roles WHERE name = 'owner'");
  if (!roles[0]) {
    throw new Error('Owner role not found. Run migrations first.');
  }

  const passwordHash = await hashPassword(password);
  await connection.query(
    `INSERT INTO panel_users (username, email, password_hash, role_id)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), email = VALUES(email)`,
    [username, email || null, passwordHash, roles[0].id]
  );

  console.log(`Owner account "${username}" created/updated successfully.`);
  rl.close();
  await connection.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
