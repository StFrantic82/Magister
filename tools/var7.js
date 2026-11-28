// var7.js variantJSON N lvlA lvlB seed0  -> per-rule metrics (Emeritus, Books, Artist activations, randomness)
global.window=global; require('../data.js'); require('../engine.js'); const E=global.MagEngine;
const VV=JSON.parse(process.argv[2]), N=+process.argv[3], LA=+process.argv[4], LB=+process.argv[5], S0=+(process.argv[6]||0); E.setVariant(VV);
const tok=VV.tok||[3,2], goal=VV.goal||8;
const R={g:0,rounds:0,short8:0,winsA:0,
  em:{first:0,second:0,promoE:0,firstRound:0,firstN:0,emPlayers:0},
  bk:{drawn:0,played:0,wPlayed:0,w4:0,byPlayed:{}},
  act:{tot:0,A:0,wA:0,wTot:0},pl:0, objWin:{first:0,firstW:0}};
for(let g=0;g<N;g++){
  const seatA=g%2;
  let s=E.newGame({players:[0,1].map(k=>({name:'P'+k,ai:true,lvl:k===seatA?LA:LB})),seed:S0+g*7919+11}); let n=0;
  const actA=[0,0], actT=[0,0];
  while(!s.over&&n<9000){ const pd=s.pending; const k=E.aiChoose(s); const o=pd.opts[k];
    if(pd.kind==='choice'&&o&&o.act){ actT[pd.p]++; if(o.act==='A') actA[pd.p]++; }
    E.choose(s,k); n++; }
  const m=E.summary(s,'sim'); R.g++; R.rounds+=m.rounds; if(m.rounds<=8.5) R.short8++;
  const nw=m.players.filter(p=>p.win).length;
  m.players.forEach((p,k)=>{ const w=p.win?1/nw:0; R.pl++;
    if(k===seatA) R.winsA+=w;
    const vals=Object.values(p.em); R.em.first+=vals.filter(v=>v===tok[0]).length; R.em.second+=vals.filter(v=>v===tok[1]).length;
    R.em.promoE+=p.promos.E||0; if(p.first.E!==undefined){ R.em.firstRound+=p.first.E; R.em.firstN++; }
    R.objWin.first+=vals.filter(v=>v===tok[0]).length; R.objWin.firstW+=w*vals.filter(v=>v===tok[0]).length;
    R.bk.drawn+=p.g.b||0; R.bk.played+=p.books.length; const b=Math.min(p.books.length,5); const a=R.bk.byPlayed[b]=R.bk.byPlayed[b]||{n:0,w:0}; a.n++; a.w+=w;
    if(p.win){ R.bk.wPlayed+=w*p.books.length; if(p.books.length>=4) R.bk.w4+=w; }
    R.act.tot+=actT[k]; R.act.A+=actA[k]; R.act.wA+=w*actA[k]; R.act.wTot+=w*actT[k];
  });
}
const f=(x,d=2)=>+x.toFixed(d), pc=x=>(100*x).toFixed(0)+'%';
console.log(JSON.stringify({variant:VV,levels:[LA,LB],games:R.g,rounds:f(R.rounds/R.g),gamesUpTo8Rounds:pc(R.short8/R.g),winRateLevelA:pc(R.winsA/R.g),
 emeritus:{firstTokensPerGame:f(R.em.first/R.g),secondTokensPerGame:f(R.em.second/R.g),promotionsPerPlayer:f(R.em.promoE/R.pl),firstEmeritusRound:f(R.em.firstRound/R.em.firstN,1),winRateOfFirstTokenTakers:pc(R.objWin.firstW/R.objWin.first)},
 books:{drawnPerPlayer:f(R.bk.drawn/R.pl,1),playedPerPlayer:f(R.bk.played/R.pl),playedByWinner:f(R.bk.wPlayed/R.g),winnerPlayed4plus:pc(R.bk.w4/R.g),winRateByBooksPlayed:Object.fromEntries(Object.entries(R.bk.byPlayed).map(([k,a])=>[k,pc(a.w/a.n)+' ('+a.n+')']))},
 artistActivation:{shareOfActivations:pc(R.act.A/R.act.tot),perPlayer:f(R.act.A/R.pl,1),winnerShare:pc(R.act.wA/R.act.wTot)}}));
