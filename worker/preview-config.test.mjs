import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('Worker feature-branch previews cannot call AI, grant Pro or use production D1',()=>{
 const cfg=readFileSync(new URL('./wrangler.toml',import.meta.url),'utf8');
 const previewStart=cfg.indexOf('[previews.vars]');
 assert.notEqual(previewStart,-1,'Previews require an explicit, safe config');
 const preview=cfg.slice(previewStart);
 for(const [key,value] of Object.entries({ENFORCE_PLANS:'false',ALLOW_AI:'false',BILLING_MODE:'disabled'})){
  assert.match(preview,new RegExp('^'+key+'\\s*=\\s*"'+value+'"\\s*$','m'));
 }
 assert.doesNotMatch(preview,/\\[\\[previews\\.(?:d1_databases|ratelimits)\\]\\]/,'Preview must not reuse production resources');
 assert.match(cfg.slice(0,previewStart),/ENFORCE_PLANS = "true"/,'Production quota must remain unchanged');
});
