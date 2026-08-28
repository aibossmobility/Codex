import assert from "node:assert/strict";
import Database from "better-sqlite3";
import {
  createHumanImpactObservation,
  ensureHumanImpactTables,
  listHumanImpactObservations,
  summarizeHumanImpact,
} from "./human-impact-store";

const db = new Database(":memory:");
ensureHumanImpactTables(db);

const common = {
  participant_ref: "pilot-001",
  interaction_ref: "conversation-001",
  program: "papa_life",
  guidance_channel: "ai_coach" as const,
  consent_scope: "research_opt_in" as const,
};

createHumanImpactObservation(db, {
  ...common,
  phase: "baseline",
  reflection_score: 2,
  decision_score: 2,
  communication_score: 1,
  action_score: 1,
  relationship_score: 2,
  outcome: "not_yet_observed",
  observed_at: "2026-08-01T12:00:00.000Z",
});

createHumanImpactObservation(db, {
  ...common,
  phase: "follow_up",
  reflection_score: 4,
  decision_score: 3,
  communication_score: 3,
  action_score: 2,
  relationship_score: 3,
  outcome: "human_contact_made",
  evidence_note: "Father reported making a calmer phone call.",
  observed_at: "2026-08-08T12:00:00.000Z",
});

const observations = listHumanImpactObservations(db, { participantRef: "pilot-001" });
assert.equal(observations.length, 2);

const summary = summarizeHumanImpact(db);
assert.equal(summary.observation_count, 2);
assert.equal(summary.paired_participant_count, 1);
assert.deepEqual(summary.dimensions.reflection, { average_delta: 2, improved: 1 });
assert.deepEqual(summary.dimensions.relationship, { average_delta: 1, improved: 1 });

// A second cycle may be imported out of order. Its follow-up must pair with
// the baseline carrying the same interaction_ref, never with another cycle.
createHumanImpactObservation(db, {
  ...common,
  interaction_ref: "conversation-002",
  phase: "follow_up",
  reflection_score: 5,
  decision_score: 4,
  communication_score: 4,
  action_score: 4,
  relationship_score: 4,
  outcome: "relationship_improved",
  observed_at: "2026-08-20T12:00:00.000Z",
});

createHumanImpactObservation(db, {
  ...common,
  interaction_ref: "conversation-002",
  phase: "baseline",
  reflection_score: 1,
  decision_score: 2,
  communication_score: 2,
  action_score: 2,
  relationship_score: 2,
  outcome: "not_yet_observed",
  observed_at: "2026-08-15T12:00:00.000Z",
});

createHumanImpactObservation(db, {
  ...common,
  interaction_ref: "conversation-003",
  phase: "baseline",
  reflection_score: 5,
  decision_score: 5,
  communication_score: 5,
  action_score: 5,
  relationship_score: 5,
  outcome: "not_yet_observed",
  observed_at: "2026-08-25T12:00:00.000Z",
});

const repeatedCycleSummary = summarizeHumanImpact(db);
assert.equal(repeatedCycleSummary.observation_count, 5);
assert.equal(repeatedCycleSummary.paired_participant_count, 1);
assert.deepEqual(repeatedCycleSummary.dimensions.reflection, { average_delta: 4, improved: 1 });
assert.deepEqual(repeatedCycleSummary.dimensions.relationship, { average_delta: 2, improved: 1 });

assert.throws(
  () =>
    createHumanImpactObservation(db, {
      ...common,
      phase: "follow_up",
      reflection_score: 6,
      decision_score: 3,
      communication_score: 3,
      action_score: 2,
      relationship_score: 3,
      outcome: "human_contact_made",
    }),
  /less than or equal to 5/
);

assert.throws(
  () =>
    createHumanImpactObservation(db, {
      ...common,
      phase: "follow_up",
      reflection_score: 4,
      decision_score: 3,
      communication_score: 3,
      action_score: 2,
      relationship_score: 3,
      outcome: "human_contact_made",
      email: "private@example.com",
    } as never),
  /unrecognized/i
);

console.log("✓ Human-impact observations validate, pair, summarize, and reject direct PII fields");
