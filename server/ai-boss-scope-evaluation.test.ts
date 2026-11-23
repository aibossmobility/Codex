import assert from "node:assert/strict";
import {test} from "node:test";
import {evaluateAiBossScope} from "./ai-boss-scope-evaluation";
test("preflight custom never calls AI",async()=>{
 let called=false;
 const x=await evaluateAiBossScope({preflightStatus:"custom_quote_required",need:"New website",apiKey:"test",fetcher:(async()=>{called=true;throw Error("no");}) as typeof fetch});
 assert.equal(called,false);assert.equal(x.status,"custom_quote_required");assert.equal(x.readyForAutomaticInvoice,false);
});
test("missing credentials stays provisional",async()=>{
 const x=await evaluateAiBossScope({preflightStatus:"standard_scope_candidate",need:"Existing tools"});assert.equal(x.origin,"website_preflight");
});
test("AI may downgrade candidate but never charge",async()=>{
 const fetcher=(async()=>({ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({decision:"clarification_required",reason:"Need permission",questions:["Which contacts opted in?"]})}}]})})) as unknown as typeof fetch;
 const x=await evaluateAiBossScope({preflightStatus:"standard_scope_candidate",need:"Business scope",apiKey:"test",fetcher});assert.equal(x.status,"clarification_required");assert.equal(x.origin,"ai");assert.equal(x.questions.length,1);assert.equal(x.readyForAutomaticBuild,false);
});
test("malicious output cannot authorize invoice",async()=>{
 const fetcher=(async()=>({ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({decision:"charge_now",readyForAutomaticInvoice:true})}}]})})) as unknown as typeof fetch;
 const x=await evaluateAiBossScope({preflightStatus:"standard_scope_candidate",need:"Business scope",apiKey:"test",fetcher});assert.equal(x.origin,"website_preflight");assert.equal(x.readyForAutomaticInvoice,false);
});
test("model failure is nonblocking",async()=>{
 const fetcher=(async()=>{throw Error("network");}) as typeof fetch;
 const x=await evaluateAiBossScope({preflightStatus:"standard_scope_candidate",need:"Business scope",apiKey:"test",fetcher});assert.equal(x.origin,"website_preflight");
});
