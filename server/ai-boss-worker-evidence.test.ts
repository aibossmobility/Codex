import assert from "node:assert/strict";
import { assessWorkerDeliverable } from "./ai-boss-worker-evidence";
import Database from "better-sqlite3";
import { ensureExecutiveActionQueueTables, createExecutiveAction, decideExecutiveAction, beginExecutiveActionExecution, completeExecutiveActionExecution } from "./executive-action-queue-store";
import { getRecentWorkerReceipts } from "./ai-boss-mobile-store";

const request = "Find today's Papa Life live recording and send it to me.";
const noProof = assessWorkerDeliverable("papa-life-director","papa-life",request,{
  role:"papa-life-director",project:"papa-life",read_only:true,
  shortlist_available:true,sources:[{path:"knowledge/old.md",exists:true}],
});
assert.equal(noProof.outcome,"blocked","A reference review cannot prove delivery");
const verified = assessWorkerDeliverable("seo-website","papa-life","Audit homepage",{
  deliverable_verified:true,
  deliverable_summary:"Verified three live Papa Life pages and saved the resulting report locally.",
  evidence:[{kind:"http-check",description:"Three public URLs all returned HTTP 200.",reference:"https://papalifecoach.com/"}]
});
assert.equal(verified.outcome,"completed");
assert.equal(assessWorkerDeliverable("seo-website","papa-life","Audit",{
  deliverable_verified:true,deliverable_summary:"I say this is completed successfully.",evidence:[]
}).outcome,"blocked");
const db = new Database(":memory:");
db.exec("CREATE TABLE IF NOT EXISTS human_impact_observations (id INTEGER PRIMARY KEY)");
ensureExecutiveActionQueueTables(db);
const q = createExecutiveAction(db,{
 action_type:"search",target_system:"desktop_commander",target_ref:"agent-team-readonly",
 requested_outcome:request,authority_level:"observe",execution_route:"local",
 approval_required:true,estimated_external_ai_cost_micros:0,
 project_key:"papa-life",source_conversation_ref:"mobile-worker-123e4567-e89b-42d3-a456-426614174000",
 action_payload:{role:"papa-life-director",project:"papa-life",instruction:request}
});
decideExecutiveAction(db,Number(q.id),{decision:"approve"});
beginExecutiveActionExecution(db,Number(q.id));
completeExecutiveActionExecution(db,Number(q.id),"Completed read-only review","test",{read_only:true,role:"papa-life-director",project:"papa-life"});
const receipts = getRecentWorkerReceipts(db);
assert.equal(receipts.length,1);
assert.equal(receipts[0].delivery,"review_only","Historic reviews must not be labeled as verified deliveries");
db.close();
console.log("Evidence check: actual proof required; reference-only work never verifies; historic status labeled honestly.");
