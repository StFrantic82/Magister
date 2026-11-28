global.window=global; require('../data.js'); require('../engine.js'); const E=global.MagEngine;
let found=0, fixed=0, tries=0;
for(let sd=1;sd<=200 && found<15;sd++){
  let s=E.newGame({players:[{name:'H'},{name:'B',ai:true}],seed:sd*31}); let n=0;
  while(!s.over&&n<3000){ const pd=s.pending;
    if(pd && pd.p===0 && pd.kind==='choice' && !pd.opts.some(o=>o.promo) && s.players[0].hand.length){
      tries++;
      const c=JSON.parse(JSON.stringify(s)); const pl=c.players[0];
      // try discarding each book to see if promo becomes possible
      for(let hk=0;hk<pl.hand.length;hk++){ const c2=JSON.parse(JSON.stringify(s)); E.bookAction(c2,0,'disc',hk);
        if(c2.pending&&c2.pending.kind==='choice'){ if(c2.pending.opts.some(o=>o.promo)){ found++; fixed++; } } else if(c2.pending&&c2.pending.p===0&&c2.pending.kind!=='choice'){ /* maybe a sub-choice like ci */ } }
    }
    E.choose(s, E.aiChoose(s)); n++; } }
console.log('choice-with-unaffordable-promo situations:',tries,' book discard made promo appear:',fixed);
