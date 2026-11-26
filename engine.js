// Magister — moteur de jeu. L'état est un objet JSON pur (synchronisable).
// Tous les textes (journal, questions, options) sont des messages structurés {m:clé, a:[arguments]} traduits à l'affichage.
(function(global){
const D = global.MAG;
const CARD = {}; D.cards.forEach(c=>CARD[c.id]=c);
const BOOK = {}; D.books.forEach(b=>BOOK[b.id]=b);
const TR = ['A','B','C'];
const COLORS = ['#c0392b','#2471a3','#d4ac0d','#7d3c98'];
const M = (m,...a)=>({m,a});
const PLUS = arr=>({m:'+',a:arr});
const TY = t=>M('T_'+t), LV = l=>M('L_'+l), WO = w=>M('W_'+w), CO = c=>M('C_'+c), CY = k=>M('CY_'+k);
D.DECK2 = [17,18,19,20,33,34,35,36,49,50,51,52,65,66,67,68];

// ---------- RNG ----------
function rnd(s){ let t = (s.rng += 0x6D2B79F5) | 0; t = Math.imul(t ^ t>>>15, t|1); t ^= t + Math.imul(t ^ t>>>7, t|61); return ((t ^ t>>>14)>>>0)/4294967296; }
function shuffle(s,a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(rnd(s)*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
const clone = o => JSON.parse(JSON.stringify(o));
// copie rapide pour les simulations de l'IA : sans le journal (les 2/3 de l'état), qui n'y sert à rien
function fcopy(o){ if(o===null||typeof o!=='object') return o; if(Array.isArray(o)){ const n=o.length, a=new Array(n); for(let i=0;i<n;i++) a[i]=fcopy(o[i]); return a; } const r={}; for(const k in o){ const v=o[k]; if(v!==undefined) r[k]=fcopy(v); } return r; }
function simClone(s){ const r={}; for(const k in s){ if(k==='log') continue; const v=s[k]; if(v!==undefined) r[k]=fcopy(v); } r.log=[]; r.nolog=true; return r; }

// ---------- aides ----------
function log(s,msg){ if(s.nolog) return; s.log.push(msg); if(s.log.length>150) s.log.splice(0,s.log.length-150); }
function P(s,p){ return s.players[p]; }
function pn(s,p){ return s.players[p].name; }
const cn = id => CARD[id].name;
function chars(pl){ const a=[...pl.students,...pl.profs,...pl.emer]; if(pl.rector) a.push(pl.rector.card); return a; }
function cardWoa(co){ const r=[]; const c=CARD[co.id]; if(c.woa) r.push(c.woa); (co.letters||[]).forEach(w=>r.push(w)); return r; }
function woaList(pl,exclStudents){ const r=[]; (exclStudents?[...pl.profs,...pl.emer,...(pl.rector?[pl.rector.card]:[])]:chars(pl)).forEach(co=>r.push(...cardWoa(co))); return r; }
// Recteur 3b : un personnage joker, du type et du niveau voulus, recompté à chaque vérification
function wild(pl){ return !!(pl.rector && pl.rector.tile==='3b'); }
function countTypeRaw(pl,t){ return chars(pl).filter(co=>CARD[co.id].type===t).length; }
function countType(pl,t){ return countTypeRaw(pl,t)+(wild(pl)?1:0); }
function countLvl(pl,l){ return chars(pl).filter(co=>CARD[co.id].lvl===l).length+(wild(pl)&&l>=1?1:0); }
function journeys(pl){ return pl.trav.filter(x=>x>=12).length; }
function hasRect(pl,id){ return !!(pl.rector && pl.rector.tile===id); }
function vp(s,p){ const pl=P(s,p); return pl.played.length + Object.values(pl.emTok).reduce((a,b)=>a+b,0) + (pl.rector?1:0) + pl.bologna + pl.constTok.length; }
function canPay(pl,c,i){ if(hasRect(pl,'2b')) return pl.coins+pl.infl>=c+i; return pl.coins>=c && pl.infl>=i; }
function pay(pl,c,i){
  if(hasRect(pl,'2b')){ const dc=Math.min(c,pl.coins); pl.coins-=dc; let rest=c-dc; const di=Math.min(i,pl.infl); pl.infl-=di; rest+=i-di; const x=Math.min(rest,pl.coins); pl.coins-=x; rest-=x; pl.infl-=rest; return; }
  pl.coins-=c; pl.infl-=i;
}
function hireCost(s,p,slot,free){ if(free) return 0; let c=D.ROWCOST[slot]; if(hasRect(P(s,p),'4b')) c=Math.max(0,c-2); return c; }
function effTxt(e){
  if(e.c) return M('e_c',e.c); if(e.i) return M('e_i',e.i); if(e.ci) return M('e_ci',e.ci);
  if(e.t) return M('e_t',e.t); if(e.tr) return M('e_tr',e.n,e.tr); if(e.b) return M('e_b',e.b);
  if(e.l) return M('e_l',e.l); if(e.r) return M('e_r'); if(e.p) return M('e_p');
  if(e.pf) return M('e_pf_'+e.pf); if(e.take) return M('e_take',e.take); if(e.elim) return M('e_elim');
  if(e.per){ const k=e.per.k, v=e.per.v; const what = k==='type'?TY(v):k==='lvl'?LV(v):k==='woa'?WO(v):M('student'); return M('e_per',effTxt(e.g),what); }
  return '?';
}
function effsTxt(a){ return PLUS(a.map(effTxt)); }

// ---------- mise en place ----------
function newGame(opts){
  const s = {v:2, rng:(opts.seed>>>0)||((Math.random()*2**32)>>>0), log:[], stack:[], pending:null, over:false, ver:0, uidc:0};
  const n = opts.players.length;
  s.players = opts.players.map((p,k)=>({name:p.name, ai:!!p.ai, lvl:p.ai?(p.lvl||3):undefined, uid:p.uid||null, color:p.color||COLORS[k], coins:0, infl:0, hand:[], played:[],
    students:[], profs:[], emer:[], rector:null, virt:null, trav:[0,0,0], emTok:{}, bologna:0, constTok:[], cities:0, w:p.w||null,
    hires:[], citiesK:[], promos:{S:0,E:0,R:0}, booksTurn:[]}));
  const cs = opts.countries && opts.countries.length===3 ? opts.countries.slice() : shuffle(s,['ITA','FRA','ENG','POR','SPA','GER','BYZ','MOR','SLK']).slice(0,3);
  s.tracks = cs;
  s.bologna = cs.includes('ITA') ? n : 0;
  s.constTok = cs.includes('BYZ') ? shuffle(s,['A','M','N','R']).slice(0,n) : [];
  const l2 = shuffle(s, D.DECK2.slice()).slice(0,[0,0,6,9,12][n]||6);
  const l3 = shuffle(s, D.cards.filter(c=>c.id>=17 && !D.DECK2.includes(c.id)).map(c=>c.id));
  s.deck = [...l2, ...l3];
  s.row = []; for(let k=0;k<6;k++) s.row.push(s.deck.length?{id:s.deck.shift(),letters:[]}:null);
  const rt = shuffle(s, D.rectors.map(r=>r.id)).slice(0,4);
  s.rectSlots = {}; ['N','R','A','M'].forEach((t,k)=>s.rectSlots[t]=rt[k]); s.rectSlotsInit=Object.assign({},s.rectSlots);
  const ob = shuffle(s,['A','B','C','D']);
  s.objSlots = {}; ['N','R','A','M'].forEach((t,k)=>{ const side = rnd(s)<0.5?1:2; s.objSlots[t]={tile:ob[k]+side, stack:[3, ...Array(n-1).fill(2)]}; });
  s.letters = D.letters.map(l=>l.id);
  s.bookDeck = shuffle(s, D.books.map(b=>b.id)); s.bookDisc = [];
  s.players.forEach((pl,k)=>drawBooks(s,k,2,true));
  const st = shuffle(s, D.cards.filter(c=>c.id<=16).map(c=>c.id)).slice(0,2*n);
  s.pairs = []; for(let k=0;k<n;k++) s.pairs.push([st[2*k],st[2*k+1]]);
  s.start = Math.floor(rnd(s)*n); s.phase = 'setup'; s.turnNo = 0; s.endTriggered = false;
  const last=(s.start+n-1)%n; s.turn = {p:last, hired:null};
  log(s,M('log_tracks',CO(cs[0]),CO(cs[1]),CO(cs[2])));
  log(s,M('log_first',pn(s,s.start)));
  s.stack.push({k:'setupPair', p:last});
  run(s);
  return s;
}

function gain(pl,k,n){ pl.g=pl.g||{}; pl.g[k]=(pl.g[k]||0)+n; }
function drawBooks(s,p,n,silent){
  let got=0;
  for(let k=0;k<n;k++){
    if(!s.bookDeck.length){ if(!s.bookDisc.length) break; s.bookDeck = shuffle(s, s.bookDisc); s.bookDisc=[]; }
    P(s,p).hand.push(s.bookDeck.shift()); got++; gain(P(s,p),'b',1);
  }
  if(!silent && got) log(s,M('log_draw',pn(s,p),got));
}

// ---------- conditions ----------
function bookOk(s,p,bid){
  const pl=P(s,p), c=BOOK[bid].cond;
  const ofT=(arr,t)=>arr.some(co=>CARD[co.id].type===t);
  switch(c.k){
    case 'spe': return ofT(pl.students,c.v)&&ofT(pl.profs,c.v)&&ofT(pl.emer,c.v);
    case 'prof4': return D.TYPES.every(t=>ofT(pl.profs,t));
    case 'cities': return pl.cities>=c.v;
    case 'pe': return pl.profs.some(co=>CARD[co.id].lvl===c.p) && pl.emer.some(co=>CARD[co.id].lvl===c.e);
    case 'woa2': return woaList(pl,true).filter(w=>w===c.v).length>=2;
    case 'coins': return pl.coins>=c.v;
    case 'infl': return pl.infl>=c.v;
    case 'jA': return pl.trav[0]>=12 && [1,2,3].every(l=>pl.profs.some(co=>CARD[co.id].lvl===l));
    case 'jB': return pl.trav[1]>=12 && woaList(pl).length>=5;
    case 'jC': return pl.trav[2]>=12 && D.TYPES.every(t=>ofT(pl.students,t));
    case 'woa3': { const w=woaList(pl); return Object.values(w.reduce((m,x)=>(m[x]=(m[x]||0)+1,m),{})).some(v=>v>=3); }
    case 'lvlN': return countLvl(pl,c.l)>=c.n;
    case 'stu': return pl.students.length>=c.v;
    case 'rect23': return !!(pl.rector && CARD[pl.rector.card.id].lvl>=1);
  }
  return false;
}
function objOk(s,p,tile){
  const pl=P(s,p);
  switch(tile){
    case 'A1': return pl.played.length>0 && D.TYPES.reduce((a,t)=>a+Math.max(0,2-countTypeRaw(pl,t)),0)<=(wild(pl)?1:0);
    case 'A2': return D.TYPES.some(t=>countType(pl,t)>=6);
    case 'B1': return journeys(pl)>=1 && pl.coins>=6 && pl.infl>=6;
    case 'B2': return journeys(pl)>=2;
    case 'C1': return pl.profs.length>=5;
    case 'C2': return pl.emer.length>=3;
    case 'D1': return new Set(woaList(pl)).size>=5;
    case 'D2': return woaList(pl).length>=7;
  }
  return false;
}
function needs(s,p){
  const pl=P(s,p); const red=hasRect(pl,'4a')?2:0; let c=0,i=3; // ~3 d'influence pour recruter au tour suivant
  if(pl.students.length) { c=Math.max(c,3-red); i=Math.max(i,1+1); }
  if(pl.profs.length) { c=Math.max(c,6-red); i=Math.max(i,2); }
  if(!pl.rector && pl.profs.some(co=>s.rectSlots[CARD[co.id].type])) { i=Math.max(i,8+1); c=Math.max(c,1); }
  pl.hand.forEach(b=>{ const k=BOOK[b].cond.k; if(k==='coins') c=Math.max(c,10); if(k==='infl') i=Math.max(i,10); });
  D.TYPES.forEach(t=>{ const o=s.objSlots[t]; if(o.tile==='B1' && pl.emTok[t]===undefined && o.stack.length){ c=Math.max(c,6); i=Math.max(i,6); } });
  if(hasRect(pl,'2b')){ const m=c+i; return {c:m,i:m}; }
  return {c,i};
}
function objProgress(s,p,tile){
  const pl=P(s,p), cap=x=>Math.max(0,Math.min(1,x));
  switch(tile){
    case 'A1': return Math.min(1,(D.TYPES.reduce((a,t)=>a+Math.min(2,countTypeRaw(pl,t)),0)+(wild(pl)?1:0)+(pl.played.length?1:0))/9);
    case 'A2': return cap(Math.max(...D.TYPES.map(t=>countType(pl,t)))/6);
    case 'B1': return cap(Math.max(...pl.trav)/12)*0.5+cap(Math.min(pl.coins,6)/6)*0.25+cap(Math.min(pl.infl,6)/6)*0.25;
    case 'B2': return cap(pl.trav.slice().sort((a,b)=>b-a).slice(0,2).reduce((a,b)=>a+b,0)/24);
    case 'C1': return cap(pl.profs.length/5);
    case 'C2': return cap(pl.emer.length/3);
    case 'D1': return cap(new Set(woaList(pl)).size/5);
    case 'D2': return cap(woaList(pl).length/7);
  }
  return 0;
}
function autoClaim(s,p){
  const pl=P(s,p);
  D.TYPES.forEach(t=>{
    if(pl.emTok[t]!==undefined) return;
    if(!pl.emer.some(co=>CARD[co.id].type===t)) return;
    const o=s.objSlots[t]; if(!o.stack.length) return;
    if(objOk(s,p,o.tile)){ const v=o.stack.shift(); pl.emTok[t]=v; log(s,M('log_obj',pl.name,TY(t),M('O_'+o.tile),v)); }
  });
}

// ---------- décisions ----------
function ask(s,p,kind,prompt,opts,task){ s.pending={p,kind,prompt,opts,task}; }
function choose(s,idx){
  const pd=s.pending; if(!pd) throw new Error('no pending decision');
  const o=pd.opts[idx]; if(!o) throw new Error('invalid option');
  s.pending=null;
  resolve(s,pd,o);
  run(s);
  s.ver=(s.ver||0)+1;
  return s;
}
function run(s){
  let guard=0;
  while(!s.pending && !s.over){
    if(++guard>20000) throw new Error('infinite loop');
    if(s.stack.length){ const t=s.stack.pop(); step(s,t); if(s.phase==='main'||s.phase==='end') autoClaim(s,s.turn.p); continue; }
    if(s.phase==='main'){ s.phase='end'; continue; }
    if(s.phase==='end'){ endPrompt(s); continue; }
    break;
  }
}
function abortCtx(s,ctx){ if(!ctx) return; ctx.abort=true; if(ctx.id){ (s.aborted=s.aborted||{})[ctx.id]=1; } }
function pushSeq(s,p,effs,ctx){ ctx=ctx||{id:(s.ctxc=(s.ctxc||0)+1)}; for(let k=effs.length-1;k>=0;k--) s.stack.push({k:'eff',p,e:effs[k],ctx}); }
function moveStep(s,p,tr,rest,kind){
  // un pas sur le parcours tr ; la Ville éventuelle est résolue avant les déplacements restants
  const pl=P(s,p);
  if(rest>0) s.stack.push(kind==='track'?{k:'moveTrack',p,tr,n:rest}:{k:'move',p,n:rest});
  if(pl.trav[tr]>=12) return;
  pl.trav[tr]++; gain(pl,'t',1);
  const cy=D.countries[s.tracks[tr]].cities.find(c=>c[0]===pl.trav[tr]);
  if(cy) s.stack.push({k:'city',p,tr,key:cy[1]});
}
const cardsOpt = id => ({cards:[id]});

function step(s,t){
  const p=t.p, pl=p!==undefined?P(s,p):null;
  switch(t.k){
  case 'setupPair':
    ask(s,p,'pair',M('q_pair',pn(s,p)),s.pairs.map((pr,k)=>pr?{label:M('o_pair',cn(pr[0]),cn(pr[1])),pair:k,cards:pr}:null).filter(Boolean),t); return;
  case 'setupPlace': {
    const [a,b]=t.ids;
    ask(s,p,'place',M('q_place',pn(s,p)),[{label:M('o_asprof',cn(a)),prof:a,stu:b,cards:[a]},{label:M('o_asprof',cn(b)),prof:b,stu:a,cards:[b]}],t); return; }
  case 'setupNext':
    { const n=s.players.length; if(p!==s.start){ const q=(p+n-1)%n; s.turn.p=q; s.stack.push({k:'setupPair',p:q}); }
      else { s.turn.p=s.start; s.stack.push({k:'setupBook',p:s.start}); } }
    return;
  case 'setupBook':
    if(!pl.hand.length){ s.stack.push({k:'setupBookNext',p}); return; }
    ask(s,p,'setupBook',M('q_setupBook',pn(s,p)),pl.hand.map((b,k)=>({label:M('o_discard',effsTxt(discEff(s,p,b))),book:b,hk:k})),t); return;
  case 'setupBookNext':
    { const q=(p+1)%s.players.length; if(q!==s.start){ s.turn.p=q; s.stack.push({k:'setupBook',p:q}); }
      else startTurn(s,s.start); }
    return;
  case 'eff': {
    if(t.ctx && (t.ctx.abort || (s.aborted&&s.aborted[t.ctx.id]))) return;
    const e=t.e;
    if(e.c){ pl.coins+=e.c; gain(pl,'c',e.c); return; }
    if(e.i){ pl.infl+=e.i; gain(pl,'i',e.i); return; }
    if(e.ci){ ask(s,p,'ci',M('q_ci',pn(s,p),e.ci),[{label:M('e_c',e.ci),c:e.ci},{label:M('e_i',e.ci),i:e.ci}],t); return; }
    if(e.t){ s.stack.push({k:'move',p,n:e.t}); return; }
    if(e.tr){ s.stack.push({k:'moveTrack',p,tr:TR.indexOf(e.tr),n:e.n}); return; }
    if(e.b){ drawBooks(s,p,e.b); return; }
    if(e.l){ for(let k=0;k<e.l;k++) s.stack.push({k:'letter',p}); return; }
    if(e.r){ s.stack.push({k:'reorg',p}); return; }
    if(e.p){ s.stack.push({k:'promo',p}); return; }
    if(e.pf){ s.stack.push({k:'freePromo',p,w:e.pf}); return; }
    if(e.take){ s.stack.push({k:'take',p,max:e.take}); return; }
    if(e.elim){ s.stack.push({k:'elim',p,ctx:t.ctx}); return; }
    if(e.per){
      const k=e.per.k,v=e.per.v; let n=0;
      if(k==='type') n=countType(pl,v); else if(k==='lvl') n=countLvl(pl,v); else if(k==='woa') n=woaList(pl).filter(w=>w===v).length; else if(k==='stu') n=pl.students.length;
      if(n<=0){ log(s,M('log_nothing',pn(s,p),effTxt(e))); return; }
      const g={}; for(const kk in e.g) g[kk]=e.g[kk]*n;
      s.stack.push({k:'eff',p,e:g,ctx:t.ctx}); return;
    }
    return; }
  case 'move': {
    if(t.n<=0) return;
    const av=[0,1,2].filter(k=>pl.trav[k]<12);
    if(!av.length) return;
    if(av.length===1){ moveStep(s,p,av[0],t.n-1); return; }
    ask(s,p,'move',M('q_move',pn(s,p),t.n),av.map(k=>({label:M('o_move',TR[k],CO(s.tracks[k]),pl.trav[k],pl.trav[k]+1),tr:k})),t); return; }
  case 'moveTrack': if(pl.trav[t.tr]<12) moveStep(s,p,t.tr,t.n-1,'track'); return;
  case 'city': return city(s,p,t);
  case 'letter':
    if(!s.letters.length) return;
    ask(s,p,'letter',M('q_letter',pn(s,p)),s.letters.map(id=>{ const L=D.letters.find(x=>x.id===id); return {label:L.woa?M('o_letterWoa',WO(L.woa)):effsTxt(L.g),letter:id}; }),t); return;
  case 'reorg': {
    const opts=[{label:M('o_noReorg'),pass:1}];
    ['students','profs','emer'].forEach(r=>{ if(pl[r].length>1) pl[r].forEach((co,k)=>opts.push({label:M('o_reorg',cn(co.id),M('row_'+r),k+1),row:r,idx:k,cards:[co.id]})); });
    if(opts.length===1) return;
    ask(s,p,'reorg',M('q_reorg',pn(s,p)),opts,t); return; }
  case 'reorgPos': {
    const r=pl[t.row]; const opts=[];
    for(let k=0;k<r.length;k++) if(k!==t.idx) opts.push({label:M('o_pos',k+1),pos:k});
    ask(s,p,'reorgPos',M('q_reorgPos',pn(s,p),cn(r[t.idx].id)),opts,t); return; }
  case 'promo': {
    const opts=promoOptions(s,p);
    if(!opts.length){ log(s,M('log_noPromo',pn(s,p))); return; }
    if(!t.forced) opts.unshift({label:M('o_noPromo'),pass:1});
    ask(s,p,'promo',M('q_promo',pn(s,p)),opts,t); return; }
  case 'freePromo':
    if(t.w==='s1'){ if(pl.students.length) doPromo(s,p,'S',0,true); return; }
    if(t.w==='p1'){ if(pl.profs.length) doPromo(s,p,'E',0,true); return; }
    if(t.w==='s'){ if(!pl.students.length) return; ask(s,p,'freePromo',M('q_freePromo',pn(s,p)),pl.students.map((co,k)=>({label:cn(co.id),idx:k,cards:[co.id]})),t); }
    return;
  case 'take': {
    // positions comptées parmi les cartes restantes, de la moins chère (à droite) à la plus chère
    const opts=[]; let pos=0;
    for(let k=5;k>=0 && pos<t.max;k--) if(s.row[k]){ pos++; opts.push({label:M('o_rowpos',pos,cn(s.row[k].id)),slot:k,cards:[s.row[k].id]}); }
    if(!opts.length) return;
    ask(s,p,'take',M('q_take',pn(s,p),t.max),opts,t); return; }
  case 'elim': {
    // on ne peut pas éliminer la carte qu'on vient d'embaucher
    const cand=pl.students.map((co,k)=>[co,k]).filter(([co])=>co.uid===undefined||co.uid!==s.turn.hired);
    if(!cand.length){ abortCtx(s,t.ctx); log(s,M('log_noElim',pn(s,p))); return; }
    ask(s,p,'elim',M('q_elim',pn(s,p)),cand.map(([co,k])=>({label:M('o_elim',cn(co.id)),idx:k,cards:[co.id]})).concat([{label:M('o_noElim'),pass:1}]),t); return; }
  case 'hire': return hire(s,p,t.slot,t.free,t.noAct);
  case 'choice': {
    const c=CARD[t.id]; if(!c.act) return;
    if(c.act!=='any' && !promoOptions(s,p).length && !promoWithBooks(s,p)){ s.stack.push({k:'activate',p,type:c.act}); pl.nAct=(pl.nAct||0)+1; return; }
    const opts=[];
    (c.act==='any'?D.TYPES:[c.act]).forEach(ty=>opts.push({label:M('o_activate',TY(ty)),act:ty}));
    if(promoOptions(s,p).length) opts.push({label:M('o_promote'),promo:1});
    ask(s,p,'choice',M('q_choice',pn(s,p)),opts,t); return; }
  case 'activate': {
    const list=pl.profs.filter(co=>CARD[co.id].trig.includes(t.type)).map(co=>co.id);
    log(s,M('log_activate',pn(s,p),TY(t.type),list.map(cn).join(', ')));
    for(let k=list.length-1;k>=0;k--) pushSeq(s,p,CARD[list[k]].A);
    pushSeq(s,p,D.BOARD[t.type]);
    return; }
  case 'refill': refill(s); return;
  case 'discardFor':
    if(!pl.hand.length) return;
    ask(s,p,'discardFor',M('q_discardFor',pn(s,p)),pl.hand.map((b,k)=>({label:M('o_discard',effsTxt(discEff(s,p,b))),book:b,hk:k})),t); return;
  case 'rectChoice': {
    const opts=[]; D.TYPES.forEach(ty=>[1,2,3].forEach(l=>opts.push({label:M('o_virt',TY(ty),LV(l)),t:ty,l})));
    ask(s,p,'virt',M('q_virt',pn(s,p)),opts,t); return; }
  case 'pickType':
    ask(s,p,'pickType',M('q_coimbra',pn(s,p)),D.TYPES.map(ty=>({label:TY(ty),type:ty})),t); return;
  case 'lisboa': {
    const drawn=s.deck.splice(0,3); if(!drawn.length) return;
    ask(s,p,'lisboa',M('q_lisboa',pn(s,p)),drawn.map(id=>({label:M('o_cardDesc',cn(id),TY(CARD[id].type),LV(CARD[id].lvl)),id,cards:[id],drawn})),t); return; }
  case 'meknes':
    if(!pl.students.length) return;
    ask(s,p,'meknes',M('q_meknes',pn(s,p)),pl.students.map(co=>({label:M('o_ability',cn(co.id),effsTxt(CARD[co.id].A)),id:co.id,cards:[co.id]})),t); return;
  case 'sale':
    if(!pl.students.length) return;
    ask(s,p,'sale',M('q_sale',pn(s,p)),pl.students.map((co,k)=>({label:M('o_elim',cn(co.id)),idx:k,cards:[co.id]})),t); return;
  case 'fes': {
    const opts=[]; s.row.forEach((co,k)=>{ if(co && canPay(pl,0,hireCost(s,p,k))) opts.push({label:M('o_fes',cn(co.id),hireCost(s,p,k)),slot:k,cards:[co.id]}); });
    if(!opts.length) return;
    ask(s,p,'fes',t.noAct?M('q_rect5a',pn(s,p)):M('q_fes',pn(s,p)),opts,t); return; }
  case 'const': {
    const opts=[]; s.constTok.forEach((ty,k)=>pl.emer.forEach((co,j)=>{ if(CARD[co.id].type===ty) opts.push({label:M('o_const',cn(co.id),TY(ty)),tok:k,idx:j,cards:[co.id]}); }));
    if(!opts.length){ log(s,M('log_noConst',pn(s,p))); return; }
    opts.push({label:M('o_nothing'),pass:1});
    ask(s,p,'const',M('q_const',pn(s,p)),opts,t); return; }
  case 'beijing': {
    const opts=[]; s.tracks.forEach(cc=>D.countries[cc].cities.forEach(c=>{ if(c[0]<12 && !t.used.includes(c[1])) opts.push({label:M('o_beijing',CY(c[1]),M('CE_'+c[1])),key:c[1],city:c[1]}); }));
    if(!opts.length||t.left<=0) return;
    ask(s,p,'beijing',M('q_beijing',pn(s,p),3-t.left),opts,t); return; }
  case 'thess':
    log(s,M('log_thess',pn(s,p)));
    for(let k=pl.emer.length-1;k>=0;k--) pushSeq(s,p,CARD[pl.emer[k].id].A);
    return;
  case 'restore': {
    const pd=t.pd;
    if(pd.kind==='turn'){ if(s.phase==='main') ask(s,p,'turn',M('q_turn',pn(s,p)),mainOpts(s,p),{k:'turn',p}); return; }
    if(pd.kind==='end'){ endPrompt(s); return; }
    // décisions qui dépendent des ressources : on les recalcule (une ressource gagnée peut rendre une option abordable)
    if(pd.task&&['choice','promo','fes'].includes(pd.kind)){ s.stack.push(pd.task); return; }
    // décision en cours : on retire les options de Livre devenues invalides
    pd.opts=pd.opts.filter(o=>(o.play===undefined&&o.disc===undefined)||P(s,p).hand[o.play!==undefined?o.play:o.disc]===o.book);
    if(!pd.opts.length){ return; }
    s.pending=pd; return; }
  case 'reMain':
    if(s.phase==='main') ask(s,p,'turn',M('q_turn',pn(s,p)),mainOpts(s,p),{k:'turn',p});
    return;
  }
}

function discEff(s,p,b){ return hasRect(P(s,p),'2a')?[{c:1},{i:1},{t:1}]:BOOK[b].disc; }

function resolve(s,pd,o){
  const p=pd.p, pl=P(s,p), t=pd.task;
  switch(pd.kind){
  case 'pair': {
    const ids=s.pairs[o.pair]; s.pairs[o.pair]=null;
    log(s,M('log_pair',pl.name,cn(ids[0]),cn(ids[1])));
    pl.start=ids.slice();
    s.stack.push({k:'setupNext',p});
    s.stack.push({k:'setupPlace',p,ids});
    pushSeq(s,p,CARD[ids[1]].H); pushSeq(s,p,CARD[ids[0]].H);
    return; }
  case 'place': pl.profs.push({id:o.prof,letters:[]}); pl.students.push({id:o.stu,letters:[]}); return;
  case 'setupBook': case 'discardFor':
    pl.hand.splice(o.hk,1); s.bookDisc.push(o.book); log(s,M('log_discard',pl.name,effsTxt(discEff(s,p,o.book))));
    if(pd.kind==='setupBook') s.stack.push({k:'setupBookNext',p});
    pushSeq(s,p,discEff(s,p,o.book)); return;
  case 'ci': if(o.c){ pl.coins+=o.c; gain(pl,'c',o.c); } else { pl.infl+=o.i; gain(pl,'i',o.i); } return;
  case 'move': moveStep(s,p,o.tr,t.n-1); return;
  case 'letter': {
    s.letters.splice(s.letters.indexOf(o.letter),1); (pl.lettersK=pl.lettersK||[]).push(o.letter);
    const L=D.letters.find(x=>x.id===o.letter);
    if(L.woa){ const tgt=hiredTarget(s,p); if(tgt){ tgt.letters.push(L.woa); log(s,M('log_letterWoa',pl.name,WO(L.woa),cn(tgt.id))); } }
    else { log(s,M('log_letter',pl.name,effsTxt(L.g))); pushSeq(s,p,L.g); }
    return; }
  case 'reorg': if(!o.pass) s.stack.push({k:'reorgPos',p,row:o.row,idx:o.idx}); return;
  case 'reorgPos': { const r=pl[t.row]; const [co]=r.splice(t.idx,1); r.splice(o.pos,0,co); log(s,M('log_reorg',pl.name,cn(co.id),o.pos+1)); return; }
  case 'promo': if(!o.pass) doPromo(s,p,o.to,o.idx,false); return;
  case 'freePromo': doPromo(s,p,'S',o.idx,true); return;
  case 'take': s.stack.push({k:'hire',p,slot:o.slot,free:true,noAct:!!t.noAct}); return;
  case 'elim': { if(o.pass){ abortCtx(s,t.ctx); return; } const [co]=pl.students.splice(o.idx,1); log(s,M('log_elim',pl.name,cn(co.id))); return; }
  case 'choice':
    if(o.act){ s.stack.push({k:'activate',p,type:o.act}); pl.nAct=(pl.nAct||0)+1; }
    else if(o.promo){ s.stack.push({k:'promo',p,forced:1}); pl.nPromo=(pl.nPromo||0)+1; }
    return;
  case 'virt': pl.virt={t:o.t,l:o.l}; log(s,M('log_virt',pl.name,TY(o.t),LV(o.l))); return;
  case 'pickType': s.stack.push({k:'activate',p,type:o.type}); return;
  case 'lisboa': o.drawn.filter(x=>x!==o.id).forEach(x=>s.deck.push(x)); pl.profs.push({id:o.id,letters:[]}); log(s,M('log_lisboa',pl.name,cn(o.id))); return;
  case 'meknes': pushSeq(s,p,CARD[o.id].A); log(s,M('log_meknes',pl.name,cn(o.id))); return;
  case 'beijing': { if(t.left>1) s.stack.push({k:'beijing',p,left:t.left-1,used:t.used.concat([o.key])}); log(s,M('log_beijing',pl.name,CY(o.key))); cityEff(s,p,o.key); return; }
  case 'sale': if(!o.pass){ const [co]=pl.students.splice(o.idx,1); log(s,M('log_sale',pl.name,cn(co.id))); } return;
  case 'fes': s.stack.push({k:'hire',p,slot:o.slot,free:false,noAct:!!t.noAct}); return;
  case 'const': if(!o.pass){ const ty=s.constTok.splice(o.tok,1)[0]; const [co]=pl.emer.splice(o.idx,1); pl.profs.push(co); pl.constTok.push(ty); log(s,M('log_const',pl.name,cn(co.id))); } return;
  case 'turn': case 'end': return turnAction(s,p,o,pd.kind);
  }
}
function hiredTarget(s,p){
  const pl=P(s,p), h=s.turn.hired;
  if(h!=null) for(const r of ['students','profs','emer']){ const f=pl[r].find(co=>co.uid===h); if(f) return f; }
  return pl.students[pl.students.length-1]||pl.profs[pl.profs.length-1]||null;
}

function city(s,p,t){
  const pl=P(s,p); pl.cities++; (pl.citiesK=pl.citiesK||[]).push(t.key);
  log(s,M('log_city',pl.name,CY(t.key),M('CE_'+t.key)));
  if(hasRect(pl,'3a')) drawBooks(s,p,1);
  cityEff(s,p,t.key);
}
function cityEff(s,p,key){
  const pl=P(s,p);
  const push=e=>pushSeq(s,p,e);
  switch(key){
    case 'samarkand': pl.coins++; gain(pl,'c',1); pl.infl++; gain(pl,'i',1); break;
    case 'kashgar': s.stack.push({k:'move',p,n:3}); break;
    case 'beijing': s.stack.push({k:'beijing',p,left:2,used:[]}); break;
    case 'pisa': push([{ci:1}]); break;
    case 'padova': s.stack.push({k:'reorg',p}); break;
    case 'bologna': if(s.bologna>0){ s.bologna--; pl.bologna++; log(s,M('log_bologna',pl.name)); } break;
    case 'toulouse': s.stack.push({k:'letter',p}); break;
    case 'avignon': { const n=new Set(woaList(pl)).size; if(n) push([{ci:n}]); break; }
    case 'paris': { const w=woaList(pl); const m=Math.max(0,...Object.values(w.reduce((a,x)=>(a[x]=(a[x]||0)+1,a),{}))); if(m) drawBooks(s,p,m); break; }
    case 'cambridge': s.stack.push({k:'promo',p}); push([{ci:2}]); break;
    case 'oxford': s.stack.push({k:'promo',p}); push([{ci:3}]); break;
    case 'lisboa': s.stack.push({k:'lisboa',p}); break;
    case 'coimbra': s.stack.push({k:'pickType',p}); break;
    case 'valladolid': drawBooks(s,p,1); break;
    case 'salamanca': s.stack.push({k:'discardFor',p}); drawBooks(s,p,2); break;
    case 'barcelona': drawBooks(s,p,2); break;
    case 'heidelberg': { const n=countLvl(pl,1); if(n) push([{ci:n}]); break; }
    case 'vienna': { const n=countLvl(pl,2)*2; if(n) push([{ci:n}]); break; }
    case 'praha': { const n=countLvl(pl,3)*3; if(n) push([{ci:n}]); break; }
    case 'thessaloniki': s.stack.push({k:'thess',p}); break;
    case 'constantinople': s.stack.push({k:'const',p}); break;
    case 'sale': s.stack.push({k:'sale',p}); break;
    case 'meknes': s.stack.push({k:'meknes',p}); break;
    case 'fes': s.stack.push({k:'fes',p}); break;
  }
}

// une promotion deviendrait-elle abordable en défaussant des Livres de la main ?
function promoWithBooks(s,p){
  const pl=P(s,p); if(!pl.hand.length) return false;
  let gc=0,gi=0; pl.hand.forEach(b=>discEff(s,p,b).forEach(e=>{ gc+=(e.c||0)+(e.ci||0); gi+=(e.i||0)+(e.ci||0); }));
  if(!gc&&!gi) return false;
  pl.coins+=gc; pl.infl+=gi; const ok=promoOptions(s,p).length>0; pl.coins-=gc; pl.infl-=gi; return ok;
}
function promoOptions(s,p){
  const pl=P(s,p), out=[]; const red=hasRect(pl,'4a')?2:0;
  pl.students.forEach((co,k)=>{ const c=Math.max(0,3-red), i=k+1; if(canPay(pl,c,i)) out.push({label:M('o_promoSP',cn(co.id),c,i),to:'S',idx:k,cards:[co.id]}); });
  pl.profs.forEach((co,k)=>{ const c=Math.max(0,6-red), i=k+1; if(canPay(pl,c,i)) out.push({label:M('o_promoPE',cn(co.id),c,i),to:'E',idx:k,cards:[co.id]}); });
  if(!pl.rector) pl.profs.forEach((co,k)=>{ const ty=CARD[co.id].type; if(!s.rectSlots[ty]) return; const c=Math.max(0,k+1-red); if(canPay(pl,c,8)) out.push({label:M('o_promoPR',cn(co.id),8,c,M('R_'+s.rectSlots[ty])),to:'R',idx:k,cards:[co.id]}); });
  return out;
}
function doPromo(s,p,to,idx,free){
  const pl=P(s,p); pl.first=pl.first||{}; const rd=Math.ceil(s.turnNo/s.players.length); if(pl.first[to]===undefined) pl.first[to]=rd; pl.promos=pl.promos||{S:0,E:0,R:0}; pl.promos[to]++; const red=hasRect(pl,'4a')?2:0;
  if(to==='S'){ const co=pl.students[idx]; if(!co) return; if(!free) pay(pl,Math.max(0,3-red),idx+1); pl.students.splice(idx,1); pl.profs.push(co); log(s,M(free?'log_promoSPfree':'log_promoSP',pl.name,cn(co.id))); return; }
  if(to==='E'){ const co=pl.profs[idx]; if(!co) return; if(!free) pay(pl,Math.max(0,6-red),idx+1); pl.profs.splice(idx,1); pl.emer.push(co); log(s,M(free?'log_promoPEfree':'log_promoPE',pl.name,cn(co.id))); return; }
  if(to==='R'){ const co=pl.profs[idx]; const ty=CARD[co.id].type; const tile=s.rectSlots[ty]; if(!tile) return;
    if(!free) pay(pl,Math.max(0,idx+1-red),8); pl.profs.splice(idx,1); pl.rector={card:co,tile,type:ty}; s.rectSlots[ty]=null;
    log(s,M('log_rector',pl.name,cn(co.id),M('R_'+tile)));
    if(tile==='2b') drawBooks(s,p,1);
    if(tile==='5a') s.stack.push({k:'fes',p,noAct:true});
    if(tile==='5b'){ s.stack.push({k:'promo',p}); s.stack.push({k:'move',p,n:5}); }
  }
}

function hire(s,p,slot,free,noAct){
  const pl=P(s,p), co=s.row[slot]; if(!co) return;
  const cost=hireCost(s,p,slot,free);
  pay(pl,0,cost);
  s.row[slot]=null;
  co.uid=(s.uidc=(s.uidc||0)+1);
  pl.students.push(co);
  s.turn.hired=co.uid;
  (pl.hires=pl.hires||[]).push(co.id); (pl.hireCost=pl.hireCost||[]).push(cost); (pl.hireSlot=pl.hireSlot||[]).push(free?-1:slot);
  const c=CARD[co.id];
  log(s,M(cost?'log_hireCost':'log_hire',pl.name,c.name,TY(c.type),LV(c.lvl),cost));
  if(hasRect(pl,'1a') && cardWoa(co).length){ pl.coins++; pl.infl++; gain(pl,'c',1); gain(pl,'i',1); }
  // ordre : bonus d'embauche → choix Activation/Promotion → remplissage de la rangée
  s.stack.push({k:'refill'});
  if(!noAct) s.stack.push({k:'choice',p,id:co.id});
  if(hasRect(pl,'1b') && c.lvl===1) s.stack.push({k:'move',p,n:3});
  pushSeq(s,p,c.H);
}
function refill(s){
  const cards=s.row.filter(Boolean);
  const add=[]; for(let k=cards.length;k<6;k++){ if(s.deck.length) add.push({id:s.deck.shift(),letters:[]}); else s.deckOut=true; }
  s.row=[...Array(6-cards.length-add.length).fill(null), ...add.reverse(), ...cards];
}


// Livre joué ou défaussé à n'importe quel moment de son tour (hors décision en cours, qui est conservée)
function canBookAct(s,p){ return !s.over && s.pending && s.pending.p===p && s.turn && s.turn.p===p && (s.phase==='main'||s.phase==='end'); }
function bookAction(s,p,type,hk){
  if(!canBookAct(s,p)) throw new Error('not your turn');
  const pl=P(s,p), b=pl.hand[hk]; if(b===undefined) throw new Error('no book');
  const saved=s.pending;
  if(type==='play'){
    if(!bookOk(s,p,b)) throw new Error('condition not met');
    pl.hand.splice(hk,1); pl.played.push(b); pl.first=pl.first||{}; if(pl.first.B===undefined) pl.first.B=Math.ceil(s.turnNo/s.players.length);
    log(s,M('log_playBook',pl.name,M('B_'+b)));
  } else {
    pl.hand.splice(hk,1); s.bookDisc.push(b); log(s,M('log_discard',pl.name,effsTxt(discEff(s,p,b))));
  }
  s.pending=null;
  s.stack.push({k:'restore',p,pd:saved});
  if(type!=='play') pushSeq(s,p,discEff(s,p,b));
  run(s); s.ver=(s.ver||0)+1; return s;
}
// ---------- tours ----------
function startTurn(s,p){
  s.phase='main'; s.turn={p, hired:null}; s.turnNo++;
  ask(s,p,'turn',M('q_turn',pn(s,p)),mainOpts(s,p),{k:'turn',p});
}
function mainOpts(s,p){
  const pl=P(s,p), opts=[];
  s.row.forEach((co,k)=>{ if(!co) return; const c=hireCost(s,p,k,false); if(canPay(pl,0,c)) opts.push({label:M('o_hire',cn(co.id),c),hire:k,cards:[co.id]}); });
  const all=opts.concat(bookOpts(s,p));
  if(!opts.length) all.push({label:M('o_passTurn'),endTurn:1});
  return all;
}
function bookOpts(s,p){
  const pl=P(s,p), opts=[];
  pl.hand.forEach((b,k)=>{ if(bookOk(s,p,b)) opts.push({label:M('o_playBook',M('B_'+b)),play:k,book:b}); });
  pl.hand.forEach((b,k)=>opts.push({label:M('o_discBook',M('B_'+b),effsTxt(discEff(s,p,b))),disc:k,book:b}));
  return opts;
}
function endPrompt(s){
  const p=s.turn.p, pl=P(s,p), opts=[];
  if(pl.hand.length<=3) opts.push({label:M('o_endTurn'),endTurn:1});
  ask(s,p,'end',M(pl.hand.length>3?'q_endTooMany':'q_end',pl.name),opts.concat(bookOpts(s,p)),{k:'end',p});
}
function turnAction(s,p,o,kind){
  const pl=P(s,p);
  if(o.hire!==undefined){ s.stack.push({k:'hire',p,slot:o.hire,free:false}); return; }
  if(o.play!==undefined){ pl.hand.splice(o.play,1); pl.played.push(o.book); pl.first=pl.first||{}; if(pl.first.B===undefined) pl.first.B=Math.ceil(s.turnNo/s.players.length); log(s,M('log_playBook',pl.name,M('B_'+o.book))); if(kind==='turn') s.stack.push({k:'reMain',p}); return; }
  if(o.disc!==undefined){ pl.hand.splice(o.disc,1); s.bookDisc.push(o.book); log(s,M('log_discard',pl.name,effsTxt(discEff(s,p,o.book)))); if(kind==='turn') s.stack.push({k:'reMain',p}); pushSeq(s,p,discEff(s,p,o.book)); return; }
  if(o.endTurn) endTurn(s);
}
function endTurn(s){
  const p=s.turn.p, n=s.players.length;
  autoClaim(s,p);
  if(!s.endTriggered && (vp(s,p)>=8 || s.deckOut)){ s.endTriggered=true; log(s,vp(s,p)>=8?M('log_endVP',pn(s,p),vp(s,p)):M('log_endDeck')); }
  const nx=(p+1)%n;
  if(nx===s.start){ (s.vpRounds=s.vpRounds||[]).push(s.players.map((_,k)=>vp(s,k))); }
  if(s.endTriggered && nx===s.start){ finish(s); return; }
  startTurn(s,nx);
}
function finish(s){
  s.over=true; s.phase='over'; s.pending=null;
  const rank=s.players.map((pl,k)=>({k,vp:vp(s,k),r:pl.rector?1:0,e:pl.emer.length,pr:pl.profs.length,st:pl.students.length}));
  rank.sort((a,b)=>b.vp-a.vp||b.r-a.r||b.e-a.e||b.pr-a.pr||b.st-a.st);
  s.ranking=rank;
  const top=rank[0]; s.winners=rank.filter(x=>x.vp===top.vp&&x.r===top.r&&x.e===top.e&&x.pr===top.pr&&x.st===top.st).map(x=>x.k);
  log(s,M('log_win',s.winners.map(k=>pn(s,k)).join(' & '),top.vp));
}

// ---------- IA ----------
const DEFAULT_W={"dear":3,"vp":7.425,"vp2":0.055,"near":-0.35,"coinN":-1.362,"coinO":-0.222,"inflN":0.403,"inflO":0.119,"lvl":0.151,"stu":-3.917,"stu2":0.198,"prof":-0.81,"prof2":0.011,"abil":-0.083,"trig":0.006,"emer":3.072,"trav":0.225,"journey":-2.019,"ncity":-1.2,"bookOk":7.601,"book":0.34,"emObj":-2.616,"objp":6.534,"woa":-0.41,"rector":-0.669,"rpow":0.677,"r3b":-0.767,"rprog":0.078,"eprog":1.994,"rready":-1.066,"eready":0.021,"sready":-1.042,"opp":-1.821,"vp_":0.396,"vp2_":-0.334,"near_":1.872,"coinN_":3.656,"coinO_":1.133,"inflN_":0.061,"inflO_":0.082,"lvl_":1.165,"stu_":-1.353,"stu2_":0.044,"prof_":2.079,"prof2_":-0.435,"abil_":1.874,"trig_":0.532,"emer_":-12.033,"trav_":0.495,"journey_":-2.51,"ncity_":3.177,"bookOk_":-6.726,"book_":2.022,"emObj_":20.987,"objp_":-6.7,"woa_":2.996,"rector_":-5.227,"rpow_":0.15,"r3b_":3.284,"rprog_":0.435,"eprog_":-3.217,"rready_":-0.538,"eready_":-1.489,"sready_":1.303};
const W_VERSION=4;
let GLOBAL_W=Object.assign({},DEFAULT_W);
let AI_DEPTH=2;
function setAIDepth(d){ AI_DEPTH=d; }
function setWeights(w){ GLOBAL_W=Object.assign({},DEFAULT_W,w||{}); }
function evalState(s,p){
  // évaluation apprise sur des milliers de parties : somme pondérée des ingrédients de la position (voir evalFeat)
  { const pl0=P(s,p), W=LIN||pl0.w||GLOBAL_W; if(s.over) return s.winners.includes(p)?10000:-10000+vp(s,p)*10; const f=evalFeat(s,p); let v=0; for(const k in W){ if(k==='dear') continue; v+=W[k]*(k.charCodeAt(k.length-1)===95?(f[k.slice(0,-1)]||0)*f.early:(f[k]||0)); } return v; }
  const pl=P(s,p), W=pl.w||GLOBAL_W;
  if(s.over) return s.winners.includes(p)?10000:-10000+vp(s,p)*10;
  const myvp=vp(s,p);
  let v = myvp*W.vp + (W.race||0)*myvp*myvp;
  // potentiel de PV à court terme (course) : Livres jouables, objectifs Émérites à portée
  v += (W.near||0)*(pl.hand.filter(b=>bookOk(s,p,b)).length + D.TYPES.filter(t=>pl.emTok[t]===undefined && s.objSlots[t].stack.length && objOk(s,p,s.objSlots[t].tile)).length);
  // réserves : pleine valeur jusqu'au besoin réel (promotions, Recteur, Livres, objectif), faible au-delà
  const need=needs(s,p);
  const sat=(x,k)=>Math.min(x,k)+Math.max(0,x-k)*(W.over===undefined?0.15:W.over);
  v += sat(Math.min(pl.coins,16),need.c)*W.coin + sat(Math.min(pl.infl,16),need.i)*W.infl;
  v += chars(pl).reduce((a,co)=>a+CARD[co.id].lvl*(W.lvl||0),0);
  v += pl.students.length*W.stu + pl.profs.reduce((a,co)=>a+W.prof+CARD[co.id].A.length*W.abil+CARD[co.id].trig.length*W.trig,0) + pl.emer.length*W.emer;
  v += pl.trav.reduce((a,x)=>a+x*W.trav+(x>=12?W.journey:0),0);
  v += pl.hand.reduce((a,b)=>a+(bookOk(s,p,b)?W.bookOk:W.book),0);
  D.TYPES.forEach(t=>{ if(pl.emTok[t]===undefined && pl.emer.some(co=>CARD[co.id].type===t) && s.objSlots[t].stack.length) v+=W.emObj; });
  // progression vers les objectifs Émérites encore disponibles (le personnage du Recteur 3b y contribue)
  D.TYPES.forEach(t=>{ if(pl.emTok[t]!==undefined || !s.objSlots[t].stack.length) return; v+=(W.objp===undefined?2:W.objp)*objProgress(s,p,s.objSlots[t].tile)*(pl.emer.some(co=>CARD[co.id].type===t)?1.5:1); });
  v += woaList(pl).length*W.woa;
  if(pl.rector){ v+=W.rector;
    // pouvoir permanent du Recteur : sa valeur dépend des tours restants
    const left=Math.max(1,11.5-s.turnNo/s.players.length), unit=(W.coin+W.infl)/2;
    const perTurn={'1a':0.8,'1b':1.3,'2a':0.7,'2b':0.5,'3a':0.7,'3b':0.4,'4a':0.8,'4b':1.3}[pl.rector.tile]||0;
    v+=(W.rpow===undefined?1:W.rpow)*perTurn*left*unit + (pl.rector.tile==='3b'?3:0);
  }
  // progression vers le Recteur : influence épargnée si un Professeur peut y prétendre
  if(!pl.rector && pl.profs.some(co=>s.rectSlots[CARD[co.id].type])) v+=Math.min(pl.infl,8)*(W.rprog||0);
  // progression vers l'Émérite : pièces épargnées si un Professeur peut être promu
  if(pl.profs.length) v+=Math.min(pl.coins,6)*(W.eprog||0);
  let opp=0; s.players.forEach((q,k)=>{ if(k!==p) opp=Math.max(opp,vp(s,k)); }); v-=opp*W.opp;
  return v;
}
// ---------- évaluation apprise : mêmes ingrédients, poids ajustés sur des parties (régression) ----------
let LIN=null;
function setLin(o){ LIN=o||null; }
function evalFeat(s,p){
  const pl=P(s,p), n=s.players.length, f={};
  const myvp=vp(s,p); f.vp=myvp; f.vp2=myvp*myvp;
  const nb=pl.hand.filter(b=>bookOk(s,p,b)).length;
  const no=D.TYPES.filter(t=>pl.emTok[t]===undefined && s.objSlots[t].stack.length && objOk(s,p,s.objSlots[t].tile)).length;
  f.near=nb+no;
  const need=needs(s,p), co=Math.min(pl.coins,16), inf=Math.min(pl.infl,16);
  f.coinN=Math.min(co,need.c); f.coinO=Math.max(0,co-need.c); f.inflN=Math.min(inf,need.i); f.inflO=Math.max(0,inf-need.i);
  const ch=chars(pl);
  f.lvl=ch.reduce((a,c)=>a+CARD[c.id].lvl,0);
  f.stu=pl.students.length; f.stu2=f.stu*f.stu; f.prof=pl.profs.length; f.prof2=f.prof*f.prof;
  f.abil=pl.profs.reduce((a,c)=>a+CARD[c.id].A.length,0); f.trig=pl.profs.reduce((a,c)=>a+CARD[c.id].trig.length,0);
  f.emer=pl.emer.length;
  f.trav=pl.trav.reduce((a,x)=>a+x,0); f.journey=pl.trav.filter(x=>x>=12).length;
  let nc=0; pl.trav.forEach((x,tr)=>{ const cy=D.countries[s.tracks[tr]].cities.map(c=>c[0]).filter(m=>m>x); if(cy.length) nc+=1/(cy[0]-x); }); f.ncity=nc;
  f.bookOk=nb; f.book=pl.hand.length-nb;
  let eo=0, op=0;
  D.TYPES.forEach(t=>{ if(pl.emTok[t]!==undefined || !s.objSlots[t].stack.length) return; const has=pl.emer.some(c=>CARD[c.id].type===t); if(has) eo++; op+=objProgress(s,p,s.objSlots[t].tile)*(has?1.5:1); });
  f.emObj=eo; f.objp=op;
  f.woa=woaList(pl).length;
  const left=Math.max(1,11.5-s.turnNo/n);
  f.rector=pl.rector?1:0;
  f.rpow=pl.rector?({'1a':0.8,'1b':1.3,'2a':0.7,'2b':0.5,'3a':0.7,'3b':0.4,'4a':0.8,'4b':1.3}[pl.rector.tile]||0)*left:0;
  f.r3b=pl.rector&&pl.rector.tile==='3b'?1:0;
  const rcan=!pl.rector && pl.profs.some(c=>s.rectSlots[CARD[c.id].type]);
  f.rprog=rcan?Math.min(pl.infl,8):0; f.eprog=pl.profs.length?Math.min(pl.coins,6):0;
  f.rready=rcan&&pl.infl>=8?1:0; f.eready=pl.profs.length&&pl.coins>=6-(hasRect(pl,'4a')?2:0)?1:0;
  f.sready=pl.students.length&&pl.coins>=3-(hasRect(pl,'4a')?2:0)?1:0;
  let opp=0; s.players.forEach((q,k)=>{ if(k!==p) opp=Math.max(opp,vp(s,k)); }); f.opp=opp;
  f.early=left*0.1; f.one=1;
  return f;
}
function evalLin(s,p){
  if(s.over) return s.winners.includes(p)?10000:-10000+vp(s,p)*10;
  const f=evalFeat(s,p); let v=0; for(const k in LIN){ v+=LIN[k]*(k.charCodeAt(k.length-1)===95?(f[k.slice(0,-1)]||0)*f.early:(f[k]||0)); } return v;
}
function summary(s,src){
  const n=s.players.length;
  return {t:Date.now(),src,n,cs:s.tracks.slice(),vpr:s.vpRounds||[],deckOut:!!s.deckOut,turns:s.turnNo,rounds:Math.round(s.turnNo/n*10)/10,start:s.start,
    rects:Object.assign({},s.rectSlotsInit||{}),objs:Object.fromEntries(Object.entries(s.objSlots).map(([k,o])=>[k,o.tile])),
    players:s.players.map((pl,k)=>{ const r=s.ranking.findIndex(x=>x.k===k);
      return {seat:(k-(s.start||0)+n)%n,ai:pl.ai,lvl:pl.ai?(pl.lvl||3):undefined,vp:vp(s,k),rank:r+1,win:s.winners.includes(k),start:pl.start||[],g:pl.g||{},first:pl.first||{},nAct:pl.nAct||0,nPromo:pl.nPromo||0,slots:pl.hireSlot||[],letters:pl.lettersK||[],trav:pl.trav.slice(),hires:pl.hires||[],hcost:pl.hireCost||[],
        fin:{s:pl.students.map(c=>c.id),p:pl.profs.map(c=>c.id),e:pl.emer.map(c=>c.id),r:pl.rector?pl.rector.card.id:null},
        rect:pl.rector?pl.rector.tile:null,books:pl.played.slice(),em:Object.assign({},pl.emTok),bol:pl.bologna,cst:pl.constTok.length,
        cities:pl.citiesK||[],j:journeys(pl),coins:pl.coins,infl:pl.infl,promos:pl.promos||{S:0,E:0,R:0}}; })};
}
function W0(){ return GLOBAL_W; }
// l'IA ne doit pas connaître l'ordre des pioches : on les mélange dans la copie qu'elle évalue
function hiddenClone(s){ const c=simClone(s); const sh=a=>{ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } }; if(c.deck) sh(c.deck); if(c.bookDeck) sh(c.bookDeck); return c; }
function aiChooseGreedy(s,depth){
  depth=depth||0;
  const pd=s.pending, p=pd.p;
  if(pd.opts.length===1) return 0;
  if(depth===0) s=hiddenClone(s);
  let best=0, bv=-Infinity;
  const lim = depth===0?pd.opts.length:Math.min(pd.opts.length,8);
  for(let k=0;k<lim;k++){
    const o=pd.opts[k];
    let c; try{ c=simClone(s); choose(c,k); }catch(e){ continue; }
    let guard=0;
    while(c.pending && c.pending.p===p && !c.over && guard<12 && depth<AI_DEPTH && c.pending.kind!=='turn'){
      guard++;
      if(c.pending.kind==='end'){ const pi=c.pending.opts.findIndex(x=>x.play!==undefined), ei=c.pending.opts.findIndex(x=>x.endTurn);
        choose(c, pi>=0?pi:(ei>=0?ei:c.pending.opts.findIndex(x=>x.disc!==undefined))); break; }
      choose(c,aiChooseGreedy(c,depth+1));
    }
    let v=evalState(c,p) + (o.pass?-0.3:0) + rnd({rng:k*7+s.ver})*0.2;
    // payer cher (4-5 d'influence) seulement si ça rapporte des PV tout de suite
    if(pd.kind==='turn' && o.hire!==undefined && depth===0){ const cost=hireCost(s,p,o.hire,false); if(cost>=3 && vp(c,p)<=vp(s,p)) v-=(W0().dear===undefined?1:W0().dear)*Math.pow(cost-2,1.5); }
    if(o.endTurn) v+=0.5;
    if(v>bv){ bv=v; best=k; }
  }
  return best;
}


// ---------- IA qui anticipe (simulations de fins de partie) ----------
const effVal=e=>{ if(e.c) return e.c; if(e.i) return e.i*1.1; if(e.ci) return e.ci*1.1; if(e.t) return e.t*0.9; if(e.tr) return e.n*0.8; if(e.b) return e.b*1.8; if(e.l) return e.l*1.5; if(e.r) return 0.5; if(e.p) return 2.5; if(e.pf) return 5; if(e.take) return 3; if(e.elim) return -1.5; if(e.per) return 3; return 0; };
const cardVal=id=>{ const c=CARD[id]; return c.H.reduce((a,e)=>a+effVal(e),0)+c.A.reduce((a,e)=>a+effVal(e),0)*1.3+c.trig.length*0.8+c.lvl*1.2+(c.woa?0.8:0); };
let FP={"cost": 3.98, "act0": 0.994, "act": 2.85, "promoER": 17.591, "promoS": 3.269, "R": 14.5, "E": 29.609, "S": 1.282, "lvl": 0.803, "abil": 1.167, "trig": 0.338, "woa": 0.187, "book": 1.042, "city": 2.369, "cityd": 0.479, "noise": 0.394, "save8": 0.414};
function setFP(o){ Object.assign(FP,o||{}); }
const cardValF=id=>{ const c=CARD[id]; return c.H.reduce((a,e)=>a+effVal(e),0)+c.A.reduce((a,e)=>a+effVal(e),0)*FP.abil+c.trig.length*FP.trig+c.lvl*FP.lvl+(c.woa?FP.woa:0); };
function fastChoose(s){
  const pd=s.pending, p=pd.p, pl=P(s,p), O=pd.opts;
  let best=0, bv=-1e9;
  const rectWant=!pl.rector && pl.profs.some(co=>s.rectSlots[CARD[co.id].type]);
  O.forEach((o,k)=>{
    let v=Math.random()*FP.noise;
    if(o.pass) v-=3;
    if(o.play!==undefined) v+=100;
    if(o.endTurn) v+=50;
    if(o.disc!==undefined) v+=(pd.kind==='end'?10:-20);
    if(o.hire!==undefined){ const c=hireCost(s,p,o.hire,false); v+=cardValF(s.row[o.hire].id)-c*FP.cost - (rectWant && pl.infl-c<8 && pl.infl>=8 ? FP.save8:0); }
    if(o.slot!==undefined && s.row[o.slot]) v+=cardValF(s.row[o.slot].id);
    if(o.act){ v+=FP.act0+pl.profs.filter(co=>CARD[co.id].trig.includes(o.act)).length*FP.act; }
    if(o.promo) v+=promoOptions(s,p).some(x=>x.to!=='S')?FP.promoER:FP.promoS;
    if(o.to) v+= o.to==='R'?FP.R:o.to==='E'?FP.E:FP.S-o.idx*0.3;
    if(o.c) v+= pl.coins<pl.infl?1:0;
    if(o.i) v+= pl.infl<=pl.coins?1:0;
    if(o.tr!==undefined && pd.kind==='move'){ const cy=D.countries[s.tracks[o.tr]].cities.map(c=>c[0]).filter(n=>n>pl.trav[o.tr]); v+= cy.length? FP.city-(cy[0]-pl.trav[o.tr])*FP.cityd : -2; }
    if(o.pair!==undefined){ const pr=s.pairs[o.pair]; v+=cardValF(pr[0])+cardValF(pr[1]); }
    if(o.prof) v+=CARD[o.prof].A.reduce((a,e)=>a+effVal(e),0);
    if(o.book!==undefined && pd.kind!=='turn' && pd.kind!=='end') v+= bookOk(s,p,o.book)?-5:0;
    if(v>bv){ bv=v; best=k; }
  });
  return best;
}
function playout(c,p,cap){
  let n=0, at8=null;
  while(!c.over && c.pending && n<cap){ choose(c,fastChoose(c)); n++; if(at8===null && vp(c,p)>=8) at8=c.turnNo; }
  return at8;
}
let MC={on:false, sims:6, cap:4000};
function setMC(o){ Object.assign(MC,o||{}); }
const MC_KINDS={turn:1,choice:1,promo:1};
function mcScore(c,p,at8){
  const n=c.players.length;
  if(c.over){
    const win=c.winners.includes(p)?1/c.winners.length:0;
    const rounds=(at8!==null?at8:c.turnNo)/n;
    // gagner, et vite : chaque tour gagné compte, dépasser 8 PV ne rapporte rien
    return win*2 + (at8!==null? (16-rounds)*0.12 : vp(c,p)*0.05);
  }
  return vp(c,p)*0.1;
}
// Planification sur deux tours : pour chaque choix, on joue la fin de mon tour, puis les adversaires (rapidement),
// puis on cherche ma meilleure embauche au tour suivant ; on garde le choix qui mène à la meilleure position.
let PLAN={on:false, oppFast:true};
function setPlan(o){ Object.assign(PLAN,o||{}); }
function finishOwnTurn(c,p){ let g=0; while(c.pending&&!c.over&&c.pending.p===p&&g<60){ choose(c,fastChoose(c)); g++; } }
function finishOwnTurnGreedy(c,p){ let g=0; while(c.pending&&!c.over&&c.pending.p===p&&g<40){ if(c.pending.kind==='turn'&&g>0) break; choose(c,aiChooseGreedy(c,1)); g++; } }
function bestNextTurn(c,p){
  // adversaires jusqu'à mon prochain tour
  let g=0; while(c.pending&&!c.over&&c.pending.p!==p&&g<400){ choose(c,fastChoose(c)); g++; }
  if(c.over) return evalState(c,p);
  if(!c.pending||c.pending.kind!=='turn') return evalState(c,p);
  let bv=-1e9;
  const O=c.pending.opts;
  for(let k=0;k<O.length;k++){ if(O[k].disc!==undefined) continue; const d=simClone(c); choose(d,k); finishOwnTurn(d,p); const v=evalState(d,p)+(vp(d,p)>=8?40:0); if(v>bv) bv=v; }
  return bv;
}
function aiPlan(s){
  const pd=s.pending, p=pd.p;
  let best=0, bv=-1e9;
  for(let k=0;k<pd.opts.length;k++){
    const o=pd.opts[k]; if(o.disc!==undefined && pd.kind==='turn') continue;
    let c; try{ c=simClone(s); choose(c,k); }catch(e){ continue; }
    finishOwnTurnGreedy(c,p);
    const now=evalState(c,p)+(vp(c,p)>=8?60:0);
    let v=now;
    if(!c.over && vp(c,p)<8){ v=0.4*now+0.6*bestNextTurn(c,p); }
    if(v>bv){ bv=v; best=k; }
  }
  return best;
}
const LVL={1:{mist:0.63,noise:0.8,rand:0.15},2:{mist:0.42,noise:0.5,rand:0.05}};
function aiChoose(s,depth){
  const pd=s.pending, pl=pd&&s.players[pd.p], lv=(pl&&pl.lvl)||3;
  if(depth||lv>=3) return aiChooseHard(s,depth);
  if(!LVL[lv]||Math.random()>=LVL[lv].mist) return aiChooseGreedy(s,depth);   // Moyen et Facile : heuristique seule (sans MCTS)
  return aiChooseWeak(s,LVL[lv]);
}
function aiChooseWeak(s,cfg){
  const pd=s.pending, p=pd.p, n=pd.opts.length;
  if(n<=1) return 0;
  if(Math.random()<cfg.rand) return Math.floor(Math.random()*n);
  const hs=hiddenClone(s); const sc=pd.opts.map((o,k)=>{ const c=simClone(hs); choose(c,k); return evalState(c,p); });
  const m=sc.reduce((a,b)=>a+b,0)/n, sd=Math.sqrt(sc.reduce((a,b)=>a+(b-m)*(b-m),0)/n)||1;
  const g=()=>{ let u=0,v=0; while(!u) u=Math.random(); while(!v) v=Math.random(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); };
  let best=0,bv=-Infinity; sc.forEach((x,k)=>{ const y=x+cfg.noise*sd*g(); if(y>bv){bv=y;best=k;} });
  return best;
}
// ---------- MCTS (recherche arborescente Monte-Carlo, à information cachée) ----------
// À chaque itération : on tire une pioche possible, on descend dans l'arbre des décisions (UCB),
// on termine le tour (+H tours) avec l'heuristique, puis on note la position avec l'évaluation apprise.
let TREE={on:false,iters:400,c:0.6,H:0,S:15,pol:1,kinds:null,R:4,fpu:0.15};
function setTree(o){ Object.assign(TREE,o||{}); }
function treePolicy(c){ const pd=c.pending; if(pd.opts.length===1) return 0;
  if(pd.kind==='end'){ const pi=pd.opts.findIndex(x=>x.play!==undefined); if(pi>=0) return pi; }
  return aiChooseGreedy(c,TREE.pol); }
function treeValue(c){ const n=c.players.length, ev=new Array(n), out=new Array(n);
  if(c.over){ for(let k=0;k<n;k++) out[k]=c.winners.includes(k)?1:-1; return out; }
  for(let k=0;k<n;k++) ev[k]=evalState(c,k);
  for(let k=0;k<n;k++){ let m=-1e9; for(let j=0;j<n;j++) if(j!==k&&ev[j]>m) m=ev[j]; out[k]=Math.tanh((ev[k]-m)/TREE.S); }
  return out; }
function aiTree(s){
  const root={N:0,ch:[]}, t0=s.turnNo, stopT=t0+1+TREE.H, C=TREE.c, R=TREE.R||4, fpu=TREE.fpu===undefined?0.15:TREE.fpu;
  // R pioches possibles, réutilisées à tour de rôle : toutes les options sont comparées sur les mêmes tirages
  const bases=[]; for(let r=0;r<R;r++){ const b=hiddenClone(s); b.rng=(b.rng+r*7919+1)>>>0; bases.push(b); }
  for(let it=0; it<TREE.iters; it++){
    const c=simClone(bases[it%R]);
    let node=root; const path=[]; let g=0;
    while(!c.over && g<80){ g++;
      const pd=c.pending;
      if(pd.opts.length===1){ choose(c,0); continue; }
      if(c.turnNo>=stopT) break;
      if(!node.ch){ node.ch=[]; }
      const L=pd.opts.length; let best=-1, bv=-1e9;
      if(node===root){ // racine : chaque option est d'abord essayée sur chaque tirage, puis UCB
        const lg=Math.log(node.N+1);
        for(let k=0;k<L;k++){ const ch=node.ch[k]; if(!ch||ch.n<R){ best=k; break; } const u=ch.w/ch.n+C*Math.sqrt(lg/ch.n); if(u>bv){ bv=u; best=k; } }
      } else if(node.N===0){ best=treePolicy(c); }
      else { const lg=Math.log(node.N+1); let tw=0; for(let k=0;k<L;k++){ const ch=node.ch[k]; if(ch) tw+=ch.w; } const mean=tw/node.N;
        for(let k=0;k<L;k++){ const ch=node.ch[k]; const u=ch?ch.w/ch.n+C*Math.sqrt(lg/ch.n):mean-fpu+C*Math.sqrt(lg); if(u>bv){ bv=u; best=k; } } }
      if(!node.ch[best]) node.ch[best]={n:0,w:0,node:{N:0}};
      path.push(node,best,pd.p);
      try{ choose(c,best); }catch(e){ break; }
      node=node.ch[best].node;
    }
    g=0; while(!c.over && c.pending && c.turnNo<stopT && g<400){ choose(c,treePolicy(c)); g++; }
    const val=treeValue(c);
    for(let i=0;i<path.length;i+=3){ const nd=path[i], ch=nd.ch[path[i+1]]; nd.N++; ch.n++; ch.w+=val[path[i+2]]; }
  }
  let bk=0, bn=-1; for(let k=0;k<s.pending.opts.length;k++){ const ch=root.ch[k]; if(ch&&(ch.n>bn||(ch.n===bn&&ch.w>root.ch[bk].w))){ bn=ch.n; bk=k; } }
  return bk;
}
function aiChooseHard(s,depth){
  const pd=s.pending;
  if(TREE.on && !depth && pd.opts.length>1 && (s.phase==='main'||s.phase==='end') && (!TREE.kinds||TREE.kinds[pd.kind])) return aiTree(s);
  if(PLAN.on && pd.kind==='turn' && pd.opts.length>1 && !depth) return aiPlan(s);
  if(!MC.on || !MC_KINDS[pd.kind] || pd.opts.length<2) return aiChooseGreedy(s,depth);
  const p=pd.p;
  let idx=pd.opts.map((o,k)=>k);
  if(pd.kind==='end'){ const pi=idx.find(k=>pd.opts[k].play!==undefined); if(pi!==undefined) return pi; }
  if(idx.length>9){ // préfiltre par l'heuristique gloutonne rapide
    const sc=idx.map(k=>{ const c=simClone(s); choose(c,k); return [k,evalState(c,p)]; }).sort((a,b)=>b[1]-a[1]);
    idx=sc.slice(0,9).map(x=>x[0]);
  }
  let best=idx[0], bv=-1e9;
  for(const k of idx){
    let tot=0;
    for(let r=0;r<MC.sims;r++){
      const c=simClone(s); c.rng=(c.rng+r*7919+k*104729)>>>0;
      try{ choose(c,k); }catch(e){ tot=-1e9; break; }
      const at8=(vp(c,p)>=8)?c.turnNo:playout(c,p,MC.cap);
      tot+=mcScore(c,p,at8);
    }
    const v=tot/MC.sims + (pd.opts[k].pass?-0.05:0);
    if(v>bv){ bv=v; best=k; }
  }
  return best;
}

global.MagEngine = {setTree, getTree:()=>Object.assign({},TREE), setLin, evalFeat, bookAction, canBookAct, wild, W_VERSION, setPlan, setFP, getFP:()=>Object.assign({},FP), setMC, fastChoose, setAIDepth, COLORS, summary, setWeights, DEFAULT_W, getWeights:()=>Object.assign({},GLOBAL_W), newGame, choose, aiChoose, vp, CARD, BOOK, bookOk, woaList, effsTxt, effTxt, clone, TR, M};
})(typeof window!=='undefined'?window:globalThis);
