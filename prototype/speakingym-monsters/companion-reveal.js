const RARITY_PRIORITY = Object.freeze({legend:3,epic:2,rare:1});
const RARITY_LABELS = Object.freeze({legend:'LEGENDARY',epic:'EPIC',rare:'RARE'});

// Only a genuinely earned, currently owned companion may appear in the
// results spotlight. Keep recruitment rules in monster-engine.js; this is
// presentation data and must never grant creatures or experience.
export function companionRevealFor(capturedIds,ownedIds,roster){
  if(!Array.isArray(capturedIds)||!Array.isArray(ownedIds)||!Array.isArray(roster))return [];
  const owned=new Set(ownedIds),byId=new Map(roster.map(monster=>[monster.id,monster]));
  const seen=new Set();
  return capturedIds.flatMap(id=>{
    if(seen.has(id)||!owned.has(id)||!byId.has(id))return [];
    seen.add(id);
    const monster=byId.get(id),rarity=RARITY_PRIORITY[monster.rarity]?monster.rarity:'normal';
    const root=monster.roots?.[0];
    return [{id,name:monster.name,japaneseName:monster.japaneseName,kind:monster.kind,
      rarity,rarityLabel:RARITY_LABELS[rarity]||'NEW FRIEND',
      rootWord:root?.word||'',rootMeaning:root?.meaning||''}];
  }).sort((a,b)=>(RARITY_PRIORITY[b.rarity]||0)-(RARITY_PRIORITY[a.rarity]||0));
}

// Keep a real reward ABOVE the collapsed learning report. Construct text with
// textContent so authored names/word roots never become injectable HTML.
export function renderCompanionSpotlight(container,companions,artFor){
  container.replaceChildren();
  container.hidden=companions.length===0;
  if(!companions.length)return;
  const doc=container.ownerDocument;
  const element=(tag,cls,content)=>{
    const node=doc.createElement(tag);
    if(cls)node.className=cls;
    if(content!==undefined)node.textContent=content;
    return node;
  };
  const heading=element('div','companion-reveal-heading');
  heading.append(
    element('span','tiny-caps','NEW COMPANIONS · '+companions.length+' JOINED'),
    element('h2','', '新しい仲間が加わった！'),
    element('p','', '英語の冒険と復習で出会えた仲間。図鑑で名前の由来と育て方を見てみよう。')
  );
  const grid=element('div','companion-reveal-grid');
  for(const creature of companions){
    const card=element('article','companion-reveal-card');
    card.dataset.rarity=creature.rarity;
    const art=element('div','companion-reveal-art');
    art.innerHTML=artFor(creature.id);
    const info=element('div','companion-reveal-info');
    const name=element('strong','',creature.name);
    name.lang='en';
    info.append(
      element('span','companion-reveal-rarity',creature.rarityLabel),
      name,
      element('small','',creature.japaneseName+' · '+creature.kind)
    );
    if(creature.rootWord){
      const root=element('p');
      const word=element('b','',creature.rootWord);
      word.lang='en';
      root.append(word,doc.createTextNode(' = '+creature.rootMeaning));
      info.append(root);
    }
    const button=element('button','button companion-reveal-open',creature.name+'の図鑑を見る');
    button.type='button';
    button.dataset.resultCompanion=creature.id;
    info.append(button);
    card.append(art,info);
    grid.append(card);
  }
  container.append(heading,grid);
}
