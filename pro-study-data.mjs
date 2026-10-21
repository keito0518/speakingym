/**
 * Speakingym Pro review: privacy-safe, no-AI, no-inferred-proficiency helper.
 * Inputs: existing allow-listed local/cloud-synced learning snapshot only.
 * No network or storage access. Does not grant Pro access.
 */
const array=x=>Array.isArray(x)?x:[];
const safe=x=>typeof x==='string'?x.trim().slice(0,260):'';
const id=x=>safe(x).normalize('NFKC').toLowerCase().replace(/[’]/g,"'").replace(/\s+/g,' ');
const date=x=>{const d=new Date(x);return Number.isFinite(d.getTime())?d:null};
const label=d=>d?[d.getMonth()+1,d.getDate()].join('/'):'日時不明';
function recentWorkouts(snapshot){
 const work=array(snapshot['speakingym-reflex-history-v1']);
 return work.filter(x=>date(x?.date)).sort((a,b)=>date(b.date)-date(a.date));
}
function performance(work){
 let attempted=0,spoken=0;
 for(const w of work)for(const a of array(w.attempts)){
  if(a?.outcome==='spoken'||a?.outcome==='stuck'){
   attempted++;if(a.outcome==='spoken')spoken++;
  }
 }
 return {attempted,spoken,stuck:attempted-spoken};
}
export function buildProStudyPlan(snapshot={},now=new Date()){
 const data=snapshot&&typeof snapshot==='object'&&!Array.isArray(snapshot)?snapshot:{};
 const current=date(now)||new Date();
 const workouts=recentWorkouts(data);
 const recent=performance(workouts.slice(0,5)),previous=performance(workouts.slice(5,10));
 const lastSaved=workouts[0]?date(workouts[0].date):null;
 const weekStart=new Date(current.getFullYear(),current.getMonth(),current.getDate()-6);
 const weekCount=workouts.filter(w=>date(w.date)>=weekStart&&date(w.date)<=current).length;
 const entries=[],seen=new Set();
 const add=(english,hint,origin,priority)=>{
  const text=safe(english);
  if(!text||text.length<2)return;
  const key=id(text);
  if(seen.has(key))return;
  seen.add(key);
  entries.push({id:key,text,hint:safe(hint),origin,priority});
 };
 // Teacher notes reflect actionable changes based on learner responses.
 // Never claim an ability weakness without an actual teacher note.
 for(const session of array(data['speakingym-reflex-ai-teacher-v1']).slice(0,20)){
  for(const n of array(session?.notes).slice(0,5)){
   const feedback=n?.feedback;
   add(feedback?.improved,feedback?.improvement||feedback?.why,'AI先生の言い換え',0);
  }
 }
 for(const p of array(data['speakingym-saved-coaching-v1']).slice(0,20))
  add(p?.natural,p?.original||p?.tip,'AI実践英会話の保存表現',1);
 for(const p of array(data['speakingym-reflex-saved-phrases-v1']).slice(0,100))
  add(p?.text,p?.goal||p?.situation,'60秒チャレンジの保存表現',2);
 // Rotate each group daily to avoid repeatedly presenting oldest expressions.
 const day=Math.floor(Date.UTC(current.getFullYear(),current.getMonth(),current.getDate())/86400000);
 // Mix teacher corrections, saved conversation phrases and Sprint
 // bookmarks when available. An abundant single source must not crowd out
 // the learner's other saved practice categories.
 const groups=[0,1,2].map(priority=>{
  const group=entries.filter(p=>p.priority===priority);
  if(!group.length)return [];
  const offset=day%group.length;
  return group.map((_,i)=>group[(offset+i)%group.length]);
 });
 const cards=[];
 while(cards.length<5&&groups.some(group=>group.length)){
  for(const group of groups){
   if(group.length&&cards.length<5)cards.push(group.shift());
  }
 }
 return {
  cards,totalUniqueExpressions:entries.length,
  report:{
   savedSessions:workouts.length,
   lastSavedPractice:lastSaved?label(lastSaved):null,
   recordedLast7Days:weekCount,
   recent,previous,
   comparison:recent.attempted>0&&previous.attempted>0?
    {recentPct:Math.round(recent.spoken/recent.attempted*100),
     previousPct:Math.round(previous.spoken/previous.attempted*100)}:null
  },
  limits:{
   historyStoredOnly:'保存できた60秒チャレンジの履歴のみを集計しています',
   notProficiency:'言えた/詰まったの自己記録であり、英会話力や発音の評価ではありません'
  },
  suggestion:cards.length?'日本語のヒントから英語を声に出してみよう。':
   '60秒チャレンジで表現を保存するか、AI先生の講評を記録しよう。'
 };
}
