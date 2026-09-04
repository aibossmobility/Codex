import type { Database as BetterSqliteDatabase } from "better-sqlite3";
import {
  defaultExecutorRegistry,
  executeApprovedExecutiveAction,
  type ExecutorRegistry,
} from "./executive-action-executor";
import { orchestrationDependenciesSatisfied } from "./unified-orchestrator";

/**
 * Execute an approved AI Boss OS action while honoring Unified Orchestrator dependencies.
 *
 * This wrapper intentionally delegates the actual work to the existing executive action
 * executor, so orchestration never gets a separate path around authority, connector,
 * timeout, payload, audit, or approval controls.
 */
export async function executeApprovedOrchestratedAction(
  db: BetterSqliteDatabase,
  actionId: number,
  registry: ExecutorRegistry = defaultExecutorRegistry()
) {
  if (!orchestrationDependenciesSatisfied(db, actionId)) {
    throw new Error("Unified Orchestrator dependencies are not completed for this action.");
  }
  return executeApprovedExecutiveAction(db, actionId, registry);
}
