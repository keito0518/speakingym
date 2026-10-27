// Auditable, task-specific meaning checks. Never infer semantics from mere
// keyword overlap or claim to assess pronunciation.
import { normalizeEnglish } from './monster-engine.js';

const NUMBERS = Object.freeze({five:5,ten:10,fifteen:15,twenty:20,thirty:30});
const NUMBER_WORD = '(?:five|ten|fifteen|twenty|thirty|5|10|15|20|30)';
const numberValue = word => NUMBERS[word] ?? Number(word);
const delayPhrase = new RegExp(`\\b(${NUMBER_WORD}) minutes? (?:late|behind schedule)\\b|\\b(?:delayed|held up) (?:by|for) (${NUMBER_WORD}) minutes?\\b`);
const isLate = text => /\b(?:late|behind schedule|delayed|held up)\b/.test(text);

/**
 * Narrow evaluator for a required arrival delay, not generic AI semantics.
 * `review` means the utterance could be about something else; it is never
 * counted as a wrong spoken answer. No external service is called.
 */
export function gradeDelayMeaning(raw, requiredMinutes){
 const text=normalizeEnglish(raw).replace(/\bi'm going to\b/g,"i'll");
 if(!Number.isInteger(requiredMinutes)||requiredMinutes<=0)throw Error('Invalid delay requirement');
 if(!text)return {status:'review',reasons:['音声を確認できませんでした。もう一度話すか、入力してみよう。']};
 // Negative lateness is the opposite of an affirmative lateness update.
 // "not sure if" expresses uncertainty instead, not a proven contradiction.
 if(/\b(?:i (?:won't|will not|am not|ain't)|i'm not|i cannot|i can't) (?:be |get |arrive |running )?(?:(?:about|around|roughly) )?(?:(?:five|ten|fifteen|twenty|thirty|\d+) minutes? )?late\b/.test(text) ||
    /\b(?:i (?:won't|will not)|i'm not) (?:arrive|get there|be there) (?:late|behind schedule)\b/.test(text))
   return {status:'incorrect',reasons:['「遅れる」を否定すると、伝える意味が逆になります。']};
 if(/\b(?:early|on time)\b/.test(text)&&/\b(?:i|i'll|arrive|be there)\b/.test(text)&&!isLate(text))
   return {status:'incorrect',reasons:['時間どおり・早着は、「遅れる」とは違う意味です。']};
 const match=text.match(delayPhrase);
 if(match){
   const minutes=numberValue(match[1]||match[2]);
   // Time information must concern *the speaker's arrival*, not someone else.
   const speaker=/\b(?:i|i'll|i'm|my arrival|running)\b/.test(text);
   if(!speaker)return {status:'review',reasons:['誰が遅れるのか明確にしてみよう。']};
   if(/\b(?:not sure|don't know|might|maybe|perhaps|if)\b/.test(text))
     return {status:'review',reasons:['遅れる見込みが確定しているか確認しよう。']};
   if(minutes!==requiredMinutes)
     return {status:'incorrect',reasons:[`指定された${requiredMinutes}分と、回答の${minutes}分が異なります。`]};
   return {status:'correct',reasons:[]};
 }
 if(isLate(text)&&/\b(?:i|i'll|i'm|my arrival)\b/.test(text))
   return {status:'incomplete',reasons:[`遅れることは伝わります。何分遅れるか（${requiredMinutes}分）を付け加えよう。`]};
 return {status:'review',reasons:['「何分遅れるか」が相手に伝わるか確認しよう。到着までの時間と、遅刻する時間は別です。']};
}
