'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const base = path.resolve(process.cwd(), 'dist', 'public');
const indexFile = path.join(base, 'index.html');
const types = {'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2','.mp4':'video/mp4','.ico':'image/x-icon'};
if (!fs.existsSync(indexFile)) { console.error('Static build missing. Refusing to serve empty preview.'); process.exit(1); }
const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405, {'content-type':'text/plain'}); return res.end('Method not allowed'); }
  let requestPath;
  try { requestPath = decodeURIComponent(new URL(req.url || '/', 'http://localhost').pathname); }
  catch { res.writeHead(400); return res.end('Bad request'); }
  if (requestPath === '/_health') { res.writeHead(200, {'content-type':'application/json','cache-control':'no-store'}); return res.end(JSON.stringify({ok:true,service:'papa-life-digital-twin-preview',mode:'static-isolated',ai_backend:false})); }
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
