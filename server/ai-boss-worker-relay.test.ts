import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import Database from "better-sqlite3";
import { ensureExecutiveActionQueueTables, decideExecutiveAction } from "./executive-action-queue-store";
import { queueWorkerAssignment } from "./ai-boss-worker-assignments";
import { claimApprovedWorkerAssignment, reportWorkerResult } from "./ai-boss-worker-relay";

const db=new Database(":memory:");
db.pragma("foreign_keys=OFF");ensureExecutiveActionQueueTables(db);
const request={project:"ai-boss-mobility",role:"seo-website",instruction:"Check links and prepare a read-only SEO report",request_id:randomUUID()};
const q=queueWorkerAssignment(db,request);
assert.equal(claimApprovedWorkerAssignment(db),null,"unapproved tasks not visible");
decideExecutiveAction(db,Number(q.id),{decision:"approve",note:"Test owner consent only in isolated DB"});
const claim=claimApprovedWorkerAssignment(db)!;
assert.equal(claim.action_id,q.id);
assert.equal(claim.project,request.project);
assert.equal(claim.role,request.role);
assert.equal(claim.instruction,request.instruction);
assert.equal(claimApprovedWorkerAssignment(db),null,"active lease prevents duplicate claims");
assert.throws(()=>reportWorkerResult(db,q.id!,{lease:randomUUID(),project:request.project,role:request.role,read_only:true,completed:true}));
assert.throws(()=>reportWorkerResult(db,q.id!,{lease:claim.lease,project:"papa-life",role:request.role,read_only:true,completed:true}));
assert.throws(()=>reportWorkerResult(db,Number(q.id),{lease:claim.lease,project:request.project,role:request.role,read_only:true,outcome:"completed",summary:"Claimed a result but provided no verifiable proof.",evidence:[]}),"No evidence cannot mean completed");
const done=reportWorkerResult(db,Number(q.id),{
  lease:claim.lease,project:request.project,role:request.role,read_only:true,
  outcome:"completed",summary:"Checked the live website links and saved a verifiable read-only result.",
  evidence:[{kind:"http-check",description:"Checked the public homepage returned HTTP 200.",reference:"https://example.com/"}]
});
assert.equal(done.status,"completed");
assert.equal(claimApprovedWorkerAssignment(db),null);
assert.equal((db.prepare("select count(*) as count from executive_actions").get() as any).count,1);
const ghlRequest={project:"papa-life",role:"ghl-customer-service",instruction:"Review Papa Life customer follow-up issue without changing records.",request_id:randomUUID()};
const ghlQueued=queueWorkerAssignment(db,ghlRequest);
assert.equal(claimApprovedWorkerAssignment(db),null,"new unapproved GHL tasks never reach Mac");
decideExecutiveAction(db,Number(ghlQueued.id),{decision:"approve",note:"Owner approved isolated GHL test"});
const ghlClaim=claimApprovedWorkerAssignment(db)!;
assert.equal(ghlClaim.role,"ghl-customer-service");
assert.equal(ghlClaim.project,"papa-life");
assert.equal(reportWorkerResult(db,Number(ghlQueued.id),{
  lease:ghlClaim.lease,project:"papa-life",role:"ghl-customer-service",read_only:true,
  outcome:"blocked",explanation:"No authenticated customer-service record could be accessed or changed by this review-only worker.",
  next_step:"Authorize a specifically scoped GHL record lookup before requesting this result again."
}).status,"failed");
db.close();
console.log("Cloud worker relay: 1 approval gated claim; lease protection; verified result; no duplicate");
