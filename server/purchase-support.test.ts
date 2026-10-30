import assert from 'node:assert/strict';
import express from 'express';
import Database from 'better-sqlite3';
import { installGhlDigitalSales } from './ghl-digital-sales';
process.env.NODE_ENV='test';
const db=new Database(':memory:');
const app=express();app.use(express.urlencoded({extended:false}));app.use(express.json());
app.use((req,_res,next)=>{(req as any).session={};next();});
installGhlDigitalSales(app,db,process.cwd(),{account:()=>{throw Error('Unexpected account change');},activation:()=>{throw Error('Unexpected credential change');}});
const server=app.listen(0,'127.0.0.1',async()=>{
 try{
  const address=server.address() as any;const base=`http://127.0.0.1:${address.port}`;
  assert.equal((await fetch(base+'/purchase-help')).status,200);
  const post=(email:string)=>fetch(base+'/purchase-help',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({email,issue:'access',details:'Receipt example'})});
  const a=await (await post('TEST@example.com')).text();const b=await (await post('someoneelse@example.com')).text();assert.equal(a,b,'Never reveal whether a buyer exists');
  await post('test@example.com');await post('not an email');
  assert.equal((db.prepare('SELECT count(*) AS n FROM purchase_support_requests').get() as any).n,2,'Rate-limit repeated email and reject malformed input');
  assert.equal((await fetch(base+'/api/admin/digital-sales-inspect/6ae3fa6785b2f088b1cf7597')).status,401);
  assert.equal((await fetch(base+'/purchase-support-admin/retry',{method:'POST'})).status,401);
  assert.equal((db.prepare('SELECT count(*) AS n FROM ghl_digital_delivery').get() as any).n,0,'Requests cannot fabricate a purchase or charge');
  console.log('Purchase support: generic responses, validation, resend throttling, admin protection, and no fabricated purchases passed.');
 }catch(e){console.error(e);process.exitCode=1;}finally{server.close();db.close();}
});
