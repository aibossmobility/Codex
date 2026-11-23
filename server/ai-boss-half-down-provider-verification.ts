/**
 * AI Boss Mobility — provider-side, READ-ONLY 50%-deposit verification.
 * Works for any signed AI Boss 50%-down service, not only Smart Outreach.
 * Never sends an invoice, charges a card, enrolls production or publishes work.
 * Signed document STATUS is not proof of archived signed SCOPE BYTES.
 */
import {AI_BOSS_LOCATION} from "./ai-boss-ghl-verifier";
import {readAiBossSignedDocument} from "./ai-boss-ghl-signed-document";

const ids=(s:unknown)=>typeof s==="string"&&/^[a-zA-Z0-9_-]{8,100}$/.test(s);
const cents=(v:unknown)=>{
 if(typeof v!=="number"||!Number.isFinite(v)||v<=0)return null;
 const round=Math.round(v*100);
 return Math.abs(v*100-round)<0.000001?round:null;
};
const mail=(s:unknown)=>typeof s==="string"&&
 /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)&&s.length<=254;
const live=(o:any)=>o?.liveMode===true&&o?.markAsTest!==true;
const status=(s:any)=>s==="succeeded";
const evidence=(s:unknown)=>typeof s==="string"&&s.length>7&&s.length<200;
const loc=(o:any)=>o?.altId===AI_BOSS_LOCATION&&o?.altType==="location";

export type ApprovedHalfDownProviderIntent={
 // All expected IDs and price come from signed business order/offer registry,
 // never an untrusted public request body.
 serviceCode:string;transactionId:string;orderId:string;documentId:string;
 contactId:string;customerEmail:string;documentName:string;documentRevision:number;
 totalCents:number;depositCents:number;authorizedPaymentProvider:"stripe";
};
export type HalfDownProviderEvidence={
 source:"ghl_verified_readonly";locationId:string;serviceCode:string;
 transactionId:string;orderId:string;documentId:string;contactId:string;
 customerEmail:string;totalCents:number;depositCents:number;
 signedAt:string;paidAt:string;providerChargeRef:string;
 signedDocumentMetadataVerified:true;depositVerified:true;
 signedAgreementBytesArchived:false;customerAcceptanceVerified:false;
 productionAuthorized:false;finalInvoiceAuthorized:false;invoiceSent:false;
};
/** Both API reads are authenticated to separate scoped, AI Boss-only tokens.
 * The document must be externally signed before the exact deposit transaction,
 * by the same contact, on a document-linked order.
 */
