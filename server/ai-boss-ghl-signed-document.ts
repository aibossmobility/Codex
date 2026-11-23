/**
 * Read-only GoHighLevel Documents & Contracts signature verification.
 * Isolated to AI Boss Mobility Consulting; never sends agreements or invoices.
 * Document-list metadata is NOT the signed PDF bytes and does not prove the
 * agreement's precise scope text. Use separate immutable scope archive proof.
 * Dedicated read-only proposals token must be provisioned before live use.
 */
export const AI_BOSS_DOCS_LOCATION="qJ83IIaK5y2ZPHzLfGG1";
const idOk=(s:unknown)=>typeof s==="string"&&/^[a-zA-Z0-9_-]{8,100}$/.test(s);
const emailOk=(s:unknown)=>typeof s==="string"&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)&&s.length<=254;
const signedStatus=(x:any)=>{
 const statuses=Array.isArray(x)?x:[x];
 return statuses.includes("completed")||statuses.includes("accepted");
};
const yes=(x:any)=>x===true;
export type VerifiedDocumentSignature={
 signatureStatusConfirmed:true;
 locationId:string;documentId:string;contactId:string;documentRevision:number;
 signerEmail:string;signedAt:string;documentStatus:"completed"|"accepted";
 providerReadOnlyEvidenceRef:string;
 documentCurrency:string;documentTotalUsd:number;
 // Intentionally false: metadata cannot cryptographically prove scope bytes.
 signedScopeBytesVerified:false;depositPaymentVerified:false;
 authorizedToEnroll:false;invoiceSent:false;
};
export async function readAiBossSignedDocument(args:{
 documentId:string;contactId:string;signerEmail:string;expectedName:string;
 expectedRevision:number;expectedDocumentTotalUsd:number;apiToken:string;
 fetchImpl?:typeof fetch;
}):Promise<VerifiedDocumentSignature>{
 const {documentId,contactId,signerEmail,expectedName,expectedRevision,
  expectedDocumentTotalUsd,apiToken}=args;
 if(!idOk(documentId)||!idOk(contactId)||!emailOk(signerEmail)||
  typeof expectedName!=="string"||expectedName.trim().length<15||
  expectedName.length>180||!Number.isSafeInteger(expectedRevision)||
  expectedRevision<1||expectedRevision>200||
  !Number.isFinite(expectedDocumentTotalUsd)||expectedDocumentTotalUsd<=0||
  expectedDocumentTotalUsd>100000||!apiToken||apiToken.length<20)
  throw Error("Dedicated AI Boss documents credential and exact signed-document identifiers required");
 const fetchImpl=args.fetchImpl||fetch;
 let match:any=null;
 for(let skip=0;skip<500;skip+=100){
  const url=new URL("https://services.leadconnectorhq.com/proposals/document");
  url.searchParams.set("locationId",AI_BOSS_DOCS_LOCATION);
  url.searchParams.set("status","completed,accepted");
  url.searchParams.set("limit","100");
  url.searchParams.set("skip",String(skip));
  const res=await fetchImpl(url.toString(),{
   method:"GET",
   headers:{Authorization:"Bearer "+apiToken,Version:"v3",Accept:"application/json"},
   signal:AbortSignal.timeout(10000)
  });
  if(!res.ok)throw Error("GoHighLevel signed-document read rejected (HTTP "+res.status+")");
  const body=await res.json() as any,docs=body?.documents;
  if(!Array.isArray(docs)||docs.length>100)throw Error("Unusable documents response");
  const found=docs.filter((d:any)=>(d?.documentId===documentId||d?._id===documentId));
  if(found.length>1||match&&found.length)throw Error("Ambiguous signed document identifier");
  if(found.length===1){match=found[0];break;}
  if(docs.length<100)break;
 }
 if(!match||match.locationId!==AI_BOSS_DOCS_LOCATION||
  ![match.documentId,match._id].includes(documentId)||
  match.deleted!==false||match.isExpired!==false||
  !Number.isSafeInteger(match.documentRevision)||
  match.documentRevision!==expectedRevision||
  match.name!==expectedName||!signedStatus(match.status))
  throw Error("Correct active signed AI Boss agreement not verified");
 const signer=(Array.isArray(match.recipients)?match.recipients:[])
  .filter((r:any)=>r?.role==="signer"&&r?.isPrimary===true&&
   String(r?.email||"").toLowerCase()===signerEmail.toLowerCase()&&
   r?.id===contactId&&r?.hasCompleted===true&&
   typeof r?.signedDate==="string"&&
   Number.isFinite(Date.parse(r.signedDate)));
 if(signer.length!==1)throw Error("Correct verified customer signer not found");
 const completedSignatures=(Array.isArray(match.fillableFields)?match.fillableFields:[])
  .filter((f:any)=>f?.type==="Signature"&&f?.hasCompleted===true&&
   f?.entityType==="contacts"&&f?.id===contactId);
 if(completedSignatures.length<1)
  throw Error("Required customer signature field not complete");
 const money=match.grandTotal;
 if(money?.currency!=="USD"||
  !Number.isFinite(money?.amount)||
  Math.round(money.amount*100)!==Math.round(expectedDocumentTotalUsd*100))
  throw Error("Document amount or currency differs from signed offer");
 // A GoHighLevel read result establishes document status, not payment.
 const state=(Array.isArray(match.status)?match.status:[match.status]).includes("accepted")?
  "accepted":"completed";
 return {signatureStatusConfirmed:true,locationId:AI_BOSS_DOCS_LOCATION,
  documentId,contactId,documentRevision:expectedRevision,
  signerEmail:signerEmail.toLowerCase(),signedAt:signer[0].signedDate,
  documentStatus:state,providerReadOnlyEvidenceRef:
   "ghl-documents:"+AI_BOSS_DOCS_LOCATION+":"+documentId+":"+expectedRevision,
  documentCurrency:"USD",documentTotalUsd:money.amount,
  signedScopeBytesVerified:false,depositPaymentVerified:false,
  authorizedToEnroll:false,invoiceSent:false};
}
