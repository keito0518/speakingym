// One honest, actionable next step based on the learner's *local* records.
// Unlike a proficiency prediction, these decisions only use scheduled review,
// XP already earned and the authored daily lesson plan.
import { dayKey, EVOLUTION_XP, SECOND_EVOLUTION_XP, getMonsterProgress, savedReviewQueue } from './monster-engine.js';
import { dailyTrainingPlan } from './daily-training.js';
import { retentionOverview } from './retention.js';
import { dueRoleplayTransfers } from './roleplay-transfer.js';
import { nextSkillFocusFor } from './skill-progress.js';

export function nextLearningQuestFor(save,today=dayKey()){
 const transfer=dueRoleplayTransfers(save,today)[0];
 if(transfer)return {
  kind:'transfer',action:'transfer-review',title:'昨日の応用、今度は自力で！',
  detail:`${transfer.prompt.scene}で使う表現を1問だけ復習。例文を見ずに言えるか試そう。`,
  button:'応用の1問を復習'
 };
 const due=retentionOverview(save,today).due;
 if(due.length)return {
  kind:'retention',action:'retention',title:'今日は忘れかけた英語を取り戻そう',
  detail:`復習タイミングが来た表現 ${due.length}件。まず${Math.min(due.length,12)}問を確認しよう。`,
  button:'定着チェックへ'
 };
 const savedDue=savedReviewQueue(save,today).filter(row=>row.due);
 if(savedDue.length)return {
  kind:'saved',action:'saved-due',title:'保存した英語を使える英語に',
  detail:`保存済みのうち、今が復習タイミングの問題 ${savedDue.length}件。`,
  button:'保存した問題を復習'
 };
 const plan=dailyTrainingPlan(save,{today});
 if(plan.counts.review>0)return {
  kind:'review',action:'daily',title:'苦手を倒して、もう一段強く！',
  detail:`今日の8問には復習 ${plan.counts.review}問入り。新しい問題も一緒に練習できるよ。`,
  button:'今日の8問に挑戦'
 };
 const focus=nextSkillFocusFor(save,{difficulty:save.difficulty||'easy',today});
 if(focus)return {
  kind:'skill',action:'skill-focus:'+focus.kind,title:focus.label+'の苦手を取り戻そう',
  detail:focus.detail,button:focus.label+'を集中練習'
 };
 const growth=getMonsterProgress(save,save.selectedMonster);
 const nextEvolution=growth.stage===0?EVOLUTION_XP:growth.stage===1?SECOND_EVOLUTION_XP:null;
 const needed=nextEvolution===null?0:nextEvolution-growth.xp;
 if(nextEvolution!==null&&needed>0&&(save.xpWallet||0)>=needed)return {
  kind:'growth',action:'growth',title:'仲間の進化チャンス！',
  detail:`あと${needed} XPを仲間にあげれば${growth.stage===0?'第1進化':'Lv.7の第2進化'}。手持ちXPで届くよ。`,
  button:'仲間を育てに行く'
 };
 const finishedToday=(save.dailyHistory||[]).some(row=>row.date===today&&row.difficulty===(save.difficulty||'easy'));
 if(finishedToday)return {
  kind:'forest',action:'forest',title:'今日のジムはクリア！ 次は実戦へ',
  detail:'ダンジョンで英語を使って、仲間と次のボスに挑戦しよう。',
  button:'冒険を続ける'
 };
 return {
  kind:'daily',action:'daily',title:'まずは今日の英語を8問',
  detail:'復習・応用・新しい表現をミックス。5分を目安に、自分のペースで。',
  button:'今日の5分ジムへ'
 };
}
