// A saved-English recap measures this attempt, not permanent proficiency.
// Hints, visible transcripts and revealed examples must never count as
// independent recall. Only the questions that still need practice are retried.
const OUTCOMES=new Set(['independent','supported','review']);
const VALID_DAY=/^\d{4}-\d{2}-\d{2}$/;
function savedReviewStatuses(prompts=[],outcomes=[]){
  const checked=new Map();
  for(const result of outcomes){
    if(result&&typeof result.promptId==='string'&&OUTCOMES.has(result.outcome))
      checked.set(result.promptId,result.outcome);
  }
  return [...new Set(prompts.map(prompt=>prompt.id))]
    .map(id=>({id,outcome:checked.get(id)||'pending'}));
}
export function savedReviewRecap(prompts=[],outcomes=[]){
  const statuses=savedReviewStatuses(prompts,outcomes);
  const independent=statuses.filter(item=>item.outcome==='independent').length;
  const supported=statuses.filter(item=>item.outcome==='supported').length;
  const review=statuses.filter(item=>item.outcome==='review').length;
  const pending=statuses.filter(item=>item.outcome==='pending').length;
  return {
    total:statuses.length,independent,supported,review,pending,
    percentage:statuses.length?Math.round(100*independent/statuses.length):0,
    retryIds:statuses.filter(item=>item.outcome!=='independent').map(item=>item.id)
  };
}

// One small result per exact saved task. No submitted English, answer audio,
// scoring history or additional review schedule is stored.
export function sanitizeSavedReviewHistory(raw,validPromptIds){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return {};
  return Object.fromEntries(Object.entries(raw).filter(([id,row])=>
    validPromptIds.has(id)&&row&&typeof row==='object'&&!Array.isArray(row)&&
    VALID_DAY.test(row.day)&&OUTCOMES.has(row.outcome)).slice(-255)
    .map(([id,row])=>[id,{day:row.day,outcome:row.outcome}]));
}
export function savedReviewTrend(prompts,outcomes,history={},today){
  const result={compared:0,improvedLater:0,improvedToday:0,maintained:0,needsPractice:0};
  for(const {id,outcome} of savedReviewStatuses(prompts,outcomes)){
    const previous=history?.[id];
    if(outcome==='pending'||!previous||!VALID_DAY.test(previous.day)||
      !OUTCOMES.has(previous.outcome)||previous.day>today)continue;
    result.compared++;
    if(outcome==='independent'&&previous.outcome!=='independent'){
      if(previous.day<today)result.improvedLater++;
      else result.improvedToday++;
    }else if(outcome==='independent')result.maintained++;
    else if(previous.outcome==='independent')result.needsPractice++;
  }
  return result;
}
export function rememberSavedReview(save,prompts,outcomes,today){
  if(typeof today!=='string'||!VALID_DAY.test(today))throw Error('Invalid saved-review date');
  const history={...(save.savedReviewHistory||{})};
  for(const {id,outcome} of savedReviewStatuses(prompts,outcomes)){
    if(outcome!=='pending')history[id]={day:today,outcome};
  }
  return {...save,savedReviewHistory:history};
}
