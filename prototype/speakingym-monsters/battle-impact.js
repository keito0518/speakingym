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
