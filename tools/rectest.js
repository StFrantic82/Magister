global.window=global; require('../data.js'); require('../engine.js'); const E=global.MagEngine;
const st={};
for(let sd=1;sd<=+process.argv[2];sd++){ let s=E.newGame({players:[{name:'A',ai:true},{name:'B',ai:true}],seed:sd*7907}); let n=0; while(!s.over&&n<8000){E.choose(s,E.aiChoose(s));n++;}
 const sm=E.summary(s,'sim'); Object.values(s.rectSlotsInit).forEach(id=>{ const r=st[id]=st[id]||{inplay:0,taken:0,win:0}; r.inplay++; });
 s.players.forEach((pl,k)=>{ if(pl.rector){ const r=st[pl.rector.tile]; r.taken++; if(s.winners.includes(k)) r.win++; } });
 if(n>=8000) console.log('STUCK',sd); }
console.log('tuile  en_jeu  prise  victoire_si_prise');
Object.entries(st).sort().forEach(([k,r])=>console.log(k.padEnd(5),String(r.inplay).padStart(6),(100*r.taken/r.inplay).toFixed(0).padStart(5)+'%',(r.taken?(100*r.win/r.taken).toFixed(0)+'%':'—').padStart(10)));
