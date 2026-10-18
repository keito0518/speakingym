import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import worker from './ai-worker.js';
import {ledgerSchemaReady} from './turn-ledger.js';

function schemaFixture(){
 const sqlite=new DatabaseSync(':memory:');
 const db={prepare(sql){return{all:async()=>({results:sqlite.prepare(sql).all()})}}};
 const migrate=()=>sqlite.exec(readFileSync(new URL('./migrations/0002-ai-turn-ledger.sql',import.meta.url),'utf8'));
 return {sqlite,db,migrate};
}
test('ledger readiness stays false until exact table and both triggers exist',async()=>{
 const f=schemaFixture();
 f.sqlite.exec(readFileSync(new URL('./schema-plans.sql',import.meta.url),'utf8'));
 assert.equal(await ledgerSchemaReady(f.db),false);
 f.migrate();
 assert.equal(await ledgerSchemaReady(f.db),true);
 f.sqlite.exec('DROP TRIGGER ai_turn_reservation_count_refund');
 assert.equal(await ledgerSchemaReady(f.db),false);
 f.migrate();
 assert.equal(await ledgerSchemaReady(f.db),true);
 f.sqlite.exec('DROP TABLE ai_turn_reservations');
 assert.equal(await ledgerSchemaReady(f.db),false);
});
test('readiness check is non-throwing with absent or malfunctioning D1 binding',async()=>{
 assert.equal(await ledgerSchemaReady(),false);
 assert.equal(await ledgerSchemaReady({prepare(){throw Error('D1 offline')}}),false);
 assert.equal(await ledgerSchemaReady({prepare(){return {all:async()=>{throw Error('D1 offline')}}}}),false);
});
test('Worker health reports separate disabled/ready states and never writes to D1',async()=>{
 const f=schemaFixture();
 f.sqlite.exec(readFileSync(new URL('./schema-plans.sql',import.meta.url),'utf8'));
 const env={ENFORCE_PLANS:'true',PLAN_DB:f.db,TURN_LEDGER_MODE:'enabled'};
 const url='https://example.workers.dev/health';
 let res=await worker.fetch(new Request(url),env);
 let j=await res.json();
 assert.equal(res.status,200);
 assert.equal(j.turnLedgerEnabled,true);
 assert.equal(j.turnLedgerSchemaReady,false);
 f.migrate();
 res=await worker.fetch(new Request(url),env);
 j=await res.json();
 assert.equal(j.turnLedgerSchemaReady,true);
 assert.equal(j.billingMode,'disabled');
 assert.equal((await (await worker.fetch(new Request(url),{...env,TURN_LEDGER_MODE:'disabled'})).json()).turnLedgerEnabled,false);
});
