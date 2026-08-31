import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { executeLocalBridgeRequest } from "./ai-boss-local-bridge";

const status = await executeLocalBridgeRequest({
  action_id: 1,
  action_type: "read",
  target_system: "desktop_commander",
  target_ref: "mac:status",
  requested_outcome: "Read Mac status.",
  authority_level: "observe",
});
assert.equal(status.ok, true);
assert.equal(status.action_id, 1);

const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ai-boss-bridge-"));
const sample = path.join(tempDir, "sample.txt");
await fs.writeFile(sample, "local bridge works", "utf8");
process.env.AI_BOSS_LOCAL_ALLOWED_ROOTS = tempDir;
const fileResult = await executeLocalBridgeRequest({
  action_id: 2,
  action_type: "read",
  target_system: "files",
  target_ref: `file:${sample}`,
  requested_outcome: "Read the sample file.",
  authority_level: "observe",
});
assert.match(JSON.stringify(fileResult.details), /local bridge works/);
const searchResult = await executeLocalBridgeRequest({
  action_id: 3,
  action_type: "search",
  target_system: "files",
  target_ref: `file:${sample}::query=bridge`,
  requested_outcome: "Find bridge in the sample file.",
  authority_level: "observe",
});
assert.equal((searchResult.details as { match_count: number }).match_count, 1);
assert.match(JSON.stringify(searchResult.details), /line_number/);
await assert.rejects(() => executeLocalBridgeRequest({
  action_id: 4,
  action_type: "read",
  target_system: "files",
  target_ref: "file:/etc/passwd",
  requested_outcome: "Read outside approved roots.",
  authority_level: "observe",
}), /outside AI Boss OS approved local roots/i);
const outsideDir = await fs.mkdtemp(path.join(os.tmpdir(), "ai-boss-outside-"));
const outsideFile = path.join(outsideDir, "secret.txt");
await fs.writeFile(outsideFile, "must stay outside", "utf8");
const linkedFile = path.join(tempDir, "linked-secret.txt");
await fs.symlink(outsideFile, linkedFile);
await assert.rejects(() => executeLocalBridgeRequest({
  action_id: 5,
  action_type: "read",
  target_system: "files",
  target_ref: `file:${linkedFile}`,
  requested_outcome: "Attempt to follow a symlink outside approved roots.",
  authority_level: "observe",
}), /outside AI Boss OS approved local roots/i);
await fs.rm(tempDir, { recursive: true, force: true });
await fs.rm(outsideDir, { recursive: true, force: true });
console.log("✓ Local bridge performs searches and blocks direct or symlink escapes from approved roots");
