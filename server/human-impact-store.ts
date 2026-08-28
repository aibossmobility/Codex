import type { Database as BetterSqliteDatabase } from "better-sqlite3";
import { z } from "zod";

export const HUMAN_IMPACT_DIMENSIONS = [
  "reflection",
  "decision",
  "communication",
  "action",
  "relationship",
] as const;

const score = z.number().int().min(1).max(5);

export const humanImpactObservationSchema = z
  .object({
    participant_ref: z.string().trim().min(3).max(120),
    interaction_ref: z.string().trim().min(1).max(120).nullable().optional(),
    program: z.string().trim().min(1).max(80).default("papa_life"),
    guidance_channel: z.enum([
      "ai_coach",
      "human_coaching",
      "tuesday_live",
      "fatherhood_check_in",
      "email",
      "other",
    ]),
    phase: z.enum(["baseline", "follow_up"]),
    reflection_score: score,
    decision_score: score,
    communication_score: score,
    action_score: score,
    relationship_score: score,
    outcome: z.enum([
      "not_yet_observed",
      "reflection_only",
      "decision_made",
      "communication_attempted",
      "human_contact_made",
      "relationship_improved",
      "relationship_unchanged",
      "relationship_worsened",
    ]),
    evidence_note: z.string().trim().max(2000).nullable().optional(),
    consent_scope: z.enum(["program_improvement", "research_opt_in"]),
    observed_at: z.string().datetime().optional(),
  })
  .strict();

export type HumanImpactObservationInput = z.input<typeof humanImpactObservationSchema>;

export function ensureHumanImpactTables(db: BetterSqliteDatabase) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS human_impact_observations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      participant_ref TEXT NOT NULL,
      interaction_ref TEXT,
      program TEXT NOT NULL DEFAULT 'papa_life',
      guidance_channel TEXT NOT NULL,
      phase TEXT NOT NULL CHECK (phase IN ('baseline', 'follow_up')),
      reflection_score INTEGER NOT NULL CHECK (reflection_score BETWEEN 1 AND 5),
      decision_score INTEGER NOT NULL CHECK (decision_score BETWEEN 1 AND 5),
      communication_score INTEGER NOT NULL CHECK (communication_score BETWEEN 1 AND 5),
      action_score INTEGER NOT NULL CHECK (action_score BETWEEN 1 AND 5),
      relationship_score INTEGER NOT NULL CHECK (relationship_score BETWEEN 1 AND 5),
      outcome TEXT NOT NULL,
      evidence_note TEXT,
      consent_scope TEXT NOT NULL CHECK (consent_scope IN ('program_improvement', 'research_opt_in')),
      observed_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_human_impact_participant_time
      ON human_impact_observations(participant_ref, observed_at);
    CREATE INDEX IF NOT EXISTS idx_human_impact_program_phase
      ON human_impact_observations(program, phase);
  `);
}

export function createHumanImpactObservation(
  db: BetterSqliteDatabase,
  rawInput: HumanImpactObservationInput
) {
  const input = humanImpactObservationSchema.parse(rawInput);
  const observedAt = input.observed_at || new Date().toISOString();
  const result = db
    .prepare(
      `INSERT INTO human_impact_observations (
        participant_ref, interaction_ref, program, guidance_channel, phase,
        reflection_score, decision_score, communication_score, action_score,
        relationship_score, outcome, evidence_note, consent_scope, observed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.participant_ref,
      input.interaction_ref || null,
      input.program,
      input.guidance_channel,
      input.phase,
      input.reflection_score,
      input.decision_score,
      input.communication_score,
      input.action_score,
      input.relationship_score,
      input.outcome,
      input.evidence_note || null,
      input.consent_scope,
      observedAt
    );
  return Number(result.lastInsertRowid);
}

export function listHumanImpactObservations(
  db: BetterSqliteDatabase,
  options: { participantRef?: string; limit?: number } = {}
) {
  const limit = Math.min(Math.max(options.limit || 100, 1), 500);
  if (options.participantRef) {
    return db
      .prepare(
        `SELECT * FROM human_impact_observations
         WHERE participant_ref = ? ORDER BY observed_at DESC, id DESC LIMIT ?`
      )
      .all(options.participantRef, limit);
  }
  return db
    .prepare(
      `SELECT * FROM human_impact_observations
       ORDER BY observed_at DESC, id DESC LIMIT ?`
    )
    .all(limit);
}

export function summarizeHumanImpact(db: BetterSqliteDatabase, program = "papa_life") {
  const rows = db
    .prepare(
      `WITH valid_pairs AS (
        SELECT
          f.id AS follow_up_id,
          f.participant_ref,
          b.reflection_score AS baseline_reflection,
          f.reflection_score AS follow_up_reflection,
          b.decision_score AS baseline_decision,
          f.decision_score AS follow_up_decision,
          b.communication_score AS baseline_communication,
          f.communication_score AS follow_up_communication,
          b.action_score AS baseline_action,
          f.action_score AS follow_up_action,
          b.relationship_score AS baseline_relationship,
          f.relationship_score AS follow_up_relationship,
          ROW_NUMBER() OVER (
            PARTITION BY f.participant_ref
            ORDER BY f.observed_at DESC, f.id DESC
          ) AS participant_rank
        FROM human_impact_observations f
        JOIN human_impact_observations b ON b.id = (
          SELECT candidate.id
          FROM human_impact_observations candidate
          WHERE candidate.program = f.program
            AND candidate.participant_ref = f.participant_ref
            AND candidate.phase = 'baseline'
            AND (
              candidate.observed_at < f.observed_at
              OR (candidate.observed_at = f.observed_at AND candidate.id < f.id)
            )
            AND (
              f.interaction_ref IS NULL
              OR candidate.interaction_ref = f.interaction_ref
            )
          ORDER BY candidate.observed_at DESC, candidate.id DESC
          LIMIT 1
        )
        WHERE f.program = ? AND f.phase = 'follow_up'
      )
      SELECT * FROM valid_pairs WHERE participant_rank = 1`
    )
    .all(program) as Array<Record<string, number | string>>;

  const deltas = Object.fromEntries(
    HUMAN_IMPACT_DIMENSIONS.map((dimension) => {
      const values = rows.map(
        (row) => Number(row[`follow_up_${dimension}`]) - Number(row[`baseline_${dimension}`])
      );
      const average = values.length
        ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100
        : null;
      return [dimension, { average_delta: average, improved: values.filter((v) => v > 0).length }];
    })
  );

  const observationCount = (
    db.prepare("SELECT COUNT(*) AS count FROM human_impact_observations WHERE program = ?").get(program) as {
      count: number;
    }
  ).count;

  return {
    program,
    observation_count: observationCount,
    paired_participant_count: rows.length,
    dimensions: deltas,
    interpretation:
      "Directional program-learning signals only. These scores do not establish clinical or causal claims.",
  };
}
