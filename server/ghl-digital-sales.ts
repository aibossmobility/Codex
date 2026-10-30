import type Database from 'better-sqlite3';
import type { Express } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { resolveGhlCredentials } from './ghl-integration-store';
import { getCommerceProductByCode, grantMemberProductEntitlement, listCommerceProducts } from './commerce-entitlements';

export function singleGhlRecord(payload:any) {
  const value=Array.isArray(payload)?payload[0]:Array.isArray(payload?.data)?payload.data[0]:payload?.data||payload;
  if(!value || typeof value!=='object' || !value._id)throw new Error('Missing authoritative payment record');
  return value;
}
export const SALES_LOCATION = 'BYx4g32AidgEkTBg7nLQ';
export function targetForGhlProduct(name: string) {
  let match = /^Papa Life Member Audio Lesson (\d{2}) — /.exec(name);
  if (match && +match[1] >= 1 && +match[1] <= 12) return {code:`curriculum.digital.module.${match[1]}`, cents:1499};
  match = /^Papa Life Lesson (\d{2}) — .* — Manuscript PDF$/.exec(name);
  if (match && +match[1] >= 1 && +match[1] <= 12) return {code:`curriculum.manuscript.module.${match[1]}`, cents:1499};
  if (name === 'Papa Life — Complete 12-Lesson Canonical Audio Curriculum') return {code:'curriculum.digital.complete',cents:7900};
  if (name === 'Papa Life — Complete Permanent Digital Curriculum + 12 Manuscripts') return {code:'curriculum.bundle.complete',cents:12900};
  return null;
}
const money = (v: unknown) => Math.round(Number(v) * 100);
const isLive = (v: unknown) => v === true || v === 'true';
export function verifyDigitalOrder(tx: any, order: any, mappings: Map<string,{code:string;cents:number;priceId:string}>) {
  if (tx.altId !== SALES_LOCATION || order.altId !== SALES_LOCATION || tx.altType !== 'location' || order.altType !== 'location') throw new Error('Wrong location');
  if (!isLive(tx.liveMode) || !isLive(order.liveMode) || isLive(tx.markAsTest) || isLive(order.markAsTest)) throw new Error('Test payment');
  if (tx.status !== 'succeeded' || order.status !== 'completed' || tx.entityId !== order._id || tx.entityType !== 'order') throw new Error('Payment not completed');
  if (tx.subscriptionId || order.subscriptionId || Number(tx.amountRefunded || 0) > 0) throw new Error('Recurring or refunded payment');
  if (String(tx.currency).toUpperCase() !== 'USD' || String(order.currency).toUpperCase() !== 'USD' || money(tx.amount) !== money(order.amount)) throw new Error('Unverified total');
  if (!Array.isArray(order.items) || !order.items.length) throw new Error('Missing order items');
  const products = order.items.map((item:any) => {
    const productId = item.product?._id || item.product?.id || item.productId;
    const mapping = mappings.get(productId);
    const priceId = item.price?._id || item.price?.id || item.priceId;
    if (!mapping || priceId !== mapping.priceId || Number(item.qty ?? item.quantity ?? 1) !== 1) throw new Error('Unapproved product or price');
    if (item.price?.type && item.price.type !== 'one_time') throw new Error('Not one-time');
    if (money(item.price?.amount) !== mapping.cents) throw new Error('Incorrect item amount');
    return mapping;
  });
  const subtotal = products.reduce((sum:number,p:any)=>sum+p.cents,0);
  if (money(order.amountSummary?.subtotal ?? order.amountSummary?.subTotal) !== subtotal || money(order.amount) < subtotal) throw new Error('Incorrect subtotal');
  const email = String(order.contactSnapshot?.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !order.contactId || tx.contactId !== order.contactId) throw new Error('Missing verified buyer');
  return {email, contactId:order.contactId, products};
}

