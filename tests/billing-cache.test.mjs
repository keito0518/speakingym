
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('pricing page pins the safer billing UI asset without changing public API',()=>{
 const html=readFileSync(new URL('../plans.html',import.meta.url),'utf8');
 assert.match(html,/<script src="\.\/billing-ui\.js\?v=20261021-account-switch-safety-5" defer><\/script>/);
});
