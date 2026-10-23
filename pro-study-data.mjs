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

const DAY_MS=86400000;
const validDay=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&
 !Number.isNaN(Date.parse(value+'T00:00:00Z'))&&
 new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
export function reviewDay(now=new Date()){
 const d=date(now)||new Date();
 return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
}
const plusDays=(day,days)=>new Date(Date.parse(day+'T00:00:00Z')+days*DAY_MS).toISOString().slice(0,10);
const cleanCount=n=>Number.isSafeInteger(n)&&n>=0?Math.min(n,100000):0;
// Local-only review metadata. Never grants Pro access or infers spoken proficiency.
export function normalizeReviewProgress(raw){
 const source=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
 const cards=Object.create(null),days=Object.create(null);
 const originalCards=source.cards&&typeof source.cards==='object'&&!Array.isArray(source.cards)?source.cards:{};
 for(const [key,value] of Object.entries(originalCards).slice(-120)){
  if(!key||key.length>260||!value||typeof value!=='object'||Array.isArray(value))continue;
  if(!Number.isInteger(value.stage)||value.stage<0||value.stage>5||!validDay(value.due))continue;
  cards[key]={
   stage:value.stage,due:value.due,attempts:cleanCount(value.attempts),
   remembered:cleanCount(value.remembered),last:validDay(value.last)?value.last:value.due
  };
 }
 const originalDays=source.days&&typeof source.days==='object'&&!Array.isArray(source.days)?source.days:{};
 for(const [key,value] of Object.entries(originalDays).slice(-60)){
  if(!validDay(key)||!value||typeof value!=='object'||Array.isArray(value))continue;
  days[key]={attempted:cleanCount(value.attempted),remembered:cleanCount(value.remembered)};
 }
 return {version:1,cards,days};
}
// Spaced reviews after successful recall: 1, 3, 7, 14, 30 days.
// "Still learning" revisits tomorrow. Every action is a self-report.
export function markReview(raw,cardId,outcome,now=new Date()){
 const state=normalizeReviewProgress(raw);
 if(typeof cardId!=='string'||!cardId||cardId.length>260||
    !['remembered','retry'].includes(outcome))return state;
 const today=reviewDay(now),previous=state.cards[cardId];
 // Ignore duplicated button clicks or replayed UI events on the same day.
 if(previous?.last===today)return state;
 const stage=outcome==='remembered'?Math.min(5,(previous?.stage||0)+1):0;
 const spacing=[0,1,3,7,14,30][stage]||1;
 state.cards[cardId]={
  stage,due:plusDays(today,spacing),last:today,
  attempts:Math.min(100000,(previous?.attempts||0)+1),
  remembered:Math.min(100000,(previous?.remembered||0)+(outcome==='remembered'?1:0))
 };
 const daily=state.days[today]||{attempted:0,remembered:0};
 state.days[today]={
  attempted:Math.min(100000,daily.attempted+1),
  remembered:Math.min(100000,daily.remembered+(outcome==='remembered'?1:0))
 };
 // Keep review state bounded as the learner saves more expressions.
 return normalizeReviewProgress(state);
}
export function summarizeReviews(raw,entries=[],now=new Date()){
 const state=normalizeReviewProgress(raw),today=reviewDay(now);
 const reviewed=entries.filter(item=>state.cards[item.id]);
 const due=entries.filter(item=>!state.cards[item.id]||state.cards[item.id].due<=today);
 const future=reviewed.map(item=>state.cards[item.id].due).filter(day=>day>today).sort();
 const recentDays=Array.from({length:7},(_,i)=>plusDays(today,-i));
 const thisWeek=recentDays.reduce((total,day)=>total+(state.days[day]?.attempted||0),0);
 const doneToday=state.days[today]||{attempted:0,remembered:0};
 let streak=0,start=today;
 if(!(state.days[today]?.attempted>0))start=plusDays(today,-1);
 for(let i=0;i<60;i++){
  if(!(state.days[start]?.attempted>0))break;
  streak++;start=plusDays(start,-1);
 }
 return {
  due:due.length,seen:reviewed.length,mastered:reviewed.filter(item=>state.cards[item.id].stage>=3).length,
  attemptedToday:doneToday.attempted,rememberedToday:doneToday.remembered,
  attemptedLast7Days:thisWeek,streak,nextDue:future[0]||null
 };
}

export function buildProStudyPlan(snapshot={},now=new Date(),reviewProgress={}){
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
 const today=reviewDay(current);
 const review=normalizeReviewProgress(reviewProgress);
 // Future reviews are hidden until their due day; new expressions are due now.
 const eligible=entries.filter(p=>!review.cards[p.id]||review.cards[p.id].due<=today);
 // Mix teacher corrections, saved conversation phrases and Sprint
 // bookmarks when available. An abundant single source must not crowd out
 // the learner's other saved practice categories.
 const groups=[0,1,2].map(priority=>{
  const group=eligible.filter(p=>p.priority===priority);
  if(!group.length)return [];
  const due=group.filter(p=>!!review.cards[p.id]).sort((a,b)=>
   review.cards[a.id].due.localeCompare(review.cards[b.id].due));
  const fresh=group.filter(p=>!review.cards[p.id]);
  const offset=fresh.length?day%fresh.length:0;
  return [...due,...fresh.map((_,i)=>fresh[(offset+i)%fresh.length])];
 });
 const cards=[];
 while(cards.length<5&&groups.some(group=>group.length)){
  for(const group of groups){
   if(group.length&&cards.length<5)cards.push(group.shift());
  }
 }
 const reviewSummary=summarizeReviews(review,entries,current);
 const dailyPlan=[
  {title:'1分：今日の復習',detail:cards.length?
    '期限が来た表現から3つ選んで声に出そう。覚えていたかを記録してね。':
    '今日は復習の期限が来ていないよ。前に保存した表現を確認しよう。',href:null},
  {title:'1分：60秒チャレンジ',detail:'復習した表現を意識しながら、別のお題にも答えてみよう。',href:'./reflex.html'},
  {title:'3分：AI実践英会話',detail:cards.length?
    'まず「'+cards[0].text+'」を場面に合う形で使ってみよう。':
    '今日は好きなシーンで短い会話に挑戦しよう。',href:'./scenes.html'}
 ];
 return {
  cards,totalUniqueExpressions:entries.length,reviewSummary,dailyPlan,
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
  suggestion:cards.length?'期限が来た表現を3つ復習して、60秒チャレンジやAI会話で使ってみよう。':
   reviewSummary.nextDue?'次の復習予定：'+reviewSummary.nextDue+'。今日は60秒チャレンジに挑戦しよう。':
   '60秒チャレンジで表現を保存するか、AI先生の講評を記録しよう。'
 };
}
