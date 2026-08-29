import assert from "node:assert/strict";
import Database from "better-sqlite3";
import {
  archiveExecutiveMemory,
  ensureExecutiveMemoryTables,
  getExecutiveMemoryHistory,
  listExecutiveConversationBriefs,
  listExecutiveMemories,
  rememberExecutiveMemory,
  saveExecutiveConversationBrief,
} from "./executive-memory-store";

const db = new Database(":memory:");
ensureExecutiveMemoryTables(db);

const first = rememberExecutiveMemory(db, {
  canonical_key: "papa_life.primary_domain",
  category: "decision",
  value: "https://papalifecoach.com",
  context: "Use everywhere public-facing.",
  source_ref: "conversation-2026-08-29",
  sensitivity: "standard",
  confidence: 1,
});
assert.equal(first.version, 1);

const second = rememberExecutiveMemory(db, {
  canonical_key: "papa_life.primary_domain",
  category: "decision",
  value: "PapaLifeCoach.com",
  context: "Display text omits the protocol.",
  sensitivity: "standard",
  confidence: 1,
});
assert.equal(second.version, 2);
assert.equal(second.superseded_id, first.id);

const active = listExecutiveMemories(db);
assert.equal(active.length, 1);
assert.equal((active[0] as { value: string }).value, "PapaLifeCoach.com");
const history = getExecutiveMemoryHistory(db, "papa_life.primary_domain");
assert.equal(history.length, 2);
assert.deepEqual(history.map((row) => (row as { status: string }).status), ["active", "superseded"]);

assert.equal(archiveExecutiveMemory(db, second.id), 1);
assert.equal(listExecutiveMemories(db).length, 0);

saveExecutiveConversationBrief(db, {
  session_ref: "chat-001",
  channel: "chatgpt",
  summary: "Brian approved the private executive-memory foundation.",
  user_intent: "Continue AI Boss OS without rebuilding completed work.",
  next_action: "Add connector-aware action queue.",
  status: "active",
});
saveExecutiveConversationBrief(db, {
  session_ref: "chat-001",
  channel: "chatgpt",
  summary: "Memory foundation implemented and under review.",
  status: "completed",
});
const briefs = listExecutiveConversationBriefs(db);
assert.equal(briefs.length, 1);
assert.equal((briefs[0] as { status: string }).status, "completed");

assert.throws(
  () =>
    rememberExecutiveMemory(db, {
      canonical_key: "Invalid key with spaces",
      category: "fact",
      value: "Rejected",
      sensitivity: "standard",
      confidence: 1,
    }),
  /invalid/i
);

console.log("✓ Executive memories version safely and conversation briefs upsert by session");
