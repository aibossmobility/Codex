import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import Database from "better-sqlite3";

const dbPath = path.resolve(process.cwd(), "leads.db");
const corruptionPattern = /SQLITE_CORRUPT|database disk image is malformed|database corruption/i;
const requiredTables = ["leads", "intake_submissions", "form_questions"];

function probeDatabase(target = dbPath) {
  const db = new Database(target);
  try {
    const quickCheck = db.pragma("quick_check", { simple: true });
    if (quickCheck !== "ok") throw new Error(`SQLite quick_check failed: ${String(quickCheck)}`);
    const tables = new Set(
      db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((row) => String(row.name))
    );
    for (const table of requiredTables) {
      if (!tables.has(table)) throw new Error(`Recovered database is missing required table: ${table}`);
    }
    return Object.fromEntries(
      requiredTables.map((table) => [table, Number(db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get().c)])
    );
  } finally {
    db.close();
  }
}

function copyIfPresent(source, destination) {
  if (!fs.existsSync(source)) return false;
  fs.copyFileSync(source, destination);
  return true;
}

function moveIfPresent(source, destination) {
  if (!fs.existsSync(source)) return false;
  fs.renameSync(source, destination);
  return true;
}

function recoverWithSqliteCli(stamp) {
  const version = spawnSync("sqlite3", ["--version"], { encoding: "utf8" });
  if (version.error || version.status !== 0) {
    throw new Error("sqlite3 CLI is not available in this runtime; native recovery cannot proceed safely");
  }
  console.warn(`[sqlite-recovery] sqlite3 available: ${(version.stdout || "").trim()}`);

  const recoveredPath = `${dbPath}.recovered-${stamp}`;
  try { fs.rmSync(recoveredPath, { force: true }); } catch {}

  const recoveredSql = spawnSync("sqlite3", [dbPath, ".recover"], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (recoveredSql.error || recoveredSql.status !== 0 || !recoveredSql.stdout?.trim()) {
    throw new Error(`sqlite3 .recover failed: ${(recoveredSql.stderr || recoveredSql.error?.message || "unknown error").trim()}`);
  }

  const rebuild = spawnSync("sqlite3", [recoveredPath], {
    input: recoveredSql.stdout,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (rebuild.error || rebuild.status !== 0) {
    throw new Error(`sqlite3 rebuild failed: ${(rebuild.stderr || rebuild.error?.message || "unknown error").trim()}`);
  }

  const counts = probeDatabase(recoveredPath);
  console.warn(`[sqlite-recovery] recovered database validated: ${JSON.stringify(counts)}`);
  return { recoveredPath, counts };
}

if (!fs.existsSync(dbPath)) {
  console.log("[sqlite-recovery] leads.db does not exist yet; startup may create it normally");
  process.exit(0);
}

try {
  const counts = probeDatabase();
  const db = new Database(dbPath);
  try { db.pragma("journal_mode = WAL"); } finally { db.close(); }
  console.log(`[sqlite-recovery] leads.db passed quick_check: ${JSON.stringify(counts)}`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (!corruptionPattern.test(message) && !/quick_check failed/i.test(message)) throw error;

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const walPath = `${dbPath}-wal`;
  const shmPath = `${dbPath}-shm`;
  const dbBackup = `${dbPath}.corrupt-backup-${stamp}`;
  const walBackup = `${walPath}.corrupt-backup-${stamp}`;
  const shmBackup = `${shmPath}.corrupt-backup-${stamp}`;

  copyIfPresent(dbPath, dbBackup);
  const copiedWal = copyIfPresent(walPath, walBackup);
  const copiedShm = copyIfPresent(shmPath, shmBackup);
  console.warn(`[sqlite-recovery] corruption detected; exact backups preserved DB=true WAL=${copiedWal} SHM=${copiedShm}`);

  try {
    const { recoveredPath } = recoverWithSqliteCli(stamp);
    const oldDb = `${dbPath}.corrupt-original-${stamp}`;
    const oldWal = `${walPath}.corrupt-original-${stamp}`;
    const oldShm = `${shmPath}.corrupt-original-${stamp}`;
    moveIfPresent(dbPath, oldDb);
    moveIfPresent(walPath, oldWal);
    moveIfPresent(shmPath, oldShm);
    fs.renameSync(recoveredPath, dbPath);

    const finalCounts = probeDatabase();
    const db = new Database(dbPath);
    try { db.pragma("journal_mode = WAL"); } finally { db.close(); }
    console.warn(`[sqlite-recovery] native recovery succeeded and replacement validated: ${JSON.stringify(finalCounts)}`);
  } catch (recoveryError) {
    console.error(`[sqlite-recovery] native recovery did not complete safely: ${recoveryError instanceof Error ? recoveryError.message : String(recoveryError)}`);
    const quarantinedDb = `${dbPath}.quarantined-${stamp}`;
    const quarantinedWal = `${walPath}.quarantined-${stamp}`;
    const quarantinedShm = `${shmPath}.quarantined-${stamp}`;
    moveIfPresent(dbPath, quarantinedDb);
    moveIfPresent(walPath, quarantinedWal);
    moveIfPresent(shmPath, quarantinedShm);
    console.warn(
      `[sqlite-recovery] corrupt database quarantined after exact backups were preserved; startup will create a clean database (stamp ${stamp})`
    );
  }
}
