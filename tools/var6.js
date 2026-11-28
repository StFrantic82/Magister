// var6.js variantJSON N np seed0 [weights.json]
global.window=global; require('../data.js'); require('../engine.js'); const E=global.MagEngine; const fs=require('fs');
const VV=JSON.parse(process.argv[2]), N=+process.argv[3], NP=+process.argv[4], S0=+(process.argv[5]||0); E.setVariant(VV);
if(process.argv[6]) E.setWeights(Object.assign({dear:3},JSON.parse(fs.readFileSync(process.argv[6]))));
const R={g:0,rounds:0,in1012:0,W:{vp:0,books:0,em:0,rect:0,city:0},byObj:{},rec:{pl:0,has:0,hasW:0,noW:0,no:0,rd:0,early:0,beforeE:0,noE:0,one:0,oneW:0,both:0,none:0,wHas:0},tile:{},gain:{has:{n:0,c:0,i:0,t:0,b:0},no:{n:0,c:0,i:0,t:0,b:0}},close:0};
for(let g=0;g<N;g++){ let s=E.newGame({players:[...Array(NP)].map((_,k)=>({name:'P'+k,ai:true,lvl:3})),seed:S0+g*7919+5}); let n=0;
  while(!s.over&&n<9000){ E.choose(s,E.aiChoose(s)); n++; }
  const m=E.summary(s,'sim'); R.g++; R.rounds+=m.rounds; if(m.rounds>=10&&m.rounds<12.5) R.in1012++;
  const nw=m.players.filter(p=>p.win).length; const v=m.players.map(p=>p.vp).sort((a,b)=>b-a); if(v[0]-v[1]<=1) R.close++;
  Object.values(m.rects).forEach(t=>{ const a=R.tile[t]=R.tile[t]||{av:0,tk:0,w:0,rd:0}; a.av++; });
  const hs=m.players.filter(p=>p.rect); if(hs.length===1){ R.rec.one++; if(hs[0].win) R.rec.oneW++; } else if(hs.length===0) R.rec.none++; else R.rec.both++;
  m.players.forEach(p=>{ const w=p.win?1/nw:0, em=Object.values(p.em).reduce((x,y)=>x+y,0), eN=Object.keys(p.em).length;
    R.rec.pl++; R.tokN=(R.tokN||0)+eN; R.tokV=(R.tokV||0)+em; R.nObjPl=(R.nObjPl||[0,0,0,0,0]); R.nObjPl[Math.min(eN,4)]++; const G=R.gain[p.rect?'has':'no']; G.n++; G.c+=p.g.c||0; G.i+=p.g.i||0; G.t+=p.g.t||0; G.b+=p.g.b||0;
    if(p.rect){ R.rec.has++; R.rec.hasW+=w; const rd=p.first.R; R.rec.rd+=rd; if(rd<=6) R.rec.early++; if(p.first.E===undefined) R.rec.noE++; else if(rd<p.first.E) R.rec.beforeE++;
      const a=R.tile[p.rect]; a.tk++; a.w+=w; a.rd+=rd; } else { R.rec.no++; R.rec.noW+=w; }
    if(p.win){ const k=1/nw; R.W.vp+=k*p.vp; R.W.books+=k*p.books.length; R.W.em+=k*em; R.W.rect+=k*(p.rect?1:0); R.W.city+=k*(p.bol+p.cst); if(p.rect) R.rec.wHas+=k;
      const b=R.byObj[eN]=R.byObj[eN]||{n:0,books:0,rect:0}; b.n+=k; b.books+=k*p.books.length; b.rect+=k*(p.rect?1:0); } });
}
const f=(x,d=2)=>+x.toFixed(d), pc=x=>Math.round(100*x)+'%', W=R.W, r=R.rec;
const out={tokensPerGame:f(R.tokN/R.g),objVPperGame:f(R.tokV/R.g),playersByObjectives:R.nObjPl.map(x=>pc(x/R.rec.pl)),variant:VV,np:NP,games:R.g,rounds:f(R.rounds/R.g),in10to12:pc(R.in1012/R.g),within1VP:pc(R.close/R.g),
 share:{em:pc(W.em/W.vp),books:pc(W.books/W.vp),rector:pc(W.rect/W.vp),cities:pc(W.city/W.vp)},
 winner:{vp:f(W.vp/R.g),books:f(W.books/R.g),emVP:f(W.em/R.g),rector:pc(W.rect/R.g)},
 winnersByObjectives:Object.fromEntries(Object.entries(R.byObj).map(([k,b])=>[k,{share:pc(b.n/R.g),books:f(b.books/b.n,1),rector:pc(b.rect/b.n)}])),
 rector:{playersWithRector:pc(r.has/r.pl),gamesNone:pc(r.none/R.g),gamesOne:pc(r.one/R.g),gamesBoth:pc(r.both/R.g),avgRoundTaken:f(r.rd/Math.max(1,r.has),1),takenByRound6:pc(r.early/Math.max(1,r.has)),beforeFirstEmeritus:pc(r.beforeE/Math.max(1,r.has)),neverEmeritus:pc(r.noE/Math.max(1,r.has)),winWith:pc(r.hasW/Math.max(1,r.has)),winWithout:pc(r.noW/Math.max(1,r.no)),ownerWinsWhenOnlyOne:pc(r.oneW/Math.max(1,r.one))},
 gainsPerPlayer:Object.fromEntries(['has','no'].map(k=>{const G=R.gain[k];return [k,{coins:f(G.c/G.n,1),infl:f(G.i/G.n,1),moves:f(G.t/G.n,1),books:f(G.b/G.n,1)}];})),
 tiles:Object.fromEntries(Object.keys(R.tile).sort().map(t=>{const a=R.tile[t];return [t,{avail:a.av,taken:pc(a.tk/a.av),win:a.tk?pc(a.w/a.tk):'-',round:a.tk?f(a.rd/a.tk,1):'-'}];}))};
console.log(JSON.stringify(out));
