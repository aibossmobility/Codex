import assert from "node:assert/strict";
import { buildCustomerJourney, customerJourneyAssignments, freeToolPolicy } from "./customer-journey-worker-routing";

for(const brand of ["papa-life","ai-boss-mobility"] as const){
 const steps=buildCustomerJourney(brand);
 assert.equal(steps.length,10);
 assert.equal(steps.find(s=>s.stage==="production")?.worker,brand==="papa-life"?"papa-life-director":"ai-boss-mobility-director");
 assert(steps.every(s=>s.brand===brand && s.operational===false));
 for(const stage of ["production","quality","delivery"] as const){
   assert.equal(steps.find(s=>s.stage===stage)?.requiresVerifiedPayment,true);
 }
 assert.equal(steps.find(s=>s.stage==="payment")?.automaticWhenSafe,false);
}
assert.equal(freeToolPolicy.zapier,false);
assert.equal(freeToolPolicy.externalPurchases,false);
assert.equal(freeToolPolicy.humanForOrdinarySteps,false);
assert.equal(Object.keys(customerJourneyAssignments).length,10);
assert.throws(()=>buildCustomerJourney("invalid" as any),/Unknown brand/);
console.log("PASS: two-brand customer journey routes to existing workers, preserves brand scope, and never implies readiness");
