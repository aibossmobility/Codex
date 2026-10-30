import assert from "node:assert/strict";
import Database from "better-sqlite3";
import {createCustomerIntake,findCustomerIntakeByToken,findUnpaidIntakeForVerifiedGhlOrder,associateVerifiedCustomerIntake} from "./ai-boss-customer-intake";
const db=new Database(":memory:");
const brief={organization:"Example Organization",objective:"Review manual client onboarding and propose practical AI improvements",currentWorkflow:"Staff currently move client details manually between email and spreadsheet",toolsInUse:["Existing Google Sheets system"],constraints:["No private client details leave organization"]};
for(const code of ["ai.feasibility.readiness","ai.strategy.planning","ai.workflow.automation","ai.cost.benefit.roi","ai.leadership.education"] as const){
 const r=createCustomerIntake(db,{productCode:code,email:"buyer@example.com",brief,acceptedTerms:true});
 assert.equal(r.paymentVerified,false);assert.equal(r.checkoutReady,false);
 assert.equal(findCustomerIntakeByToken(db,r.intakeId,r.privateStatusToken)?.state,"awaiting_payment");
 assert.equal(findCustomerIntakeByToken(db,r.intakeId,"wrong"),null);
 assert.throws(()=>findUnpaidIntakeForVerifiedGhlOrder(db,r.intakeId,"other@example.com",code,r.priceCents),/No matching/);
 assert.throws(()=>findUnpaidIntakeForVerifiedGhlOrder(db,r.intakeId,"buyer@example.com",code,r.priceCents+1),/No matching/);
 const pair=findUnpaidIntakeForVerifiedGhlOrder(db,r.intakeId,"buyer@example.com",code,r.priceCents);
 assert.equal(pair.brief.objective,brief.objective);
 associateVerifiedCustomerIntake(db,r.intakeId,"verified-transaction-"+code,"job-"+code);
 assert.equal(findCustomerIntakeByToken(db,r.intakeId,r.privateStatusToken)?.paymentVerified,true);
 assert.throws(()=>associateVerifiedCustomerIntake(db,r.intakeId,"duplicate","duplicate"),/already processed/);
}
assert.throws(()=>createCustomerIntake(db,{productCode:"ai.fake" as any,email:"buyer@example.com",brief,acceptedTerms:true}));
assert.throws(()=>createCustomerIntake(db,{productCode:"ai.feasibility.readiness",email:"buyer@example.com",brief,acceptedTerms:false}));
assert.throws(()=>createCustomerIntake(db,{productCode:"ai.feasibility.readiness",email:"buyer@example.com",brief:{...brief,objective:""},acceptedTerms:true}));
console.log("PASS: five self-service fixed-price intakes, consent, private status, exact email/price binding and duplicate protection; never creates paid order");