export function installGhlDigitalSales(app:Express, db:Database.Database, root:string, callbacks:{
  account:(email:string,name:string)=>{member:any;created:boolean};
  activation:(memberId:number)=>{rawToken:string;expiresAt:string};
}) {
  db.exec(`CREATE TABLE IF NOT EXISTS ghl_digital_delivery (transaction_id TEXT PRIMARY KEY, order_id TEXT, status TEXT NOT NULL, error TEXT, attempts INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS ghl_digital_sales_config (id INTEGER PRIMARY KEY CHECK(id=1), started_at TEXT NOT NULL);
    INSERT OR IGNORE INTO ghl_digital_sales_config(id,started_at) VALUES(1,datetime('now'));`);
  const started = String((db.prepare('SELECT started_at FROM ghl_digital_sales_config WHERE id=1').get() as any).started_at).replace(' ','T')+'Z';
  let ready = false, checkedAt = 0, busy = false, lastError = 'Checking delivery connection';
  let mappings = new Map<string,{code:string;cents:number;priceId:string}>();
  async function api(route:string, method='GET', body?:unknown) {
    const credentials = resolveGhlCredentials(db);
    if (!credentials?.token || credentials.locationId !== SALES_LOCATION) throw new Error('Papa Life API credentials are not configured for the approved location');
    const url = new URL('https://services.leadconnectorhq.com'+route);
    if(method==='GET') {url.searchParams.set('locationId',SALES_LOCATION); url.searchParams.set('altId',SALES_LOCATION); url.searchParams.set('altType','location');}
    const response=await fetch(url,{method,headers:{Authorization:`Bearer ${credentials.token}`,Version:'v3','Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});
    if(!response.ok) throw new Error(`HighLevel ${method} ${url.pathname}: ${response.status}`);
    const payload=await response.json();
    return /^\/payments\/(transactions|orders)\/[^/?]+/.test(route)?singleGhlRecord(payload):payload;
  }
  async function preflight() {
    if(Date.now()-checkedAt<300000) return ready;
    checkedAt=Date.now(); ready=false;
    try {
      const payload=await api('/products/?limit=100');
      const products=payload.products||payload.data||[];
      const next=new Map<string,{code:string;cents:number;priceId:string}>();
      for(const product of products) {
        const target=targetForGhlProduct(product.name||''); if(!target)continue;
        const id=product._id||product.id;
        const pricesPayload=await api(`/products/${encodeURIComponent(id)}/price?limit=100`);
        const prices=pricesPayload.prices||pricesPayload.data||[];
        const matches=prices.filter((p:any)=>p.type==='one_time'&&money(p.amount)===target.cents&&String(p.currency).toUpperCase()==='USD');
        if(matches.length!==1) throw new Error(`Public price not uniquely verified: ${target.code}`);
        const priceId=matches[0]._id||matches[0].id;
        if(Array.from(next.values()).some(p=>p.code===target.code)) throw new Error('Duplicate delivery mapping');
        next.set(id,{...target,priceId});
      }
      if(next.size!==26) throw new Error(`Expected 26 verified public product prices, found ${next.size}`);
      for(const product of listCommerceProducts(db).filter(p=>p.format==='manuscript')) {
        if(!product.document_filename || !fs.existsSync(path.join(root,'server/private-resources/papa-life-manuscripts',path.basename(product.document_filename)))) throw new Error('Manuscript delivery file missing');
      }
      await api('/payments/transactions?limit=1');
      await api('/payments/orders?limit=1');
      mappings=next; ready=true; lastError='';
    }catch(error:any){lastError=error.message; console.warn('[digital-sales] preflight:',lastError);}
    return ready;
  }
  app.get('/api/public/digital-sales-status',async(_req,res)=>{await preflight();res.set('Cache-Control','no-store').json({available:ready,checked_at:checkedAt,delivery:ready?'Verified GoHighLevel payments unlock the purchased resources.':'Digital delivery connection is being verified.'});});
  app.get('/api/admin/digital-sales-status',async(req,res)=>{
    if(!(req.session as any)?.user && !(req.session as any)?.adminId) return res.status(401).json({ok:false});
    await preflight();res.json({ready,error:lastError,started_at:started,mapped_products:mappings.size,recent:db.prepare('SELECT status,error,attempts,updated_at FROM ghl_digital_delivery ORDER BY updated_at DESC LIMIT 10').all()});
  });
  // Authenticated, read-only inspection of a post-launch purchase. Never exposes provider/card credentials.
  app.get('/api/admin/digital-sales-inspect/:id',async(req,res)=>{
    if(!(req.session as any)?.adminId)return res.status(401).json({ok:false});
    try {
      const id=String(req.params.id); if(!/^[a-f0-9]{24}$/.test(id))return res.status(400).json({ok:false});
      const tx=await api(`/payments/transactions/${id}`);
      const order=tx.entityId?await api(`/payments/orders/${encodeURIComponent(tx.entityId)}`):null;
      const list=await api('/payments/transactions?limit=5');
      const pick=(v:any,keys:string[])=>Object.fromEntries(keys.filter(k=>v?.[k]!==undefined).map(k=>[k,v[k]]));
      res.set('Cache-Control','no-store').json({transaction:pick(tx,['_id','altId','altType','entityId','entityType','status','amount','currency','liveMode','createdAt','amountRefunded','subscriptionId']),order:pick(order,['_id','altId','altType','status','amount','currency','liveMode','createdAt','amountSummary','items']),list_keys:Object.keys(list),listed_ids:(list.data||list.transactions||[]).map((v:any)=>({id:v._id||v.id,entityType:v.entityType,status:v.status,createdAt:v.createdAt}))});
    }catch(error:any){res.status(502).json({error:error.message});}
  });
  async function fulfill(id:string) {
    const previous=db.prepare('SELECT status,attempts FROM ghl_digital_delivery WHERE transaction_id=?').get(id) as any;
    if(previous?.status==='sent'||previous?.status==='ignored'||previous?.attempts>=10)return;
    const tx=await api(`/payments/transactions/${encodeURIComponent(id)}`);
    if(new Date(tx.createdAt).getTime()<new Date(started).getTime())return;
    if(!tx.entityId||tx.status!=='succeeded'||tx.entityType!=='order')return;
    const order=await api(`/payments/orders/${encodeURIComponent(tx.entityId)}`);
    // Orders outside the explicitly reconciled public curriculum catalog are unrelated.
    if(!Array.isArray(order.items)||!order.items.some((i:any)=>mappings.has(i.product?._id||i.product?.id||i.productId)))return;
    db.prepare("INSERT INTO ghl_digital_delivery(transaction_id,order_id,status) VALUES(?,?,'pending') ON CONFLICT(transaction_id) DO NOTHING").run(id,tx.entityId);
    try {
      const buyer=verifyDigitalOrder(tx,order,mappings);
      const account=callbacks.account(buyer.email,String(order.contactSnapshot?.name||order.contactSnapshot?.firstName||'Papa Life customer'));
      for(const p of buyer.products){
        if(!getCommerceProductByCode(db,p.code))throw new Error('Canonical product not found');
        const existing=db.prepare('SELECT 1 FROM member_product_entitlements e JOIN commerce_products p ON p.id=e.product_id WHERE e.member_id=? AND p.code=? AND e.revoked_at IS NULL').get(account.member.id,p.code);
        if(!existing)grantMemberProductEntitlement(db,{memberId:account.member.id,productCode:p.code,source:'verified_ghl_public_purchase',externalOrderId:order._id});
      }
      const activation=account.created || previous?.status==='pending' ? callbacks.activation(account.member.id) : null;
      const accessUrl=activation?`https://papalifecoach.com/member-activate?token=${encodeURIComponent(activation.rawToken)}`:'https://papalifecoach.com/member-login';
      const message=`Thank you for your Papa Life purchase. Your purchased resources are ready in your learning library.\n\n${activation?'Set your password using this secure link':'Sign in with your existing password'}:\n${accessUrl}\n\nOpen Manuscripts for your PDFs or Courses for your audio lessons. No paid membership or subscription is required. Your purchase includes only the resources you selected.\n\nFor help, reply to brian@papalifecoach.com.\nPapa Life`;
      await api('/conversations/messages','POST',{type:'Email',contactId:buyer.contactId,emailFrom:'brian@papalifecoach.com',emailTo:buyer.email,subject:'Your Papa Life resources are ready',message,html:message.split('\n').map(line=>line.startsWith('https://')?`<p><a href="${line}">Open your Papa Life library</a></p>`:`<p>${line}</p>`).join('')});
      db.prepare("UPDATE ghl_digital_delivery SET status='sent',error=NULL,attempts=attempts+1,updated_at=datetime('now') WHERE transaction_id=?").run(id);
    }catch(error:any){db.prepare("UPDATE ghl_digital_delivery SET status='pending',error=?,attempts=attempts+1,updated_at=datetime('now') WHERE transaction_id=?").run(String(error.message).slice(0,300),id);console.warn('[digital-sales] delivery pending:',error.message);}
  }
  async function tick(){
    if(busy)return;busy=true;
    try{if(!await preflight())return;
      for(let offset=0;offset<1000;offset+=100){const payload=await api(`/payments/transactions?limit=100&offset=${offset}&startAt=${encodeURIComponent(started)}`);const rows=payload.data||payload.transactions||[]; for(const tx of rows)await fulfill(tx._id||tx.id); if(rows.length<100)break;}
    }catch(error:any){console.warn('[digital-sales] sync:',error.message);}finally{busy=false;}
  }
  if(process.env.NODE_ENV!=='test'){const timer=setInterval(()=>{void tick();},60000);timer.unref();void tick();}
}
