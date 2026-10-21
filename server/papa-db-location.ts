import fs from "node:fs";
import path from "node:path";

/** Reuse the already-mounted Railway volume. Never silently create a fresh
 * production database after redeployment, which would lose worker history.
 */
export function resolvePapaDbDirectory(
  appDirectory: string,
  env: NodeJS.ProcessEnv = process.env,
  exists: (file: string) => boolean = fs.existsSync,
): string {
  if (!env.RAILWAY_ENVIRONMENT && !env.RAILWAY_PROJECT_ID) return appDirectory;
  const persistentDirectory = "/data";
  const database = path.join(persistentDirectory, "leads.db");
  const sessions = path.join(persistentDirectory, "sessions.db");
  if (!exists(database) || !exists(sessions)) {
    throw new Error("Persistent Papa Life database backup is missing; refusing to start with empty production records.");
  }
  return persistentDirectory;
}
