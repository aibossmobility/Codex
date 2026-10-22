'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const base = path.resolve(process.cwd(), 'dist', 'public');
const indexFile = path.join(base, 'index.html');
const types = {'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2','.mp4':'video/mp4','.ico':'image/x-icon'};
if (!fs.existsSync(indexFile)) { console.error('Static build missing. Refusing to serve empty preview.'); process.exit(1); }

const GUIDED_RESPONSES = Object.freeze({
  safety: 'If anyone is in immediate danger, contact local emergency services. In the United States, call or text 988 for crisis support. Papa Life is not an emergency or clinical service.',
  papa: 'PAPA stands for Presence, Authority, Purpose and Alignment. Begin with presence: listen without defending, respect your adult child’s independence, and choose one small consistent action.',
  reconnect: 'Reconnection is an invitation, not a demand. Begin by listening without pressure, acknowledging impact, and offering one small, reliable act of care. You cannot choose the other person’s response.',
  apology: 'An effective repair starts by naming what happened and how it affected the other person. Avoid explaining away the harm, then allow them space to respond or not respond.',
  boundaries: 'A father can express care without directing an adult child’s decisions. Ask permission before offering advice, and honor a boundary even when it is difficult.',
  listening: 'Listen first. Reflect what you heard, ask whether you understood correctly, and resist the urge to defend your intention before acknowledging the impact.',
  learning: 'You can begin with Papa Life’s first lesson and resources on papalifecoach.com. Participation does not require a voice conversation or purchasing a subscription.',
  faith: 'Faith can guide a father toward humility, patience, accountability and reconciliation. See Matthew 5:13–16 and Romans 12:6–8, and read those passages in your preferred translation.',
  human: 'I am Brian’s guided digital resource, not Brian personally. This preview cannot deliver a message to Brian or claim that he has read it. Contact him through the verified Papa Life website channel for personal matters.',
  default: 'Tell me what happened, what you hope will change, and what feels hardest. A thoughtful next step is to listen first, respect the other person’s autonomy, and act consistently rather than pressing for an immediate answer.'
});
function guidedReply(raw) {
  const input = raw.includes('VISITOR MESSAGE:') ? raw.split('VISITOR MESSAGE:').pop() : raw;
  const msg = String(input || '').slice(0,4000).toLowerCase();
  if (/(suicid|kill myself|self.harm|immediate danger|being abused)/.test(msg)) return GUIDED_RESPONSES.safety;
  if (/(i(?:.m| am) brian.s (child|daughter|son)|my father brian|personal message to brian)/.test(msg)) return GUIDED_RESPONSES.human;
  if (/(what is papa|papa framework|presence.*authority.*purpose)/.test(msg)) return GUIDED_RESPONSES.papa;
  if (/(apolog|sorry|own my impact|repair sentence)/.test(msg)) return GUIDED_RESPONSES.apology;
  if (/(boundary|boundaries|control|adult child.s decision|unwanted advice)/.test(msg)) return GUIDED_RESPONSES.boundaries;
  if (/(listen|defend|hear what)/.test(msg)) return GUIDED_RESPONSES.listening;
  if (/(reconnect|estrang|distant|pulls away|won.t talk)/.test(msg)) return GUIDED_RESPONSES.reconnect;
  if (/(lesson|course|workshop|website resources|start without a voice)/.test(msg)) return GUIDED_RESPONSES.learning;
  if (/(scripture|biblical|bible|faith|christian)/.test(msg)) return GUIDED_RESPONSES.faith;
  if (/(speak to brian|contact brian|tell brian|send (him|brian))/i.test(msg)) return GUIDED_RESPONSES.human;
  return GUIDED_RESPONSES.default;
}
function respondJson(res, code, payload) {
  res.writeHead(code, {'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});
  return res.end(JSON.stringify(payload));
}
function handleNoCostGuidedChat(req, res) {
  if (!/application\/json/i.test(String(req.headers['content-type']||''))) return respondJson(res,415,{ok:false,error:'JSON content type required'});
  const origin = req.headers.origin;
  if (origin) {
    try { if (new URL(origin).host !== req.headers.host) return respondJson(res,403,{ok:false,error:'Cross-origin requests are not accepted'}); }
    catch { return respondJson(res,400,{ok:false,error:'Invalid origin'}); }
  }
  const limit=8192;
  if (Number(req.headers['content-length']||0)>limit) return respondJson(res,413,{ok:false,error:'Request too large'});
  let chunks=[],length=0,done=false;
  req.on('data',chunk=>{
    if(done)return;
    length+=chunk.length;
    if(length>limit){done=true;return respondJson(res,413,{ok:false,error:'Request too large'});}
    chunks.push(chunk);
  });
  req.on('end',()=>{
    if(done)return;
    let parsed;
    try { parsed=JSON.parse(Buffer.concat(chunks).toString('utf8')); }
    catch { return respondJson(res,400,{ok:false,error:'Invalid JSON'}); }
    const message=parsed?.message;
    if(typeof message!=='string'||!message.trim()) return respondJson(res,400,{ok:false,error:'Message is required'});
    if(message.length>4000) return respondJson(res,413,{ok:false,error:'Message too long'});
    const reply=guidedReply(message);
    return respondJson(res,200,{ok:true,reply:'Prepared guidance (not live AI): '+reply,provider:'scripted-guidance',live_ai_enabled:false,ai_backend:false,conversation_saved:false,mode:'no-cost-guided',disclaimer:'Prepared Papa Life response, not generated AI or a message sent to Brian.'});
  });
  req.on('error',()=>{if(!done){done=true;respondJson(res,400,{ok:false,error:'Invalid request'});}});
}

const server = http.createServer((req, res) => {
  if(req.method==='POST' && ['/api/ai/chat','/api/papa-ai/chat'].includes(new URL(req.url||'/', 'http://localhost').pathname)) return handleNoCostGuidedChat(req,res);
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405, {'content-type':'text/plain'}); return res.end('Method not allowed'); }
  let requestPath;
  try { requestPath = decodeURIComponent(new URL(req.url || '/', 'http://localhost').pathname); }
  catch { res.writeHead(400); return res.end('Bad request'); }
  if (requestPath === '/_health') { res.writeHead(200, {'content-type':'application/json','cache-control':'no-store'}); return res.end(JSON.stringify({ok:true,service:'papa-life-digital-twin-preview',mode:'static-isolated',ai_backend:false,guided_chat:true,conversation_storage:false,voice_session_enabled:false})); }
  if (requestPath === '/api' || requestPath.startsWith('/api/')) { res.writeHead(503, {'content-type':'application/json','cache-control':'no-store'}); return res.end(JSON.stringify({ok:false,reason:'This preview is frontend-only; AI APIs are not enabled.'})); }
  const rel = requestPath.replace(/^\/+/, '');
  const abs = path.resolve(base, rel);
  if (abs !== base && !abs.startsWith(base + path.sep)) { res.writeHead(403); return res.end('Forbidden'); }
  let filePath = abs;
  try {
    let stat = fs.statSync(filePath);
    if (stat.isDirectory()) { filePath = path.join(filePath, 'index.html'); stat = fs.statSync(filePath); }
    if (!stat.isFile()) { res.writeHead(404); return res.end('Not found'); }
  } catch {
    if (path.extname(requestPath) || requestPath.startsWith('/vendor/') || requestPath.startsWith('/assets/') || requestPath.startsWith('/videos/')) { res.writeHead(404); return res.end('Not found'); }
    filePath = indexFile;
  }
  res.setHeader('content-type', types[path.extname(filePath).toLowerCase()] || 'application/octet-stream');
  res.setHeader('x-content-type-options','nosniff');
  res.setHeader('cache-control',filePath === indexFile ? 'no-store' : 'public,max-age=300');
  res.writeHead(200);
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(filePath).on('error', () => res.destroy()).pipe(res);
});
const port = Number(process.env.PORT || 8080);
if (!Number.isInteger(port) || port < 1 || port > 65535) { console.error('Invalid PORT'); process.exit(1); }
server.listen(port, '0.0.0.0', () => console.log('Isolated static preview listening on ' + port));

