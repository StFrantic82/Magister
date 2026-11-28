global.window=global; require('../data.js'); require('../engine.js'); const E=global.MagEngine;
let res={g:0,w:0,rounds:0,bj:0,logs:[]};
for(let sd=1;sd<=40;sd++){ let s=E.newGame({players:[{name:'A',ai:true},{name:'B',ai:true}],seed:sd*13,countries:['SLK',['FRA','POR','GER','BYZ','MOR','SPA','ITA','ENG'][sd%8],['ITA','SPA','ENG','MOR','GER'][sd%5]].filter((v,i,a)=>a.indexOf(v)===i).concat(['ENG']).slice(0,3)}); let n=0; while(!s.over&&n<8000){E.choose(s,E.aiChoose(s));n++;}
 const sm=E.summary(s,'sim'); res.g++; res.rounds+=sm.rounds; const L=JSON.stringify(s.log||[]); if(L.includes('log_beijing')) res.bj++; }
console.log(res.g,'games, avg rounds',(res.rounds/res.g).toFixed(2),'games with Beijing copies',res.bj);
