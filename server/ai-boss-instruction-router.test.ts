import assert from "node:assert/strict";
import { routeAiBossInstruction } from "./ai-boss-instruction-router";

assert.deepEqual(routeAiBossInstruction("Check my calendar for Papa Life meetings"), {
  action_type: "search",
  target_system: "google_calendar",
  target_ref: "query:Papa Life",
  requested_outcome: "Check my calendar for Papa Life meetings",
  authority_level: "observe",
  execution_route: "direct",
  approval_required: false,
  estimated_external_ai_cost_micros: 0,
  work_kind: "action",
});
assert.equal(routeAiBossInstruction("Find the Tuesday Live file in Google Drive")?.target_system, "google_drive");
assert.equal(routeAiBossInstruction("Review Gmail for replies from GoDaddy")?.target_system, "gmail");
assert.equal(routeAiBossInstruction("Remember that I met a father"), null);

console.log("✓ AI Boss routes Google Workspace instructions without model credits");
