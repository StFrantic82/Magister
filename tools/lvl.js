global.window=global; require('../data.js'); require('../engine.js'); const E=global.MagEngine;
const [a,b,N]=process.argv.slice(2).map(Number); let wa=0,wb=0,r=0,vpa=0,vpb=0;
for(let sd=1;sd<=N;sd++){ const L=sd%2?[a,b]:[b,a];
 let s=E.newGame({players:L.map((l,k)=>({name:'P'+k,ai:true,lvl:l})),seed:sd*4241}); let n=0; while(!s.over&&n<9000){E.choose(s,E.aiChoose(s));n++;}
 const ia=sd%2?0:1, ib=1-ia; if(s.winners.includes(ia)) wa++; if(s.winners.includes(ib)) wb++; r+=s.turnNo/2; vpa+=E.vp(s,ia); vpb+=E.vp(s,ib); }
console.log(`lvl${a} vs lvl${b}: wins ${(100*wa/N).toFixed(0)}% / ${(100*wb/N).toFixed(0)}%  vp ${(vpa/N).toFixed(1)}/${(vpb/N).toFixed(1)} rounds ${(r/N).toFixed(1)}`);
