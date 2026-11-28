global.window=global; require('../data.js'); require('../engine.js'); const E=global.MagEngine; const D=global.MAG;
const el=D.cards.filter(c=>JSON.stringify(c.H).includes('elim'));
console.log('elim cards:',el.map(c=>c.id+' '+c.name+' '+JSON.stringify(c.H)).join('\n'));
for(const c of el){
  let s=E.newGame({players:[{name:'H'},{name:'B',ai:true}],seed:11}); let n=0;
  while(!(s.pending&&s.pending.p===0&&s.pending.kind==='turn')&&n<500){ E.choose(s,E.aiChoose(s)); n++; }
  // give resources, put card in row slot 5 (free)
  s.players[0].infl=20; s.players[0].coins=20; s.row[5]={id:c.id,letters:[]}; s.players[0].students.push({id:3,letters:[],uid:900});
  const k=s.pending.opts.findIndex(o=>o.hire===5); if(k<0){ console.log('no hire opt'); continue; }
  E.choose(s,k); let g=0;
  while(s.pending&&s.pending.p===0&&s.pending.kind!=='elim'&&g<20){ E.choose(s,0); g++; }
  if(s.pending&&s.pending.kind==='elim') console.log(c.name,'elim options:',s.pending.opts.map(o=>o.cards?D.cards.find(x=>x.id===o.cards[0]).name:'(pass)').join(', '),'| students:',s.players[0].students.map(x=>D.cards.find(y=>y.id===x.id).name).join(','));
  else console.log(c.name,'no elim pending; kind',s.pending&&s.pending.kind);
}
