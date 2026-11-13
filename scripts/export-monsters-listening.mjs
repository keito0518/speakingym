// Read the authoritative listening curriculum; never duplicate transcripts in
// a hand-maintained audio table.
import { ALL_PROMPTS } from '../prototype/speakingym-monsters/monster-data.js';
import { listeningChallengeFor } from '../prototype/speakingym-monsters/listening-challenges.js';

const catalog=ALL_PROMPTS.filter(prompt=>prompt.kind==='listen').map(prompt=>({
  id:prompt.id,
  sceneId:prompt.baseId||prompt.id,
  level:prompt.difficulty||'easy',
  text:listeningChallengeFor(prompt).audio
}));
if(new Set(catalog.map(item=>item.id)).size!==catalog.length)throw Error('Duplicate listening id');
if(catalog.some(item=>!item.text||!/^[a-z0-9-]+$/.test(item.id)))throw Error('Invalid listening catalog');
process.stdout.write(JSON.stringify(catalog));
