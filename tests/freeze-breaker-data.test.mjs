import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SCENE_COMMENTARY_LEVELS,SCENE_COMMENTARY_PHOTOS,SCENE_PHOTO_LICENSE} from '../scene-commentary-data.mjs';

test('scene commentary ships 30 unique real-photo exercises with three meaningful language models each',()=>{
 assert.equal(SCENE_COMMENTARY_PHOTOS.length,30);
 assert.equal(new Set(SCENE_COMMENTARY_PHOTOS.map(s=>s.id)).size,30);
 assert.equal(Object.keys(SCENE_COMMENTARY_LEVELS).length,3);
 for(const scene of SCENE_COMMENTARY_PHOTOS){
  assert.ok(scene.image.startsWith('https://images.unsplash.com/photo-'));
  assert.ok(scene.source.startsWith('https://unsplash.com/photos/'));
  assert.ok(scene.creator.length>2&&scene.alt.length>10&&scene.title.length>2);
  assert.ok(scene.task.length>10&&scene.tip.length>10);
  assert.equal(scene.examples.length,3,`${scene.id} needs three model answers`);
  assert.equal(scene.levelTasks.length,3,`${scene.id} needs three distinct practice purposes`);
  assert.ok(scene.examples.every(line=>line.length>16));
  assert.ok(new Set(scene.examples).size===3);
 }
 assert.equal(SCENE_PHOTO_LICENSE,'https://unsplash.com/license');
});

test('photo tasks develop noticing, cautious inference and contextual sharing rather than translation',()=>{
 assert.match(SCENE_COMMENTARY_LEVELS[1].goal,/見えている/);
 assert.match(SCENE_COMMENTARY_LEVELS[2].goal,/推測/);
 assert.match(SCENE_COMMENTARY_LEVELS[3].goal,/友人/);
 for(const scene of SCENE_COMMENTARY_PHOTOS){
  assert.match(scene.levelTasks[0],/見|人|物|動き|場所|様子/);
  assert.match(scene.levelTasks[1],/推測|理由|状況|かもしれ/);
  assert.match(scene.levelTasks[2],/友人|伝え|提案|共有/);
 }
 const market=SCENE_COMMENTARY_PHOTOS.find(s=>s.title==='車も通る市場');
 assert.match(market.examples[0],/vehicles pass by/);
 assert.match(market.examples[2],/wait before crossing/);
 const rainy=SCENE_COMMENTARY_PHOTOS.find(s=>s.title==='雨の夜道を歩く人');
 assert.match(rainy.examples[0],/umbrellas/);
 assert.match(rainy.examples[2],/walk carefully/);
 const tourists=SCENE_COMMENTARY_PHOTOS.find(s=>s.title==='地図を見ながら観光');
 assert.match(tourists.examples[0],/map/);
 assert.doesNotMatch(tourists.examples[0],/camera/);
 assert.match(tourists.examples[2],/directions/);
});

test('the scene workout has a continuous 30-second speech cycle, honest fallback and no AI/scoring/storage',()=>{
 const html=readFileSync(new URL('../freeze-breaker.html',import.meta.url),'utf8');
 const script=readFileSync(new URL('../scene-commentary.js',import.meta.url),'utf8');
 assert.match(html,/シーン実況チャレンジ/);
 assert.match(html,/60秒チャレンジ/);
 assert.match(html,/30秒チャレンジを始める/);
 assert.match(html,/音声認識なしで続ける/);
 assert.match(html,/同じ写真でもう一度/);
 assert.match(html,/写真の出典/);
 assert.match(html,/保存・送信しません/);
 assert.match(script,/setTimeout\(tick,150\)/);
 assert.match(script,/recognition\.continuous=true/);
 assert.match(script,/event\.resultIndex/);
 assert.match(script,/認識された英文はありません/);
 assert.match(script,/escapeHtml\(text\)/);
 assert.doesNotMatch(script,/\bfetch\s*\(|GEMINI_API_KEY|STRIPE_SECRET|localStorage|sessionStorage|\baccuracy\b|\bfluencyScore\b/i);
 assert.doesNotMatch(html,/日本語を英語に訳|正解はこれ/);
});
