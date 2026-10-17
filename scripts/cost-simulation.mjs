// Illustrative token budgets, not production measurements. JPY/USD is an assumption.
const fx=Number(process.env.SG_USDJPY||150),price=680,fee=price*(.036+.007);
const cost=(input,outputAndThinking)=>(input*.30+outputAndThinking*2.50)/1e6*fx;
const scenarios={typical:{turn:cost(1200,150),coaching:cost(2500,1400)},heavy:{turn:cost(2000,2000),coaching:cost(4000,2200)}};
for(const [name,s] of Object.entries(scenarios)){
 const proAi=600*s.turn+100*s.coaching;
 const freeAi=31*(5*20*s.turn+3*s.coaching);
 console.log(JSON.stringify({scenario:name,assumedUsdJpy:fx,turn:s.turn,coaching:s.coaching,proAi,freeAiMaximum31Days:freeAi,stripe:fee,contributionPerPro:price-fee-proAi,
 members:[10,50,100,500].map(n=>({pro:n,revenue:n*price,contribution:n*(price-fee-proAi),withTenMaxedFreeUsers:n*(price-fee-proAi)-10*freeAi}))},null,2));
}
