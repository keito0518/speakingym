// Compact synthesized effects, never external audio downloads or automatic
// playback. The player must press the battle sound button to opt in.
// Keep this module independent of save data, grading, combat and rewards.
const SHAPE_TUNING=Object.freeze({
 sword:0,scythe:-85,dagger:140,claw:65,axe:-160,hammer:-80,
 spear:65,bow:160,crossbow:15,staff:45,lantern:-45,shield:-105,
 whip:90,fan:125,flute:195,ring:250
});
const SOUND_PROFILES=Object.freeze({
 sweep:[['sawtooth',680,130,.023,-300],['triangle',460,190,.019,-230]],
 flurry:[['square',820,68,.012,-280],['square',1040,75,.012,-370],['triangle',900,95,.016,-260]],
 crush:[['triangle',210,230,.042,-150],['sawtooth',120,170,.013,-65]],
 thrust:[['sawtooth',740,125,.023,-360],['sine',420,100,.018,-90]],
 shoot:[['triangle',900,200,.020,-420],['sine',1230,125,.011,-520]],
 channel:[['sine',400,270,.018,110],['triangle',590,320,.013,130]],
 pulse:[['sine',650,170,.019,70],['sine',900,205,.013,110]],
 brace:[['triangle',235,260,.032,-80],['sine',480,260,.018,-160]],
 lash:[['sawtooth',980,185,.022,-730],['square',380,82,.010,-180]]
});
const MAX_GAIN=.045;

export function weaponAttackSoundPlan(visual,{ultimate=false}={}){
 const motion=Object.hasOwn(SOUND_PROFILES,visual?.motion)?visual.motion:'sweep';
 const tuning=SHAPE_TUNING[visual?.shape]||0;
 const rank=Math.max(0,Math.min(3,Number(visual?.rank)||0));
 const bonus=visual?.rarity==='legend'?55:visual?.rarity==='epic'?30:0;
 const notes=SOUND_PROFILES[motion].map(([wave,freq,length,gain,slide],index)=>({
  wave,frequency:Math.max(70,freq+tuning+bonus),
  delay:index*(motion==='flurry'?.065:.045),
  duration:length/1000,gain:Math.min(MAX_GAIN,gain),slide
 }));
 if(ultimate){
  notes.push({wave:'sine',frequency:Math.max(180,523+tuning),delay:.13,duration:.38,gain:.022,slide:175});
  notes.push({wave:'triangle',frequency:Math.max(230,784+tuning),delay:.22,duration:.43,gain:.026,slide:100});
 }else if(rank>=2){
  notes.push({wave:'sine',frequency:Math.max(230,820+tuning),delay:.11,duration:.18,gain:.010,slide:80});
 }
 return notes;
}

export function createWeaponBattleSoundPlayer({environment=()=>window}={}){
 let enabled=false,context=null;
 function audioContext(){
  const host=environment();
  const AudioEngine=host.AudioContext||host.webkitAudioContext;
  if(!AudioEngine)return null;
  context||=new AudioEngine();
  if(context.state==='suspended')context.resume?.().catch(()=>{});
  return context;
 }
 function play(visual,{ultimate=false}={}){
  if(!enabled)return false;
  try{
   if(!audioContext())return false;
   const now=context.currentTime;
   for(const note of weaponAttackSoundPlan(visual,{ultimate})){
    const start=now+note.delay,stop=start+note.duration;
    const oscillator=context.createOscillator(),gain=context.createGain();
    oscillator.type=note.wave;
    oscillator.frequency.setValueAtTime(note.frequency,start);
    oscillator.frequency.linearRampToValueAtTime(Math.max(60,note.frequency+note.slide),stop);
    gain.gain.setValueAtTime(.0001,start);
    gain.gain.exponentialRampToValueAtTime(note.gain,start+.025);
    gain.gain.exponentialRampToValueAtTime(.0001,stop);
    oscillator.connect(gain);gain.connect(context.destination);
    oscillator.start(start);oscillator.stop(stop+.02);
   }
   return true;
  }catch{
   // Unsupported/muted devices must never interrupt the learning session.
   return false;
  }
 }
 function setEnabled(value){
  enabled=Boolean(value);
  if(enabled){
   // Must happen in the toggle's direct click handler; iOS Safari may block
   // audio context creation after the asynchronous English grading resolves.
   try{if(!audioContext())enabled=false;}catch{enabled=false;}
  }
  return enabled;
 }
 return {play,setEnabled,isEnabled:()=>enabled};
}
