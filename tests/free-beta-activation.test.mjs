import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';

const page=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
test('first-time guide has an actionable login-free sprint link included in existing anonymous CTA funnel',()=>{
 const html=page('index.html');
 const guide=html.match(/<section class="start-guide"[^>]*>([\s\S]*?)<\/section>/)?.[1];
 assert.ok(guide);
 assert.match(guide,/<a class="btn primary" href="\.\/reflex\.html" data-sg-cta="sprint">まずは無料で60秒試す/);
 assert.match(html,/60秒チャレンジはログイン不要・回数制限なし/);
 assert.doesNotMatch(guide,/stripe|checkout|Googleログインが必須/);
});

test('feedback entry points are present at the end of the sprint and in the AI conversation page',()=>{
 const sprint=page('reflex.html');
 const ai=page('scenes.html');
 const resultSection=sprint.slice(sprint.indexOf('id="endPane"'),sprint.indexOf('id="phrasesPane"'));
 assert.match(resultSection,/href="\.\/contact\.html">感想・改善案を送る/);
 const aipractice=ai.slice(ai.indexOf('id="practice"'),ai.indexOf('</main>'));
 assert.match(aipractice,/href="\.\/contact\.html">感想・改善案を送る/);
 assert.ok(existsSync(new URL('../contact.html',import.meta.url)));
 assert.doesNotMatch(resultSection,/mailto:[^"]*\.ru/);
});

test('contact page provides direct beta email without collecting learner inputs on public GitHub',()=>{
 const contact=page('contact.html');
 assert.match(contact,/無料ベータ版の感想をメールで送る/);
 assert.match(contact,/mailto:odentabetaina\.oden@gmail\.com\?subject=/);
 assert.match(contact,/ログインID・会話内容・個人情報は送らないでください/);
 assert.match(contact,/GitHubのIssueは公開されます/);
 assert.doesNotMatch(contact,/<form[^>]+method="post"/i);
});
