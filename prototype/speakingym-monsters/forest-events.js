// A single optional story detour at the last regular encounter of each chapter.
// Outcomes are cosmetic; neither selection can award XP, grade English or
// bypass an authored task. Route and chapter produce distinct scenes.
const make=(id,title,story,options)=>Object.freeze({
 id,title,story,options:Object.freeze(options.map(o=>Object.freeze(o)))
});
export const FOREST_EVENTS=Object.freeze({
 entry:Object.freeze({
  sunlit:make('entry-sunlit','陽だまりの古い道しるべ',
   '道しるべが二つに割れている。文字の下に、小さな足あとが残っていた。',[
    {id:'inspect',label:'文字を確かめる',detail:'欠けた看板をそっと組み合わせる',outcome:'「よく聞く者に森は道を開く」と刻まれていた。仲間はトゲ王の声に耳をすませる。',memento:'古い道しるべの言葉'},
    {id:'follow',label:'足あとを追う',detail:'草むらの向こうを調べる',outcome:'小さな足あとが広場へ続いていた。仲間はトゲ王の気配を先に見つける。',memento:'小さな足あと'}
   ]),
  moss:make('entry-moss','光るキノコの輪',
   'キノコが輪になって淡く光っている。森の奥から声が響いた。',[
    {id:'listen',label:'声を聞いてみる',detail:'立ち止まり、響く音に耳をすます',outcome:'声は岩に反射していた。仲間は反響する音の方向を覚えた。',memento:'こだまする声'},
    {id:'observe',label:'灯りを観察する',detail:'光の順番をたどってみる',outcome:'キノコの光が奥へ伝わっていく。仲間は森の秘密の合図を発見した。',memento:'キノコの合図'}
   ])
 }),
 glade:Object.freeze({
  sunlit:make('glade-sunlit','旅人の落とした地図',
   '木の枝に地図が引っかかっていた。陽の当たる道が一本だけ描かれている。',[
    {id:'restore',label:'地図を広げる',detail:'折れた部分を直して道を確かめる',outcome:'地図には「まず相手の話を聞く」と書かれていた。光の番人の試練を思い出す。',memento:'旅人の地図'},
    {id:'return',label:'持ち主を探す',detail:'地図の落ちた場所を調べる',outcome:'地図の裏に「ありがとう」の文字。仲間は旅人の歩いた道を見つけた。',memento:'旅人の足跡'}
   ]),
  moss:make('glade-moss','木陰の小さな郵便箱',
   '苔に埋もれた郵便箱には、誰かの書きかけの手紙があった。',[
    {id:'read',label:'手紙の宛先を確かめる',detail:'名前の部分だけ丁寧に読む',outcome:'宛先には「光を探す友だちへ」。仲間は光の番人の物語を知った。',memento:'友だちへの手紙'},
    {id:'protect',label:'雨よけを作る',detail:'葉で郵便箱を守る',outcome:'葉の雨よけが完成した。風に揺れる葉が光の番人への道を指した。',memento:'葉っぱの雨よけ'}
   ])
 }),
 thicket:Object.freeze({
  sunlit:make('thicket-sunlit','霧に消える標識',
   '明るい道にも霧が入り込んでいる。標識の文字が半分消えていた。',[
    {id:'trace',label:'文字をなぞる',detail:'残った文章を落ち着いて確かめる',outcome:'途切れた文章の向こうに、霧の騎士の古い紋章が浮かんだ。',memento:'古い騎士の紋章'},
    {id:'scout',label:'周りの道を調べる',detail:'同じ標識がないか探す',outcome:'別の標識を見つけた。二つを見比べると、霧の奥に道が見えた。',memento:'二つの標識'}
   ]),
  moss:make('thicket-moss','霧の中の壊れたランタン',
   '静かな抜け道で小さなランタンを見つけた。灯りはつかない。',[
    {id:'repair',label:'ランタンを直す',detail:'割れたガラスを安全な場所に置く',outcome:'灯りが弱くとも戻った。仲間の影が霧の向こうへ伸びる。',memento:'戻った小さな灯り'},
    {id:'mark',label:'目印を残す',detail:'道を見失わないよう石を並べる',outcome:'石の目印ができた。仲間は霧の中でも来た道を思い出せる。',memento:'石の道しるべ'}
   ])
 }),
 sanctuary:Object.freeze({
  sunlit:make('sanctuary-sunlit','古木の年輪',
   '地面からのぞく古い切り株に、星のような模様が刻まれていた。',[
    {id:'count',label:'年輪をたどる',detail:'模様が続く向きを確かめる',outcome:'年輪は聖域の中心へ向かっていた。仲間は古木の長い歴史を感じた。',memento:'星模様の年輪'},
    {id:'rest',label:'木のそばで休む',detail:'深呼吸し、森の音を聞く',outcome:'木々のざわめきが静まった。仲間は守護者の声を待つことにした。',memento:'聖域の静けさ'}
   ]),
  moss:make('sanctuary-moss','根元に眠る小石',
   '根元に三つの小石が並び、その上だけ苔が生えていない。',[
    {id:'arrange',label:'小石を並べ直す',detail:'模様を壊さず並びを確かめる',outcome:'石は古木の葉と同じ形になった。仲間は守護者への道を感じ取る。',memento:'葉の形の石'},
    {id:'leave',label:'そのまま見守る',detail:'足元を傷つけずに観察する',outcome:'木の根が小さく動いたように見えた。仲間は自然の静けさを大切にした。',memento:'木の根のささやき'}
   ])
});
export function forestEventFor({areaId='entry',route=null,index=-1}={}){
 if(index!==4)return null;
 return FOREST_EVENTS[areaId]?.[route]||null;
}
export function forestEventChoice(event,choiceId){
 if(!event||typeof choiceId!=='string')return null;
 return event.options.find(x=>x.id===choiceId)||null;
}
