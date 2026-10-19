import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {randomUUID} from "node:crypto";
import {spawnSync} from "node:child_process";
import Database from "better-sqlite3";
import {ensureExecutiveActionQueueTables} from "./executive-action-queue-store";
import {acceptVerifiedClaim} from "./ai-boss-worker-mac-poller";

const dir=fs.mkdtempSync(path.join(os.tmpdir(),"papa-os-relay-test-"));
const file=path.join(dir,"isolated.db");
const db=new Database(file);db.pragma("foreign_keys=OFF");
ensureExecutiveActionQueueTables(db);
const c={action_id:12,project:"papa-life",role:"quality-compliance",
  instruction:"Review our read-only safety and compliance policy",request_id:randomUUID(),lease:randomUUID()};
try {
  const a=acceptVerifiedClaim(db,c);
  assert.equal(a.reused,false);
  const second=acceptVerifiedClaim(db,c);
  assert.equal(second.reused,true);
  assert.equal(second.local_action_id,a.local_action_id);
  assert.throws(()=>acceptVerifiedClaim(db,{...c,instruction:"changed assignment"}));
  assert.throws(()=>acceptVerifiedClaim(db,{...c,action_id:13,project:"ai-boss-mobility",role:"papa-life-director"}));
  const row=db.prepare("SELECT status,provider_id,estimated_external_ai_cost_micros,action_payload_json FROM executive_actions WHERE id=?")
     .get(a.local_action_id) as any;
  assert.equal(row.status,"approved");
  assert.equal(row.provider_id,null);
  assert.equal(row.estimated_external_ai_cost_micros,0);
  assert.equal(JSON.parse(row.action_payload_json).no_purchases,true);
  const before=db.prepare("SELECT count(*) n FROM executive_actions").get() as any;
  assert.equal(before.n,1);
  const installed=fs.readFileSync("/Users/bossmobility/.ai-boss-os/bin/agent-team-queue-worker.ts","utf8");
  const original="new Database('/Users/bossmobility/Developer/Codex-seo-health-20261004/leads.db')";
  const poll="void poll();setInterval(poll,30000);";
  assert.ok(installed.includes(original)&&installed.includes(poll)&&installed.includes("Director project boundary violated"));
  const isolated=installed.replace(original,`new Database(${JSON.stringify(file)})`).replace(poll,"await poll();");
  assert.ok(!isolated.includes(original)&&!isolated.includes(poll));
  const worker=path.join(dir,"worker-test.mts");fs.writeFileSync(worker,isolated);
  const r=spawnSync(process.execPath,["--import","/Users/bossmobility/Developer/Codex-seo-health-20261004/node_modules/tsx/dist/loader.mjs",worker],{encoding:"utf8",timeout:30000});
  assert.equal(r.status,0,r.stderr);
  const result=db.prepare("SELECT status,result_json FROM executive_actions WHERE id=?").get(a.local_action_id) as any;
  assert.equal(result.status,"completed");
  const details=JSON.parse(result.result_json);
  assert.equal(details.role,"quality-compliance");
  assert.equal(details.project,"papa-life");
  assert.equal(details.read_only,true);
  console.log("Mac outbound worker relay: idempotent accepted cloud approval; local worker completed; no provider calls");
}finally {db.close();}
