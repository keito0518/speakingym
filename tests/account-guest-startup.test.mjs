import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../account-sync.js',import.meta.url),'utf8');
const section=source.match(/function releaseUnownedGuestWhileAuthLoads\(\)\{[\s\S]*?\n\}/)?.[0];
assert.ok(section,'guest startup guard must stay a standalone, auditable function');

function simulate({owner=null,loggedIn=false,throws=false}={}){
 let notifications=0;
 const storage={getItem:()=>{if(throws)throw Error('storage blocked');return owner}};
 const fn=vm.runInNewContext(section+';releaseUnownedGuestWhileAuthLoads',{
  user:loggedIn?{uid:'current-user'}:null,
  localStorage:storage,
  OWNER_KEY:'speakingym-account-owner-v1',
  notify:()=>{notifications++}
 });
 return {released:fn(),notifications};
}

test('an unowned guest can practise before Firebase SDK download finishes',()=>{
 assert.deepEqual(simulate(),{released:true,notifications:1});
 assert.match(source,/const guestReleased=releaseUnownedGuestWhileAuthLoads\(\)/);
 assert.match(source,/無料練習はすぐ使えるよ/);
});
test('a previously verified owner is NEVER released as a guest during auth load',()=>{
 assert.deepEqual(simulate({owner:'previous-user'}),{released:false,notifications:0});
 assert.deepEqual(simulate({loggedIn:true}),{released:false,notifications:0});
});
test('guest startup fails closed if local storage access is restricted',()=>{
 assert.deepEqual(simulate({throws:true}),{released:false,notifications:0});
});
