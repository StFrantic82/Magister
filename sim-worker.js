// Magister — simulations IA en arrière-plan
self.window=self;
importScripts('data.js?'+(self.location.search.slice(1)||''),'engine.js?'+(self.location.search.slice(1)||''));
const E=self.MagEngine;
let stop=false;
function play(nPlayers,countries,ws,seed,rules){
  const players=[...Array(nPlayers)].map((_,k)=>({name:'IA '+(k+1),ai:true,w:ws?ws[k]:null}));
  const s=E.newGame({players,countries,seed,rules});
  let n=0; while(!s.over && n<5000){ E.choose(s,E.aiChoose(s)); n++; }
  return s;
}
function pickCountries(c){ if(c&&c.length===3) return c; return null; }
function mutate(w,sigma){ const o={}; for(const k in w){ const f=Math.exp((Math.random()*2-1)*sigma); o[k]=Math.round(w[k]*f*1000)/1000; } return o; }
self.onmessage=async ev=>{
  const m=ev.data;
  if(m.cmd==='stop'){ stop=true; return; }
  stop=false;
  E.setAIDepth(m.depth===3?2:(m.depth||2)); E.setTree({on:m.depth===3,iters:200});
  if(m.weights) E.setWeights(m.weights);
  if(m.cmd==='batch'){
    for(let g=0; g<m.games && !stop; g++){
      const t0=Date.now();
      const s=play(m.players,pickCountries(m.countries),null,(Math.random()*2**32)>>>0,m.rule);
      self.postMessage({type:'game',i:g+1,ms:Date.now()-t0,sum:E.summary(s,'sim')});
      await new Promise(r=>setTimeout(r,0));
    }
    self.postMessage({type:'done'});
  }
  if(m.cmd==='train'){
    let best=Object.assign({},E.DEFAULT_W,m.weights||{}); let bestRounds=null;
    for(let gen=1; gen<=m.gens && !stop; gen++){
      const ch=mutate(best,m.sigma||0.25);
      let chWins=0, games=0, rounds=0, expSum=0; const sums=[];
      for(let g=0; g<m.perGen && !stop; g++){
        // le challenger occupe une place sur deux, en alternant
        const ws=[...Array(m.players)].map((_,k)=>((k+g)%2===0)?ch:best);
        const s=play(m.players,pickCountries(m.countries),ws,(Math.random()*2**32)>>>0,m.rule);
        games++; rounds+=s.turnNo/m.players;
        const chSeats=ws.map((w,k)=>w===ch?k:-1).filter(k=>k>=0);
        expSum+=chSeats.length/m.players;
        const share=s.winners.filter(k=>chSeats.includes(k)).length/s.winners.length;
        chWins+=share;
        sums.push(E.summary(s,'train'));
        self.postMessage({type:'tgame',gen,g:g+1});
        await new Promise(r=>setTimeout(r,0));
      }
      if(!games) break;
      const expected=expSum/games; // part attendue à niveau égal, d'après les places réellement occupées
      const rate=chWins/games;
      const r=rounds/games; const target=m.target||11;
      if(bestRounds===null) bestRounds=r+0.5;
      // mode rush : on accepte aussi un challenger aussi fort qui raccourcit les parties vers la cible
      // seuil statistique (~95 %, unilatéral) pour ne pas adopter un challenger seulement chanceux
      const margin=1.65*Math.sqrt(expected*(1-expected)/games);
      const accepted = rate > expected + margin || (m.rush && rate >= expected && Math.abs(r-target) < Math.abs(bestRounds-target) - 0.3);
      if(accepted){ best=ch; bestRounds=r; }
      self.postMessage({type:'gen',gen,rate,expected,accepted,rounds:rounds/games,best,sums});
    }
    self.postMessage({type:'done',best});
  }
};
