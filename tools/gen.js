// gen.js N seed0 out [linfile] : parties IA vs IA, enregistre (features, tours restants jusqu'à 8 PV)
global.window=global; require('../data.js'); require('../engine.js'); const E=global.MagEngine; const fs=require('fs');
const N=+process.argv[2], S0=+process.argv[3], out=process.argv[4], lin=process.argv[5]?JSON.parse(fs.readFileSync(process.argv[5])):null;
if(lin) E.setLin(lin); if(process.env.VARIANT) E.setVariant(JSON.parse(process.env.VARIANT));
const GOAL=process.env.VARIANT?(JSON.parse(process.env.VARIANT).goal||8):8;
const rows=[]; let rs=0;
for(let g=0;g<N;g++){ const np=2+(g%3===2?1:0)+(g%6===5?1:0);
  let s=E.newGame({players:[...Array(np)].map((_,k)=>({name:'P'+k,ai:true,lvl:3})),seed:S0+g*104729}); let n=0, lastT=0, lastP=-1; const rec=[...Array(np)].map(()=>[]), hit=Array(np).fill(null), own=Array(np).fill(0);
  // exploration : 8% de coups au hasard pour diversifier les positions
  while(!s.over&&n<9000){ if(s.turnNo!==lastT){ if(lastP>=0&&s.turnNo>1){ own[lastP]++; rec[lastP].push({t:own[lastP],f:E.evalFeat(s,lastP)}); if(hit[lastP]===null&&E.vp(s,lastP)>=GOAL) hit[lastP]=own[lastP]; } lastT=s.turnNo; lastP=s.pending.p; }
    const k=Math.random()<0.08?Math.floor(Math.random()*s.pending.opts.length):E.aiChoose(s); E.choose(s,k); n++; }
  rs+=s.turnNo/np;
  for(let p=0;p<np;p++){ const end=hit[p]!==null?hit[p]:own[p]+Math.max(1,(GOAL-E.vp(s,p))*1.6); rec[p].forEach(r=>{ if(hit[p]!==null&&r.t>=hit[p]) return; rows.push(Object.assign({y:end-r.t,np,win:s.winners.includes(p)?1:0},r.f)); }); }
}
fs.writeFileSync(out,JSON.stringify(rows)); console.log(out,rows.length,'rows, rounds',(rs/N).toFixed(2));
