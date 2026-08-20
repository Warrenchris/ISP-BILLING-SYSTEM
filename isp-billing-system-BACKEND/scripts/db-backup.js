/**
 * db-backup.js - Database Backup Utility with gzip compression and retention policy
 * 
 * Usage:
 *   node scripts/db-backup.js [--out /path/to/backup.sql.gz] [--retention-days 30]
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
require('dotenv').config();

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_PORT = process.env.DB_PORT || (DB_HOST === '127.0.0.1' ? '3307' : '3306');
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || 'rootpassword';
const DB_NAME = process.env.DB_NAME || 'isp_billing_db';

const BACKUP_DIR = path.resolve(__dirname, '../backups');

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

async function performBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backup-${DB_NAME}-${timestamp}.sql`;
  const dumpPath = path.join(BACKUP_DIR, filename);
  const gzPath = `${dumpPath}.gz`;

  console.log(`[BACKUP] Starting automated database backup for: ${DB_NAME}`);
  console.log(`[BACKUP] Host: ${DB_HOST}:${DB_PORT}, User: ${DB_USER}`);

  // Construct mysqldump command
  const dumpCmd = `mysqldump -h ${DB_HOST} -P ${DB_PORT} -u ${DB_USER} --password=${DB_PASSWORD} --single-transaction --quick --routines --triggers ${DB_NAME} > "${dumpPath}"`;

  exec(dumpCmd, (error, stdout, stderr) => {
    if (error) {
      console.error('[BACKUP ERROR] mysqldump command failed:', error.message);
      // Fallback message for environments where mysqldump binary is not in PATH
      console.warn('[BACKUP ADVISORY] Ensure MySQL client tools (mysqldump) are installed or run inside docker container.');
      return;
    }

    // Compress with gzip
    const readStream = fs.createReadStream(dumpPath);
    const writeStream = fs.createWriteStream(gzPath);
    const gzip = zlib.createGzip({ level: 9 });

    readStream.pipe(gzip).pipe(writeStream).on('finish', () => {
      // Remove uncompressed raw dump
      try { fs.unlinkSync(dumpPath); } catch (e) {}

      const stats = fs.statSync(gzPath);
      console.log(`[BACKUP SUCCESS] Compressed backup created: ${gzPath} (${(stats.size / 1024).toFixed(2)} KB)`);

      // Enforce retention policy (e.g. 30 days)
      cleanOldBackups(30);
    });
  });
}

function cleanOldBackups(retentionDays = 30) {
  const now = Date.now();
  const maxAgeMs = retentionDays * 24 * 60 * 60 * 1000;

  fs.readdir(BACKUP_DIR, (err, files) => {
    if (err) return;
    files.forEach(file => {
      if (file.endsWith('.sql.gz')) {
        const filePath = path.join(BACKUP_DIR, file);
        const stats = fs.statSync(filePath);
        if (now - stats.mtimeMs > maxAgeMs) {
          fs.unlinkSync(filePath);
          console.log(`[RETENTION] Purged expired backup: ${file}`);
        }
      }
    });
  });
}

performBackup();
