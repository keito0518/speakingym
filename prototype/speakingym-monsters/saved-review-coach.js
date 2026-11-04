// A saved-English recap measures this attempt, not permanent proficiency.
// Hints, visible transcripts and revealed examples must never count as
// independent recall. Only the questions that still need practice are retried.
export function savedReviewRecap(prompts=[],outcomes=[]){
  const checked=new Map();
  for(const result of outcomes){
    if(result&&typeof result.promptId==='string'&&
        ['independent','supported','review'].includes(result.outcome))
      checked.set(result.promptId,result.outcome);
  }
  const ids=[...new Set(prompts.map(prompt=>prompt.id))];
  const statuses=ids.map(id=>({id,outcome:checked.get(id)||'pending'}));
  const independent=statuses.filter(item=>item.outcome==='independent').length;
  const supported=statuses.filter(item=>item.outcome==='supported').length;
  const review=statuses.filter(item=>item.outcome==='review').length;
  const pending=statuses.filter(item=>item.outcome==='pending').length;
  return {
    total:ids.length,independent,supported,review,pending,
    percentage:ids.length?Math.round(100*independent/ids.length):0,
    retryIds:statuses.filter(item=>item.outcome!=='independent').map(item=>item.id)
  };
}
