// Pure presentation of a VERIFIED battle result. Combat damage and boss seals
// are calculated elsewhere; the visual cue must never change either value.
export function battleImpactFor({damage=0,ultimate=false,weak=false,pierce=false,resist=false,
  boss=false,sealsBroken=0,sealsTotal=3}={}){
  const amount=Number.isFinite(damage)?Math.max(0,Math.floor(damage)):0;
  const kind=ultimate?'ultimate':pierce?'pierce':weak?'weak':resist?'resist':amount>=4?'heavy':'normal';
  const total=Number.isFinite(sealsTotal)?Math.max(1,Math.floor(sealsTotal)):3;
  const broken=Number.isFinite(sealsBroken)?Math.max(0,Math.min(total,Math.floor(sealsBroken))):0;
  const label=boss
    ?'封印 '+broken+'/'+total+' 解除'
    :kind==='ultimate'?'ULTIMATE'
      :kind==='weak'?'WEAK HIT!'
      :kind==='pierce'?'PIERCE!'
      :kind==='resist'?'RESIST'
      :kind==='heavy'?'POWER HIT':'';
  return {kind,label,damage:amount,damageText:'−'+amount+' DMG'};
}

// A compact, truthful copy of the battle's resolved HP/seal state, placed by
// the answer on small screens where the animated hit may be above the fold.
// This function never changes combat, XP, grading or the underlying save.
export function battlePayoffFor({turn='attack',damage=0,impact='normal',
  enemyHp=0,enemyMax=1,boss=false,sealsBroken=0,sealsTotal=3,
  partyHp=0,partyMax=1,covered=false}={}){
 const clamp=(value,max)=>Math.min(max,Math.max(0,Number.isFinite(value)?Math.floor(value):0));
 const rawMax=turn==='defense'?partyMax:boss?sealsTotal:enemyMax;
 const max=Math.max(1,Number.isFinite(rawMax)?Math.floor(rawMax):1);
 const hp=clamp(turn==='defense'?partyHp:boss?max-sealsBroken:enemyHp,max);
 const amount=clamp(damage,999);
 const defense=turn==='defense';
 const title=defense?(covered?'COVER!':amount?'HIT TAKEN':'GUARD!'):
   boss?'SEAL BREAK!':!hp?'K.O.!':({weak:'WEAK HIT!',pierce:'PIERCE!',ultimate:'ULTIMATE!',resist:'RESIST'}[impact]||'HIT!');
 const amountLabel=defense?(covered?'仲間が援護':amount?`−${amount} HP`:'0 DAMAGE'):
   boss?`封印 ${max-hp}/${max}`:`−${amount} DMG`;
 const remainder=defense?`味方 HP ${hp}/${max}`:boss?`残り封印 ${hp}/${max}`:
   hp?`敵 HP ${hp}/${max}`:'敵を撃破！';
 return {turn:turn==='defense'?'defense':'attack',impact,title,amountLabel,remainder,
  current:hp,max,percent:Math.round(100*hp/max)};
}
