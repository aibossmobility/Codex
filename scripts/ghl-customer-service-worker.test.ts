import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { reviewGhlServiceRequest } from "./ghl-customer-service-worker";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "papa-ghl-worker-"));
try {
  const estimates = path.join(dir,"research","ai-boss-estimate-drafts-2026-10-17");
  fs.mkdirSync(estimates,{recursive:true});
  fs.writeFileSync(path.join(estimates,"estimate-149-ai-clarity-session.md"),"draft");
  const estimate = reviewGhlServiceRequest({project:"ai-boss-mobility",instruction:"Help a consulting client with an estimate and signed agreement",root:dir});
  assert.equal(estimate.role,"ghl-customer-service");
  assert.equal(estimate.issue_type,"estimates-agreements");
  assert.equal(estimate.no_external_ai_cost,true);
  assert.equal(estimate.read_only,true);
  assert.equal(estimate.customer_record_verified,false);
  assert.equal(estimate.local_evidence.length,1);
  assert.ok(estimate.recommended_steps.join(" ").includes("signed"));
  const papa = reviewGhlServiceRequest({project:"papa-life",instruction:"Investigate a fatherhood contact record without changing it",root:dir});
  assert.equal(papa.issue_type,"client-contact");
  assert.equal(papa.local_evidence.length,0,"No AI Boss estimate detail may cross into Papa Life");
  const credits = reviewGhlServiceRequest({project:"ai-boss-mobility",instruction:"Troubleshoot a Stripe payment and invoice",root:dir});
  assert.equal(credits.issue_type,"payments");
  assert.ok(credits.disabled_paid_routes.some(x=>x.includes("Zapier")));
  assert.throws(()=>reviewGhlServiceRequest({project:"papa-life",instruction:"too short",root:dir}));
  assert.throws(()=>reviewGhlServiceRequest({project:"other" as "papa-life",instruction:"Review a contact carefully",root:dir}));
  console.log("GoHighLevel Customer Service Worker: issue routing, project isolation, $0 policy, no CRM writes PASS");
} finally {fs.rmSync(dir,{recursive:true,force:true});}
