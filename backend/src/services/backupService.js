import fs from 'fs/promises';
import path from 'path';
import { create } from 'tar';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import config from '../config/index.js';
import { getPanelPool } from '../db/pool.js';
import { resolveSafePath } from '../utils/pathValidator.js';

const execFileAsync = promisify(execFile);
const activeJobs = new Map();

export async function listBackups() {
  const pool = getPanelPool();
  const [rows] = await pool.query(
    'SELECT * FROM panel_backups ORDER BY created_at DESC LIMIT 100'
  );
  return rows;
}

export async function createBackup(types = ['server-data', 'resources', 'server-cfg', 'database'], userId, onProgress) {
  const jobId = uuidv4();
  const backupDir = resolveSafePath(config.fivem.backupFolder);
  await fs.mkdir(backupDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `noxus-backup-${timestamp}.tar.gz`;
  const outputPath = path.join(backupDir, filename);
  const tempDir = path.join(backupDir, `.tmp-${jobId}`);
  await fs.mkdir(tempDir, { recursive: true });

  const pool = getPanelPool();
  const [result] = await pool.query(
    `INSERT INTO panel_backups (filename, filepath, types, status, created_by)
     VALUES (:filename, :filepath, :types, 'running', :userId)`,
    {
      filename,
      filepath: outputPath,
      types: JSON.stringify(types),
      userId,
    }
  );
  const backupId = result.insertId;

  const job = runBackupJob({ jobId, backupId, types, tempDir, outputPath, onProgress });
  activeJobs.set(jobId, job);

  return { jobId, backupId, filename };
}

async function runBackupJob({ jobId, backupId, types, tempDir, outputPath, onProgress }) {
  const pool = getPanelPool();
  try {
    let step = 0;
    const total = types.length;

    if (types.includes('server-data')) {
      onProgress?.({ jobId, percent: Math.round((++step / total) * 80), message: 'Backing up server-data...' });
      await copyDir(resolveSafePath(config.fivem.serverDataPath), path.join(tempDir, 'server-data'));
    }

    if (types.includes('resources')) {
      onProgress?.({ jobId, percent: Math.round((++step / total) * 80), message: 'Backing up resources...' });
      await copyDir(resolveSafePath(config.fivem.resourcesPath), path.join(tempDir, 'resources'));
    }

    if (types.includes('server-cfg')) {
      onProgress?.({ jobId, percent: Math.round((++step / total) * 80), message: 'Backing up server.cfg...' });
      const cfg = resolveSafePath(config.fivem.serverCfgPath);
      await fs.mkdir(path.join(tempDir, 'config'), { recursive: true });
      await fs.copyFile(cfg, path.join(tempDir, 'config', 'server.cfg'));
    }

    if (types.includes('database')) {
      onProgress?.({ jobId, percent: Math.round((++step / total) * 80), message: 'Dumping database...' });
      const dumpPath = path.join(tempDir, 'database.sql');
      await dumpDatabase(dumpPath);
    }

    onProgress?.({ jobId, percent: 90, message: 'Compressing...' });
    await create({ gzip: true, file: outputPath, cwd: tempDir }, ['.']);

    const stat = await fs.stat(outputPath);
    await pool.query(
      `UPDATE panel_backups SET status = 'completed', size_bytes = :size, completed_at = NOW() WHERE id = :id`,
      { size: stat.size, id: backupId }
    );

    onProgress?.({ jobId, percent: 100, message: 'Backup complete', filename: path.basename(outputPath) });
    await cleanupOldBackups();
    return { success: true, outputPath };
  } catch (err) {
    await pool.query(
      `UPDATE panel_backups SET status = 'failed', error_message = :error, completed_at = NOW() WHERE id = :id`,
      { error: err.message, id: backupId }
    );
    onProgress?.({ jobId, percent: 0, message: `Failed: ${err.message}`, error: true });
    throw err;
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
    activeJobs.delete(jobId);
  }
}

async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

async function dumpDatabase(outputPath) {
  const { host, port, user, password, database } = config.fivemDb;
  const args = ['-h', host, '-P', String(port), '-u', user, database, '-r', outputPath];
  const env = { ...process.env };
  if (password) env.MYSQL_PWD = password;
  await execFileAsync('mysqldump', args, { timeout: 300000, env });
}

async function cleanupOldBackups() {
  const pool = getPanelPool();
  const retention = config.backup.retentionCount;
  const [rows] = await pool.query(
    'SELECT id, filepath FROM panel_backups WHERE status = \'completed\' ORDER BY created_at DESC'
  );

  if (rows.length <= retention) return;

  const toDelete = rows.slice(retention);
  for (const row of toDelete) {
    try {
      await fs.unlink(row.filepath);
    } catch {
      // file may already be gone
    }
    await pool.query('DELETE FROM panel_backups WHERE id = :id', { id: row.id });
  }
}

export async function deleteBackup(id) {
  const pool = getPanelPool();
  const [rows] = await pool.query('SELECT * FROM panel_backups WHERE id = :id', { id });
  const backup = rows[0];
  if (!backup) throw new Error('Backup not found');

  try {
    await fs.unlink(backup.filepath);
  } catch {
    // ignore
  }
  await pool.query('DELETE FROM panel_backups WHERE id = :id', { id });
}

export function getBackupProgress(jobId) {
  return activeJobs.get(jobId);
}

let scheduleInterval = null;

export function startBackupScheduler() {
  if (!config.backup.enabled || scheduleInterval) return;

  // Simple daily check (every hour, run if past 3 AM and not run today)
  let lastRunDate = null;
  scheduleInterval = setInterval(async () => {
    const now = new Date();
    if (now.getHours() === 3 && lastRunDate !== now.toDateString()) {
      lastRunDate = now.toDateString();
      try {
        await createBackup(['server-data', 'server-cfg', 'database'], null);
      } catch (err) {
        console.error('Scheduled backup failed:', err.message);
      }
    }
  }, 60 * 60 * 1000);
}
