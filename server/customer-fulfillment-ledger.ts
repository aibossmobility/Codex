import type Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { brandDirectors, type CustomerBrand } from "./customer-journey-worker-routing";

export type OrderState = "payment_verified" | "production_ready" | "quality_passed" | "delivered" | "needs_attention";
export type FixedOrder = {
  brand: CustomerBrand; transactionId: string; orderId: string; productCode: string;
  priceCents: number; email: string; paymentVerified: boolean; paymentEvidence: string;
};
const validBrand=(value:string):value is CustomerBrand=>value==="papa-life"||value==="ai-boss-mobility";
export function installCustomerOrderLedger(db:Database.Database) {
 db.exec(`CREATE TABLE IF NOT EXISTS customer_fulfillment_jobs (
  id TEXT PRIMARY KEY,
  brand TEXT NOT NULL CHECK(brand IN ('papa-life','ai-boss-mobility')),
  transaction_id TEXT NOT NULL, order_id TEXT NOT NULL,
  product_code TEXT NOT NULL, price_cents INTEGER NOT NULL CHECK(price_cents>0),
  customer_email TEXT NOT NULL,
  director_role TEXT NOT NULL,
  state TEXT NOT NULL CHECK(state IN ('payment_verified','production_ready','quality_passed','delivered','needs_attention')),
  payment_evidence TEXT NOT NULL,
  deliverable_evidence TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(brand,transaction_id,product_code)
 );
 CREATE TABLE IF NOT EXISTS customer_fulfillment_events (
  event_id TEXT PRIMARY KEY,job_id TEXT NOT NULL REFERENCES customer_fulfillment_jobs(id),
  state TEXT NOT NULL,evidence TEXT NOT NULL,
  recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
 );`);
}
export function registerVerifiedCustomerOrder(db:Database.Database, input:FixedOrder) {
 if(!validBrand(input.brand)||!input.paymentVerified||!input.paymentEvidence?.trim()||
  !input.transactionId?.trim()||!input.orderId?.trim()||!input.productCode?.trim()||
  !Number.isSafeInteger(input.priceCents)||input.priceCents<=0||
  !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email))throw Error("Authoritative verified paid order is required");
 installCustomerOrderLedger(db);
 return db.transaction(()=>{
  const prior=db.prepare("SELECT * FROM customer_fulfillment_jobs WHERE brand=? AND transaction_id=? AND product_code=?")
   .get(input.brand,input.transactionId,input.productCode) as any;
  if(prior){
   if(prior.order_id!==input.orderId||prior.price_cents!==input.priceCents||prior.customer_email!==input.email||
    prior.payment_evidence!==input.paymentEvidence)throw Error("Conflicting payment identity; manual investigation required");
   return {id:prior.id,state:prior.state,reused:true};
  }
  const id=randomUUID();
  db.prepare(`INSERT INTO customer_fulfillment_jobs
   (id,brand,transaction_id,order_id,product_code,price_cents,customer_email,director_role,state,payment_evidence)
   VALUES(?,?,?,?,?,?,?,?,'payment_verified',?)`)
   .run(id,input.brand,input.transactionId,input.orderId,input.productCode,input.priceCents,input.email,brandDirectors[input.brand],input.paymentEvidence);
  db.prepare("INSERT INTO customer_fulfillment_events(event_id,job_id,state,evidence) VALUES(?,?,?,?)")
   .run(randomUUID(),id,"payment_verified",input.paymentEvidence);
  return {id,state:"payment_verified" as const,reused:false};
 })();
}
export function advanceCustomerJob(db:Database.Database,jobId:string,next:OrderState,evidence:string) {
 if(!evidence?.trim()||evidence.length>3000)throw Error("Documented evidence required for job transition");
 return db.transaction(()=>{
  const job=db.prepare("SELECT * FROM customer_fulfillment_jobs WHERE id=?").get(jobId) as any;
  if(!job)throw Error("Job not found");
  if(job.state===next)return {state:next,reused:true};
  const allowed:Record<OrderState,OrderState[]>={
   payment_verified:["production_ready","needs_attention"],
   production_ready:["quality_passed","needs_attention"],
   quality_passed:["delivered","needs_attention"],
   delivered:[],
   needs_attention:["production_ready"]
  };
  if(!allowed[job.state as OrderState]?.includes(next))throw Error("Worker stage or verified-payment gate not satisfied");
  db.prepare(`UPDATE customer_fulfillment_jobs SET state=?,deliverable_evidence=CASE WHEN ?='quality_passed' OR ?='delivered' THEN ? ELSE deliverable_evidence END,
   error_message=CASE WHEN ?='needs_attention' THEN ? ELSE NULL END,updated_at=datetime('now') WHERE id=?`)
   .run(next,next,next,evidence,next,next==="needs_attention"?evidence:null,jobId);
  db.prepare("INSERT INTO customer_fulfillment_events(event_id,job_id,state,evidence) VALUES(?,?,?,?)")
   .run(randomUUID(),jobId,next,evidence);
  return {state:next,reused:false};
 })();
}
export function customerJobSummary(db:Database.Database,brand:CustomerBrand){
 if(!validBrand(brand))throw Error("Unknown business");
 installCustomerOrderLedger(db);
 return db.prepare("SELECT id,brand,product_code,price_cents,director_role,state,created_at,updated_at FROM customer_fulfillment_jobs WHERE brand=? ORDER BY created_at DESC LIMIT 50").all(brand);
}
