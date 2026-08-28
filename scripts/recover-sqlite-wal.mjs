import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const dbPath = path.resolve(process.cwd(), "leads.db");
const corruptionPattern = /SQLITE_CORRUPT|database disk image is malformed|database corruption/i;

function probeDatabase() {
  const db = new Database(dbPath);
  try {
    const quickCheck = db.pragma("quick_check", { simple: true });
    if (quickCheck !== "ok") {
      throw new Error(`SQLite quick_check failed: ${String(quickCheck)}`);
    }
    db.pragma("journal_mode = WAL");
  } finally {
    db.close();
  }
}

function moveIfPresent(source, destination) {
  if (!fs.existsSync(source)) return false;
  fs.renameSync(source, destination);
  return true;
}

try {
  probeDatabase();
  console.log("[sqlite-recovery] leads.db passed quick_check; no recovery needed");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (!corruptionPattern.test(message)) throw error;

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const walPath = `${dbPath}-wal`;
  const shmPath = `${dbPath}-shm`;
  const walBackup = `${walPath}.recovery-backup-${stamp}`;
  const shmBackup = `${shmPath}.recovery-backup-${stamp}`;

  const movedWal = moveIfPresent(walPath, walBackup);
  const movedShm = moveIfPresent(shmPath, shmBackup);
  console.warn(
    `[sqlite-recovery] corruption detected; preserved WAL=${movedWal} SHM=${movedShm} before retry`
  );

  try {
    probeDatabase();
    console.warn(
      `[sqlite-recovery] recovery succeeded; original journal files preserved with recovery-backup-${stamp}`
    );
  } catch (retryError) {
    const failedWal = `${walPath}.failed-retry-${stamp}`;
    const failedShm = `${shmPath}.failed-retry-${stamp}`;
    moveIfPresent(walPath, failedWal);
    moveIfPresent(shmPath, failedShm);
    if (movedWal && fs.existsSync(walBackup)) fs.renameSync(walBackup, walPath);
    if (movedShm && fs.existsSync(shmBackup)) fs.renameSync(shmBackup, shmPath);
    console.error("[sqlite-recovery] journal isolation did not repair the database; original journals restored");
    throw retryError;
  }
}
