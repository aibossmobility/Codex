/**
 * Persist read-only, provider-verified half-down evidence in a private ledger.
 * No public endpoint and NO production enrollment. Every call rereads provider
 * records before returning even when an earlier receipt exists, so a refund
 * is not hidden by cached verification.
 */
import type Database from "better-sqlite3";
import {createHash,randomUUID} from "node:crypto";
import {verifyAiBossHalfDownProviderOrder,type ApprovedHalfDownProviderIntent} from "./ai-boss-half-down-provider-verification";
const sha=(v:string)=>createHash("sha256").update(v).digest("hex");
export function initAiBossHalfDownProviderReceipts(db:Database.Database){
 db.exec("CREATE TABLE IF NOT EXISTS ai_boss_half_down_provider_receipts("+
  "id TEXT PRIMARY KEY,service_code TEXT NOT NULL,location_id TEXT NOT NULL,"+
  "transaction_id TEXT NOT NULL UNIQUE,order_id TEXT NOT NULL UNIQUE,"+
  "document_id TEXT NOT NULL,contact_id TEXT NOT NULL,customer_email_sha TEXT NOT NULL,"+
  "deposit_cents INTEGER NOT NULL,total_cents INTEGER NOT NULL,"+
  "signed_at TEXT NOT NULL,paid_at TEXT NOT NULL,charge_ref TEXT NOT NULL,"+
  "provider_read_checked_at TEXT NOT NULL,scope_pdf_archived INTEGER NOT NULL DEFAULT 0,"+
  "production_authorized INTEGER NOT NULL DEFAULT 0,final_invoice_authorized INTEGER NOT NULL DEFAULT 0);"+
  "CREATE TABLE IF NOT EXISTS ai_boss_half_down_provider_audit("+
  "id TEXT PRIMARY KEY,receipt_id TEXT NOT NULL,kind TEXT NOT NULL,"+
  "recorded_at TEXT DEFAULT(datetime('now')));");
}
export async function verifyAndStageAiBossHalfDownReceipt(input:{
 db:Database.Database;approved:ApprovedHalfDownProviderIntent;
 paymentReadToken:string;documentsReadToken:string;fetchImpl?:typeof fetch;
}){
 // Prevent caller from caching 'valid' without querying live provider.
 const verified=await verifyAiBossHalfDownProviderOrder(input);
 const db=input.db;initAiBossHalfDownProviderReceipts(db);
 const customerEmailSha=sha(verified.customerEmail);
 return db.transaction(()=>{
  const prior=db.prepare("SELECT * FROM ai_boss_half_down_provider_receipts WHERE transaction_id=?")
   .get(verified.transactionId) as any;
  if(prior){
   if(prior.location_id!==verified.locationId||prior.service_code!==verified.serviceCode||
    prior.order_id!==verified.orderId||prior.document_id!==verified.documentId||
    prior.contact_id!==verified.contactId||prior.customer_email_sha!==customerEmailSha||
    prior.deposit_cents!==verified.depositCents||prior.total_cents!==verified.totalCents||
    prior.charge_ref!==verified.providerChargeRef||
    prior.signed_at!==verified.signedAt)
    throw Error("Conflicting provider order identity: investigation required");
   db.prepare("UPDATE ai_boss_half_down_provider_receipts SET provider_read_checked_at=? WHERE id=?")
    .run(new Date().toISOString(),prior.id);
   db.prepare("INSERT INTO ai_boss_half_down_provider_audit(id,receipt_id,kind) VALUES(?,?,?)")
    .run(randomUUID(),prior.id,"provider_reverified_no_charge");
   return {receiptId:prior.id,reused:true,serviceCode:verified.serviceCode,
    depositCents:verified.depositCents,scopePdfArchived:false,
    productionAuthorized:false,finalInvoiceAuthorized:false,invoiceSent:false};
  }
  const id=randomUUID();
  db.prepare("INSERT INTO ai_boss_half_down_provider_receipts("+
   "id,service_code,location_id,transaction_id,order_id,document_id,"+
   "contact_id,customer_email_sha,deposit_cents,total_cents,signed_at,paid_at,"+
   "charge_ref,provider_read_checked_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
   .run(id,verified.serviceCode,verified.locationId,verified.transactionId,
    verified.orderId,verified.documentId,verified.contactId,customerEmailSha,
    verified.depositCents,verified.totalCents,verified.signedAt,verified.paidAt,
    verified.providerChargeRef,new Date().toISOString());
  db.prepare("INSERT INTO ai_boss_half_down_provider_audit(id,receipt_id,kind) VALUES(?,?,?)")
   .run(randomUUID(),id,"provider_verified_readonly_no_charge");
  return {receiptId:id,reused:false,serviceCode:verified.serviceCode,
   depositCents:verified.depositCents,scopePdfArchived:false,
   productionAuthorized:false,finalInvoiceAuthorized:false,invoiceSent:false};
 })();
}
