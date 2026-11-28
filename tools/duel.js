// duel.js cfgA cfgB N [nplayers]  — cfg: JSON {plan:1}|{mc:1,sims:6}|{algo:'x'}|{}
global.window=global; require('../data.js'); require('../engine.js'); const E=global.MagEngine;
const A=JSON.parse(process.argv[2]), B=JSON.parse(process.argv[3]), N=+process.argv[4], NP=+(process.argv[5]||2), S0=+(process.argv[6]||0);
const LC={}; if(process.env.VARIANT) E.setVariant(JSON.parse(process.env.VARIANT));
function setup(c){ E.setTree(Object.assign({on:false,iters:120,c:0.6,H:0,S:15,pol:1,kinds:null,deep:1,R:4,fpu:0.15},c.tree||{})); if(c.tree) E.setTree({on:true}); E.setLin(c.lin?(LC[c.lin]=LC[c.lin]||JSON.parse(require('fs').readFileSync(c.lin))):null); E.setAIDepth(c.depth||2); E.setPlan({on:!!c.plan}); E.setMC({on:!!c.mc,sims:c.sims||6}); }
let wa=0,wb=0,r=0,ta=0,tb=0,na=0,nb=0,vpa=0,vpb=0,ra=0,rb=0;
for(let g=1;g<=N;g++){ const seatA=g%NP; 
  let s=E.newGame({players:[...Array(NP)].map((_,k)=>({name:'P'+k,ai:true,lvl:3})),seed:S0+g*7919}); let n=0;
  while(!s.over&&n<9000){ const isA=s.pending.p===seatA; setup(isA?A:B); const t0=process.hrtime.bigint(); const k=E.aiChoose(s); const dt=Number(process.hrtime.bigint()-t0)/1e6; if(isA){ta+=dt;na++;}else{tb+=dt;nb++;} E.choose(s,k); n++; }
  if(g%20===0) process.stderr.write(`${g}:${wa.toFixed(1)} `);
  if(s.winners.includes(seatA)) wa+=1/s.winners.length; else wb+=1; r+=s.turnNo/NP; vpa+=E.vp(s,seatA);
}
const p=wa/N, exp=1/NP, se=Math.sqrt(exp*(1-exp)/N);
console.log(`A ${JSON.stringify(A)} vs B ${JSON.stringify(B)} n=${NP}: A wins ${(100*p).toFixed(1)}% (fair ${(100*exp).toFixed(0)}%, z=${((p-exp)/se).toFixed(2)}) rounds ${(r/N).toFixed(2)} vpA ${(vpa/N).toFixed(2)} ms/dec A ${(ta/na).toFixed(1)} B ${(tb/nb).toFixed(1)}`);
