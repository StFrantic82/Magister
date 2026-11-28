global.window=global; require('../data.js'); require('../engine.js'); const E=global.MagEngine;
const D=global.MAG; const is2=id=>D.DECK2.includes(id); const fails=[]; let copies=0, withUnder=0, oppDiff=0, keptOwn=0, resampled=0, games=0, lis=0;
const ck=(c,m)=>{ if(!c) fails.push(m); };
const sorted=a=>a.slice().sort((x,y)=>x-y).join(',');
for(let g=0; g<30; g++){
  const np=2+g%3; E.setTree({on:true,iters:120});
  let s=E.newGame({players:[...Array(np)].map((_,k)=>({name:'P'+k,ai:true,lvl:3})),seed:g*7919+3,countries:['POR',['ITA','FRA','ENG','SPA','GER','BYZ','MOR','SLK'][g%8],['MOR','SLK','GER'][g%3]===['ITA','FRA','ENG','SPA','GER','BYZ','MOR','SLK'][g%8]?'FRA':['MOR','SLK','GER'][g%3]]});
  let n=0; games++;
  while(!s.over && n<9000){
    const before=JSON.stringify(s), me=s.pending.p;
    if(n%3===0){
      const c=E.hiddenClone(s); copies++;
      ck(c.deck.length===s.deck.length,'deck size');
      ck(sorted(c.deck.concat(c.l2Out||[]))===sorted(s.deck.concat(s.l2Out||[])),'student cards');
      const under=(s.under||[]).filter(u=>s.deck.includes(u.id)), k=s.deck.length-under.length;
      for(let i=0;i<k;i++) ck(is2(c.deck[i])===is2(s.deck[i]),'level position');
      if(under.length) withUnder++;
      under.forEach((u,i)=>{ if(u.p===me){ ck(c.deck[k+i]===u.id,'own Lisboa card kept'); keptOwn++; } else resampled++; });
      const allB=a=>sorted(a.bookDeck.concat(...a.players.map(p=>p.hand)));
      ck(allB(c)===allB(s),'book cards');
      ck(c.players[me].hand.join()===s.players[me].hand.join(),'own hand');
      c.players.forEach((p,k)=>{ ck(p.hand.length===s.players[k].hand.length,'hand size'); if(k!==me && p.hand.join()!==s.players[k].hand.join()) oppDiff++; });
      ck(JSON.stringify(s)===before,'real state untouched');
    }
    const k=E.aiChoose(s); ck(JSON.stringify(s)===before,'aiChoose leaves state untouched');
    const t=s.pending&&s.pending.task; E.choose(s,k); n++;
  }
  lis+=s.log.filter(m=>m&&m.m==='log_lisboa').length;
}
console.log({games,copies,withUnder,keptOwn,resampled,oppDiff,lisboa:lis,fails:fails.length,first:[...new Set(fails)].slice(0,5)});
