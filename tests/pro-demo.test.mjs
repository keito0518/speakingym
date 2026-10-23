import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {buildProStudyPlan,markReview,reviewDay} from '../pro-study-data.mjs';

const html=readFileSync(new URL('../pro-demo.html',import.meta.url),'utf8');
const js=readFileSync(new URL('../pro-demo.js',import.meta.url),'utf8');
const plans=readFileSync(new URL('../plans.html',import.meta.url),'utf8');
const runnable=js.replace(/^import .*;\s*$/gm,'');
function fixture(){
 const nodes=new Map();
 function node(tag='div'){
  const callbacks=new Map();
  return {tagName:tag,children:[],hidden:false,disabled:false,textContent:'',
   attributes:{},className:'',setAttribute(k,v){this.attributes[k]=v},
   addEventListener(name,fn){callbacks.set(name,fn)},
   click(){callbacks.get('click')?.()},
   append(...children){this.children.push(...children)},
   replaceChildren(...children){this.children=children}};
 }
 const document={createElement:node,getElementById(id){
  if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);
 }};
 vm.runInNewContext(runnable,{document,buildProStudyPlan,markReview,reviewDay,Date});
 return nodes;
}
test('public Pro study demo is explicit about sample content, no payments and no real AI use',()=>{
 assert.match(html,/架空の学習データ/);
 assert.match(html,/ログイン・お支払い・AIへの通信は不要/);
 assert.match(html,/id="demo-review-list"/);
 assert.match(html,/id="demo-next-day"/);
 assert.match(html,/id="demo-reset"/);
 assert.match(html,/@media\(max-width:680px\)/);
 assert.match(html,/name="robots" content="noindex,nofollow"/);
 assert.match(plans,/href="\.\/pro-demo\.html"/);
 assert.doesNotMatch(js,/\bfetch\s*\(|stripe|checkout|firebase|localStorage|sessionStorage|innerHTML\s*=/i);
});
test('sample review can be graded, advanced one day, and reset with no permanent writes',()=>{
 const nodes=fixture();
 const list=nodes.get('demo-review-list');
 assert.equal(list.children.length,5);
 assert.equal(nodes.get('demo-plan').children.length,3);
 const first=list.children[0];
 const buttons=first.children.at(-1).children;
 const reveal=buttons[0],remember=buttons[1],retry=buttons[2];
 assert.equal(first.children[2].hidden,true);
 reveal.click();
 assert.equal(first.children[2].hidden,false);
 assert.equal(reveal.attributes['aria-expanded'],'true');
 remember.click();
 assert.equal(nodes.get('demo-review-list').children.length,5,'replaced by next ungraded card');
 assert.match(nodes.get('demo-review-status').textContent,/次の復習日/);
 const attempts=nodes.get('demo-stats').children[0].children[0].textContent;
 assert.equal(attempts,'1');
 nodes.get('demo-next-day').click();
 assert.match(nodes.get('demo-day').textContent,/練習2日目/);
 assert.ok(nodes.get('demo-review-list').children.length>=1);
 const next=nodes.get('demo-review-list').children[0];
 next.children.at(-1).children[2].click();
 assert.match(nodes.get('demo-review-status').textContent,/明日また/);
 nodes.get('demo-reset').click();
 assert.match(nodes.get('demo-day').textContent,/練習1日目/);
 assert.equal(nodes.get('demo-review-list').children.length,5);
 assert.equal(nodes.get('demo-stats').children[0].children[0].textContent,'0');
});
test('sample targets cannot silently become a signed Pro entitlement',()=>{
 assert.doesNotMatch(js,/\bgetIdToken\b|\bentitlement\b|stripe\b|apiKey\b/i);
 assert.match(html,/実際のPro権限や利用枠も変更しません/);
 assert.match(html,/正式な販売条件と公開日は準備中/);
});
