/**
 * Public, no-login interactive *sample* of Pro spaced review.
 * Example phrases only, ephemeral in-memory grading, zero API/payment calls.
 * This cannot unlock Pro or alter a real account's saved learning history.
 */
import {buildProStudyPlan,markReview,reviewDay} from './pro-study-data.mjs';

const SAMPLE=Object.freeze({
 'speakingym-reflex-ai-teacher-v1':[{notes:[
  {feedback:{improved:'Could you say that a little more slowly?',improvement:'もう少しゆっくり話してほしい'}},
  {feedback:{improved:'Would it be possible to check in early?',improvement:'早めのチェックインをお願いする'}}
 ]}],
 'speakingym-saved-coaching-v1':[
  {natural:'Could you recommend a local restaurant?',original:'地元のおすすめレストランを教えて'}
 ],
 'speakingym-reflex-saved-phrases-v1':[
  {text:'Could I get this to go, please?',goal:'持ち帰りでお願いします'},
  {text:'I am just looking, thank you.',goal:'見ているだけです、ありがとう'},
  {text:'Could I have the bill, please?',goal:'お会計をお願いします'}
 ]
});
const $=id=>document.getElementById(id);
const make=(tag,value,klass)=>{
 const el=document.createElement(tag);
 if(value!==undefined)el.textContent=value;
 if(klass)el.className=klass;
 return el;
};
const TODAY=new Date();
let offset=0,progress={},undoStep=null;
const currentDate=()=>new Date(TODAY.getTime()+offset*86400000);

function render(){
 const view=buildProStudyPlan(SAMPLE,currentDate(),progress),stats=view.reviewSummary;
 $('demo-day').textContent=reviewDay(currentDate())+'（練習'+(offset+1)+'日目の例）';
 $('demo-undo').hidden=!undoStep;
 $('demo-next-day').disabled=offset>=30;
 const list=$('demo-review-list');list.replaceChildren();
 for(const [index,card] of view.cards.entries()){
  const li=make('li',undefined,'review-card');
  const top=make('div',undefined,'review-top');
  top.append(make('span',(index+1)+' / '+view.cards.length),
   make('span',card.origin));
  const answer=make('p',card.text,'answer');answer.hidden=true;answer.lang='en';
  const reveal=make('button','答えを見る');reveal.type='button';
  reveal.setAttribute('aria-expanded','false');
  reveal.addEventListener('click',()=>{
   answer.hidden=!answer.hidden;
   reveal.setAttribute('aria-expanded',String(!answer.hidden));
   reveal.textContent=answer.hidden?'答えを見る':'答えを隠す';
  });
  const remembered=make('button','言えた ✓');
  remembered.type='button';
  remembered.setAttribute('aria-label','言えた：'+card.text);
  const retry=make('button','まだ苦手 ↻','retry');
  retry.type='button';
  retry.setAttribute('aria-label','まだ苦手：'+card.text);
  const record=outcome=>{
   const previous=progress;
   progress=markReview(progress,card.id,outcome,currentDate());
   undoStep={previous,offset};
   render();
   $('demo-review-status').textContent=outcome==='remembered'?
    'いいね！次の復習日にもう一度挑戦しよう。':
    '大丈夫！明日また練習してみよう。';
  };
  remembered.addEventListener('click',()=>record('remembered'));
  retry.addEventListener('click',()=>record('retry'));
  const actions=make('div',undefined,'actions');
  actions.append(reveal,remembered,retry);
  li.append(top,make('p',card.hint||'声に出して言ってみよう。','review-hint'),
   answer,actions);
  list.append(li);
 }
 if(!view.cards.length)list.append(make('li',
  '今日の復習はおしまい！「翌日を試す」で次の練習を確認できるよ。','review-card'));
 const plan=$('demo-plan');plan.replaceChildren();
 for(const item of view.dailyPlan){
  const li=make('li');li.append(make('strong',item.title),make('p',item.detail,'small'));
  plan.append(li);
 }
 const values=[
  [stats.attemptedToday,'今日の復習回数'],
  [stats.rememberedToday,'今日「言えた」'],
  [stats.streak+'日','連続の復習記録'],
  [stats.mastered,'3段階以上進んだ表現'],
  [stats.due,'今、復習できる表現'],
  [stats.nextDue||'なし','次の予定日']
 ];
 const root=$('demo-stats');root.replaceChildren();
 for(const [value,label] of values){
  const el=make('div',undefined,'stat');
  el.append(make('strong',String(value)),make('small',label));root.append(el);
 }
}
$('demo-next-day').addEventListener('click',()=>{
 if(offset>=30)return;
 offset++;undoStep=null;render();
 $('demo-review-status').textContent='体験の日付を1日進めました。実際の学習記録には影響しません。';
});
$('demo-reset').addEventListener('click',()=>{
 offset=0;progress={};undoStep=null;render();
 $('demo-review-status').textContent='体験版の記録をリセットしました。';
});
$('demo-undo').addEventListener('click',()=>{
 if(!undoStep||undoStep.offset!==offset)return;
 progress=undoStep.previous;undoStep=null;render();
 $('demo-review-status').textContent='直前の記録を取り消したよ。もう一度選んでみよう。';
});
render();