export async function verifyAiBossHalfDownProviderOrder(args:{
 approved:ApprovedHalfDownProviderIntent;paymentReadToken:string;
 documentsReadToken:string;fetchImpl?:typeof fetch;
}):Promise<HalfDownProviderEvidence>{
 const {approved:a,paymentReadToken,documentsReadToken}=args;
 if(!a||!ids(a.serviceCode)||!ids(a.transactionId)||!ids(a.orderId)||
  !ids(a.documentId)||!ids(a.contactId)||!mail(a.customerEmail)||
  typeof a.documentName!=="string"||a.documentName.length<15||a.documentName.length>180||
  !Number.isSafeInteger(a.documentRevision)||a.documentRevision<1||
  !Number.isSafeInteger(a.totalCents)||!Number.isSafeInteger(a.depositCents)||
  a.depositCents<=0||a.totalCents!==2*a.depositCents||
  a.authorizedPaymentProvider!=="stripe"||
  !paymentReadToken||paymentReadToken.length<20||
  !documentsReadToken||documentsReadToken.length<20)
  throw Error("Trusted 50% business order, provider identifiers and separate read credentials required");
 if(paymentReadToken===documentsReadToken)
  throw Error("Dedicated document-read and payment-read credentials must be distinct");
 const fetchImpl=args.fetchImpl||fetch;
 const retrieve=async(url:URL)=>{
  const res=await fetchImpl(url.toString(),{
   method:"GET",headers:{Authorization:"Bearer "+paymentReadToken,
    Version:"v3",Accept:"application/json"},signal:AbortSignal.timeout(12000)
  });
  if(!res.ok)throw Error("Payment provider record unavailable (HTTP "+res.status+")");
  const v=await res.json() as any;
  const body=Array.isArray(v)?v[0]:v?.data||v;
  if(!body||typeof body!=="object"||Array.isArray(body)||
   !(body._id||body.id))throw Error("Payment provider returned invalid record");
  return body;
 };
 const txUrl=new URL("https://services.leadconnectorhq.com/payments/transactions/"+encodeURIComponent(a.transactionId));
 txUrl.searchParams.set("locationId",AI_BOSS_LOCATION);
 txUrl.searchParams.set("altId",AI_BOSS_LOCATION);
 txUrl.searchParams.set("altType","location");
 const tx=await retrieve(txUrl);
 if(!loc(tx)||!live(tx)||!status(tx.status)||
  (tx._id||tx.id)!==a.transactionId||
  tx.entityType!=="order"||tx.entityId!==a.orderId||
  tx.contactId!==a.contactId||
  tx.currency!=="USD"||cents(tx.amount)!==a.depositCents||
  tx.subscriptionId||tx.isParent===true||Number(tx.amountRefunded||0)!==0||
  !evidence(tx.chargeId)||!tx.paymentProvider||
  tx.paymentProvider.type!==a.authorizedPaymentProvider)
  throw Error("Exact live, nonrefunded, one-time 50% deposit transaction not verified");
 const orderUrl=new URL("https://services.leadconnectorhq.com/payments/orders/"+encodeURIComponent(a.orderId));
 orderUrl.searchParams.set("locationId",AI_BOSS_LOCATION);
 orderUrl.searchParams.set("altId",AI_BOSS_LOCATION);
 const order=await retrieve(orderUrl);
 if(!loc(order)||!live(order)||order.status!=="completed"||
  (order._id||order.id)!==a.orderId||
  order.contactId!==a.contactId||
  order.currency!=="USD"||cents(order.amount)!==a.depositCents||
  Number(order.amountRefunded||0)!==0||order.subscriptionId||
  !mail(order.contactSnapshot?.email)||
  order.contactSnapshot.email.toLowerCase()!==a.customerEmail.toLowerCase()||
  (order.contactSnapshot?.location_id&&order.contactSnapshot.location_id!==AI_BOSS_LOCATION))
  throw Error("Deposit order does not match the authorized business and customer");
 // No unverified guesswork about invoice-origin payments:
 // this version requires an explicit document ID in the provider order
 // or transaction metadata. Unsupported linkage is BLOCKED.
 const linked=(order.source?.type==="document_contracts"&&order.source?.id===a.documentId)||
  (tx.entitySource?.type==="document_contracts"&&tx.entitySource?.id===a.documentId);
 if(!linked)throw Error("Payment cannot be linked to exact signed document by provider records");
 // Document metadata is read directly with the dedicated documents-only token.
 const signed=await readAiBossSignedDocument({
  documentId:a.documentId,contactId:a.contactId,
  signerEmail:a.customerEmail,expectedName:a.documentName,
  expectedRevision:a.documentRevision,
  expectedDocumentTotalUsd:a.depositCents/100,
  apiToken:documentsReadToken,fetchImpl
 });
 const paidAt=Date.parse(tx.createdAt),signedAt=Date.parse(signed.signedAt);
 if(!Number.isFinite(paidAt)||!Number.isFinite(signedAt)||
  paidAt<signedAt-120000)
  throw Error("Exact payment must follow customer signature");
 return {source:"ghl_verified_readonly",locationId:AI_BOSS_LOCATION,
  serviceCode:a.serviceCode,transactionId:a.transactionId,orderId:a.orderId,
  documentId:a.documentId,contactId:a.contactId,
  customerEmail:a.customerEmail.toLowerCase(),
  totalCents:a.totalCents,depositCents:a.depositCents,
  signedAt:signed.signedAt,paidAt:tx.createdAt,
  providerChargeRef:tx.chargeId,
  signedDocumentMetadataVerified:true,depositVerified:true,
  signedAgreementBytesArchived:false,customerAcceptanceVerified:false,
  productionAuthorized:false,finalInvoiceAuthorized:false,invoiceSent:false};
}
