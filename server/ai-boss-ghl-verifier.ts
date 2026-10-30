/** Exact-product AI Boss GHL verification. No credentials, external calls or charges in this module. */
export const AI_BOSS_LOCATION="qJ83IIaK5y2ZPHzLfGG1";
export type AiBossPriceMapping={productId:string;priceId:string;productCode:string;cents:number};
const isLive=(x:any)=>x===true||x==="true";
const cents=(x:any)=>{const n=Number(x);if(!Number.isFinite(n))throw Error("Invalid payment amount");return Math.round(n*100);};
export function verifyAiBossPaidOrder(tx:any,order:any,prices:readonly AiBossPriceMapping[],intake:{email:string;code:string;cents:number;createdAt:string}){
 if(tx?.altId!==AI_BOSS_LOCATION||order?.altId!==AI_BOSS_LOCATION||tx?.altType!=="location"||order?.altType!=="location")throw Error("Wrong GHL business");
 if(!isLive(tx.liveMode)||!isLive(order.liveMode)||isLive(tx.markAsTest)||isLive(order.markAsTest))throw Error("Not a verified live payment");
 if(tx.status!=="succeeded"||order.status!=="completed"||tx.entityType!=="order"||tx.entityId!==(order._id||order.id))throw Error("Transaction/order not complete");
 if(tx.subscriptionId||order.subscriptionId||Number(tx.amountRefunded||0)>0||Number(order.amountRefunded||0)>0)throw Error("Recurring or refunded payment");
 if(String(tx.currency).toUpperCase()!=="USD"||String(order.currency).toUpperCase()!=="USD")throw Error("Wrong currency");
 if(cents(tx.amount)!==cents(order.amount))throw Error("Transaction total mismatch");
 if(!order.contactId||tx.contactId!==order.contactId)throw Error("Contact mismatch");
 const email=String(order.contactSnapshot?.email||"").trim().toLowerCase();
 if(!email||email!==intake.email.trim().toLowerCase())throw Error("Buyer email mismatch");
 const txnCreated=Date.parse(tx.createdAt);
 const intakeCreated=Date.parse(intake.createdAt);
 if(!Number.isFinite(txnCreated)||!Number.isFinite(intakeCreated)||txnCreated<intakeCreated-300000)throw Error("Payment predates accepted customer brief");
 if(!Array.isArray(order.items)||order.items.length!==1)throw Error("Expected one fixed service only");
 const item=order.items[0];
 const productId=String(item.product?._id||item.product?.id||item.productId||"");
 const priceId=String(item.price?._id||item.price?.id||item.priceId||"");
 const config=prices.find(p=>p.productCode===intake.code&&p.cents===intake.cents&&p.productId===productId&&p.priceId===priceId);
 if(!config||prices.filter(p=>p.productCode===intake.code).length!==1)throw Error("Price/product ID not approved for this service");
 if(Number(item.qty??item.quantity??1)!==1||item.price?.type!=="one_time"||cents(item.price?.amount)!==config.cents)throw Error("Wrong quantity or payment type");
 if(cents(order.amountSummary?.subtotal??order.amountSummary?.subTotal)!==config.cents||cents(order.amount)<config.cents)throw Error("Incorrect paid amount");
 return {email,brand:"ai-boss-mobility" as const,productCode:config.productCode,
  cents:config.cents,transactionId:String(tx._id||tx.id),orderId:String(order._id||order.id)};
}
