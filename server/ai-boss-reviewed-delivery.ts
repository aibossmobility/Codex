import type Database from 'better-sqlite3';
import {createHash} from 'node:crypto';
import {advanceCustomerJob,installCustomerOrderLedger} from './customer-fulfillment-ledger';
import {findCustomerIntakeByToken,initializeCustomerIntake} from './ai-boss-customer-intake';
import {fixedServiceTemplates} from './fixed-service-draft-worker';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
export function initializeReviewedDelivery(db:Database.Database){
 installCustomerOrderLedger(db);initializeCustomerIntake(db);
 db.exec(`CREATE TABLE IF NOT EXISTS ai_boss_reviewed_deliverables (
 job_id TEXT PRIMARY KEY REFERENCES customer_fulfillment_jobs(id),content TEXT NOT NULL,sha256 TEXT NOT NULL,
 review_notes TEXT,reviewer TEXT,released_at TEXT,downloaded_at TEXT,updated_at TEXT NOT NULL DEFAULT(datetime('now')));`);
}
function eligibleJob(db:Database.Database,id:string){
 const job=db.prepare(`SELECT j.*,i.id AS intake_id,i.state AS intake_state FROM customer_fulfillment_jobs j
 JOIN ai_boss_customer_intakes i ON i.verified_job_id=j.id AND i.payment_transaction_id=j.transaction_id
 WHERE j.id=? AND j.brand='ai-boss-mobility' AND i.email=j.customer_email AND i.product_code=j.product_code AND i.expected_cents=j.price_cents`).get(id) as any;
 const config=job?fixedServiceTemplates[job.product_code as keyof typeof fixedServiceTemplates]:undefined;
 if(!job||!config||job.price_cents!==config.cents||!String(job.payment_evidence).startsWith('verified_ghl:'))throw Error('Verified, matched AI Boss purchase required');
 return {job,config};
}
export function reviewCandidate(db:Database.Database,id:string){
 initializeReviewedDelivery(db);const {job,config}=eligibleJob(db,id);
 const artifact=db.prepare('SELECT * FROM ai_boss_reviewed_deliverables WHERE job_id=?').get(id) as any;
 return {job,sections:config.sections,artifact:artifact||null};
}
export function saveReviewCandidate(db:Database.Database,id:string,content:string){
 initializeReviewedDelivery(db);const {job,config}=eligibleJob(db,id);
 if(job.state!=='production_ready')throw Error('Production-ready job required; released work is immutable');
 if(typeof content!=='string'||content.length<1000||Buffer.byteLength(content)>300000||/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(content))throw Error('A complete bounded text deliverable is required');
 if(/WORKING DRAFT|This section requires project-specific validation|\bTODO\b|\bTBD\b|\[INSERT\b/i.test(content))throw Error('Unfinished draft or placeholder cannot be released');
 const missing=config.sections.filter(section=>!content.toLowerCase().includes(section.toLowerCase()));
 if(missing.length)throw Error('Missing package sections: '+missing.join(', '));
 const sha256=digest(content);
 db.transaction(()=>{
 db.prepare(`INSERT INTO ai_boss_reviewed_deliverables(job_id,content,sha256) VALUES(?,?,?)
 ON CONFLICT(job_id) DO UPDATE SET content=excluded.content,sha256=excluded.sha256,updated_at=datetime('now') WHERE released_at IS NULL`).run(id,content,sha256);
 db.prepare("UPDATE ai_boss_customer_intakes SET state='quality_review',updated_at=datetime('now') WHERE id=?").run(job.intake_id);
 })();return {sha256};
}
export function approveReviewedDelivery(db:Database.Database,id:string,input:{sha256:string;reviewer:string;notes:string;sections:string[];serviceCompleted:boolean;factsChecked:boolean}){
 initializeReviewedDelivery(db);
 return db.transaction(()=>{
 const {job,config}=eligibleJob(db,id);
 const artifact=db.prepare('SELECT * FROM ai_boss_reviewed_deliverables WHERE job_id=?').get(id) as any;
 if(job.state!=='production_ready'||!artifact||artifact.released_at||artifact.sha256!==input.sha256||digest(artifact.content)!==input.sha256)throw Error('Exact unreleased reviewed artifact required');
 if(input.serviceCompleted!==true||input.factsChecked!==true||!input.reviewer?.trim()||input.reviewer.length>100||!input.notes?.trim()||input.notes.trim().length<30||input.notes.length>3000||!Array.isArray(input.sections)||input.sections.length!==config.sections.length||!config.sections.every(s=>input.sections.includes(s)))throw Error('Owner must confirm every package requirement, factual checks and completion of contracted work');
 advanceCustomerJob(db,id,'quality_passed','Owner review '+input.reviewer+' approved SHA256 '+artifact.sha256+'. '+input.notes);
 db.prepare("UPDATE ai_boss_reviewed_deliverables SET review_notes=?,reviewer=?,released_at=datetime('now') WHERE job_id=?").run(input.notes,input.reviewer,id);
 return {sha256:artifact.sha256,released:true,downloaded:false};
 })();
}
export function customerReleasedArtifact(db:Database.Database,intakeId:string,token:string){
 initializeReviewedDelivery(db);
 if(!findCustomerIntakeByToken(db,intakeId,token))return null;
 const artifact=db.prepare(`SELECT d.job_id,d.content,d.sha256,d.released_at,d.downloaded_at,j.product_code FROM ai_boss_reviewed_deliverables d
 JOIN customer_fulfillment_jobs j ON j.id=d.job_id JOIN ai_boss_customer_intakes i ON i.verified_job_id=j.id
 WHERE i.id=? AND i.payment_transaction_id=j.transaction_id AND i.email=j.customer_email AND i.product_code=j.product_code
 AND j.brand='ai-boss-mobility' AND j.state IN ('quality_passed','delivered') AND d.released_at IS NOT NULL`).get(intakeId) as any;
 if(!artifact||digest(artifact.content)!==artifact.sha256)return null;
 return artifact;
}
export function recordCompletedDownload(db:Database.Database,intakeId:string,sha256:string){
 initializeReviewedDelivery(db);
 return db.transaction(()=>{
 const row=db.prepare(`SELECT d.job_id,d.sha256,j.state FROM ai_boss_reviewed_deliverables d JOIN ai_boss_customer_intakes i ON i.verified_job_id=d.job_id JOIN customer_fulfillment_jobs j ON j.id=d.job_id WHERE i.id=? AND j.brand='ai-boss-mobility' AND d.released_at IS NOT NULL`).get(intakeId) as any;
 if(!row||row.sha256!==sha256)throw Error('Released artifact mismatch');
 if(row.state!=='delivered')advanceCustomerJob(db,row.job_id,'delivered','Authenticated customer download response completed for SHA256 '+sha256);
 db.prepare("UPDATE ai_boss_reviewed_deliverables SET downloaded_at=COALESCE(downloaded_at,datetime('now')) WHERE job_id=?").run(row.job_id);
 db.prepare("UPDATE ai_boss_customer_intakes SET state='delivered',updated_at=datetime('now') WHERE id=?").run(intakeId);
 })();
}
