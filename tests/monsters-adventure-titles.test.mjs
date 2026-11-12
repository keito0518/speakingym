import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FOREST_AREAS,CITY_AREAS,RUINS_AREAS} from '../prototype/speakingym-monsters/forest-engine.js';
import {adventureTitleProgress} from '../prototype/speakingym-monsters/monster-collection.js';

const ids=areas=>areas.map(area=>area.id);
const progress=completedAreas=>adventureTitleProgress({completedAreas});

test('all six adventure titles are attainable through the current ten chapters',()=>{
  const forest=ids(FOREST_AREAS),city=ids(CITY_AREAS),ruins=ids(RUINS_AREAS);
  assert.deepEqual(progress([]).map(title=>title.earned),[false,false,false,false,false,false]);
  assert.deepEqual(progress(forest.slice(0,1)).map(title=>title.earned),[true,false,false,false,false,false]);
  assert.deepEqual(progress(forest.slice(0,2)).map(title=>title.earned),[true,true,false,false,false,false]);
  assert.deepEqual(progress(forest).map(title=>title.earned),[true,true,true,false,false,false]);
  assert.deepEqual(progress([...forest,...city.slice(0,2)]).map(title=>title.earned),[true,true,true,true,false,false]);
  assert.deepEqual(progress([...forest,...city,...ruins.slice(0,1)]).map(title=>title.earned),[true,true,true,true,true,false]);
  assert.deepEqual(progress([...forest,...city,...ruins]).map(title=>title.earned),[true,true,true,true,true,true]);
  assert.equal(progress([]).length,6);
});

test('obsolete route choices cannot unlock titles in an uncompleted adventure',()=>{
  const oldSave={completedAreas:[],routes:['sunlit','moss'],journal:Array.from({length:16},(_,i)=>({eventId:String(i)}))};
  assert.equal(adventureTitleProgress(oldSave).filter(title=>title.earned).length,0);
  assert.ok(adventureTitleProgress(oldSave).every(title=>!/分かれ道|選択|イベント/.test(title.goal)));
});

// Public profile links must describe the game players actually reach, not an
// obsolete 60-second-only app. The prototype remains unindexed until GO.
test('release preview metadata is accurate and links do not imply progress sync',()=>{
  const html=readFileSync(new URL('../prototype/speakingym-monsters/index.html',import.meta.url),'utf8');
  const js=readFileSync(new URL('../prototype/speakingym-monsters/monsters.js',import.meta.url),'utf8');
  assert.match(html,/<meta name="description" content="[^"]*Englishダンジョン[^"]*">/);
  assert.match(html,/<meta property="og:title" content="Speakingym Monsters[^"]*">/);
  assert.match(html,/<meta property="og:description" content="[^"]*無料[^"]*開発版[^"]*">/);
  assert.match(html,/<meta name="robots" content="noindex,nofollow">/,
    'Do not expose unfinished prototype to indexing before launch approval');
  assert.match(html,/別ドメインや別ブラウザ（Safari／LINE内ブラウザ）へ進捗は自動で移りません/);
  assert.match(js,/記録はこのブラウザ・サイトに保存されます（別ドメイン・別ブラウザへ自動同期しません）/);
});
