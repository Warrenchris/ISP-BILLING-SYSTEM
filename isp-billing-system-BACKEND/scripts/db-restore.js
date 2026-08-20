/**
 * db-restore.js - Database Restore Utility for gzipped and raw SQL dumps
 * 
 * Usage:
 *   node scripts/db-restore.js --file /path/to/backup.sql.gz
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

const targetFile = process.argv[2] || process.argv.find(arg => arg.endsWith('.sql.gz') || arg.endsWith('.sql'));

if (!targetFile || !fs.existsSync(targetFile)) {
  console.error('[RESTORE ERROR] Please specify a valid backup file to restore.');
  console.log('Example: node scripts/db-restore.js backups/backup-isp_billing_db-latest.sql.gz');
  process.exit(1);
}

async function performRestore() {
  let restorePath = targetFile;

  if (targetFile.endsWith('.gz')) {
    const uncompressedPath = targetFile.replace('.gz', '.temp.sql');
    console.log(`[RESTORE] Decompressing ${targetFile}...`);

    await new Promise((resolve, reject) => {
      const readStream = fs.createReadStream(targetFile);
      const writeStream = fs.createWriteStream(uncompressedPath);
      const gunzip = zlib.createGunzip();

      readStream.pipe(gunzip).pipe(writeStream).on('finish', resolve).on('error', reject);
    });

    restorePath = uncompressedPath;
  }

  console.log(`[RESTORE] Restoring database ${DB_NAME} on ${DB_HOST}:${DB_PORT}...`);
  const restoreCmd = `mysql -h ${DB_HOST} -P ${DB_PORT} -u ${DB_USER} --password=${DB_PASSWORD} ${DB_NAME} < "${restorePath}"`;

  exec(restoreCmd, (error, stdout, stderr) => {
    // Clean up temporary uncompressed file if we created one
    if (restorePath !== targetFile) {
      try { fs.unlinkSync(restorePath); } catch (e) {}
    }

    if (error) {
      console.error('[RESTORE ERROR] Database restore failed:', error.message);
      process.exit(1);
    }

    console.log(`[RESTORE SUCCESS] Database ${DB_NAME} restored successfully from backup.`);
  });
}

performRestore();
