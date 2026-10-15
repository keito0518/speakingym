/** Presentation-only model for Speakingym's account dashboard.
 * Uses ONLY existing local/cloud-synced training records. Nothing is sent to an API.
 * Figures never infer speaking skill, fluency, or a score from self ratings.
 */
const asArray=v=>Array.isArray(v)?v:[];
const asObject=v=>v&&typeof v==="object"&&!Array.isArray(v)?v:{};
const count=v=>Number.isFinite(Number(v))?Math.max(0,Math.trunc(Number(v))):0;
const dateValue=v=>{
 const d=new Date(v);
 return Number.isFinite(d.getTime())?d:null;
};
const localDay=d=>[
 d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")
].join("-");
const truncate=(v,length=180)=>typeof v==="string"?v.trim().slice(0,length):"";
const days=Object.freeze(["日","月","火","水","木","金","土"]);
export function buildLearningDashboard(snapshot={},now=new Date()){
 const all=asObject(snapshot);
 const reflexStats=asObject(all["speakingym-reflex-stats-v1"]);
 const sceneStats=asObject(all["speakingym-scenes-stats-v1"]);
 const cafeStats=asObject(all["speakingym-survival-stats-v1"]);
 const history=asArray(all["speakingym-reflex-history-v1"]);
 const scenePhrases=asArray(all["speakingym-saved-coaching-v1"]);
 const reflexPhrases=asArray(all["speakingym-reflex-saved-phrases-v1"]);
 const teacherSessions=asArray(all["speakingym-reflex-ai-teacher-v1"]);
 const legacy=asArray(all["speakingym-v01-records"]);
 const validDate=dateValue(now)||new Date();
 const dates=[];
 const today=new Date(validDate.getFullYear(),validDate.getMonth(),validDate.getDate());
 const dayMap=new Map();
 for(let i=6;i>=0;i--){
  const d=new Date(today);d.setDate(d.getDate()-i);
  const key=localDay(d);
  dates.push({key,label:days[d.getDay()],today:i===0,completed:0});
  dayMap.set(key,dates[dates.length-1]);
 }
 for(const session of history){
  const d=dateValue(session?.date);
  if(!d)continue;
  const slot=dayMap.get(localDay(d));
  if(slot)slot.completed++;
 }
 // Historical sprint sessions are intentionally capped by the game (20).
 const activeDays=dates.filter(x=>x.completed>0).length;
 const sevenDaySessions=dates.reduce((n,x)=>n+x.completed,0);
 const phrases=[];
 for(const phrase of reflexPhrases){
  const txt=truncate(phrase?.text,260);
  if(!txt)continue;
  phrases.push({english:txt,subtitle:truncate(phrase?.goal,110)||truncate(phrase?.situation,110),source:"60秒チャレンジ"});
 }
 for(const phrase of scenePhrases){
  const txt=truncate(phrase?.natural,260);
  if(!txt)continue;
  phrases.push({english:txt,subtitle:truncate(phrase?.original,110),source:"AI実戦英会話"});
 }
 const recentTeacher=[];
 for(const lesson of teacherSessions){
  const date=dateValue(lesson?.date);
  for(const note of asArray(lesson?.notes)){
   const feedback=asObject(note?.feedback);
   const praise=truncate(feedback.praise,300),improvement=truncate(feedback.improvement,300);
   const rewrite=truncate(feedback.improved,240);
   if(!praise&&!improvement&&!rewrite)continue;
   recentTeacher.push({date, praise, improvement,rewrite});
  }
 }
 recentTeacher.sort((a,b)=>(b.date?.getTime()||0)-(a.date?.getTime()||0));
 const recentSessions=history.filter(x=>dateValue(x?.date)).sort((a,b)=>(dateValue(b.date)?.getTime()||0)-(dateValue(a.date)?.getTime()||0))
  .slice(0,3).map(s=>({
   date:dateValue(s.date),
   level:["easy","standard","challenge"].includes(s.level)?s.level:"standard",
   total:asArray(s.attempts).filter(a=>a?.outcome==="spoken"||a?.outcome==="stuck").length,
   spoke:asArray(s.attempts).filter(a=>a?.outcome==="spoken").length
  }));
 const sprintCount=count(reflexStats.sessions);
 const phraseCount=reflexPhrases.filter(p=>truncate(p?.text)).length+scenePhrases.filter(p=>truncate(p?.natural)).length;
 const aiCount=count(sceneStats.total);
 const cafeCount=count(cafeStats.attempts);
 return {
  totals:{sprint:sprintCount,phrases:phraseCount,ai:aiCount,cafe:cafeCount,savedSessions:history.length+legacy.length},
  weekly:{days:dates,activeDays,recordedSessions:sevenDaySessions},
  phrases:phrases.slice(0,3),
  recentTeacher:recentTeacher.slice(0,2),
  recentSessions,
  nextAction:phraseCount>0?{title:"保存した英語を、自分の言葉に。",subtitle:"集めたフレーズを声に出して復習しよう",href:"./reflex.html#phrases",label:"フレーズを復習する"}
   :sprintCount>0?{title:"昨日の自分より、あと一言。",subtitle:"今日も60秒、英語の瞬発力を鍛えよう",href:"./reflex.html",label:"60秒を始める"}
   :{title:"最初の60秒から、始めよう。",subtitle:"まずは短いフレーズを声に出してみよう",href:"./reflex.html",label:"60秒を始める"}
 };
}
export function japaneseDate(value){
 const d=dateValue(value);
 if(!d)return "日時不明";
 return (d.getMonth()+1)+"/"+d.getDate();
}
