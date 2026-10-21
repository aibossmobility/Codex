/**
 * Outbound-only Mac bridge, deliberately NOT enabled on startup.
 * Requires a private 0600 token and an explicit --activate on the Mac.
 * Never makes model calls, purchases, writes to customer systems or connects inbound ports.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import Database from "better-sqlite3";
import { createExecutiveAction, decideExecutiveAction } from "./executive-action-queue-store";
import { assessWorkerDeliverable } from "./ai-boss-worker-evidence";

const BASE = "https://papalifecoach.com";
const RELAY_FILE = path.join(os.homedir(),".config","papa-life-os","worker-relay.token");
const LOCAL_DB = path.join(os.homedir(),"Developer","Codex-seo-health-20261004","leads.db");
const ROLES = new Set([
  "financial-director","marketing-revenue-director","papa-life-director",
  "ai-boss-mobility-director","outreach-followup","content-distribution",
  "seo-website","crm-sales","ghl-customer-service","finance-records","scheduling-communications","quality-compliance",
]);
type Claim = {action_id:number;project:string;role:string;instruction:string;request_id:string;lease:string};

function validateClaim(raw: unknown): Claim {
  if (!raw || typeof raw!=="object")throw Error("Invalid remote claim");
  const item=raw as Record<string,unknown>;
  const project=String(item.project||""),role=String(item.role||"");
  if (!Number.isSafeInteger(item.action_id) || Number(item.action_id)<1 ||
    !["papa-life","ai-boss-mobility"].includes(project) || !ROLES.has(role) ||
    (role==="papa-life-director"&&project!=="papa-life") ||
    (role==="ai-boss-mobility-director"&&project!=="ai-boss-mobility") ||
    typeof item.instruction!=="string"||item.instruction.length<12||item.instruction.length>2000||
    typeof item.request_id!=="string"||!/^[0-9a-f-]{36}$/i.test(item.request_id)||
    typeof item.lease!=="string"||!/^[0-9a-f-]{36}$/i.test(item.lease))throw Error("Remote claim outside approved scope");
  return {action_id:Number(item.action_id),project,role,instruction:item.instruction,
    request_id:item.request_id,lease:item.lease};
}
function ensureMap(db: Database.Database) {
  db.exec(`CREATE TABLE IF NOT EXISTS ai_boss_worker_remote_map (
    remote_action_id INTEGER PRIMARY KEY,
    local_action_id INTEGER NOT NULL UNIQUE,
    project TEXT NOT NULL,
    role TEXT NOT NULL,
    instruction TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );`);
}
export function acceptVerifiedClaim(db:Database.Database, raw:unknown) {
  const claim=validateClaim(raw);
  ensureMap(db);
  return db.transaction(()=>{
    const prior=db.prepare("SELECT * FROM ai_boss_worker_remote_map WHERE remote_action_id=?").get(claim.action_id) as any;
    if(prior){
      if(prior.project!==claim.project||prior.role!==claim.role||prior.instruction!==claim.instruction)
        throw Error("Remote identity changed on retry");
      return {local_action_id:Number(prior.local_action_id),reused:true,claim};
    }
    const local=createExecutiveAction(db,{
      action_type:"search",target_system:"desktop_commander",target_ref:"agent-team-readonly",
      requested_outcome:"Papa Life OS approved worker: "+claim.role+" — "+claim.instruction,
      authority_level:"observe",execution_route:"local",approval_required:true,
      estimated_external_ai_cost_micros:0,project_key:claim.project,work_kind:"task",
      source_conversation_ref:"verified-cloud-worker-"+claim.action_id,
      action_payload:{worker:"agent-team-v1",role:claim.role,project:claim.project,
        instruction:claim.instruction,mode:"read_only",no_writes:true,no_outreach:true,no_purchases:true}
    });
    if(!local?.id||local.status!=="awaiting_approval")throw Error("Approval gate missing");
    // Cloud endpoint issues this claim ONLY for a task the owner approved on the authenticated site.
    decideExecutiveAction(db,Number(local.id),{
      decision:"approve",note:"Copied the owner's already-approved Papa Life OS assignment #"+claim.action_id+" over the authenticated outbound Mac relay."
    });
    db.prepare("INSERT INTO ai_boss_worker_remote_map(remote_action_id,local_action_id,project,role,instruction) VALUES(?,?,?,?,?)")
      .run(claim.action_id,local.id,claim.project,claim.role,claim.instruction);
    return {local_action_id:Number(local.id),reused:false,claim};
  })();
}
function readSecret():string {
  const fd=fs.openSync(RELAY_FILE,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);
  try {
    const st=fs.fstatSync(fd);
    if (!st.isFile() || st.uid!==process.getuid?.() || (st.mode&0o777)!==0o600)throw Error("Worker relay credential permissions invalid");
    const token=fs.readFileSync(fd,"utf8").trim();
    if (token.length<32||token.length>256||/\s/.test(token))throw Error("Worker relay credential invalid");
    return token;
  }finally{fs.closeSync(fd);}
}
async function call(pathname:string, token:string,body:unknown={}) {
  const url=new URL(pathname,BASE);
  if(url.origin!==BASE||!pathname.startsWith("/api/ai-boss/worker-relay/"))throw Error("Unexpected remote endpoint");
  const response=await fetch(url,{method:"POST",redirect:"error",
    signal:AbortSignal.timeout(12_000),
    headers:{"authorization":"Bearer "+token,"content-type":"application/json"},
    body:JSON.stringify(body)
  });
  if(!response.ok)throw Error("Authenticated worker relay unavailable: HTTP "+response.status);
  const text=await response.text();
  if(Buffer.byteLength(text)>4096)throw Error("Worker relay response too large");
  return JSON.parse(text);
}
export async function pollOnce() {
  const token=readSecret();
  const received=await call("/api/ai-boss/worker-relay/claim",token);
  if(!received?.ok)throw Error("Remote server claim failed");
  if(!received.assignment)return {status:"empty"};
  const db=new Database(LOCAL_DB);db.pragma("busy_timeout=5000");
  try {
    const {local_action_id,claim}=acceptVerifiedClaim(db,received.assignment);
    const deadline=Date.now()+100_000;
    while(Date.now()<deadline) {
      const row=db.prepare("SELECT status,result_json,error_summary FROM executive_actions WHERE id=?").get(local_action_id) as any;
      if(row?.status==="completed" || row?.status==="failed") {
        let details: any = null;
        try { details=JSON.parse(row.result_json||"null"); } catch { /* invalid result must not pass */ }
        const result=details?.details||details?.result?.details||details;
        if (row.status==="completed" &&
          (result?.role!==claim.role||result?.project!==claim.project||result?.read_only!==true))
          throw Error("Local worker result provenance invalid");
        const decision= row.status==="failed"
          ? { outcome:"blocked" as const, explanation:String(row.error_summary||"Worker execution failed without a verifiable deliverable.").slice(0,1800),
              next_step:"Inspect local worker failure, correct the blocker, and request a fresh approval." }
          : assessWorkerDeliverable(claim.role,claim.project,claim.instruction,result);
        const response=await call("/api/ai-boss/worker-relay/"+claim.action_id+"/result",token,
          {lease:claim.lease,project:claim.project,role:claim.role,read_only:true,...decision});
        const expected=decision.outcome==="completed" ? "completed" : "failed";
        if(!response?.ok||response.assignment?.status!==expected)throw Error("Cloud receipt not acknowledged");
        return {status:expected,remote_action_id:claim.action_id,local_action_id,
          result:decision.outcome==="completed"?"verified_deliverable":"needs_attention"};
      }
      if(row?.status==="declined")throw Error("Worker was declined");
      await new Promise(resolve=>setTimeout(resolve,3000));
    }
    return {status:"pending",remote_action_id:claim.action_id,local_action_id};
  }finally{db.close();}
}
if(process.argv[1]&&path.resolve(process.argv[1])===new URL(import.meta.url).pathname){
  if(process.argv.slice(2).join("")!=="--activate"){
    console.error("Bridge is disabled by default; explicit --activate on the Mac is required.");
    process.exitCode=2;
  }else {
    pollOnce().then(x=>console.log(JSON.stringify(x))).catch(e=>{console.error(String(e));process.exitCode=1;});
  }
}
