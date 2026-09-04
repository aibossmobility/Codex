import type { Database as BetterSqliteDatabase } from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  actionRequiresApproval,
  createExecutiveAction,
  defaultExecutionRoute,
  executiveActionInputSchema,
} from "./executive-action-queue-store";

const orchestratorStepSchema = executiveActionInputSchema
  .omit({ work_kind: true, waiting_on: true })
  .extend({
    step_id: z.string().trim().min(1).max(80).regex(/^[a-z0-9][a-z0-9._-]*$/),
    depends_on: z.array(z.string().trim().min(1).max(80)).default([]),
    work_kind: z.enum(["action", "task", "follow_up"]).default("action"),
  })
  .strict();

export const unifiedOrchestrationInputSchema = z
  .object({
    orchestration_id: z.string().uuid().optional(),
    goal: z.string().trim().min(3).max(4000),
    project_key: z
      .string()
      .trim()
      .min(3)
      .max(120)
      .regex(/^[a-z0-9][a-z0-9._-]*$/)
      .nullable()
      .optional(),
    source_conversation_ref: z.string().trim().max(160).nullable().optional(),
    steps: z.array(orchestratorStepSchema).min(1).max(50),
  })
  .strict();

export type UnifiedOrchestrationInput = z.input<typeof unifiedOrchestrationInputSchema>;

export type PlannedOrchestrationStep = z.infer<typeof orchestratorStepSchema> & {
  execution_route: "direct" | "local" | "local_model" | "cloud_model";
  approval_required: boolean;
};

export type UnifiedOrchestrationPlan = {
  orchestration_id: string;
  goal: string;
  project_key: string | null;
  source_conversation_ref: string | null;
  steps: PlannedOrchestrationStep[];
  summary: {
    total_steps: number;
    approval_steps: number;
    automatic_steps: number;
    external_ai_steps: number;
  };
};

function assertValidDependencyGraph(steps: Array<{ step_id: string; depends_on: string[] }>) {
  const ids = new Set<string>();
  for (const step of steps) {
    if (ids.has(step.step_id)) throw new Error(`Duplicate orchestrator step_id: ${step.step_id}`);
    ids.add(step.step_id);
  }

  for (const step of steps) {
    for (const dependency of step.depends_on) {
      if (!ids.has(dependency)) {
        throw new Error(`Orchestrator step ${step.step_id} depends on unknown step ${dependency}.`);
      }
      if (dependency === step.step_id) {
        throw new Error(`Orchestrator step ${step.step_id} cannot depend on itself.`);
      }
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const byId = new Map(steps.map((step) => [step.step_id, step]));

  function visit(stepId: string) {
    if (visited.has(stepId)) return;
    if (visiting.has(stepId)) throw new Error(`Unified Orchestrator dependency cycle detected at ${stepId}.`);
    visiting.add(stepId);
    for (const dependency of byId.get(stepId)?.depends_on || []) visit(dependency);
    visiting.delete(stepId);
    visited.add(stepId);
  }

  for (const step of steps) visit(step.step_id);
}

export function planUnifiedOrchestration(rawInput: UnifiedOrchestrationInput): UnifiedOrchestrationPlan {
  const parsed = unifiedOrchestrationInputSchema.parse(rawInput);
  assertValidDependencyGraph(parsed.steps);

  const steps: PlannedOrchestrationStep[] = parsed.steps.map((step) => {
    const executionRoute = step.execution_route || defaultExecutionRoute(step);
    const approvalRequired = actionRequiresApproval({
      action_type: step.action_type,
      authority_level: step.authority_level,
      execution_route: executionRoute,
      approval_required: step.approval_required,
    });
    return {
      ...step,
      execution_route: executionRoute,
      approval_required: approvalRequired,
    };
  });

  return {
    orchestration_id: parsed.orchestration_id || randomUUID(),
    goal: parsed.goal,
    project_key: parsed.project_key || null,
    source_conversation_ref: parsed.source_conversation_ref || null,
    steps,
    summary: {
      total_steps: steps.length,
      approval_steps: steps.filter((step) => step.approval_required).length,
      automatic_steps: steps.filter((step) => !step.approval_required).length,
      external_ai_steps: steps.filter((step) => step.execution_route === "cloud_model").length,
    },
  };
}

export function enqueueUnifiedOrchestration(
  db: BetterSqliteDatabase,
  rawInput: UnifiedOrchestrationInput
) {
  const plan = planUnifiedOrchestration(rawInput);
  const actionIdsByStep = new Map<string, number>();

  const transaction = db.transaction(() => {
    const actions = plan.steps.map((step) => {
      const dependencyActionIds = step.depends_on.map((dependency) => actionIdsByStep.get(dependency)).filter(Boolean) as number[];
      const action = createExecutiveAction(db, {
        action_type: step.action_type,
        target_system: step.target_system,
        target_ref: step.target_ref,
        requested_outcome: step.requested_outcome,
        authority_level: step.authority_level,
        execution_route: step.execution_route,
        approval_required: step.approval_required,
        provider_id: step.provider_id,
        estimated_external_ai_cost_micros: step.estimated_external_ai_cost_micros,
        source_conversation_ref: step.source_conversation_ref || plan.source_conversation_ref,
        action_payload: {
          ...(step.action_payload || {}),
          _orchestrator: {
            orchestration_id: plan.orchestration_id,
            goal: plan.goal,
            step_id: step.step_id,
            depends_on_steps: step.depends_on,
            depends_on_action_ids: dependencyActionIds,
          },
        },
        human_impact_observation_id: step.human_impact_observation_id,
        project_key: step.project_key || plan.project_key,
        work_kind: step.work_kind,
        due_at: step.due_at,
        waiting_on: dependencyActionIds.length
          ? `Unified Orchestrator dependencies: ${dependencyActionIds.join(",")}`
          : null,
      }) as { id: number };
      actionIdsByStep.set(step.step_id, action.id);
      return { step_id: step.step_id, action_id: action.id };
    });
    return actions;
  });

  const actions = transaction();
  return { ...plan, actions };
}

export function orchestrationDependenciesSatisfied(
  db: BetterSqliteDatabase,
  actionId: number
) {
  const row = db
    .prepare("SELECT action_payload_json FROM executive_actions WHERE id = ?")
    .get(actionId) as { action_payload_json?: string | null } | undefined;
  if (!row) throw new Error("Action not found");
  if (!row.action_payload_json) return true;

  let payload: any = null;
  try {
    payload = JSON.parse(row.action_payload_json);
  } catch {
    return true;
  }
  const dependencies = payload?._orchestrator?.depends_on_action_ids;
  if (!Array.isArray(dependencies) || dependencies.length === 0) return true;

  const placeholders = dependencies.map(() => "?").join(",");
  const completed = db
    .prepare(`SELECT COUNT(*) AS count FROM executive_actions WHERE id IN (${placeholders}) AND status = 'completed'`)
    .get(...dependencies) as { count: number };
  return completed.count === dependencies.length;
}
