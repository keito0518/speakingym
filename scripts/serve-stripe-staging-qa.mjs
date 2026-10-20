/** Serve ONLY the isolated Stripe TEST QA page on the developer's own PC.
 * No public network listener, no local files outside the three allowlisted assets,
 * no proxying, secret storage or access to production services.
 */
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';

export const HOST='127.0.0.1';
export const PORT=8765;
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export const QA_ASSETS=Object.freeze({
 '/stripe-staging-qa.html':{file:'stripe-staging-qa.html',type:'text/html; charset=utf-8'},
 '/stripe-staging-qa.js':{file:'stripe-staging-qa.js',type:'text/javascript; charset=utf-8'},
 '/firebase-config.js':{file:'firebase-config.js',type:'text/javascript; charset=utf-8'},
});
export function assetForRequest(method,url){
 if(method!=='GET')return null;
 let uri;
 try{uri=new URL(url,'http://localhost:'+PORT)}catch{return null}
 if(uri.hostname!=='localhost'||uri.port!==String(PORT))return null;
 const path=uri.pathname==='/'?'/stripe-staging-qa.html':uri.pathname;
 return QA_ASSETS[path]||null;
}
export function createQaServer(){
 return createServer(async(req,res)=>{
  const requested=assetForRequest(req.method,req.url);
  const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',
    'X-Frame-Options':'DENY','Referrer-Policy':'no-referrer',
    'Permissions-Policy':'microphone=(),camera=(),geolocation=()'};
  if(!requested){res.writeHead(404,headers);res.end('Not found');return}
  try{
   const contents=await readFile(resolve(ROOT,requested.file));
   res.writeHead(200,{...headers,'Content-Type':requested.type});
   res.end(contents);
  }catch{res.writeHead(503,headers);res.end('QA asset not available')}
 });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const server=createQaServer();
 server.on('error',()=>{console.error('STOP: localhost test port unavailable. No browser started.');process.exitCode=1});
 server.listen(PORT,HOST,()=>{
  console.log('Speakingym STRIPE SANDBOX QA only: http://localhost:'+PORT+'/stripe-staging-qa.html');
  console.log('Isolated staging Worker only. No production API routes.');
  console.log('Close this window or press Ctrl+C to stop QA server.');
 });
}
