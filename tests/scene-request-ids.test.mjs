import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../scenes.html',import.meta.url),'utf8');

test('new user speech gets one UUID and ambiguous retries retain it',()=>{
 assert.match(html,/pendingRequestId=globalThis\.crypto\?\.randomUUID\?\.\(\)\|\|"";turn\+\+/);
 assert.match(html,/requestId:pendingRequestId\|\|undefined/);
 assert.match(html,/function send\(\).*?pendingRequestId=/s);
 assert.match(html,/function answer\(text\).*?requestId:pendingRequestId\|\|undefined/s);
 assert.match(html,/\$\("retry"\)\.addEventListener\("click",\(\)=>\{if\(pendingText&&!processing&&running&&!retryBlocked\)answer\(pendingText\)\}/);
});
test('confirmed HTTP errors rotate ID while network errors preserve ID, successes clear it',()=>{
 assert.match(html,/if\(!response\.ok\)\{if\(!\["request_pending","request_uncertain","request_result_expired"\]\.includes\(data\.error\)\)pendingRequestId=""/);
 assert.match(html,/async function answer\(text\)\{if\(!pendingRequestId\)pendingRequestId=globalThis\.crypto\?\.randomUUID\?\.\(\)\|\|""/);
 assert.match(html,/pendingText="";pendingRequestId="";retryBlocked=false;processing=false/);
 assert.match(html,/function leave\(\)\{runToken\+\+;running=false;processing=false;pendingText="";pendingRequestId="";retryBlocked=false/);
 const catchBlock=html.slice(html.indexOf('}catch(e){if(!running||requestToken!==runToken)return;processing=false;const code='));
 assert.ok(!catchBlock.split('}finally')[0].includes('pendingRequestId=""'),
  'Ambiguous transport errors must not clear idempotency UUID before retry');
});
test('retry controls fail closed on terminal receipts or unprotected ambiguous POST',()=>{
 assert.match(html,/aiReplayEnabled===true&&info\.aiReplaySchemaReady===true/);
 assert.match(html,/turnLedgerEnabled===true&&info\.turnLedgerSchemaReady===true/);
 assert.match(html,/retryBlocked=\["request_uncertain","request_result_expired","request_id_conflict","invalid_request_id","invalid_ai_response"\]/);
 assert.match(html,/aiPostStarted&&!aiResponseReceived&&!safeReplay/);
 assert.match(html,/\$\("retry"\)\.disabled=processing\|\|!running\|\|!pendingText\|\|retryBlocked/);
});
