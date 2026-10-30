import type Database from 'better-sqlite3';
import express, { type Express } from 'express';
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
  async function fulfill(id:string, resend=false) {
    const previous=db.prepare('SELECT status,attempts FROM ghl_digital_delivery WHERE transaction_id=?').get(id) as any;
    if(!resend&&(previous?.status==='sent'||previous?.status==='ignored'||previous?.attempts>=10))return;
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
      const activation=resend || account.created || previous?.status==='pending' ? callbacks.activation(account.member.id) : null;
      const accessUrl=activation?`https://papalifecoach.com/member-activate?token=${encodeURIComponent(activation.rawToken)}`:'https://papalifecoach.com/member-login';
      const message=`Thank you for your Papa Life purchase. Your purchased resources are ready in your learning library.\n\n${activation?'Set your password using this secure link':'Sign in with your existing password'}:\n${accessUrl}\n\nOpen Manuscripts for your PDFs or Courses for your audio lessons. No paid membership or subscription is required. Your purchase includes only the resources you selected.\n\nFor access help or a new secure access email, visit https://papalifecoach.com/purchase-help. Never pay again to restore a purchase. For personal help, reply to brian@papalifecoach.com.\nPapa Life`;
      await api('/conversations/messages','POST',{type:'Email',contactId:buyer.contactId,emailFrom:'brian@papalifecoach.com',emailTo:buyer.email,subject:'Your Papa Life resources are ready',message,html:message.split('\n').map(line=>line.startsWith('https://')?`<p><a href="${line}">Open your Papa Life library</a></p>`:`<p>${line}</p>`).join('')});
      db.prepare("UPDATE ghl_digital_delivery SET status='sent',error=NULL,attempts=attempts+1,updated_at=datetime('now') WHERE transaction_id=?").run(id);
    }catch(error:any){db.prepare("UPDATE ghl_digital_delivery SET status='pending',error=?,attempts=attempts+1,updated_at=datetime('now') WHERE transaction_id=?").run(String(error.message).slice(0,300),id);console.warn('[digital-sales] delivery pending:',error.message);}
  }
  db.exec(`CREATE TABLE IF NOT EXISTS purchase_support_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,email TEXT NOT NULL,issue TEXT NOT NULL,details TEXT,
    status TEXT NOT NULL DEFAULT 'queued',transaction_id TEXT,error TEXT,owner_notified INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),updated_at TEXT NOT NULL DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS digital_delivery_alerts (transaction_id TEXT PRIMARY KEY,notified INTEGER NOT NULL DEFAULT 0);`);
  const escapeHtml=(v:unknown)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
  function helpPage(title:string,body:string){return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} | Papa Life</title><style>body{font:18px/1.6 system-ui;background:#f7f1df;color:#163c2d;margin:0}main{max-width:700px;margin:50px auto;padding:25px}input,select,textarea,button{display:block;width:100%;box-sizing:border-box;padding:12px;margin:6px 0 20px;font:inherit}button{background:#163c2d;color:white;border:0;cursor:pointer}a{color:#163c2d}article{border:1px solid;padding:20px;margin:20px 0}</style><main><a href="/shop">Papa Life · Resource Room</a><h1>${title}</h1>${body}</main></html>`;}
  app.get('/purchase-help',(_req,res)=>res.type('html').send(helpPage('Help with your purchase',`<p><strong>Paid but cannot access your resource? Do not pay again.</strong></p><p>For AI Boss Mobility consulting purchases, use <a href="https://ai.bossmobilelifecoach.com/purchase-help">AI Boss Mobility service help</a>. Each business keeps its own support requests and purchase records.</p><h2>Quick answers</h2><details><summary>What did I buy, and where do I find it?</summary><p>Individual manuscripts cost $14.99 each and are PDF downloads in the Papa Life learning library. The $79 bundle provides all 12 streaming audio lessons. The $129 bundle provides all 12 streaming audio lessons and 12 manuscript PDFs. Individual $14.99 audio lessons and the separate $19.99 video series use GoHighLevel's course portal and its access emails. No paid membership is required.</p></details><details><summary>My payment succeeded but I have no access email.</summary><p>Check spam and the email address on your receipt. Use the form below with that same checkout email. We verify eligible payments before requesting another access email. Never buy the same resource again to fix access.</p></details><details><summary>My secure link expired or I cannot sign in.</summary><p>For manuscript and audio-bundle purchases, request a new access email below. Open the newest email; requesting a replacement can invalidate an older password-setup link. Choose your own password on the secure Papa Life page. Do not email your password.</p></details><details><summary>Can I download the audio?</summary><p>These audio products provide protected streaming access. Manuscripts are downloadable PDFs. On a phone, use the browser's download or share menu after opening your purchased PDF.</p></details><details><summary>I entered the wrong email or want a refund.</summary><p>Select the matching issue below and include your receipt or order number. Brian reviews identity corrections and refund requests; they are not automatically approved. Digital-product refund requests are accepted within seven calendar days under the refund policy. Do not include card information.</p></details><h2>Request help</h2><p>For manuscript and audio-bundle purchases, request a new secure access email below. Use the email entered at checkout. We verify the payment before restoring access.</p><form method="post" action="/purchase-help"><label>Checkout email<input type="email" name="email" required maxlength="254" autocomplete="email"></label><label>What do you need?<select name="issue"><option value="access">Access email missing, expired link, or cannot sign in</option><option value="wrong_email">I entered the wrong email at checkout</option><option value="refund">Refund request</option><option value="other">Something else, including audio/video course access</option></select></label><label>Receipt/order number or a short explanation (optional)<textarea name="details" maxlength="1000" rows="4"></textarea></label><p>Never enter a card number, security code, or password here.</p><button>Request purchase help</button></form><p>Access requests normally receive an automated check within five minutes. Check spam too. Wrong-email changes, refunds, course issues, and payments we cannot verify are queued for Brian's review; a response time is not guaranteed.</p><p>For individual audio lessons and the video series, use the GoHighLevel course access email and its password-reset option, or select Something else above.</p><p><a href="/member-login">Learning library sign in</a> · <a href="/refund-policy">Refund policy</a> · <a href="mailto:brian@papalifecoach.com">Email Brian</a></p>`)));
  const supportRate=new Map<string,{at:number;count:number}>();
  app.post('/purchase-help',express.urlencoded({extended:false,limit:'8kb'}),(req,res)=>{
    const ip=req.ip||'unknown'; const now=Date.now(); let rate=supportRate.get(ip);
    if(!rate||now-rate.at>3600000){rate={at:now,count:0};supportRate.set(ip,rate);}
    if(supportRate.size>10000)supportRate.clear();
    const allowed=++rate.count<=10;
    const email=String(req.body?.email||'').trim().toLowerCase();const issue=String(req.body?.issue||'access');
    if(allowed&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)&&email.length<=254&&['access','wrong_email','refund','other'].includes(issue)){
      const recent=db.prepare("SELECT 1 FROM purchase_support_requests WHERE email=? AND created_at>datetime('now','-15 minutes')").get(email);
      if(!recent)db.prepare('INSERT INTO purchase_support_requests(email,issue,details) VALUES(?,?,?)').run(email,issue,String(req.body?.details||'').slice(0,1000));
    }
    res.type('html').send(helpPage('Your request was received',`<p>If we can match a verified manuscript or audio-bundle purchase to that email, we will email a secure access link. Other requests go to Brian for review.</p><p>Check your inbox and spam folder. <strong>Do not purchase again.</strong></p><p>Keep your receipt. If nothing arrives within 15 minutes, email <a href="mailto:brian@papalifecoach.com">brian@papalifecoach.com</a> with your receipt number. Never send card details.</p>`));
  });
  async function ownerNotice(subject:string,message:string){
    const payload=await api('/contacts/?limit=20&query='+encodeURIComponent('brian@papalifecoach.com'));
    const owner=(payload.contacts||[]).find((c:any)=>String(c.email).toLowerCase()==='brian@papalifecoach.com');
    if(!owner?.id)throw new Error('Owner contact unavailable for support notification');
    await api('/conversations/messages','POST',{type:'Email',contactId:owner.id,emailFrom:'brian@papalifecoach.com',emailTo:'brian@papalifecoach.com',subject,message});
  }
  function dashboardAlert(email:string,note:string){
    db.prepare('INSERT INTO ghl_contact_alerts(email,source,outreach_note,voice_prompt) VALUES(?,?,?,?)').run(email,'purchase_support',note,note);
  }
  async function supportTick(){
    const requests=db.prepare("SELECT * FROM purchase_support_requests WHERE status='queued' ORDER BY id LIMIT 10").all() as any[];
    for(const request of requests){
      try{
        let matched:string|null=null;
        if(request.issue==='access' && ready){
          for(let offset=0;offset<1000&&!matched;offset+=100){
            const payload=await api(`/payments/transactions?limit=100&offset=${offset}&startAt=${encodeURIComponent(started)}`);const rows=payload.data||[];
            for(const row of rows){if(String(row.contactEmail||'').toLowerCase()!==request.email)continue;
              const tx=singleGhlRecord(await api(`/payments/transactions/${encodeURIComponent(row._id)}`));
              if(new Date(tx.createdAt).getTime()<new Date(started).getTime()||!tx.entityId)continue;
              const order=singleGhlRecord(await api(`/payments/orders/${encodeURIComponent(tx.entityId)}`));
              const buyer=verifyDigitalOrder(tx,order,mappings);if(buyer.email!==request.email)continue;
              matched=tx._id;await fulfill(tx._id,true);break;
            }if(rows.length<100)break;
          }
        }
        const delivered=matched?db.prepare('SELECT status FROM ghl_digital_delivery WHERE transaction_id=?').get(matched) as any:null;
        const status=delivered?.status==='sent'?'access_emailed':'review';
        db.prepare("UPDATE purchase_support_requests SET status=?,transaction_id=?,updated_at=datetime('now') WHERE id=?").run(status,matched,request.id);
        if(status==='review')dashboardAlert(request.email,`Purchase help #${request.id}: ${request.issue}. Review https://papalifecoach.com/purchase-support-admin. Verify the receipt before changing email or issuing a refund; never ask the customer to pay again.`);
      }catch(error:any){db.prepare("UPDATE purchase_support_requests SET status='review',error=?,updated_at=datetime('now') WHERE id=?").run(String(error.message).slice(0,300),request.id);dashboardAlert(request.email,`Purchase help #${request.id} needs review: automated recovery failed. Open /purchase-support-admin.`);}
    }
    for(const request of db.prepare("SELECT * FROM purchase_support_requests WHERE status='review' AND owner_notified=0 LIMIT 10").all() as any[]){
      try{await ownerNotice(`Papa Life purchase help #${request.id} needs review`,`Customer: ${request.email}\nIssue: ${request.issue}\nDetails: ${request.details||'None'}\nOpen https://papalifecoach.com/purchase-support-admin while signed in to CRM. Verify payment first; do not request another purchase. Email changes and refunds need your approval.`);db.prepare('UPDATE purchase_support_requests SET owner_notified=1 WHERE id=?').run(request.id);}catch{}
    }
    for(const item of db.prepare("SELECT transaction_id,error FROM ghl_digital_delivery WHERE status='pending' AND attempts>=3").all() as any[]){
      const inserted=db.prepare('INSERT OR IGNORE INTO digital_delivery_alerts(transaction_id) VALUES(?)').run(item.transaction_id);
      if(inserted.changes)dashboardAlert('',`Paid digital delivery needs review. Transaction ${item.transaction_id}. Open /purchase-support-admin. ${item.error||''}`);
      const alert=db.prepare('SELECT notified FROM digital_delivery_alerts WHERE transaction_id=?').get(item.transaction_id) as any;
      if(!alert.notified)try{await ownerNotice('Papa Life: paid resource delivery needs attention',`Transaction: ${item.transaction_id}\nDelivery error: ${item.error}\nReview https://papalifecoach.com/purchase-support-admin. The customer has paid; do not charge again.`);db.prepare('UPDATE digital_delivery_alerts SET notified=1 WHERE transaction_id=?').run(item.transaction_id);}catch{}
    }
  }
  app.get('/purchase-support-admin',(req,res)=>{
    if(!(req.session as any)?.adminId)return res.redirect('/crm-console');
    const requests=db.prepare('SELECT * FROM purchase_support_requests ORDER BY id DESC LIMIT 50').all() as any[];
    const deliveries=db.prepare('SELECT transaction_id,status,error,attempts,updated_at FROM ghl_digital_delivery ORDER BY updated_at DESC LIMIT 50').all() as any[];
    res.set('Cache-Control','no-store').type('html').send(helpPage('Purchase support',`<p>Check payment first. Access recovery never creates a charge. Refunds and changing a buyer's email require your review. Keep historical payment records unchanged.</p><h2>Customer requests</h2>${requests.map(r=>`<article><strong>#${r.id}: ${escapeHtml(r.status)}</strong><p>${escapeHtml(r.email)} · ${escapeHtml(r.issue)}</p><p>${escapeHtml(r.details)}</p><p>${escapeHtml(r.error)}</p><p>Owner email notification: ${r.owner_notified?'sent':'pending / not needed'}</p></article>`).join('')||'<p>No requests.</p>'}<h2>Digital deliveries</h2>${deliveries.map(d=>`<article><p>${escapeHtml(d.transaction_id)} · ${escapeHtml(d.status)} · ${d.attempts} attempts</p><p>${escapeHtml(d.error)}</p>${d.status==='pending'?`<form method="post" action="/purchase-support-admin/retry"><input type="hidden" name="id" value="${escapeHtml(d.transaction_id)}"><button>Retry verified access delivery — no charge</button></form>`:''}</article>`).join('')||'<p>No delivery records.</p>'}<p><a href="/crm-console">Open CRM alerts</a></p>`));
  });
  app.post('/purchase-support-admin/retry',express.urlencoded({extended:false,limit:'8kb'}),(req,res)=>{
    if(!(req.session as any)?.adminId)return res.status(401).end();
    if(req.get('origin')!=='https://papalifecoach.com')return res.status(403).end();
    const id=String(req.body?.id||'');if(/^[a-f0-9]{24}$/.test(id))db.prepare("UPDATE ghl_digital_delivery SET attempts=0 WHERE transaction_id=? AND status='pending'").run(id);
    res.redirect('/purchase-support-admin');
  });
  async function tick(){
    if(busy)return;busy=true;
    try{if(!await preflight()){await supportTick();return;}
      for(let offset=0;offset<1000;offset+=100){const payload=await api(`/payments/transactions?limit=100&offset=${offset}&startAt=${encodeURIComponent(started)}`);const rows=payload.data||payload.transactions||[]; for(const tx of rows)await fulfill(tx._id||tx.id); if(rows.length<100)break;}
      await supportTick();
    }catch(error:any){console.warn('[digital-sales] sync:',error.message);}finally{busy=false;}
  }
  if(process.env.NODE_ENV!=='test'){const timer=setInterval(()=>{void tick();},60000);timer.unref();void tick();}
}
