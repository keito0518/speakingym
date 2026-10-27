// Touch-first deterministic forest quiz controls. No third-party services.
const escapeText=value=>String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
export function quizControlsHtml(prompt){
 const advanced=prompt.difficulty!=='easy';
 if(prompt.kind==='vocab')return `<div class="forest-quiz" data-quiz-kind="vocab"><p class="forest-quiz-guide">${advanced?'Find the word that completes the sentence.':'相手の弱点になる単語を選ぼう'}</p><div class="forest-vocab-options" role="group" aria-label="${advanced?'Choose an English word':'英単語を選ぶ'}">${prompt.options.map((option,i)=>`<button type="button" data-vocab-option="${i}" aria-pressed="false">${escapeText(option)}</button>`).join('')}</div></div>`;
 if(prompt.kind==='grammar')return `<div class="forest-quiz" data-quiz-kind="grammar"><p class="forest-quiz-guide">${advanced?'Tap the words to build the sentence.':'単語を順番にタップして魔法の英文を完成させよう'}</p><div id="forest-grammar-built" class="forest-grammar-built" role="status" aria-live="polite">${advanced?'Your sentence will appear here.':'ここに英文ができあがるよ'}</div><div class="forest-grammar-tiles" role="group" aria-label="${advanced?'Arrange the words':'並べ替える単語'}">${prompt.tokens.map((word,i)=>`<button type="button" data-grammar-piece="${i}">${escapeText(word)}</button>`).join('')}</div><div class="forest-grammar-tools"><button type="button" id="forest-grammar-undo">${advanced?'Undo':'1つ戻す'}</button><button type="button" id="forest-grammar-reset">${advanced?'Reset':'最初から'}</button></div></div>`;
 return '';
}
export function wireQuizControls(prompt,container){
 if(prompt.kind==='vocab'){
   const input=container.querySelector('#spoken-answer');
   const buttons=[...container.querySelectorAll('[data-vocab-option]')];
   const sync=()=>buttons.forEach(button=>button.setAttribute('aria-pressed',String(input.value.trim().toLowerCase()===prompt.options[Number(button.dataset.vocabOption)].toLowerCase())));
   buttons.forEach(button=>button.addEventListener('click',()=>{input.value=prompt.options[Number(button.dataset.vocabOption)];sync();}));
   // Typing after choosing an option must not leave a conflicting highlighted answer.
   input.addEventListener('input',sync);
   return;
 }
 if(prompt.kind==='grammar'){
   const input=container.querySelector('#spoken-answer');
   const selected=[],tiles=[...container.querySelectorAll('[data-grammar-piece]')];
   const draw=()=>{
     const phrase=selected.map(i=>prompt.tokens[i]).join(' ');
     input.value=phrase;
     container.querySelector('#forest-grammar-built').textContent=phrase||(prompt.difficulty==='easy'?'ここに英文ができあがるよ':'Your sentence will appear here.');
     tiles.forEach((button,i)=>{
       button.disabled=selected.includes(i);
       button.setAttribute('aria-pressed',String(selected.includes(i)));
     });
   };
   tiles.forEach((button,i)=>button.addEventListener('click',()=>{selected.push(i);draw();}));
   container.querySelector('#forest-grammar-undo').addEventListener('click',()=>{selected.pop();draw();});
   container.querySelector('#forest-grammar-reset').addEventListener('click',()=>{selected.length=0;draw();});
   // Manually typing is still accessible; editing the text clears the tile state
   // so UI and the actual graded answer never silently disagree.
   input.addEventListener('input',()=>{if(selected.length){selected.length=0;tiles.forEach(button=>{button.disabled=false;button.setAttribute('aria-pressed','false');});container.querySelector('#forest-grammar-built').textContent=prompt.difficulty==='easy'?'手入力中':'Typing your answer';}});
   draw();
 }
}
