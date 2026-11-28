(function(){
const D=window.MAG, E=window.MagEngine, CARD=E.CARD, BOOK=E.BOOK, DICT=window.MAG_I18N;
const $=s=>document.querySelector(s);
const el=(tag,attrs,...kids)=>{ const e=document.createElement(tag); if(attrs) for(const k in attrs){ if(k==='class') e.className=attrs[k]; else if(k==='style') e.style.cssText=attrs[k]; else if(k.startsWith('on')) e.addEventListener(k.slice(2),attrs[k]); else if(attrs[k]!==undefined&&attrs[k]!==null&&attrs[k]!==false) e.setAttribute(k,attrs[k]); } kids.flat().forEach(c=>{ if(c==null||c===false) return; e.appendChild(typeof c==='string'||typeof c==='number'?document.createTextNode(String(c)):c); }); return e; };
const COUNTRY_IMG={ITA:'ita',FRA:'fra',ENG:'eng',POR:'por',SPA:'spa',GER:'ger',BYZ:'byz',MOR:'mor',SLK:'slk'};
const SEATCOL=['#c0392b','#2471a3','#d4ac0d','#7d3c98'];
const PALETTE=['#c0392b','#2471a3','#d4ac0d','#7d3c98','#27864a','#e67e22','#2b2b2b','#f4f1ea'];
const tokTxt=c=>(c==='#d4ac0d'||c==='#f4f1ea')?'#2b1405':'#fff';
let palOpen=-1;
const store={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}},del(k){try{localStorage.removeItem(k)}catch(e){}}};

// =========== TRADUCTION ===========
E.setTree({on:true,iters:400});   // Flaminia (Difficile) réfléchit par MCTS dans les parties jouées
let LANG=store.get('mag_lang'); if(!DICT[LANG]){ const n=(navigator.language||'fr').slice(0,2); LANG=DICT[n]?n:'fr'; }
// Règle choisie à l'accueil ('classic' = 8 PV, 'six' = règle des 6) ; en partie, c'est la règle de la partie qui compte.
let homeRule=store.get('mag_rule')==='six'?'six':'classic';
function curRules(){ try{ const g=document.getElementById('game'); if(S&&g&&!g.classList.contains('hidden')) return E.rulesOf(S); }catch(e){} return E.RULESETS[homeRule]; }
const SIXTXT=[['8 PV','6 PV'],['8 VP','6 VP'],['8 points de victoire','6 points de victoire'],['8 victory points','6 victory points'],['8 punti vittoria','6 punti vittoria'],['8 puntos de victoria','6 puntos de victoria'],
 ['8 [infl]','6 [infl]'],['Coût : 8 influence','Coût : 6 influence'],['Cost: 8 influence','Cost: 6 influence'],['Costo: 8 influenza','Costo: 6 influenza'],['Coste: 8 de influencia','Coste: 6 de influencia'],
 ['3 PV pour le premier, 2 PV ensuite','2 PV pour le premier ; le deuxième prend 1 PV à 3 joueurs, 2 PV à 4 joueurs (aucun à 2 joueurs)'],['3 VP for the first, 2 VP afterwards','2 VP for the first; the second takes 1 VP with 3 players, 2 VP with 4 (none with 2 players)'],['3 PV per il primo, poi 2 PV','2 PV per il primo; il secondo prende 1 PV a 3 giocatori, 2 PV a 4 (nessuno a 2 giocatori)'],['3 PV para el primero, 2 PV después','2 PV para el primero; el segundo toma 1 PV con 3 jugadores, 2 PV con 4 (ninguno con 2 jugadores)'],
 ['(3 puis 2)','(2, puis 1 ou 2 selon le nombre de joueurs)'],['(3, then 2)','(2, then 1 or 2 depending on the number of players)'],['(3, poi 2)','(2, poi 1 o 2 a seconda del numero di giocatori)'],['(3 y luego 2)','(2, luego 1 o 2 según el número de jugadores)']];
function ruleTxt(d){ if(curRules().goal!==6) return d; for(const [a,b] of SIXTXT) if(d.indexOf(a)>=0) d=d.split(a).join(b); return d; }
function tm(x){
  if(x==null) return ''; if(typeof x==='string'||typeof x==='number') return String(x);
  if(Array.isArray(x)) return x.map(tm).join(', ');
  if(x.m==='+') return x.a.map(tm).join(' + ');
  const d=DICT[LANG][x.m]!==undefined?DICT[LANG][x.m]:(DICT.fr[x.m]!==undefined?DICT.fr[x.m]:x.m);
  const a=(x.a||[]).map(tm);
  return typeof d==='function'?d(a):(String(x.m).startsWith('ui_rule')?d:ruleTxt(d)).replace(/\{(\d)\}/g,(_,i)=>a[i]!==undefined?a[i]:'');
}
const t=(k,...a)=>tm({m:k,a});
const TN=ty=>t('T_'+ty), LN=l=>t('L_'+l), WN=w=>t('W_'+w);
function applyStatic(){
  document.documentElement.lang=LANG;
  document.querySelectorAll('[data-i18n]').forEach(n=>n.textContent=t(n.dataset.i18n));
  document.querySelectorAll('[data-i18n-html]').forEach(n=>n.innerHTML=t(n.dataset.i18nHtml));
  document.querySelectorAll('.langbar button').forEach(b=>b.classList.toggle('on',b.dataset.lang===LANG));
  $('#langSel').value=LANG;
  document.querySelectorAll('#ruleSeg button').forEach(b=>b.classList.toggle('on',b.dataset.r===homeRule)); const rs=$('#ruleSub'); if(rs) rs.textContent=t(homeRule==='six'?'ui_rule6Sub':'ui_rule8Sub');
  if(!db && !onlineFailed) $('#onlineOff').textContent=t('ui_onlineWait');
  if(onlineFailed) $('#onlineOff').textContent=t('ui_onlineNo');
}
function setLang(l){ LANG=l; store.set('mag_lang',l); 
applyStatic(); renderSeats(); countryBoxes('#cboxL',true); if(table&&table.status==='lobby') renderTable(); if(S) render(); if(view==='tuto') renderTuto(); if(view==='stats'&&STATS) renderStats(); if(view==='sim') renderSim(); }
document.querySelectorAll('.langbar button').forEach(b=>b.onclick=()=>setLang(b.dataset.lang));
document.querySelectorAll('#ruleSeg button').forEach(b=>b.onclick=()=>{ homeRule=b.dataset.r; store.set('mag_rule',homeRule); setLang(LANG); });
$('#langSel').onchange=e=>setLang(e.target.value);

let hist=[], myLastVer=-1;
let S=null, mode=null, mySeats=[], tab=null, filter=null, aiTimer=null, busy=false;
let db=null, myUid=null, table=null, tableUnsub=null, tableCode=null, onlineFailed=false;

// =========== ACCUEIL ===========
const AINAMES=['Flaminia (IA)','Virginio (IA)','Marco (IA)'];
const LVLNAME={3:'Flaminia',2:'Virginio',1:'Marco'};
const LVLCOL={3:['#d4a017','#b8860b','#e8c15a'],2:['#a9b2bc','#7f8a96','#c9d0d6'],1:['#b06a2c','#8c4f1d','#c98a52']};
function aiColor(lvl,taken,self){ const L=LVLCOL[lvl]||LVLCOL[3]; return L.find(c=>!taken.some(x=>x!==self&&x.color===c))||L[0]; }
function aiName(lvl,taken,self){ const base=LVLNAME[lvl]||'IA'; let n=base+' (IA)', k=2; while(taken.some(x=>x!==self&&x.name===n)){ n=base+' '+k+' (IA)'; k++; } return n; }
function isAutoName(n){ return !n||/^(Flaminia|Virginio|Marco)( \d+)? \(IA\)$/.test(n)||n==='IA'; }
let seats=[{name:store.get('mag_name')||'',ai:false},{name:'',ai:true}];
function renderSeats(){
  const box=$('#localSeats'); box.innerHTML='';
  document.querySelectorAll('#nSeg button').forEach(b=>b.classList.toggle('on',+b.dataset.n===seats.length));
  seats.forEach((s,k)=>{
    if(s.ai&&!s.lvl) s.lvl=defLvl();
    if(s.ai&&isAutoName(s.name)) s.name=aiName(s.lvl,seats,s);
    if(s.ai&&!s.manCol) s.color=aiColor(s.lvl,seats,s);
    else if(!s.color||seats.some((o,j)=>j<k&&o.color===s.color)) s.color=PALETTE.find(c=>!seats.some((o,j)=>j!==k&&o.color===c));
    box.appendChild(el('div',{class:'pseat'},
      el('button',{class:'tok',title:t('ui_color'),style:'background:'+s.color+';color:'+tokTxt(s.color),onclick:()=>{ palOpen=palOpen===k?-1:k; renderSeats(); }},k+1),
      el('input',{value:s.name,placeholder:k===0?t('ui_me'):t('ui_player1')+' '+(k+1),maxlength:18,oninput:e=>{s.name=e.target.value;}}),
      el('div',{class:'tog'},
        el('button',{class:s.ai?'':'on',onclick:()=>{ if(s.ai){ s.ai=false; if(/\(IA\)/.test(s.name)) s.name=''; renderSeats(); } }},t('ui_human')),
        el('button',{class:s.ai?'on':'',onclick:()=>{ if(!s.ai){ s.ai=true; s.lvl=s.lvl||defLvl(); if(isAutoName(s.name)) s.name=aiName(s.lvl,seats,s); renderSeats(); } }},t('ui_ai'))),
      s.ai?lvlTog(s.lvl||defLvl(),v=>{ s.lvl=v; s.manCol=false; store.set('mag_ailvl',v); if(isAutoName(s.name)) s.name=aiName(v,seats,s); renderSeats(); }):null));
    if(palOpen===k) box.appendChild(colorRow(s.color,seats.filter((o,j)=>j!==k).map(o=>o.color),c=>{ s.color=c; s.manCol=true; palOpen=-1; renderSeats(); }));
  });
}
function defLvl(){ return +(store.get('mag_ailvl')||3); }
function lvlTog(cur,set){ return el('div',{class:'tog lvl',title:t('ui_lvl')},[1,2,3].map(v=>el('button',{class:cur===v?'on':'',onclick:()=>set(v)},t('ui_lvl'+v)))); }
function colorRow(cur,taken,pick){
  return el('div',{class:'pal'},PALETTE.map(c=>el('button',{class:c===cur?'on':'',style:'background:'+c,disabled:taken.includes(c)?'':null,title:c,onclick:()=>pick(c)})));
}
document.querySelectorAll('#nSeg button').forEach(b=>b.onclick=()=>{ const n=+b.dataset.n; while(seats.length<n){ const ns={ai:true,lvl:defLvl()}; ns.name=aiName(ns.lvl,seats,ns); seats.push(ns); } seats.length=n; renderSeats(); });
function countryBoxes(id,keep){
  const box=$(id); if(!box) return;
  const prev=keep?[...box.querySelectorAll('input:checked')].map(x=>x.value):[];
  box.innerHTML='';
  Object.keys(D.countries).forEach(k=>{
    const inp=el('input',{type:'checkbox',value:k,checked:prev.includes(k)?'':null});
    inp.addEventListener('change',()=>limitCountries(id));
    box.appendChild(el('label',{title:D.countries[k].cities.map(c=>t('CY_'+c[1])).join(' · ')},inp,el('img',{src:'tok/country_'+COUNTRY_IMG[k]+'.webp',alt:''}),el('span',{},t('C_'+k))));
  });
  limitCountries(id);
}
function limitCountries(id){
  const ins=[...document.querySelectorAll(id+' input')]; const n=ins.filter(x=>x.checked).length;
  ins.forEach(x=>x.disabled=!x.checked&&n>=3);
}
function randomCountries(id){
  const keys=Object.keys(D.countries);
  for(let i=keys.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [keys[i],keys[j]]=[keys[j],keys[i]]; }
  const pick=keys.slice(0,3);
  document.querySelectorAll(id+' input').forEach(x=>{ x.disabled=false; x.checked=pick.includes(x.value); });
  limitCountries(id);
}
function pickedCountries(id){ return [...document.querySelectorAll(id+' input:checked')].map(x=>x.value); }
$('#randL').onclick=()=>randomCountries('#cboxL');
$('#startLocal').onclick=()=>{
  const cs=pickedCountries('#cboxL');
  if(cs.length && cs.length!==3){ alertBox(t('ui_pick3')); return; }
  if(seats[0].name) store.set('mag_name',seats[0].name);
  S=E.newGame({players:seats.map((s,k)=>({name:s.name||(k===0?t('ui_me'):t('ui_player1')+' '+(k+1)),ai:s.ai,lvl:s.ai?(s.lvl||defLvl()):undefined,color:s.color})),countries:cs.length?cs:null,rules:homeRule,seed:(Math.random()*2**32)>>>0});
  startLocal();
};
$('#resumeLocal').onclick=()=>{ try{ S=JSON.parse(store.get('mag_local')); if(S.v!==2) throw 0; startLocal(); }catch(e){ store.del('mag_local'); checkResume(); } };
function startLocal(){ hist=[]; mode='local'; mySeats=S.players.map((p,k)=>p.ai?-1:k).filter(k=>k>=0); tab=null; showGame(); afterChange(); }
function goHome(){ if(tourOn) endTour(); $('#coach').classList.add('hidden'); hist=[]; if(tableUnsub){ tableUnsub(); tableUnsub=null; } clearTimeout(aiTimer); S=null; mode=null; $('#game').classList.add('hidden'); $('#decide').classList.add('hidden'); $('#lobby').classList.remove('hidden'); checkResume(); if(table) renderTable(); setView('play'); }
$('#quit').onclick=()=>{ if(!S||S.over){ goHome(); return; } zoomShow(el('div',{class:'zt'},el('h3',{},t('ui_quitQ')),el('p',{},t(mode==='local'?'ui_quitLocal':'ui_quitOnline')),el('div',{class:'row-f',style:'justify-content:flex-end'},el('button',{onclick:zoomHide},t('ui_cancel')),el('button',{class:'primary',onclick:()=>{ zoomHide(); goHome(); }},t('ui_quitYes'))))); };
function checkResume(){ let ok=false; try{ const r=JSON.parse(store.get('mag_local')); ok=r&&r.v===2&&!r.over; }catch(e){} $('#resumeLocal').classList.toggle('hidden',!ok); }
function showGame(){ $('#lobby').classList.add('hidden'); $('#game').classList.remove('hidden'); $('#decide').classList.remove('hidden'); window.scrollTo(0,0); }
function alertBox(msg){ zoomShow(el('div',{class:'zt'},el('p',{},msg),el('button',{onclick:zoomHide},t('ui_ok')))); }

// =========== ACTIONS ===========
function isMine(p){ return mySeats.includes(p); }
function act(k){
  if(busy) return; filter=null;
  if(S&&S.pending&&isMine(S.pending.p)){ hist.push(JSON.stringify(S)); if(hist.length>40) hist.shift(); }
  if(mode==='local'){ try{ E.choose(S,k); }catch(e){ console.error(e); alertBox(t('ui_engineErr',e.message)); } afterChange(); return; }
  if(mode==='online') onlineAct(k);
}
function afterChange(){
  maybeRecord();
  if(mode==='local'){ if(S.over) store.del('mag_local'); else store.set('mag_local',JSON.stringify(S)); }
  render(); scheduleAI();
}
function scheduleAI(){
  clearTimeout(aiTimer);
  if(!S||S.over||!S.pending) return;
  if(!S.players[S.pending.p].ai) return;
  if(mode==='online' && !(table && table.host===myUid)) return;
  aiTimer=setTimeout(()=>{
    if(!S||!S.pending||!S.players[S.pending.p].ai) return;
    const k=E.aiChoose(S);
    if(mode==='local'){ E.choose(S,k); afterChange(); } else onlineAct(k,true);
  }, S.pending.kind==='turn'?700:380);
}


const hidSig=s=>s?[s.deck.length,s.bookDeck.length,s.players.map(p=>p.hand.length+p.played.length).join(',')].join('|'):'';
function canUndo(){
  if(!hist.length||!S||S.over) return false;
  // pas d'annulation après une pioche (cartes ou Livres) : l'information cachée a été révélée
  try{ const prev=JSON.parse(hist[hist.length-1]); if(prev.deck.length!==S.deck.length||prev.bookDeck.length!==S.bookDeck.length) return false; }catch(e){}
  if(mode==='online') return S.ver===myLastVer;
  return true;
}
async function undo(){
  if(!canUndo()) return;
  clearTimeout(aiTimer);
  const prev=JSON.parse(hist.pop());
  if(mode==='local'){ S=prev; filter=null; afterChange(); return; }
  prev.ver=(S.ver||0)+1; S=prev; myLastVer=-1; render();
  try{ await db.doc('tables/'+table.code).update({state:JSON.stringify(prev),rev:prev.ver}); }catch(e){ alertBox(t('ui_writeErr',e.code||e.message)); }
}
function boardHelp(pl){
  const red=(pl.rector&&pl.rector.tile==='4a')?2:0, C=n=>el('span',{class:'coin',style:'transform:scale(.8)'},n), I=n=>el('span',{class:'seal',style:'transform:scale(.8)'},n);
  const row=(a,b,cost)=>el('span',{class:'bh'},icon(a,20,''),'→',icon(b,20,''),' ',...cost);
  return el('div',{class:'bhelp'},
    el('div',{},el('b',{},t('ui_promoCosts')+' '),
      row('stu','prof',[C(Math.max(0,3-red)),' + ',I('#')]),
      row('prof','emer',[C(Math.max(0,6-red)),' + ',I('#')]),
      row('prof','rect',[C(red?'#−2':'#'),' + ',I(curRules().rcost)]),
      el('span',{class:'muted',style:'font-size:12px'},t('ui_promoPosNote'))),
    el('div',{},el('b',{},t('ui_boardAct')+' '),D.TYPES.map(ty=>el('span',{class:'bh',title:tm(E.effsTxt(D.BOARD[ty]))},icon('t_'+ty,20,'width:20px'),'→',...D.BOARD[ty].map(fx=>fx.b?icon('book',22,''):fx.c?C(fx.c):fx.i?I(fx.i):fx.t?el('span',{style:'display:inline-flex;align-items:center'},icon('trav',22,''),el('b',{},fx.t)):el('span',{},tm(E.effsTxt([fx]))))))));
}
function hasRect2a(pl){ return pl.rector&&pl.rector.tile==='2a'; }
document.addEventListener('click',function bkOutside(){ document.querySelectorAll('.bk.open').forEach(x=>x.classList.remove('open')); });
async function bookAct(type,hk){
  if(busy||!S) return;
  const p=S.pending&&S.pending.p; if(!isMine(p)) return;
  hist.push(JSON.stringify(S)); if(hist.length>40) hist.shift();
  if(mode==='local'){ try{ E.bookAction(S,p,type,hk); }catch(e){ alertBox(t('ui_engineErr',e.message)); } afterChange(); return; }
  busy=true; const next=E.clone(S);
  try{ E.bookAction(next,p,type,hk); }catch(e){ busy=false; alertBox(t('ui_engineErr',e.message)); return; }
  S=next; myLastVer=next.ver; render();
  try{ await db.doc('tables/'+table.code).update({state:JSON.stringify(next),rev:next.ver,status:next.over?'over':'play'}); }catch(e){ alertBox(t('ui_writeErr',e.code||e.message)); }
  busy=false; renderDecide(); scheduleAI();
}
// =========== RENDU ===========
function cardImg(id){
  const im=el('img',{class:'card',src:'cards/'+id+'.webp',alt:CARD[id].name,'data-cid':id,loading:'lazy'});
  im.addEventListener('click',()=>cardClick(id));
  return im;
}
function selectableIds(){
  const pd=S&&S.pending; if(!pd||!isMine(pd.p)) return new Set();
  const ids=new Set(); pd.opts.forEach(o=>(o.cards||[]).forEach(c=>ids.add(c))); return ids;
}
function cardClick(id){
  const pd=S.pending;
  if(pd && isMine(pd.p)){
    const m=pd.opts.map((o,k)=>[o,k]).filter(([o])=>(o.cards||[]).includes(id));
    if(m.length===1){ act(m[0][1]); return; }
    if(m.length>1){ filter=m.map(x=>x[1]); renderDecide(); return; }
  }
  zoomCard(id);
}
function cardRecap(id){
  const c=CARD[id];
  const then = c.act ? (c.act==='any'?t('ui_zActAny'):t('ui_zAct',TN(c.act))) : (c.id<=16?t('ui_zStart'):t('ui_zNoAct'));
  return el('div',{class:'crecap'},
    el('h4',{},c.name),
    el('div',{class:'cr1'},icon('t_'+c.type,18,'margin-right:4px;width:18px'),TN(c.type)+' — '+LN(c.lvl)+(c.woa?' — '+WN(c.woa):'')),
    el('p',{},el('b',{},t('ui_zHire')+' : '),tm(E.effsTxt(c.H))||'—'),
    el('p',{},el('b',{},t('ui_zThen')+' : '),then),
    el('p',{},el('b',{},t('ui_zAbility')+' : '),tm(E.effsTxt(c.A))||'—'),
    el('p',{class:'muted'},t('ui_zTrig',c.trig.map(TN).join(', '))));
}
function zoomCard(id){
  const c=CARD[id];
  const then = c.act ? (c.act==='any'?t('ui_zActAny'):t('ui_zAct',TN(c.act))) : (c.id<=16?t('ui_zStart'):t('ui_zNoAct'));
  zoomShow(el('img',{src:'cards/'+id+'.webp'}), el('div',{class:'zt'},
    el('h3',{},c.name),
    el('div',{},icon('t_'+c.type,20,'margin-right:5px'),TN(c.type)+' — '+LN(c.lvl)+(c.woa?' — '+t('ui_zWoa',WN(c.woa)):'')),
    el('p',{},el('b',{},t('ui_zHire')+' : '),tm(E.effsTxt(c.H))||'—'),
    el('p',{},el('b',{},t('ui_zThen')+' : '),then),
    el('p',{},el('b',{},t('ui_zAbility')+' : '),tm(E.effsTxt(c.A)),el('br'),el('span',{class:'muted'},t('ui_zTrig',c.trig.map(TN).join(', ')))),
    el('button',{onclick:zoomHide},t('ui_close'))));
}
function zoomImg(src,title,txt){ zoomShow(el('img',{src}),el('div',{class:'zt'},el('h3',{},title),el('p',{},txt||''),el('button',{onclick:zoomHide},t('ui_close')))); }
function zoomShow(...kids){ const z=$('#zoom'); z.innerHTML=''; z.appendChild(el('div',{class:'zb'},...kids)); z.classList.remove('hidden'); }
function zoomHide(){ $('#zoom').classList.add('hidden'); }
$('#zoom').addEventListener('click',e=>{ if(e.target.id==='zoom') zoomHide(); });

function render(){
  if(!S) return;
  const sel=selectableIds();
  const sc=$('#score'); sc.innerHTML='';
  S.players.forEach((pl,k)=>sc.appendChild(el('div',{class:'chip'+(S.pending&&S.pending.p===k?' active':'')},el('span',{class:'dot',style:'background:'+pl.color}),pl.name,el('span',{class:'vp'},E.vp(S,k)+' '+t('ui_vp')))));
  $('#tinfo').textContent=(S.endTriggered?t('ui_last')+' · ':'')+t('ui_round',Math.max(1,Math.ceil(S.turnNo/S.players.length)))+' · '+E.rulesOf(S).goal+' '+t('ui_vp')+(mode==='online'&&tableCode?' · '+t('ui_table',tableCode):'');
  // rangée
  const row=$('#row'); row.innerHTML='';
  row.appendChild(el('div',{class:'decks'},el('img',{src:'cards/back3.webp',alt:''}),el('div',{},t('ui_deckS',S.deck.length)),el('img',{src:'book/back.webp',alt:''}),el('div',{},t('ui_deckB',S.bookDeck.length))));
  S.row.forEach((co,k)=>{
    const cost=D.ROWCOST[k];
    const slot=el('div',{class:'slot'}, el('div',{class:'cost'},el('span',{class:'seal'+(cost?'':' free')},cost)));
    if(co){ const im=cardImg(co.id); if(sel.has(co.id)) im.classList.add('sel'); slot.appendChild(im); }
    else slot.appendChild(el('div',{class:'empty'},t('ui_empty')));
    row.appendChild(slot);
  });
  // parcours
  const tr=$('#tracks'); tr.innerHTML='';
  const moveOpt={}; let mePl=null;
  if(S.pending&&S.pending.kind==='move'&&isMine(S.pending.p)){ mePl=S.players[S.pending.p]; S.pending.opts.forEach((o,k)=>{ if(o.tr!==undefined) moveOpt[o.tr]=k; }); }
  S.tracks.forEach((cn,ti)=>{
    const C=D.countries[cn];
    const line=el('div',{class:'track'},el('div',{class:'lab'},el('img',{src:'tok/country_'+COUNTRY_IMG[cn]+'.webp',alt:''}),el('span',{},el('b',{},E.TR[ti]+' '),t('C_'+cn))));
    for(let n=0;n<=12;n++){
      const cy=C.cities.find(c=>c[0]===n);
      const cell=el('div',{class:'cell'+(cy?' city':'')+(n===12?' finish':''),title:cy?'':t('ui_cell',n)});
      if(moveOpt[ti]!==undefined && n===mePl.trav[ti]+1){ cell.classList.add('target'); const k=moveOpt[ti]; cell.addEventListener('click',ev=>{ ev.stopImmediatePropagation(); act(k); }); }
      if(cy){ cell.style.backgroundImage='url(city/'+cy[1]+'.webp)'; cell.addEventListener('click',()=>zoomImg('city/'+cy[1]+'.webp',t('CY_'+cy[1])+' ('+n+')',t('CE_'+cy[1]))); }
      else cell.appendChild(el('span',{class:'n'},n||'⚑'));
      const tv=el('div',{class:'travs'}); S.players.forEach(pl=>{ if(pl.trav[ti]===n) tv.appendChild(el('span',{class:'horse',title:pl.name},el('i',{style:'background:'+pl.color}))); });
      cell.appendChild(tv); line.appendChild(cell);
    }
    tr.appendChild(line);
  });
  // recteurs
  const rs=$('#rslots'); rs.innerHTML='';
  ['N','R','A','M'].forEach(ty=>{
    const id=S.rectSlots[ty]; const owner=S.players.find(pl=>pl.rector&&pl.rector.type===ty);
    const box=el('div',{class:'tslot t-'+ty});
    if(id){ const im=el('img',{src:'rect/'+id+'.webp',alt:''}); im.onclick=()=>zoomImg('rect/'+id+'.webp',t('ui_rectorOf',TN(ty)),t('ui_rectCost',t('R_'+id))); box.appendChild(im); }
    else box.appendChild(el('img',{src:'rect/back.webp',alt:''}));
        box.appendChild(el('div',{},el('b',{},icon('t_'+ty,22,'margin-right:5px;width:22px;cursor:default'),TN(ty)),el('br'),id?t('R_'+id):t('ui_takenBy',owner?owner.name:'?')));
    rs.appendChild(box);
  });
  // objectifs
  const os=$('#oslots'); os.innerHTML='';
  ['N','R','A','M'].forEach(ty=>{
    const o=S.objSlots[ty]; const who=S.players.filter(pl=>pl.emTok[ty]!==undefined).map(pl=>pl.name+' ('+pl.emTok[ty]+')');
    const im=el('img',{src:'obj/'+o.tile+'.webp',alt:''}); im.onclick=()=>zoomImg('obj/'+o.tile+'.webp',t('ui_objOf',TN(ty)),t('ui_objTxt',t('O_'+o.tile),TN(ty)));
    const clp=S.players.filter(pl=>pl.emTok[ty]!==undefined), me=(typeof uniTab!=='undefined'?uniTab:null);
    const sl=el('div',{class:'tslot t-'+ty+(clp.length?' claimed':'')},im,el('div',{},el('b',{},icon('t_'+ty,22,'margin-right:5px;width:22px;cursor:default'),TN(ty)),el('br'),t('O_'+o.tile),
      el('div',{class:'vps'},o.stack.map(v=>el('img',{src:'tok/vp'+v+'.webp',alt:v+' '+t('ui_vp')}))), who.length?el('div',{class:'muted'},t('ui_claimed',who.join(', '))):null));
    if(clp.length){ sl.appendChild(el('div',{class:'clbadge'},clp.map(pl=>el('span',{class:'cldot',style:'background:'+pl.color,title:pl.name},'✓')))); }
    os.appendChild(sl);
  });
  // lettres & jetons
  const lt=$('#letters'); lt.innerHTML='';
  const Ls=S.letters.map(id=>D.letters.find(x=>x.id===id)), res=Ls.filter(L=>!L.woa), wo=Ls.filter(L=>L.woa);
  res.forEach(L=>lt.appendChild(el('img',{src:'let/'+L.id+'.webp',title:tm(E.effsTxt(L.g))})));
  if(res.length&&wo.length&&res.length%5) lt.appendChild(el('span',{class:'lgap'}));
  wo.forEach(L=>lt.appendChild(el('img',{src:'let/'+L.id+'.webp',title:WN(L.woa)})));
  if(!S.letters.length) lt.textContent=t('ui_none');
  const tk=[]; if(S.tracks.includes('ITA')) tk.push(t('ui_bologna',S.bologna));
  if(S.tracks.includes('BYZ')) tk.push(t('ui_const',S.constTok.map(TN).join(', ')||'—'));
  $('#tokens').textContent=tk.join(' · ');
  renderTabs(sel); renderLog(); renderDecide(); renderCoach();
}
function renderTabs(sel){
  const tb=$('#tabs'); tb.innerHTML='';
  if(tab===null||tab>=S.players.length) tab=(S.pending&&isMine(S.pending.p))?S.pending.p:(mySeats[0]!==undefined?mySeats[0]:0);
  S.players.forEach((pl,k)=>tb.appendChild(el('button',{class:tab===k?'on':'',onclick:()=>{tab=k;render();}},el('span',{class:'dot',style:'background:'+pl.color+';margin-right:5px'}),pl.name)));
  const pl=S.players[tab], u=$('#uni'); u.innerHTML='';
  const vpB=[]; if(pl.played.length) vpB.push(t('ui_vpBooks',pl.played.length)); Object.entries(pl.emTok).forEach(([ty,v])=>vpB.push(t('ui_vpEm',v,TN(ty)))); if(pl.rector) vpB.push(t('ui_vpRect')); if(pl.bologna) vpB.push(t('ui_vpBol',pl.bologna)); if(pl.constTok.length) vpB.push(t('ui_vpConst',pl.constTok.length));
  u.appendChild(el('div',{class:'res'},
    el('span',{title:t('ui_coins')},el('span',{class:'coin'},pl.coins)), el('span',{title:t('ui_infl')},el('span',{class:'seal'},pl.infl)),
    el('span',{},icon('laurel',20,'margin-right:4px'),E.vp(S,tab)+' '+t('ui_vp')+(vpB.length?' ('+vpB.join(', ')+')':'')),
    el('span',{},icon('trav',20,'margin-right:4px'),pl.trav.map((x,i)=>E.TR[i]+':'+x).join(' ')+' · '+pl.cities+' '+t('ui_cities')),
    (()=>{ const all=[].concat(pl.students,pl.profs,pl.emer,pl.rector?[pl.rector.card]:[]), n={}; all.forEach(co=>{ const ty=CARD[co.id].type; n[ty]=(n[ty]||0)+1; });
      return el('span',{class:'tys'},D.TYPES.map(ty=>el('span',{title:TN(ty),style:'margin-right:8px;white-space:nowrap'+(n[ty]?'':';opacity:.4')},icon('t_'+ty,20,'margin-right:2px;width:20px'),String(n[ty]||0)))); })(),
    (()=>{ const all=[].concat(pl.students,pl.profs,pl.emer,pl.rector?[pl.rector.card]:[]), n=[0,0,0,0]; all.forEach(co=>n[CARD[co.id].lvl]++);
      return el('span',{class:'lvls'},[1,2,3].map(l=>el('span',{title:t('L_'+l),style:'margin-right:8px;white-space:nowrap'+(n[l]?'':';opacity:.4')},icon('lv_'+l,20,'margin-right:2px'),String(n[l])))); })(),
    (()=>{ const wl=E.woaList(pl), cnt={}; wl.forEach(w=>cnt[w]=(cnt[w]||0)+1); return el('span',{class:'woas'},['ARC','MUS','PAI','SCU','THE'].map(w=>el('span',{title:WN(w),style:'margin-right:8px;white-space:nowrap'+(cnt[w]?'':';opacity:.4')},icon('w_'+w,20,'margin-right:2px'),String(cnt[w]||0))),'('+wl.length+')'); })(),
    E.wild(pl)?el('span',{},t('ui_wild')):null));
  const rowEl=(label,arr,extra,ico)=>{
    const cs=el('div',{class:'ucards'});
    arr.forEach((co,k)=>{ const w=el('div',{class:'ucard'}); const im=cardImg(co.id); if(sel.has(co.id)) im.classList.add('sel'); w.appendChild(im); w.appendChild(el('span',{class:'pos'},k+1));
      if(co.letters&&co.letters.length){ const l=el('div',{class:'lt'}); co.letters.forEach(wo=>l.appendChild(el('img',{src:'let/'+({ARC:'arch',MUS:'mus',PAI:'pai',SCU:'scu',THE:'thea'})[wo]+'.webp',title:WN(wo)}))); w.appendChild(l); }
      cs.appendChild(w); });
    if(extra) cs.appendChild(extra);
    if(!arr.length&&!extra) cs.appendChild(el('span',{class:'muted'},'—'));
    return el('div',{class:'urow'},el('div',{class:'rlw'},ico?icon(ico,26,''):null,el('div',{class:'rl'},label)),cs);
  };
  if(pl.rector){ const ri=el('img',{src:'rect/'+pl.rector.tile+'.webp',title:t('ui_rector')+' : '+t('R_'+pl.rector.tile),class:'rtile nopv',style:'width:96px;height:auto;aspect-ratio:139/200;object-fit:contain;align-self:flex-start;flex:0 0 auto;border-radius:6px;cursor:zoom-in'}); ri.onclick=()=>zoomImg('rect/'+pl.rector.tile+'.webp',t('ui_rRector'),t('R_'+pl.rector.tile)); u.appendChild(rowEl(t('ui_rRector'),[pl.rector.card],ri,'rect')); }
  u.appendChild(rowEl(t('ui_rEmer'),pl.emer,null,'emer')); u.appendChild(rowEl(t('ui_rProf'),pl.profs,null,'prof')); u.appendChild(rowEl(t('ui_rStu'),pl.students,null,'stu'));
  u.appendChild(boardHelp(pl));
  const nHum=S.players.filter(x=>!x.ai).length;
  const showHand = mode==='local' ? (!pl.ai && (nHum<=1 || (S.pending&&S.pending.p===tab))) : isMine(tab);
  const h=el('div',{class:'hand'});
  const canAct=isMine(tab)&&!busy&&E.canBookAct(S,tab);
  const pdS=S.pending, setupPick=isMine(tab)&&!busy&&pdS&&(pdS.kind==='setupBook'||pdS.kind==='discardFor')&&pdS.p===tab;
  if(showHand) pl.hand.forEach((b,hk)=>{ const ok=E.bookOk(S,tab,b);
    const im=el('img',{src:'book/'+b+'.webp',class:(ok?'ok':''),title:t('B_'+b)});
    if(setupPick){ const k=pdS.opts.findIndex(o=>o.hk===hk); const w=el('div',{class:'bk act'},im); im.removeAttribute('title'); w.title=t('ui_bkCond')+' : '+t('B_'+b)+'\n'+t('ui_bkDiscFx')+' : '+tm(E.effsTxt(BOOK[b].disc))+'\n'+t('ui_bkClickDisc'); w.onclick=()=>{ if(k>=0) act(k); }; h.appendChild(w); return; }
    if(!canAct){ im.title=t('ui_bkCond')+' : '+t('B_'+b)+'\n'+t('ui_bkDiscFx')+' : '+tm(E.effsTxt(BOOK[b].disc)); im.onclick=()=>zoomImg('book/'+b+'.webp',t('ui_book'),t('B_'+b)+(ok?t('ui_bookOk'):'')+t('ui_bookDisc',tm(E.effsTxt(BOOK[b].disc)))); h.appendChild(im); return; }
    const disc=hasRect2a(pl)?[{c:1},{i:1},{t:1}]:BOOK[b].disc;
    const w=el('div',{class:'bk act'+(ok?' canplay':'')+(S.pending&&S.pending.kind==='end'&&pl.hand.length>3?' warn':''),tabindex:'0'},im);
    w.title=t('ui_bkCond')+' : '+t('B_'+b)+'\n'+t('ui_bkDiscFx')+' : '+tm(E.effsTxt(disc))+'\n'+(ok?t('ui_bkClickBoth'):t('ui_bkClickDisc'));
    im.removeAttribute('title');
    if(!ok){ w.addEventListener('click',ev=>{ ev.stopPropagation(); bookAct('disc',hk); }); h.appendChild(w); return; }
    const menu=el('div',{class:'bkmenu'},el('div',{class:'bkt'},t('B_'+b)),
      el('button',{class:'primary small',onclick:ev=>{ev.stopPropagation();bookAct('play',hk);}},t('ui_bkPlay')),
      el('button',{class:'small',onclick:ev=>{ev.stopPropagation();bookAct('disc',hk);}},t('ui_bkDisc',tm(E.effsTxt(disc)))));
    w.appendChild(menu);
    const place=()=>{ const r=w.getBoundingClientRect(); let x=r.right+6, y=r.top; if(x+226>innerWidth) x=r.left-232; y=Math.max(8,Math.min(innerHeight-200,y)); menu.style.left=x+'px'; menu.style.top=y+'px'; };
    w.addEventListener('click',ev=>{ ev.stopPropagation(); const was=w.classList.contains('open'); document.querySelectorAll('.bk.open').forEach(x=>x.classList.remove('open')); if(!was){ place(); w.classList.add('open'); } }); h.appendChild(w); });
  else pl.hand.forEach(()=>h.appendChild(el('img',{src:'book/back.webp'})));
  if(!pl.hand.length) h.appendChild(el('span',{class:'muted'},'—'));
  u.appendChild(el('div',{},el('b',{},t('ui_books')+' '),el('span',{class:'muted'},t('ui_booksSub',pl.hand.length)),h));
  if(pl.played.length){ const pp=el('div',{class:'hand'}); pl.played.forEach(b=>{ const im=el('img',{src:'book/'+b+'.webp',style:'width:56px'}); im.onclick=()=>zoomImg('book/'+b+'.webp',t('ui_book'),t('B_'+b)); pp.appendChild(im); }); u.appendChild(el('div',{},el('b',{},t('ui_played')),pp)); }
}
function renderLog(){ const lg=$('#log'); lg.innerHTML=''; S.log.slice().reverse().forEach(l=>lg.appendChild(el('div',{},tm(l)))); }
function renderDecide(){
  const d=$('#decide'); d.innerHTML='';
  if(S.over){
    const IC=(src,tt)=>el('img',{src,title:tt,alt:tt,style:'width:24px;height:24px;object-fit:contain;vertical-align:middle;background:#f3e6c4;border-radius:50%;padding:3px'});
    const src=[['book',p=>p.played.length,'ic/book.png',t('ui_srcBooks')],['emer',p=>Object.values(p.emTok).reduce((a,b)=>a+b,0),'ic/emer.png',t('ui_srcObj')],['rect',p=>p.rector?1:0,'ic/rect.png',t('ui_rector')]];
    if(S.tracks.includes('ITA')) src.push(['bol',p=>p.bologna,'city/bologna.webp',t('CY_bologna')]);
    if(S.tracks.includes('BYZ')) src.push(['con',p=>p.constTok.length,'city/constantinople.webp',t('CY_constantinople')]);
    const tie=[['r','ic/rect.png',t('ui_rector')],['e','ic/emer.png',t('ui_emer')],['pr','ic/prof.png',t('ui_profs')],['st','ic/stu.png',t('ui_stus')]];
    const sep='';
    const tb=el('table',{class:'endtbl'},
      el('tr',{},el('th',{},'#'),el('th',{},t('ui_player')),el('th',{},t('ui_vp')),src.map(s=>el('th',{class:'num'},IC(s[2],s[3]))),
        el('th',{class:'endsep'}),tie.map(x=>el('th',{class:'num'},IC(x[1],x[2])))));
    S.ranking.forEach((r,i)=>{ const pl=S.players[r.k];
      tb.appendChild(el('tr',{},el('td',{},i+1),el('td',{},pl.name),el('td',{style:'font-weight:700'},r.vp),src.map(s=>{ const v=s[1](pl); return el('td',{class:'num',style:v?'':'opacity:.4'},String(v)); }),
        el('td',{class:'endsep'}),tie.map((x,j)=>el('td',{class:'num',style:(r[x[0]]?'':'opacity:.4')},String(r[x[0]])))));
    });
    const names=S.winners.map(k=>S.players[k].name).join(' & ');
    d.appendChild(el('div',{class:'endbox'},el('div',{class:'q'},t(S.winners.length>1?'ui_winsN':'ui_wins',names)),tb,
      el('button',{class:'primary',onclick:goHome},t('ui_menu'))));
    return;
  }
  const pd=S.pending; d.classList.toggle('bubble',!!pd&&['pair','setupBook'].includes(pd.kind)); if(!pd) return;
  if(!isMine(pd.p)){
    d.appendChild(el('div',{class:'wait'},el('span',{class:'spin'}),t(S.players[pd.p].ai?'ui_thinking':'ui_waiting',S.players[pd.p].name),canUndo()?el('button',{class:'small undo',onclick:undo},'↶ '+t('ui_undo')):null));
    return;
  }
  d.appendChild(el('div',{class:'q'},tm(pd.prompt),canUndo()?el('button',{class:'small undo',onclick:undo},'↶ '+t('ui_undo')):null));
  const opts=el('div',{class:'opts'});
  if(pd.kind==='move'){ d.appendChild(el('div',{class:'hint'},'👉 '+t('ui_clickTrack'))); const tb=document.querySelector('.cell.target'); if(tb) tb.scrollIntoView({block:'nearest',behavior:'smooth'}); return; }
  const THUMB={pair:1,place:1,lisboa:1,take:1,fes:1,meknes:1,elim:1,sale:1,freePromo:1,reorg:1};
  const hideBooks=true, nH=S.players[pd.p].hand.length;
  if(pd.kind==='end'&&nH>3) d.appendChild(el('div',{class:'hint bkwarn'},icon('book',22,'margin-right:6px'),t('ui_tooManyBooks',nH)));
  if((pd.kind==='setupBook'||pd.kind==='discardFor')&&isMine(pd.p)) d.appendChild(el('div',{class:'hint'},icon('book',22,'margin-right:6px'),t(pd.kind==='setupBook'?'ui_setupBookHint':'ui_discForHint')));
  pd.opts.forEach((o,k)=>{ if(filter&&!filter.includes(k)) return; if((pd.kind==='setupBook'||pd.kind==='discardFor')&&isMine(pd.p)) return; if(hideBooks&&(o.play!==undefined||o.disc!==undefined)&&(pd.kind==='turn'||pd.kind==='end')) return;
    const b=el('button',{class:(o.endTurn?'primary':'')+(THUMB[pd.kind]&&o.cards?' cbtn':''),onclick:()=>act(k)});
    if(pd.kind==='beijing'&&o.city){ b.classList.add('lbtn','cbtn2'); b.title=tm(o.label); b.appendChild(el('img',{src:'city/'+o.city+'.webp',alt:tm(o.label)})); opts.appendChild(b); return; }
    if(pd.kind==='letter'&&o.letter){ b.classList.add('lbtn'); b.title=tm(o.label); b.appendChild(el('img',{src:'let/'+o.letter+'.webp',alt:tm(o.label)})); opts.appendChild(b); return; }
    if(THUMB[pd.kind]&&o.cards){ const row=el('div',{class:'cthumbs'}); o.cards.forEach(id=>row.appendChild(el('img',{src:'cards/'+id+'.webp',alt:CARD[id].name}))); b.appendChild(row); }
    { const tys=new Set(); (function w(x){ if(!x||typeof x!=='object') return; if(Array.isArray(x)){ x.forEach(w); return; } const m=/^T_([ANMR])$/.exec(x.m||''); if(m) tys.add(m[1]); (x.a||[]).forEach(w); })(o.label);
      if(o.act&&D.TYPES.includes(o.act)) tys.add(o.act); if(!THUMB[pd.kind]&&o.cards&&o.cards.length===1&&CARD[o.cards[0]]) tys.add(CARD[o.cards[0]].type);
      if(tys.size){ b.classList.add('tyb'); D.TYPES.filter(x=>tys.has(x)).forEach(ty=>b.appendChild(icon('t_'+ty,22,'width:22px;margin-right:6px;cursor:inherit;vertical-align:middle'))); } }
    b.appendChild(el('span',{},tm(o.label))); opts.appendChild(b); });
  if(filter) opts.appendChild(el('button',{onclick:()=>{filter=null;renderDecide();}},t('ui_allOpts')));
  d.appendChild(opts);
}

// =========== EN LIGNE ===========
function onlineFail(){ onlineFailed=true; db=null; $('#onlineOff').textContent=t('ui_onlineNo'); }
(async function initOnline(){
  if(!window.claude||!window.claude.use){
    // hors de claude.ai : Firebase si configuré
    try{
      const r=window.MAG_NET&&await window.MAG_NET.init();
      if(!r){ onlineFail(); return; }
      db=r.db; myUid=r.uid; onlineFailed=false;
      $('#onlineOff').classList.add('hidden'); $('#onlineOn').classList.remove('hidden');
      $('#myName').value=store.get('mag_name')||'';
      const last=store.get('mag_table'); if(last) $('#joinCode').value=last;
      loadWeights(); STATS=null;
    }catch(e){ console.warn(e); onlineFail(); }
    return;
  }
  const timer=setTimeout(()=>{ if(!db) onlineFail(); },10000);
  try{
    const d=await window.claude.use('db'); const user=await window.claude.use('user');
    if(user) myUid=await user.id();
    clearTimeout(timer);
    if(!d||!myUid){ onlineFail(); return; }
    db=d; onlineFailed=false;
    $('#onlineOff').classList.add('hidden'); $('#onlineOn').classList.remove('hidden');
    $('#myName').value=store.get('mag_name')||'';
    const last=store.get('mag_table'); if(last) $('#joinCode').value=last;
    loadWeights(); STATS=null;
  }catch(e){ clearTimeout(timer); onlineFail(); }
})();
function genCode(){ const a='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s=''; for(let i=0;i<5;i++) s+=a[Math.floor(Math.random()*a.length)]; return s; }
function myName(){ const n=($('#myName').value||'').trim()||t('ui_player1'); store.set('mag_name',n); return n; }
$('#createTable').onclick=async()=>{
  const code=genCode();
  try{ await db.doc('tables/'+code).set({code,host:myUid,status:'lobby',seats:[{name:myName(),uid:myUid,ai:false}],rules:homeRule,state:null,rev:0,created:Date.now()}); subscribe(code); }
  catch(e){ $('#onlineMsg').textContent=t('ui_createErr',e.code||e.message); }
};
$('#joinBtn').onclick=async()=>{
  const code=($('#joinCode').value||'').trim().toUpperCase(); if(!code) return;
  try{
    const ref=db.doc('tables/'+code); const snap=await ref.get();
    if(!snap.exists){ $('#onlineMsg').textContent=t('ui_noTable'); return; }
    const d=snap.data();
    if(!d.seats.some(s=>s.uid===myUid)){
      if(d.status!=='lobby'){ $('#onlineMsg').textContent=t('ui_started'); subscribe(code); return; }
      if(d.seats.length>=4){ $('#onlineMsg').textContent=t('ui_full'); return; }
      await ref.acquire({holder:myUid,ttlMs:4000});
      const fresh=(await ref.get()).data();
      if(fresh.seats.length<4 && !fresh.seats.some(s=>s.uid===myUid)) await ref.update({seats:[...fresh.seats,{name:myName(),uid:myUid,ai:false}]});
    }
    subscribe(code);
  }catch(e){ $('#onlineMsg').textContent=t('ui_err',e.code||e.message); }
};
function subscribe(code){
  if(tableUnsub) tableUnsub();
  tableCode=code; store.set('mag_table',code);
  const timer=setTimeout(()=>{ $('#onlineMsg').textContent=t('ui_slow'); },10000);
  tableUnsub=db.doc('tables/'+code).onSnapshot(snap=>{
    clearTimeout(timer);
    if(!snap.exists){ $('#onlineMsg').textContent=t('ui_notFound'); return; }
    table=snap.data();
    if(table.status==='lobby'){ renderTable(); return; }
    if(table.state){
      const st=JSON.parse(table.state);
      if(!S || mode!=='online' || (st.ver||0)>=(S.ver||0)) S=st;
      mySeats=S.players.map((p,k)=>(!p.ai&&p.uid===myUid)?k:-1).filter(k=>k>=0);
      if(mode!=='online'){ mode='online'; tab=null; showGame(); }
      busy=false; render(); scheduleAI(); maybeRecord();
    }
  },err=>{ clearTimeout(timer); $('#onlineMsg').textContent=t('ui_lost',err.code); });
}
function renderTable(){
  const b=$('#tableBox'); b.classList.remove('hidden'); b.innerHTML='';
  const host=table.host===myUid;
  b.appendChild(el('div',{},t('ui_code'),el('span',{class:'code'},table.code),' ',el('span',{class:'muted'},t('ui_shareCode'))));
  table.seats.forEach((s,k)=>{ const mine=s.uid===myUid||(host&&s.ai); const col=s.color||SEATCOL[k]; b.appendChild(el('div',{class:'seat'},el(mine?'button':'span',{class:'dot',style:'background:'+col+(mine?';width:22px;height:22px;cursor:pointer;padding:0':''),title:mine?t('ui_color'):null,onclick:mine?()=>{ palOpen=palOpen===100+k?-1:100+k; renderTable(); }:null}),s.name+(s.ai?t('ui_aiTag'):'')+(s.uid===table.host?t('ui_hostTag'):'')+(s.uid===myUid?t('ui_you'):''),
    s.ai?(host&&table.status==='lobby'?lvlTog(s.lvl||3,async v=>{ store.set('mag_ailvl',v); await db.doc('tables/'+table.code).update({seats:table.seats.map((o,j)=>j===k?Object.assign({},o,{lvl:v,color:aiColor(v,table.seats,o)},isAutoName(o.name)?{name:aiName(v,table.seats,o)}:{}):o)}); }):el('span',{class:'muted'},' · '+t('ui_lvl'+(s.lvl||3)))):null,
    host&&k>0?el('button',{class:'small',onclick:async()=>{ await db.doc('tables/'+table.code).update({seats:table.seats.filter((_,j)=>j!==k)}); }},t('ui_remove')):null));
    if(palOpen===100+k && table.status==='lobby') b.appendChild(colorRow(col,table.seats.filter((o,j)=>j!==k).map((o,j)=>o.color||SEATCOL[j]),async c=>{ palOpen=-1; const ns=table.seats.map((o,j)=>j===k?Object.assign({},o,{color:c}):o); await db.doc('tables/'+table.code).update({seats:ns}); })); });
  if(table.status==='lobby'){
    // Règle de la table : choisie par l'hôte, affichée à tous les joueurs du salon.
    const tr=table.rules==='six'?'six':'classic';
    b.appendChild(el('div',{style:'margin-top:8px'},el('div',{class:'flab'},t('ui_rule')),
      host?el('div',{class:'seg segw',id:'ruleSegO'},['classic','six'].map(r=>el('button',{'data-r':r,class:r===tr?'on':null,onclick:async()=>{ if(r===tr) return; await db.doc('tables/'+table.code).update({rules:r}); }},t(r==='six'?'ui_rule6':'ui_rule8'))))
          :el('div',{class:'fell',id:'ruleTxtO',style:'font-size:17px;color:var(--wine2)'},t(tr==='six'?'ui_rule6':'ui_rule8')),
      el('div',{class:'muted'},t(tr==='six'?'ui_rule6Sub':'ui_rule8Sub'))));
    if(host){
      b.appendChild(el('div',{class:'row-f',style:'margin-top:6px'},
        el('button',{disabled:table.seats.length>=4?'':null,onclick:async()=>{ const n=aiName(defLvl(),table.seats,null), nc=aiColor(defLvl(),table.seats,null); await db.doc('tables/'+table.code).update({seats:[...table.seats,{name:n,uid:null,ai:true,lvl:defLvl(),color:nc}]}); }},t('ui_addAI')),
        el('button',{class:'primary',disabled:table.seats.length<2?'':null,onclick:startOnline},t('ui_start'))));
      b.appendChild(el('div',{style:'margin-top:8px'},el('div',{class:'flab row-f',style:'justify-content:space-between'},el('span',{},t('ui_tracks')),el('button',{class:'dice',onclick:()=>randomCountries('#cboxO')},el('span',{class:'die'},'⚄'),el('span',{},t('ui_random')))),el('div',{class:'muted'},t('ui_tracksSub')),el('div',{class:'cbox',id:'cboxO'})));
      countryBoxes('#cboxO');
    } else b.appendChild(el('div',{class:'muted',style:'margin-top:6px'},t('ui_waitHost')));
  } else b.appendChild(el('button',{class:'primary',onclick:()=>{ mode=null; subscribe(table.code); }},t('ui_backGame')));
}
async function startOnline(){
  const cs=pickedCountries('#cboxO');
  if(cs.length && cs.length!==3){ $('#onlineMsg').textContent=t('ui_pick3'); return; }
  const st=E.newGame({players:table.seats.map((s,k)=>({name:s.name,ai:s.ai,lvl:s.ai?(s.lvl||3):undefined,uid:s.uid,color:s.color||SEATCOL[k]})),countries:cs.length?cs:null,rules:table.rules==='six'?'six':'classic',seed:(Math.random()*2**32)>>>0});
  st.ver=1;
  await db.doc('tables/'+table.code).update({status:'play',state:JSON.stringify(st),rev:1});
}
async function onlineAct(k,isAI){
  if(!table) return;
  busy=true; renderDecide();
  const next=E.clone(S);
  try{ E.choose(next,k); }catch(e){ busy=false; alertBox(t('ui_engineErr',e.message)); return; }
  S=next; if(!isAI) myLastVer=next.ver; render();
  try{ await db.doc('tables/'+table.code).update({state:JSON.stringify(next),rev:next.ver,status:next.over?'over':'play'}); }
  catch(e){ alertBox(t('ui_writeErr',e.code||e.message)); }
  busy=false; renderDecide(); scheduleAI();
}


// =========== NAVIGATION ===========
let view='play';
function setView(v){
  view=v;
  ['play','tuto','stats','sim','fb'].forEach(x=>$('#v-'+x).classList.toggle('hidden',x!==v));
  $('#fbBtn').classList.toggle('hidden',v==='fb');
  document.querySelectorAll('.lnav button').forEach(b=>b.classList.toggle('on',b.dataset.v===v));
  if(v==='tuto') renderTuto();
  if(v==='stats') loadStats();
  if(v==='sim') renderSim();
  if(v==='fb') renderFbAdmin();
  const nav=document.querySelector('.lnav'); if(nav && window.scrollY>nav.offsetTop) window.scrollTo({top:nav.offsetTop});
}
document.querySelectorAll('.lnav button').forEach(b=>b.onclick=()=>setView(b.dataset.v));
const icon=(n,h,extra)=>el('img',{src:'ic/'+n+'.png',alt:'',style:'height:'+(h||20)+'px;max-height:none;vertical-align:middle;box-shadow:none;border-radius:0;'+(extra||'')});


// =========== AVIS / FEEDBACK ===========
const FBCATS=['bug','rules','ui','ai','idea'];
const IS_ADMIN=(()=>{ try{ const q=new URLSearchParams(location.search); if(q.has('admin')) localStorage.setItem('mag_admin','1'); if(q.has('noadmin')) localStorage.removeItem('mag_admin'); return localStorage.getItem('mag_admin')==='1'; }catch(e){ return false; } })();
if(IS_ADMIN) $('#navFb').classList.remove('hidden');
function fbContext(){
  const c={lang:LANG,view,ua:navigator.userAgent.slice(0,160),w:innerWidth,h:innerHeight};
  try{ if(S&&view==='play'){ c.game={phase:S.phase,turn:S.turnNo,n:S.players.length,tracks:S.tracks,over:!!S.over,vp:S.players.map((p,k)=>E.vp(S,k)),pending:S.pending&&S.pending.kind,log:(S.log||[]).slice(-6).map(x=>typeof x==='string'?x:tm(x))}; } }catch(e){}
  return c;
}
async function fbSend(rec){
  if(db){ try{ await db.collection('feedback').doc().set(rec); return true; }catch(e){ console.warn(e); } }
  let q=[]; try{ q=JSON.parse(store.get('mag_fbq')||'[]'); }catch(e){} if(!Array.isArray(q)) q=[]; q.push(rec); store.set('mag_fbq',JSON.stringify(q)); return false;
}
async function fbFlush(){ if(!db) return; let q=[]; try{ q=JSON.parse(store.get('mag_fbq')||'[]'); }catch(e){} if(!Array.isArray(q)) q=[]; if(!q.length) return; const rest=[]; for(const r of q){ try{ await db.collection('feedback').doc().set(r); }catch(e){ rest.push(r); } } store.set('mag_fbq',JSON.stringify(rest)); }
setTimeout(fbFlush,15000);
function openFeedback(){
  let cat=null, stars=0;
  const ta=el('textarea',{placeholder:t('fb_ph')});
  const cats=el('div',{class:'fbcats'}); const drawCats=()=>{ cats.innerHTML=''; FBCATS.forEach(k=>cats.appendChild(el('button',{class:cat===k?'on':'',onclick:()=>{cat=cat===k?null:k; drawCats();}},t('fb_c_'+k)))); }; drawCats();
  const st=el('div',{class:'fbstars'}); const drawSt=()=>{ st.innerHTML=''; for(let i=1;i<=5;i++) st.appendChild(el('span',{class:i<=stars?'on':'',onclick:()=>{stars=stars===i?0:i; drawSt();}},'★')); }; drawSt();
  const nm=el('input',{type:'text',placeholder:t('fb_name'),value:(store.get('mag_name')||'')});
  const msg=el('p',{class:'muted',style:'margin:0;min-height:1.2em'});
  const send=el('button',{class:'primary',onclick:async()=>{
    const txt=ta.value.trim(); if(txt.length<3){ msg.textContent=t('fb_empty'); return; }
    send.disabled=true; msg.textContent=t('fb_sending');
    const rec={t:Date.now(),cat:cat||'other',stars,text:txt.slice(0,4000),name:nm.value.trim().slice(0,40),uid:myUid||null,src:window.claude&&window.claude.use?'claude':'web',ctx:fbContext(),done:false};
    const ok=await fbSend(rec);
    zoomShow(el('div',{class:'zt'},el('p',{},ok?t('fb_thanks'):t('fb_queued')),el('button',{onclick:zoomHide},t('ui_ok'))));
  }},t('fb_send'));
  zoomShow(el('div',{class:'fbf'},el('h3',{style:'margin:0'},t('fb_title')),el('p',{class:'muted',style:'margin:0'},t('fb_intro')),cats,ta,el('div',{style:'display:flex;gap:12px;align-items:center;flex-wrap:wrap'},el('span',{},t('fb_rate')),st,nm),msg,el('div',{style:'display:flex;gap:8px;justify-content:flex-end'},el('button',{onclick:zoomHide},t('ui_cancel')),send)));
  setTimeout(()=>ta.focus(),50);
}
$('#fbBtn').appendChild(icon('letter',22)); $('#fbBtn').appendChild(el('span',{'data-i18n':'fb_btn'},t('fb_btn'))); $('#fbBtn').onclick=openFeedback;
let FB=null, fbFilter={cat:'all',st:'open'};
async function renderFbAdmin(){
  const box=$('#fbAdmin'); box.innerHTML=''; box.appendChild(el('h2',{},t('fb_admin')));
  if(!db){ box.appendChild(el('p',{},t('fb_noDb'))); return; }
  if(!FB){ box.appendChild(el('p',{class:'muted'},t('fb_loading'))); try{ const r=await db.collection('feedback').limit(2000).get(); FB=r.docs.map(d=>Object.assign({_id:d.id},d.data())).sort((a,b)=>b.t-a.t); }catch(e){ box.lastChild.textContent=t('fb_readErr',e.code||e.message); return; } box.lastChild.remove(); }
  const bar=el('div',{class:'ctrls',style:'display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:8px'});
  const sel=(opts,key)=>{ const s=el('select',{onchange:()=>{fbFilter[key]=s.value; renderFbAdmin();}}); opts.forEach(([v,l])=>s.appendChild(el('option',{value:v,selected:fbFilter[key]===v?'':null},l))); return s; };
  bar.appendChild(sel([['all',t('fb_all')],...FBCATS.concat(['other']).map(k=>[k,t('fb_c_'+k)])],'cat'));
  bar.appendChild(sel([['open',t('fb_open')],['done',t('fb_doneF')],['all',t('fb_all')]],'st'));
  bar.appendChild(el('button',{onclick:()=>{FB=null; renderFbAdmin();}},t('fb_reload')));
  bar.appendChild(el('button',{onclick:()=>{ const b=new Blob([JSON.stringify(FB,null,1)],{type:'application/json'}); const a=el('a',{href:URL.createObjectURL(b),download:'magister-avis.json'}); document.body.appendChild(a); a.click(); a.remove(); }},t('fb_export')));
  box.appendChild(bar);
  const list=FB.filter(f=>(fbFilter.cat==='all'||f.cat===fbFilter.cat)&&(fbFilter.st==='all'||(fbFilter.st==='done')===!!f.done));
  box.appendChild(el('p',{class:'muted'},t('fb_count',list.length,FB.filter(f=>!f.done).length)));
  list.forEach(f=>{ const g=f.ctx&&f.ctx.game;
    box.appendChild(el('div',{class:'fbitem'+(f.done?' done':'')},
      el('div',{class:'meta'},el('b',{},t('fb_c_'+(f.cat||'other'))),el('span',{},new Date(f.t).toLocaleString()),el('span',{},f.name||t('fb_anon')),f.stars?el('span',{},'★'.repeat(f.stars)):null,el('span',{},(f.src||'')+' · '+((f.ctx&&f.ctx.lang)||'')+' · '+((f.ctx&&f.ctx.view)||'')),g?el('span',{},t('fb_ctxGame',g.turn,g.tracks.join('/'))):null),
      el('pre',{},f.text),
      el('div',{style:'margin-top:6px;display:flex;gap:6px'},el('button',{class:'small',onclick:async()=>{ try{ await db.doc('feedback/'+f._id).update({done:!f.done}); f.done=!f.done; renderFbAdmin(); }catch(e){ alertBox(t('fb_readErr',e.code||e.message)); } }},f.done?t('fb_reopen'):t('fb_markDone')))));
  });
}

// =========== TUTORIEL ===========
let tutoStep=0;
const TUTO=[
 {k:'s1',vis:()=>[el('img',{src:'tok/box.webp'}),el('div',{style:'display:flex;flex-direction:column;gap:8px;align-items:center'},icon('laurel',70),el('div',{class:'fell',style:'font-size:40px;color:var(--wine2)'},String(curRules().goal)))]},
 {k:'s2',vis:()=>{ const d=el('div',{style:'display:grid;grid-template-columns:auto 50px auto 90px auto;grid-template-rows:auto 70px auto;align-items:center;justify-items:center;gap:0'});
   const ar=(rot,w)=>el('div',{style:'width:'+w+'px;height:4px;background:var(--wine2);position:relative;transform:rotate('+rot+'deg);border-radius:2px'},el('div',{style:'position:absolute;right:-2px;top:-6px;border-left:12px solid var(--wine2);border-top:8px solid transparent;border-bottom:8px solid transparent'}));
   const lab=(ic,h,k)=>el('div',{style:'display:flex;flex-direction:column;align-items:center;gap:4px'},icon(ic,h),el('span',{class:'fell',style:'font-size:15px;color:var(--wine2)'},t(k)));
   const cell=(n,r,c,extra)=>{ n.style.gridRow=r; n.style.gridColumn=c; if(extra) Object.assign(n.style,extra); return n; };
   d.append(cell(lab('stu',58,'ui_rStu'),1,1),cell(ar(0,40),1,2),cell(lab('prof',40,'ui_rProf'),1,3),cell(ar(0,76),1,4),cell(lab('emer',40,'ui_rEmer'),1,5),
     cell(ar(38,110),2,'4 / 6',{justifySelf:'start',marginLeft:'-6px'}),cell(lab('rect',58,'ui_rRector'),3,5));
   return [d]; }},
 {k:'s3',vis:()=>[el('img',{src:'cards/31.webp',class:'sm'}),el('img',{src:'cards/45.webp',class:'sm'})]},
 {k:'s4',vis:()=>[el('img',{src:'cards/24.webp'}),el('div',{style:'display:grid;grid-template-columns:1fr 1fr;gap:8px'},['A','M','N','R'].map(x=>icon('t_'+x,54)))]},
 {k:'s5',vis:()=>[el('img',{src:'tok/playerboard.webp',class:'sm'}),el('img',{src:'rect/2b.webp',class:'sm',style:'max-height:120px'})]},
 {k:'s6',vis:()=>[icon('trav',70),el('img',{src:'city/pisa.webp',class:'sm',style:'max-height:150px'}),el('img',{src:'city/padova.webp',class:'sm',style:'max-height:150px'}),el('img',{src:'city/bologna.webp',class:'sm',style:'max-height:150px'})]},
 {k:'s7',vis:()=>[el('img',{src:'book/16.webp',class:'sm'}),el('img',{src:'book/23.webp',class:'sm'}),el('div',{style:'display:flex;gap:6px;flex-wrap:wrap;max-width:180px;justify-content:center'},['c2','i2','book','pai','mus','thea'].map(x=>el('img',{src:'let/'+x+'.webp',style:'width:50px;box-shadow:none'})))]},
 {k:'s8',vis:()=>[el('img',{src:'obj/A1.webp',class:'sm',style:'max-height:140px'}),el('img',{src:'obj/D2.webp',class:'sm',style:'max-height:140px'}),el('div',{style:'display:flex;gap:6px'},el('img',{src:'tok/vp'+curRules().tok[0]+'.webp',style:'width:56px;box-shadow:none'}),el('img',{src:'tok/vp'+curRules().tok[1]+'.webp',style:'width:56px;box-shadow:none'}))]},
 {k:'s9',vis:()=>[el('img',{src:'cards/45.webp',class:'sm'}),el('div',{style:'display:flex;flex-direction:column;gap:8px;align-items:center'},el('img',{src:'city/samarkand.webp',class:'sm',style:'max-height:110px'}),el('img',{src:'rect/5a.webp',class:'sm',style:'max-height:110px'}))]},
];
function richTxt(s){ const IC={A:'t_A',M:'t_M',N:'t_N',R:'t_R',stu:'stu',prof:'prof',emer:'emer',rect:'rect',coin:'coin',infl:'infl',trav:'trav'}; return s.split(/(\[[a-zA-Z]+\])/).map(x=>{ const m=x.match(/^\[([a-zA-Z]+)\]$/); return m&&IC[m[1]]?icon(IC[m[1]],22,'margin:0 2px'):x; }); }
function renderTuto(){
  const box=$('#tuto'); box.innerHTML='';
  const st=TUTO[tutoStep];
  box.appendChild(el('div',{class:'orn'},el('span',{},t('tu_title'))));
  box.appendChild(el('div',{class:'pcard tourcard'},el('div',{},el('h3',{},t('tour_t')),el('p',{},t('tour_intro'))),el('button',{class:'primary',onclick:startTutoGame},t('tour_btn'))));
  box.appendChild(el('h3',{class:'fell',style:'color:var(--goldA);font-weight:400;font-size:22px;margin:26px 0 0;text-align:center'},t('tu_rules')));
  const card=el('div',{class:'pcard'},
    el('div',{class:'tuto'},el('div',{class:'vis'},st.vis()),el('div',{},el('div',{class:'muted'},t('tu_step',tutoStep+1,TUTO.length)),el('h3',{},t('tu_'+st.k+'_t')),el('p',{},...richTxt(t('tu_'+st.k+'_x'))))),
    el('div',{class:'dots'},TUTO.map((_,i)=>el('span',{class:i===tutoStep?'on':'',onclick:()=>{tutoStep=i;renderTuto();}}))),
    el('div',{class:'tnav'},
      el('button',{disabled:tutoStep===0?'':null,onclick:()=>{tutoStep--;renderTuto();}},t('tu_prev')),
      tutoStep<TUTO.length-1?el('button',{class:'primary',onclick:()=>{tutoStep++;renderTuto();}},t('tu_next')):el('button',{class:'primary',onclick:startTutoGame},t('tu_start'))));
  box.appendChild(card);
}
function startTutoGame(){
  const me=seats[0]&&seats[0].name||t('ui_me');
  S=E.newGame({players:[{name:me,ai:false,color:seats[0]&&seats[0].color||PALETTE[0]},{name:'Flaminia (IA)',ai:true,lvl:3,color:LVLCOL[3][0]}],countries:['ITA','FRA','ENG'],rules:homeRule,seed:(Math.random()*2**32)>>>0});
  S.tutorial=true; coachSeen={}; coachOn=true;
  startLocal(); setTimeout(()=>startTour(0),700);
}
// =========== VISITE GUIDÉE DE L'INTERFACE ===========
const TOUR=['#score','#rslots','#oslots','#row .decks','#row .slot','#tracks','#tabs','#uni .res','#uni .urow','#uni .bhelp','#uni .hand','#letters','#log','#decide','#quit'];
let tourOn=false, tourI=0;
function tourEls(i){ return [...document.querySelectorAll(TOUR[i])].filter(e=>{ const r=e.getBoundingClientRect(); return r.width>0&&r.height>0; }); }
function startTour(i){ tourOn=true; tourI=i||0; let o=$('#tour'); if(!o){ o=el('div',{id:'tour'},el('div',{class:'tblk'}),el('div',{class:'tblk'}),el('div',{class:'tblk'}),el('div',{class:'tblk'}),el('div',{id:'tourHole'}),el('div',{id:'tourBub'})); document.body.appendChild(o); }
  o.classList.remove('hidden'); renderCoach(); showTourStep(); }
function endTour(){ tourOn=false; const o=$('#tour'); if(o) o.classList.add('hidden'); window.scrollTo({top:0,behavior:'smooth'}); renderCoach(); }
function showTourStep(){
  while(tourI<TOUR.length && !tourEls(tourI).length) tourI++;
  if(tourI>=TOUR.length){ endTour(); return; }
  const els=tourEls(tourI); const fixed=els.some(e=>getComputedStyle(e).position==='fixed');
  const b=$('#tourBub'); b.innerHTML=''; const last=tourI===TOUR.length-1;
  b.append(el('div',{class:'tstep'},(tourI+1)+' / '+TOUR.length),el('h4',{},t('tour_'+(tourI+1)+'_t')),el('p',{},t('tour_'+(tourI+1)+'_x')),
    ...(['#rslots','#oslots'].includes(TOUR[tourI])?[el('div',{class:'ttys'},['N','R','A','M'].map(ty=>el('span',{},icon('t_'+ty,24,'width:24px;cursor:default;margin-right:4px'),TN(ty))))]:[]),
    el('div',{class:'row-f'},el('button',{class:'small',onclick:endTour},t('tour_skip')),el('span',{style:'flex:1'}),
      tourI>0?el('button',{class:'small',onclick:()=>{ do{tourI--;}while(tourI>0&&!tourEls(tourI).length); showTourStep(); }},t('tour_prev')):null,
      el('button',{class:'small primary',onclick:()=>{ if(last) endTour(); else { tourI++; showTourStep(); } }},t(last?'tour_done':'tour_next'))));
  if(!fixed){ const bh=$('#tourBub').offsetHeight||200, vh=innerHeight; let T=1e9,B=-1e9; els.forEach(e=>{ const r=e.getBoundingClientRect(); T=Math.min(T,r.top+scrollY); B=Math.max(B,r.bottom+scrollY); });
    const need=(B-T)+bh+40; const y= need<=vh ? T-Math.max(16,(vh-need)/2) : T-16; window.scrollTo({top:Math.max(0,y),behavior:'smooth'}); }
  setTimeout(placeTour,fixed?0:500);
}
function placeTour(){
  if(!tourOn) return; const els=tourEls(tourI); if(!els.length) return;
  let L=1e9,T=1e9,R=-1e9,B=-1e9; els.forEach(e=>{ const r=e.getBoundingClientRect(); L=Math.min(L,r.left);T=Math.min(T,r.top);R=Math.max(R,r.right);B=Math.max(B,r.bottom); });
  const p=6, vw=innerWidth, vh=innerHeight; T=Math.max(T,4-p); B=Math.min(B,vh-4+p);
  const h=$('#tourHole'); Object.assign(h.style,{left:(L-p)+'px',top:(T-p)+'px',width:(R-L+2*p)+'px',height:(B-T+2*p)+'px'});
  const hl=L-p,ht=T-p,hr=R+p,hb=B+p, bk=document.querySelectorAll('#tour .tblk'), S4=[[0,0,vw,ht],[0,hb,vw,vh],[0,ht,hl,hb],[hr,ht,vw,hb]];
  bk.forEach((d,k)=>{ const [x1,y1,x2,y2]=S4[k]; Object.assign(d.style,{left:x1+'px',top:y1+'px',width:Math.max(0,x2-x1)+'px',height:Math.max(0,y2-y1)+'px'}); });
  const bb=$('#tourBub'), bw=Math.min(360,vw-24); bb.style.width=bw+'px'; const bh=bb.offsetHeight;
  let x,y;
  if(B+p+12+bh<vh){ y=B+p+12; x=L; } else if(T-p-12-bh>0){ y=T-p-12-bh; x=L; }
  else if(R+p+12+bw<vw){ x=R+p+12; y=T; } else if(L-p-12-bw>0){ x=L-p-12-bw; y=T; }
  else { const below=vh-B, above=T; if(below>=above){ y=vh-bh-12; } else { y=12; } x=L; }
  x=Math.max(12,Math.min(vw-bw-12,x)); y=Math.max(12,Math.min(vh-bh-12,y));
  bb.style.left=x+'px'; bb.style.top=y+'px';
}
addEventListener('resize',placeTour); addEventListener('scroll',()=>{ if(tourOn) placeTour(); },true);

let coachSeen={}, coachOn=true;
function renderCoach(){
  const c=$('#coach');
  const pd=S&&!S.over&&S.pending;
  if(!S||!S.tutorial||!coachOn||tourOn||!pd||!isMine(pd.p)||coachSeen[pd.kind]||!DICT.fr['tip_'+pd.kind]){ c.classList.add('hidden'); return; }
  c.innerHTML='';
  c.appendChild(el('div',{},el('b',{},'💡 '+t('tu_coach')+' — '),t('tip_'+pd.kind)));
  c.appendChild(el('div',{class:'row-f'},el('button',{class:'small',onclick:()=>{coachOn=false;renderCoach();}},t('tip_hide')),el('button',{class:'small primary',onclick:()=>{coachSeen[pd.kind]=1;renderCoach();}},t('tip_ok'))));
  c.classList.remove('hidden');
  c.style.bottom=($('#decide').offsetHeight+10)+'px';
}

// =========== ENREGISTREMENT DES PARTIES ===========
const LKEY='mag_stats';
function localGames(){ try{ return JSON.parse(store.get(LKEY)||'[]'); }catch(e){ return []; } }
function saveLocal(arr){ let all=localGames().concat(arr); if(all.length>600) all=all.slice(-600); store.set(LKEY,JSON.stringify(all)); }
async function recordGames(arr,src){
  if(!arr.length) return;
  STATS=null;
  if(db){
    try{
      if(src==='human'){ for(const g of arr) await db.collection('games').doc().set(g); }
      else for(let i=0;i<arr.length;i+=120) await db.collection('sims').doc().set({t:Date.now(),src,games:arr.slice(i,i+120)});
      return;
    }catch(e){ console.warn('db write failed',e); }
  }
  saveLocal(arr);
}
function maybeRecord(){
  if(!S||!S.over||S._rec) return;
  if(mode==='online' && !(table && table.host===myUid)) return;
  S._rec=true;
  recordGames([E.summary(S,'human')],'human');
}

// =========== POIDS DE L'IA ===========
let AIW=null; // {w, gen}
async function loadWeights(){
  let w=null;
  if(db){ try{ const d=await db.doc('ai/best').get(); if(d.exists) w=d.data(); }catch(e){} }
  if(!w){ try{ w=JSON.parse(store.get('mag_aiw')||'null'); }catch(e){} }
  if(w&&w.w&&w.v===E.W_VERSION){ AIW=w; E.setWeights(w.w); }
  if(view==='sim') renderSim();
}
async function saveWeights(w,gen){
  AIW={w,gen,updated:Date.now(),v:E.W_VERSION}; E.setWeights(w);
  if(db){ try{ await db.doc('ai/best').set(AIW); return t('si_saved'); }catch(e){} }
  store.set('mag_aiw',JSON.stringify(AIW)); return t('si_savedLocal');
}

// =========== STATISTIQUES ===========
let STATS=null, stFilter={src:'all',n:'all',rule:'all'}, stSort={}, STRESET=0, stCard={lvl:'all',type:'all',act:'all'};
async function loadStats(){
  const box=$('#stats');
  if(!STATS){
    box.innerHTML=''; box.appendChild(el('div',{class:'orn'},el('span',{},t('st_title')))); box.appendChild(el('p',{style:'color:#f3e7cc;text-align:center'},t('st_loading')));
    let all=localGames(), shared=false;
    if(db){
      try{
        const g=await db.collection('games').limit(1000).get(); g.docs.forEach(d=>all.push(d.data()));
        const s=await db.collection('sims').limit(500).get(); s.docs.forEach(d=>(d.data().games||[]).forEach(x=>all.push(x)));
        shared=true;
      }catch(e){ console.warn(e); }
    }
    let reset=+(store.get('mag_stats_reset')||0);
    if(db){ try{ const r=await db.doc('ai/stats').get(); if(r.exists) reset=Math.max(reset,r.data().reset||0); }catch(e){} }
    STRESET=reset;
    STATS={all:all.filter(g=>(g.t||0)>reset),shared,total:all.length};
  }
  renderStats();
}
const pct=(a,b)=>b?Math.round(a/b*100)+'%':'—';
const avg=(arr)=>arr.length?arr.reduce((a,b)=>a+b,0)/arr.length:0;
function sortable(cols,rows,key){
  // cols: [{h,num,f:(r)=>val, r:(r)=>node}] ; rows: data
  const sc=stSort[key]||{i:2,d:-1};
  const sorted=rows.slice().sort((a,b)=>{ const x=cols[sc.i].f(a), y=cols[sc.i].f(b); return (x>y?1:x<y?-1:0)*sc.d; });
  const tb=el('table',{class:'stbl'});
  tb.appendChild(el('tr',{},cols.map((c,i)=>el('th',{class:c.num?'num':'',onclick:()=>{ stSort[key]={i,d:sc.i===i?-sc.d:-1}; renderStats(); }},c.h+(sc.i===i?(sc.d<0?' ▾':' ▴'):'')))));
  sorted.forEach(r=>tb.appendChild(el('tr',{},cols.map(c=>el('td',{class:c.num?'num':''},c.r?c.r(r):String(c.f(r)))))));
  return el('div',{class:['rects','objs','seats','levels','letters','travel'].includes(key)?'':'scroll'},tb);
}
const barCell=(v,max,label)=>el('span',{},label,el('span',{class:'bar',style:'width:'+Math.round((max?v/max:0)*70)+'px'}));
function loadLib(src){ return new Promise((ok,ko)=>{ if(document.querySelector('script[src="'+src+'"]')) return ok(); const s=document.createElement('script'); s.src=src; s.onload=ok; s.onerror=ko; document.head.appendChild(s); }); }
async function exportPDF(){
  const btn=$('#pdfBtn'); if(btn){ btn.disabled=true; btn.textContent=t('st_pdfWait'); }
  try{
    await loadLib('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
    await loadLib('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    const node=$('#stats');
    document.querySelectorAll('#stats .scroll').forEach(x=>{ x.dataset.mh=x.style.maxHeight; x.style.maxHeight='none'; });
    const canvas=await html2canvas(node,{backgroundColor:'#2a1e14',scale:1.5,useCORS:true,ignoreElements:e=>e.id==='pdfBtn'});
    document.querySelectorAll('#stats .scroll').forEach(x=>{ x.style.maxHeight=x.dataset.mh||''; });
    const {jsPDF}=window.jspdf; const pdf=new jsPDF({orientation:'p',unit:'mm',format:'a4'});
    const pw=210, ph=297, m=6, iw=pw-2*m, pxPerMm=canvas.width/iw, sliceH=Math.floor((ph-2*m)*pxPerMm);
    for(let y=0,pg=0;y<canvas.height;y+=sliceH,pg++){
      const h=Math.min(sliceH,canvas.height-y); const c=document.createElement('canvas'); c.width=canvas.width; c.height=h;
      const cx=c.getContext('2d'); cx.fillStyle='#2a1e14'; cx.fillRect(0,0,c.width,h); cx.drawImage(canvas,0,y,canvas.width,h,0,0,canvas.width,h);
      if(pg) pdf.addPage(); pdf.setFillColor(42,30,20); pdf.rect(0,0,pw,ph,'F');
      pdf.addImage(c.toDataURL('image/jpeg',0.88),'JPEG',m,m,iw,h/pxPerMm);
    }
    const blob=pdf.output('blob'); const name='magister-statistiques-'+new Date().toISOString().slice(0,10)+'.pdf';
    let done=false;
    if(window.claude&&window.claude.use){ try{ const dl=await window.claude.use('downloads'); if(dl){ await dl.save({filename:name,data:blob}); done=true; } }catch(e){ if(e&&e.code==='declined') done=true; else console.warn(e); } }
    if(!done){ const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },2000); }
  }catch(e){ console.error(e); alertBox(t('st_pdfErr')); }
  if(btn){ btn.disabled=false; btn.textContent='⤓ '+t('st_pdf'); }
}
function resetStats(){
  zoomShow(el('div',{class:'zt'},el('h3',{},t('st_resetQ')),el('p',{},t('st_resetTxt')),
    el('div',{class:'row-f',style:'justify-content:flex-end'},el('button',{onclick:zoomHide},t('ui_cancel')),
      el('button',{class:'primary',onclick:async()=>{ zoomHide(); const now=Date.now(); store.set('mag_stats_reset',String(now));
        if(db){ try{ await db.doc('ai/stats').set({reset:now}); }catch(e){} }
        STATS=null; loadStats(); }},t('st_resetYes')))));
}
function renderStats(){
  const box=$('#stats'); box.innerHTML='';
  box.appendChild(el('div',{class:'orn'},el('span',{},t('st_title'))));
  const sel=(id,opts,cur,on)=>el('select',{onchange:e=>on(e.target.value)},opts.map(([v,l])=>el('option',{value:v,selected:v===cur?'':null},l)));
  box.appendChild(el('div',{class:'filters'},
    el('label',{},t('st_source'),sel('src',[['all',t('st_all')],['human',t('st_human')],['sim',t('st_sim')],['train',t('st_train')]],stFilter.src,v=>{stFilter.src=v;renderStats();})),
    el('label',{},t('st_players'),sel('n',[['all',t('st_any')],['2','2'],['3','3'],['4','4']],stFilter.n,v=>{stFilter.n=v;renderStats();})),
    el('label',{},t('ui_rule'),sel('rule',[['all',t('st_all')],['classic',t('ui_rule8')],['six',t('ui_rule6')]],stFilter.rule,v=>{stFilter.rule=v;renderStats();})),
    el('span',{class:'muted',style:'color:#e9d7b0'},STATS.shared?t('st_shared'):t('st_localOnly')),
    el('span',{class:'spacer',style:'flex:1'}),
    el('button',{class:'small',onclick:async()=>{ try{ await navigator.clipboard.writeText(JSON.stringify(games)); alertBox(t('st_copied')); }catch(e){} }},t('st_copy')),
    el('button',{class:'small',onclick:resetStats},t('st_reset')),
    el('button',{class:'small primary',id:'pdfBtn',onclick:exportPDF},'⤓ '+t('st_pdf'))));
  if(STRESET) box.appendChild(el('div',{class:'muted',style:'color:#e9d7b0;margin-top:6px'},t('st_since',new Date(STRESET).toLocaleString(LANG))));
  const games=STATS.all.filter(g=>(stFilter.src==='all'||g.src===stFilter.src)&&(stFilter.n==='all'||g.n===+stFilter.n)&&(stFilter.rule==='all'||(g.rule||'classic')===stFilter.rule));
  if(!games.length){ box.appendChild(el('div',{class:'pcard'},el('p',{},t('st_empty')))); return; }
  const N=games.length;
  // KPIs
  const winners=[]; games.forEach(g=>g.players.forEach(p=>{ if(p.win) winners.push(p); }));
  const firstWins=games.filter(g=>g.players.find(p=>p.seat===g.start&&p.win)).length;
  const humanGames=games.filter(g=>g.players.some(p=>!p.ai)&&g.players.some(p=>p.ai));
  const humanWins=humanGames.filter(g=>g.players.some(p=>!p.ai&&p.win)).length;
  const rounds=games.map(g=>g.rounds);
  const kp=[[N,t('st_games')],[avg(rounds).toFixed(1),t('st_rounds')],[avg(winners.map(p=>p.vp)).toFixed(1),t('st_winVP')],[pct(firstWins,N),t('st_firstWin')]];
  if(humanGames.length) kp.push([pct(humanWins,humanGames.length),t('st_humanWin')+' ('+humanGames.length+')']);
  box.appendChild(el('div',{class:'kpis'},kp.map(([v,l])=>el('div',{class:'kpi'},el('div',{class:'v'},String(v)),el('div',{class:'l'},l)))));
  // durée + places
  const dist={}; rounds.forEach(r=>{ const k=Math.round(r); dist[k]=(dist[k]||0)+1; });
  const dk=Object.keys(dist).map(Number).sort((a,b)=>a-b); const dmax=Math.max(...Object.values(dist));
  const distBox=el('div',{style:'display:flex;align-items:flex-end;gap:6px;height:150px;padding-top:10px'},dk.map(k=>{ const inR=k>=10&&k<=12;
    return el('div',{style:'flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%',title:k+' : '+dist[k]},
      el('div',{style:'font-size:12px'},String(dist[k])),
      el('div',{style:'width:100%;max-width:38px;border-radius:4px 4px 0 0;background:var(--wine2);height:'+Math.max(3,Math.round(dist[k]/dmax*110))+'px'}),
      el('div',{style:'font-size:13px;margin-top:3px'},String(k))); }));
  const seats=[0,1,2,3].map(sx=>{ const gs=games.filter(g=>g.n>sx); return {seat:sx+1,g:gs.length,w:gs.filter(g=>g.players[sx]&&g.players[sx].win).length}; }).filter(x=>x.g);
  box.appendChild(el('div',{class:'two'},
    el('div',{class:'pcard'},el('h3',{},t('st_lengthDist')),distBox),
    el('div',{class:'pcard'},el('h3',{},t('st_seats')),sortable([{h:t('st_seat'),f:r=>r.seat},{h:t('st_games'),num:1,f:r=>r.g},{h:t('st_wins'),num:1,f:r=>r.g?r.w/r.g:0,r:r=>barCell(r.w/r.g,1,pct(r.w,r.g))}],seats,'seats'))));
  // sources de PV des vainqueurs
  const src={books:0,em:0,rect:0,bol:0,cst:0};
  winners.forEach(p=>{ src.books+=p.books.length; src.em+=Object.values(p.em).reduce((a,b)=>a+b,0); src.rect+=p.rect?1:0; src.bol+=p.bol; src.cst+=p.cst; });
  const tot=Object.values(src).reduce((a,b)=>a+b,0)||1;
  const srcRows=[['books',t('st_src_books'),'book'],['em',t('st_src_em'),'emer'],['rect',t('st_src_rect'),'rect'],['bol',t('st_src_bol'),'laurel'],['cst',t('st_src_cst'),'laurel']].filter(r=>src[r[0]]>0||r[0]!=='cst');
  box.appendChild(el('div',{class:'pcard'},el('h3',{},t('st_vpSources')),
    el('div',{style:'display:flex;height:26px;border-radius:6px;overflow:hidden;margin:6px 0 10px;gap:2px'},srcRows.map((r,i)=>el('div',{title:r[1]+' : '+Math.round(src[r[0]]/tot*100)+'%',style:'flex:'+src[r[0]]+';background:'+['#5a1414','#c99a2e','#1f6f8b','#2e7d32','#7b3f7f'][i]}))),
    el('div',{style:'display:flex;gap:18px;flex-wrap:wrap'},srcRows.map((r,i)=>el('span',{},el('span',{class:'tbadge',style:'background:'+['#5a1414','#c99a2e','#1f6f8b','#2e7d32','#7b3f7f'][i]}),r[1]+' : '+(src[r[0]]/winners.length).toFixed(2)+' '+t('ui_vp')+' ('+Math.round(src[r[0]]/tot*100)+'%)')))));
  // cartes
  const cs={}; D.cards.forEach(c=>cs[c.id]={c,h:0,hw:0,p:0,e:0,r:0,cost:[]});
  games.forEach(g=>g.players.forEach(p=>{
    new Set([...(p.start||[]),...p.hires]).forEach(id=>{ if(cs[id]){ cs[id].h++; if(p.win) cs[id].hw++; } });
    (p.hcost||[]).forEach((c,i)=>{ const id=p.hires[i]; if(cs[id]) cs[id].cost.push(c); });
    p.fin.p.forEach(id=>{ if(cs[id]) cs[id].p++; }); p.fin.e.forEach(id=>{ if(cs[id]) cs[id].e++; }); if(p.fin.r&&cs[p.fin.r]) cs[p.fin.r].r++;
  }));
  const crowAll=Object.values(cs); const crow=crowAll.filter(r=>r.c.id>16);
  const lv=[1,2,3].map(l=>{ const rs=crow.filter(r=>r.c.lvl===l); const h=rs.reduce((a,r)=>a+r.h,0), hw=rs.reduce((a,r)=>a+r.hw,0), cost=[].concat(...rs.map(r=>r.cost)); return {l,h,hw,cost,per:h/N}; });
  box.appendChild(el('div',{class:'pcard'},el('h3',{},t('st_levels')),
    sortable([{h:t('st_level'),f:r=>r.l,r:r=>el('span',{},icon('lv_'+r.l,22),' '+t('L_'+r.l))},
      {h:t('st_hiresPerGame'),num:1,f:r=>r.per,r:r=>el('span',{},r.per.toFixed(1))},
      {h:t('st_cost'),num:1,f:r=>r.cost.length?avg(r.cost):-1,r:r=>barCell(r.cost.length?avg(r.cost):0,5,r.cost.length?avg(r.cost).toFixed(2):'—')},
      {h:t('st_paid5'),num:1,f:r=>r.cost.length?r.cost.filter(c=>c>=5).length/r.cost.length:-1,r:r=>el('span',{},pct(r.cost.filter(c=>c>=5).length,r.cost.length))},
      {h:t('st_hiredWin'),num:1,f:r=>r.h?r.hw/r.h:-1,r:r=>el('span',{},pct(r.hw,r.h))}],lv,'levels')));
  const thumb=id=>{ const im=el('img',{class:'th',src:'cards/'+id+'.webp'}); im.onclick=()=>zoomCard(id); return im; };
  // Victoires selon le type que l'Étudiant permet d'activer (Artiste / Marchand / Noble / Religieux / Joker)
  const actIc=a=>a==='any'?icon('t_any',20):icon('t_'+a,20), actName=a=>a==='any'?t('st_joker'):TN(a);
  const byAct=['A','M','N','R','any'].map(a=>{ const rs=crow.filter(r=>r.c.act===a); const h=rs.reduce((s,r)=>s+r.h,0), hw=rs.reduce((s,r)=>s+r.hw,0), cost=[].concat(...rs.map(r=>r.cost)); return {a,n:rs.length,h,hw,cost,per:h/N}; });
  box.appendChild(el('div',{class:'pcard'},el('h3',{},t('st_byAct')),el('div',{class:'muted',style:'margin-bottom:6px'},t('st_byActNote')),
    sortable([{h:t('st_actType'),f:r=>r.a,r:r=>el('span',{},actIc(r.a),' '+actName(r.a))},
      {h:t('st_nCards'),num:1,f:r=>r.n,r:r=>el('span',{},String(r.n))},
      {h:t('st_hiresPerGame'),num:1,f:r=>r.per,r:r=>el('span',{},r.per.toFixed(1))},
      {h:t('st_cost'),num:1,f:r=>r.cost.length?avg(r.cost):-1,r:r=>el('span',{},r.cost.length?avg(r.cost).toFixed(2):'—')},
      {h:t('st_hiredWin'),num:1,f:r=>r.h?r.hw/r.h:-1,r:r=>barCell(r.h?r.hw/r.h:0,1,pct(r.hw,r.h))}],byAct,'byact')));
  const cfil=crowAll.filter(r=>(stCard.lvl==='all'||r.c.lvl===+stCard.lvl)&&(stCard.type==='all'||r.c.type===stCard.type)&&(stCard.act==='all'||r.c.act===stCard.act));
  const cbar=el('div',{class:'row-f',style:'margin-bottom:8px;gap:12px'},
    el('div',{class:'tog'},[['all',t('st_any')],['3',t('L_3')],['2',t('L_2')],['1',t('L_1')],['0',t('L_0')]].map(([v,l])=>el('button',{class:stCard.lvl===v?'on':'',onclick:()=>{stCard.lvl=v;renderStats();}},v==='all'||v==='0'?l:el('span',{},icon('lv_'+v,16),' '+l)))),
    el('div',{class:'tog'},[['all',t('st_any')],['A',t('T_A')],['M',t('T_M')],['N',t('T_N')],['R',t('T_R')]].map(([v,l])=>el('button',{class:stCard.type===v?'on':'',onclick:()=>{stCard.type=v;renderStats();}},v==='all'?l:el('span',{},icon('t_'+v,16),' '+l)))),
    el('span',{style:'display:inline-flex;align-items:center;gap:6px'},el('span',{class:'muted',style:'font-size:13px'},t('st_actType')+' :'),
    el('div',{class:'tog'},[['all',t('st_any')],['A',t('T_A')],['M',t('T_M')],['N',t('T_N')],['R',t('T_R')],['any',t('st_joker')]].map(([v,l])=>el('button',{class:stCard.act===v?'on':'',title:v==='all'?null:l,onclick:()=>{stCard.act=v;renderStats();}},v==='all'?l:el('span',{},icon('t_'+v,16),' '+l))))));
  box.appendChild(el('div',{class:'pcard'},el('h3',{},t('st_cards')),el('div',{class:'muted',style:'margin-bottom:6px'},t('st_note')),cbar,
    sortable([
      {h:t('st_card'),f:r=>r.c.name,r:r=>el('span',{},thumb(r.c.id),r.c.name)},
      {h:t('st_type'),f:r=>r.c.type+r.c.lvl,r:r=>el('span',{},icon('t_'+r.c.type,20),' ',r.c.lvl?icon('lv_'+r.c.lvl,18):el('span',{class:'muted',style:'font-size:12px'},t('L_0')))},
      {h:t('st_actType'),f:r=>({A:1,M:2,N:3,R:4,any:5})[r.c.act]||9,r:r=>r.c.act?el('span',{title:actName(r.c.act)},actIc(r.c.act)):el('span',{class:'muted'},'—')},
      {h:t('st_hired'),num:1,f:r=>r.h/N,r:r=>barCell(r.h/N,1,pct(r.h,N))},
      {h:t('st_cost'),num:1,f:r=>r.cost.length?avg(r.cost):-1,r:r=>el('span',{},r.cost.length?avg(r.cost).toFixed(1):'—')},
      {h:t('st_hiredWin'),num:1,f:r=>r.h?r.hw/r.h:-1,r:r=>el('span',{},pct(r.hw,r.h))},
      {h:t('st_prof'),num:1,f:r=>r.p/N,r:r=>el('span',{},pct(r.p,N))},
      {h:t('st_emer'),num:1,f:r=>r.e/N,r:r=>el('span',{},pct(r.e,N))},
      {h:t('st_rect'),num:1,f:r=>r.r,r:r=>el('span',{},String(r.r))}],cfil,'cards')));
  // ===== analyses avancées (parties enregistrées depuis la mise à jour) =====
  const adv=games.filter(g=>g.vpr);
  if(adv.length){
    const AP=[]; adv.forEach(g=>g.players.forEach(p=>AP.push({g,p})));
    const W=AP.filter(x=>x.p.win), L=AP.filter(x=>!x.p.win);
    const mean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0, f1=v=>v.toFixed(1);
    box.appendChild(el('div',{class:'orn'},el('span',{},t('sx_title'))));
    box.appendChild(el('div',{class:'muted',style:'color:#e9d7b0;text-align:center;margin-top:-8px'},t('sx_note',adv.length)));
    // --- Comparaison vainqueurs / moyenne / perdants
    const gm=[['sx_gCoins',p=>(p.g||{}).c||0],['sx_gInfl',p=>(p.g||{}).i||0],['sx_gMoves',p=>(p.g||{}).t||0],['sx_gCities',p=>(p.cities||[]).length],['sx_gJourneys',p=>p.j||0],
      ['sx_gDrawn',p=>(p.g||{}).b||0],['sx_gPlayed',p=>p.books.length],['sx_gLetters',p=>(p.letters||[]).length],['sx_gHires',p=>p.hires.length],['sx_gPaid',p=>(p.hcost||[]).reduce((a,b)=>a+b,0)],
      ['sx_gAct',p=>p.nAct||0],['sx_gPromoChoice',p=>p.nPromo||0],['sx_gProf',p=>(p.promos||{}).S||0],['sx_gEmer',p=>(p.promos||{}).E||0],['sx_gRect',p=>p.rect?1:0],['sx_gLeftC',p=>p.coins||0],['sx_gLeftI',p=>p.infl||0],['sx_gVP',p=>p.vp]];
    const gRows=gm.map(([k,f])=>{ const w=mean(W.map(x=>f(x.p))), a=mean(AP.map(x=>f(x.p))), l=mean(L.map(x=>f(x.p))); const d=l?Math.round((w-l)/l*100):null;
      const GI={sx_gCoins:['coin'],sx_gInfl:['infl'],sx_gMoves:['trav'],sx_gJourneys:['trav_a'],sx_gDrawn:['book'],sx_gPlayed:['book'],sx_gLetters:['letter'],sx_gHires:['stu'],sx_gPaid:['infl'],sx_gPromoChoice:['promo'],sx_gProf:['prof'],sx_gEmer:['emer'],sx_gRect:['rect'],sx_gLeftC:['coin'],sx_gLeftI:['infl'],sx_gVP:['laurel']};
      return el('tr',{},el('td',{},el('span',{style:'display:inline-block;width:46px;text-align:center'},(GI[k]||[]).map(n=>icon(n,20,'margin:0 1px'))),t(k)),el('td',{class:'num',style:'font-weight:700;color:var(--wine2)'},f1(w)),el('td',{class:'num'},f1(a)),el('td',{class:'num'},f1(l)),
        el('td',{class:'num',style:'color:'+(d===null?'inherit':d>=10?'#1f5a1a':d<=-10?'#8e1f1f':'inherit')},d===null?'—':(d>0?'+':'')+d+' %')); });
    box.appendChild(el('div',{class:'pcard'},el('h3',{},t('sx_compare')),el('div',{class:'muted',style:'margin-bottom:6px'},t('sx_compareNote')),
      el('table',{class:'stbl'},el('tr',{},el('th',{},''),el('th',{class:'num'},t('sx_winners')),el('th',{class:'num'},t('sx_avg')),el('th',{class:'num'},t('sx_losers')),el('th',{class:'num'},t('sx_diff'))),gRows)));
    // --- Rythme : courbe des PV par tour
    const maxR=Math.max(...adv.map(g=>g.vpr.length));
    const curve=k=>[...Array(maxR)].map((_,r)=>{ const v=[]; adv.forEach(g=>{ if(g.vpr[r]) g.players.forEach((p,i)=>{ if((k==='w')===p.win) v.push(g.vpr[r][i]); }); }); return v.length>=3?mean(v):null; });
    const cw=curve('w'), cl=curve('l');
    const Wd=560,Hd=200,px=r=>40+r*(Wd-60)/Math.max(1,maxR-1),py=v=>Hd-25-v*(Hd-45)/9;
    const path=c=>c.map((v,r)=>v===null?null:(px(r)+','+py(v))).filter(Boolean).join(' ');
    const svg=`<svg viewBox="0 0 ${Wd} ${Hd}" style="width:100%;max-width:640px">${[0,2,4,6,8].map(v=>`<line x1="40" x2="${Wd-20}" y1="${py(v)}" y2="${py(v)}" stroke="#d8c393" stroke-width="1"/><text x="30" y="${py(v)+4}" font-size="11" text-anchor="end" fill="#5b3a1a">${v}</text>`).join('')}
      <line x1="40" x2="${Wd-20}" y1="${py(8)}" y2="${py(8)}" stroke="#5a1414" stroke-dasharray="4 3" stroke-width="1.5"/>
      ${[...Array(maxR)].map((_,r)=>`<text x="${px(r)}" y="${Hd-8}" font-size="11" text-anchor="middle" fill="#5b3a1a">${r+1}</text>`).join('')}
      <polyline points="${path(cw)}" fill="none" stroke="#5a1414" stroke-width="2.5"/><polyline points="${path(cl)}" fill="none" stroke="#c99a2e" stroke-width="2.5"/>
      ${cw.map((v,r)=>v===null?'':`<circle cx="${px(r)}" cy="${py(v)}" r="4" fill="#5a1414" stroke="#f3e7cc" stroke-width="2"><title>${t('sx_winner')} — ${t('ui_round',r+1)} : ${f1(v)} ${t('ui_vp')}</title></circle>`).join('')}
      ${cl.map((v,r)=>v===null?'':`<circle cx="${px(r)}" cy="${py(v)}" r="4" fill="#c99a2e" stroke="#f3e7cc" stroke-width="2"><title>${t('sx_others')} — ${t('ui_round',r+1)} : ${f1(v)} ${t('ui_vp')}</title></circle>`).join('')}</svg>`;
    const curveBox=el('div',{}); curveBox.innerHTML=svg;
    const legend=el('div',{style:'display:flex;gap:16px;font-size:14px'},el('span',{},el('span',{class:'tbadge',style:'background:#5a1414'}),t('sx_winner')),el('span',{},el('span',{class:'tbadge',style:'background:#c99a2e'}),t('sx_others')));
    const ms=[['S','sx_firstProf'],['E','sx_firstEmer'],['R','sx_firstRect'],['B','sx_firstBook']];
    const msRow=(set)=>ms.map(([k])=>{ const v=set.map(x=>x.p.first&&x.p.first[k]).filter(x=>x!==undefined&&x!==null); return v.length?f1(mean(v)):'—'; });
    const margins=adv.map(g=>{ const v=g.players.map(p=>p.vp).sort((a,b)=>b-a); return v[0]-(v[1]||0); });
    box.appendChild(el('div',{class:'two'},
      el('div',{class:'pcard'},el('h3',{},t('sx_curve')),legend,curveBox),
      el('div',{class:'pcard'},el('h3',{},t('sx_milestones')),
        el('table',{class:'stbl'},el('tr',{},el('th',{},''),el('th',{class:'num'},t('sx_winner')),el('th',{class:'num'},t('sx_others'))),
          ms.map(([k,l],i)=>el('tr',{},el('td',{},t(l)),el('td',{class:'num'},msRow(W)[i]),el('td',{class:'num'},msRow(L)[i])))),
        el('h3',{style:'margin-top:14px'},t('sx_margin')),
        el('div',{class:'kpis',style:'margin-top:0'},[['0',m=>m===0],['1',m=>m===1],['2',m=>m===2],['3+',m=>m>=3]].map(([l,f])=>el('div',{class:'kpi'},el('div',{class:'v'},pct(margins.filter(f).length,margins.length)),el('div',{class:'l'},t('sx_marginOf',l))))))));
    // --- Stratégies
    const major=p=>{ const c={A:0,M:0,N:0,R:0}; [...p.fin.s,...p.fin.p,...p.fin.e,...(p.fin.r?[p.fin.r]:[])].forEach(id=>c[CARD[id].type]++); return Object.entries(c).sort((a,b)=>b[1]-a[1])[0][0]; };
    const byT={A:[0,0],M:[0,0],N:[0,0],R:[0,0]}; AP.forEach(x=>{ const ty=major(x.p); byT[ty][0]++; if(x.p.win) byT[ty][1]++; });
    const path2=p=>{ const o=Object.keys(p.em).length, b=p.books.length; return [b?t('sx_pBooks',b):null,o?t('sx_pObjs',o):null,p.rect?t('ui_vpRect'):null,(p.bol+p.cst)?t('sx_pCities',p.bol+p.cst):null].filter(Boolean).join(' · ')||'—'; };
    const paths={}; W.forEach(x=>{ const k=path2(x.p); paths[k]=(paths[k]||0)+1; });
    const topPaths=Object.entries(paths).sort((a,b)=>b[1]-a[1]).slice(0,8);
    const actShare=set=>{ const a=set.reduce((s,x)=>s+(x.p.nAct||0),0), pr=set.reduce((s,x)=>s+(x.p.nPromo||0),0); return pct(a,a+pr); };
    box.appendChild(el('div',{class:'two'},
      el('div',{class:'pcard'},el('h3',{},t('sx_byType')),
        el('table',{class:'stbl'},el('tr',{},el('th',{},t('st_type')),el('th',{class:'num'},t('sx_players')),el('th',{class:'num'},t('st_wins'))),
          D.TYPES.map(ty=>el('tr',{},el('td',{},icon('t_'+ty,20),' '+t('T_'+ty)),el('td',{class:'num'},String(byT[ty][0])),el('td',{class:'num'},barCell(byT[ty][0]?byT[ty][1]/byT[ty][0]:0,1,pct(byT[ty][1],byT[ty][0])))))),
        el('h3',{style:'margin-top:14px'},t('sx_actShare')),
        el('div',{class:'kpis',style:'margin-top:0'},el('div',{class:'kpi'},el('div',{class:'v'},actShare(W)),el('div',{class:'l'},t('sx_winner'))),el('div',{class:'kpi'},el('div',{class:'v'},actShare(L)),el('div',{class:'l'},t('sx_others'))))),
      el('div',{class:'pcard'},el('h3',{},t('sx_paths')),
        el('table',{class:'stbl'},el('tr',{},el('th',{},t('sx_path')),el('th',{class:'num'},t('st_wins'))),
          topPaths.map(([k,n])=>el('tr',{},el('td',{},k),el('td',{class:'num'},barCell(n/W.length,1,pct(n,W.length)))))))));
    // --- Économie
    const left=set=>f1(mean(set.map(x=>(x.p.coins||0)+(x.p.infl||0))));
    const sl=[0,0,0,0,0,0], free=[0]; AP.forEach(x=>(x.p.slots||[]).forEach(v=>{ if(v<0) free[0]++; else sl[v]++; }));
    const slTot=sl.reduce((a,b)=>a+b,0)+free[0];
    const lt={}; D.letters.forEach(L0=>lt[L0.id]={id:L0.id,n:0,w:0}); AP.forEach(x=>(x.p.letters||[]).forEach(id=>{ if(lt[id]){ lt[id].n++; if(x.p.win) lt[id].w++; } }));
    box.appendChild(el('div',{class:'two'},
      el('div',{class:'pcard'},el('h3',{},t('sx_slots')),
        el('div',{style:'display:flex;gap:8px;align-items:flex-end;height:150px;padding-top:8px'},[...sl.map((n,i)=>[n,String(D.ROWCOST[i])]),[free[0],t('sx_free')]].map(([n,l])=>el('div',{style:'flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%'},
          el('div',{style:'font-size:12px'},pct(n,slTot)),el('div',{style:'width:100%;max-width:40px;border-radius:4px 4px 0 0;background:var(--wine2);height:'+Math.max(2,Math.round((slTot?n/slTot:0)*300))+'px;max-height:110px'}),
          el('div',{style:'margin-top:4px'},l===t('sx_free')?el('span',{style:'font-size:12px'},l):el('span',{class:'seal'+(l==='0'?' free':''),style:'width:22px;height:22px;font-size:12px'},l))))),
        el('div',{class:'muted',style:'margin-top:6px'},t('sx_slotsNote')),
        el('h3',{style:'margin-top:14px'},t('sx_left')),
        el('div',{class:'kpis',style:'margin-top:0'},el('div',{class:'kpi'},el('div',{class:'v'},left(W)),el('div',{class:'l'},t('sx_winner'))),el('div',{class:'kpi'},el('div',{class:'v'},left(L)),el('div',{class:'l'},t('sx_others'))))),
      el('div',{class:'pcard'},el('h3',{},t('sx_letters')),
        sortable([{h:t('sx_letter'),f:r=>r.id,r:r=>{ const L0=D.letters.find(x=>x.id===r.id); return el('span',{},el('img',{class:'th',src:'let/'+r.id+'.webp',style:'width:26px'}),L0.woa?t('W_'+L0.woa):tm(E.effsTxt(L0.g))); }},
          {h:t('sx_taken'),num:1,f:r=>r.n},{h:t('st_playedWin'),num:1,f:r=>r.n?r.w/r.n:-1,r:r=>el('span',{},pct(r.w,r.n))}],Object.values(lt),'letters'))));
    // --- Places par nombre de joueurs, voyages, pioche
    const seatTab=el('table',{class:'stbl'},el('tr',{},el('th',{},t('st_players')),...[1,2,3,4].map(i=>el('th',{class:'num'},t('st_seat')+' '+i)),el('th',{class:'num'},t('st_games'))));
    [2,3,4].forEach(n=>{ const gs=adv.filter(g=>g.n===n); if(!gs.length) return; seatTab.appendChild(el('tr',{},el('td',{},String(n)),...[0,1,2,3].map(i=>el('td',{class:'num'},i<n?pct(gs.filter(g=>g.players[i]&&g.players[i].win).length,gs.length):'')),el('td',{class:'num'},String(gs.length)))); });
    const tv={}; adv.forEach(g=>g.cs.forEach((c,i)=>g.players.forEach(p=>{ if(!p.trav) return; (tv[c]=tv[c]||{c,pos:[],done:0,n:0}); tv[c].pos.push(p.trav[i]); tv[c].n++; if(p.trav[i]>=12) tv[c].done++; })));
    const dk=[2,3,4].map(n=>{ const gs=adv.filter(g=>g.n===n); return [n,gs.filter(g=>g.deckOut).length,gs.length]; }).filter(x=>x[2]);
    box.appendChild(el('div',{class:'two'},
      el('div',{class:'pcard'},el('h3',{},t('sx_seatsByN')),seatTab,
        el('h3',{style:'margin-top:14px'},t('sx_deckOut')),
        el('div',{class:'kpis',style:'margin-top:0'},dk.map(([n,d,tot])=>el('div',{class:'kpi'},el('div',{class:'v'},pct(d,tot)),el('div',{class:'l'},t('sx_nPlayers',n)))))),
      el('div',{class:'pcard'},el('h3',{},t('sx_travel')),
        sortable([{h:t('st_country'),f:r=>t('C_'+r.c),r:r=>el('span',{},el('img',{class:'th',src:'tok/country_'+COUNTRY_IMG[r.c]+'.webp',style:'width:22px'}),t('C_'+r.c))},
          {h:t('sx_avgPos'),num:1,f:r=>mean(r.pos),r:r=>barCell(mean(r.pos)/12,1,f1(mean(r.pos))+' / 12')},
          {h:t('sx_done'),num:1,f:r=>r.done/r.n,r:r=>el('span',{},pct(r.done,r.n))}],Object.values(tv),'travel'))));
  }
  // Livres + Recteurs
  const bs={}; D.books.forEach(b=>bs[b.id]={id:b.id,n:0,w:0});
  games.forEach(g=>g.players.forEach(p=>p.books.forEach(b=>{ bs[b].n++; if(p.win) bs[b].w++; })));
  const rs={}; D.rectors.forEach(r=>rs[r.id]={id:r.id,app:0,n:0,w:0});
  games.forEach(g=>{ Object.values(g.rects||{}).forEach(id=>{ if(rs[id]) rs[id].app++; }); g.players.forEach(p=>{ if(p.rect&&rs[p.rect]){ rs[p.rect].n++; if(p.win) rs[p.rect].w++; } }); });
  box.appendChild(el('div',{class:'two'},
    el('div',{class:'pcard'},el('h3',{},t('st_books')),sortable([
      {h:t('st_book'),f:r=>t('B_'+r.id),r:r=>{ const im=el('img',{class:'th',src:'book/'+r.id+'.webp'}); im.onclick=()=>zoomImg('book/'+r.id+'.webp',t('ui_book'),t('B_'+r.id)); return el('span',{},im,t('B_'+r.id)); }},
      {h:t('st_played'),num:1,f:r=>r.n,r:r=>barCell(r.n,Math.max(...Object.values(bs).map(x=>x.n)),String(r.n))},
      {h:t('st_playedWin'),num:1,f:r=>r.n?r.w/r.n:-1,r:r=>el('span',{},pct(r.w,r.n))}],Object.values(bs),'books')),
    el('div',{class:'pcard'},el('h3',{},t('st_rectors')),sortable([
      {h:t('st_rector'),f:r=>t('R_'+r.id),r:r=>{ const im=el('img',{class:'th',src:'rect/'+r.id+'.webp'}); im.onclick=()=>zoomImg('rect/'+r.id+'.webp',t('ui_rRector'),t('R_'+r.id)); return el('span',{},im,t('R_'+r.id)); }},
      {h:t('st_taken'),num:1,f:r=>r.app?r.n/r.app:-1,r:r=>el('span',{},pct(r.n,r.app))},
      {h:t('st_takenWin'),num:1,f:r=>r.n?r.w/r.n:-1,r:r=>el('span',{},pct(r.w,r.n))}],Object.values(rs),'rects'))));
  // objectifs + pays + villes
  const os={}; ['A1','A2','B1','B2','C1','C2','D1','D2'].forEach(o=>os[o]={id:o,app:0,n:0,w:0,rc:[]});
  games.forEach(g=>{ Object.entries(g.objs||{}).forEach(([ty,o])=>{ os[o].app++; const cl=g.players.filter(p=>p.em[ty]!==undefined), k=cl.length; os[o].n+=k; os[o].w+=cl.filter(p=>p.win).length; if(k) os[o].rc.push(g.rounds); }); });
  const ct={}; Object.keys(D.countries).forEach(c=>ct[c]={id:c,n:0,r:[]});
  games.forEach(g=>g.cs.forEach(c=>{ if(ct[c]){ ct[c].n++; ct[c].r.push(g.rounds); } }));
  const cy={}; Object.entries(D.countries).forEach(([c,C])=>C.cities.forEach(x=>cy[x[1]]={k:x[1],c,app:0,n:0,pn:0,pw:0}));
  games.forEach(g=>{ g.cs.forEach(c=>D.countries[c].cities.forEach(x=>cy[x[1]].app++)); g.players.forEach(p=>{ p.cities.forEach(k=>{ if(cy[k]) cy[k].n++; }); new Set(p.cities).forEach(k=>{ if(cy[k]){ cy[k].pn++; if(p.win) cy[k].pw++; } }); }); });
  box.appendChild(el('div',{class:'two'},
    el('div',{class:'pcard'},el('h3',{},t('st_objs')),sortable([
      {h:t('st_obj'),f:r=>t('O_'+r.id),r:r=>{ const im=el('img',{class:'th',src:'obj/'+r.id+'.webp'}); im.onclick=()=>zoomImg('obj/'+r.id+'.webp',t('st_obj'),t('O_'+r.id)); return el('span',{},im,t('O_'+r.id)); }},
      {h:t('st_games'),num:1,f:r=>r.app},
      {h:t('st_claimed'),num:1,f:r=>r.app?r.n/r.app:-1,r:r=>el('span',{},r.app?(r.n/r.app).toFixed(2):'—')},{h:t('st_claimWin'),num:1,f:r=>r.n?r.w/r.n:-1,r:r=>el('span',{},r.n?Math.round(100*r.w/r.n)+'%':'—')},{h:t('st_roundsClaimed'),num:1,f:r=>r.rc.length?avg(r.rc):-1,r:r=>el('span',{},r.rc.length?avg(r.rc).toFixed(1):'—')}],Object.values(os),'objs')),
    el('div',{class:'pcard'},el('h3',{},t('st_countries')),sortable([
      {h:t('st_country'),f:r=>t('C_'+r.id),r:r=>el('span',{},el('img',{class:'th',src:'tok/country_'+COUNTRY_IMG[r.id]+'.webp',style:'width:22px'}),t('C_'+r.id))},
      {h:t('st_games'),num:1,f:r=>r.n},
      {h:t('st_rounds'),num:1,f:r=>avg(r.r),r:r=>el('span',{},r.r.length?avg(r.r).toFixed(1):'—')}],Object.values(ct),'countries'))));
  box.appendChild(el('div',{class:'pcard'},el('h3',{},t('st_cities')),sortable([
      {h:t('st_city'),f:r=>t('CY_'+r.k),r:r=>el('span',{},el('img',{class:'th',src:'city/'+r.k+'.webp'}),t('CY_'+r.k),el('span',{class:'muted'},' — '+t('C_'+r.c)))},
      {h:t('st_games'),num:1,f:r=>r.app},
      {h:t('st_reached'),num:1,f:r=>r.app?r.n/r.app:-1,r:r=>barCell(r.app?r.n/r.app:0,Math.max(...Object.values(cy).map(x=>x.app?x.n/x.app:0)),r.app?(r.n/r.app).toFixed(2):'—')},
      {h:t('st_cityWin'),num:1,f:r=>r.pn?r.pw/r.pn:-1,r:r=>el('span',{},r.pn?Math.round(100*r.pw/r.pn)+'%':'—')}],Object.values(cy).filter(x=>x.app),'cities')));
}

// =========== SIMULATIONS ===========
let simCfg={rule:homeRule,games:50,players:2,depth:2,countries:[],gens:10,perGen:24,tPlayers:2,rush:true};
let job=null; // {kind, total, done, results:[], log:[], worker}
function makeWorker(){
  try{ return new Worker('sim-worker.js?v=2611280900'); }catch(e){ return null; }
}
function runJob(kind,manual){
  if(job&&job.running) return;
  const w=makeWorker();
  if(!w){ alertBox(t('si_noWorker')); return; }
  job={kind,manual:!!manual,running:true,done:0,total:kind==='batch'?simCfg.games:simCfg.gens*simCfg.perGen,results:[],log:[],ms:[],worker:w,best:null,startW:E.getWeights(),accepted:0};
  const cs=simCfg.countries.length===3?simCfg.countries:null;
  w.onmessage=async ev=>{
    const m=ev.data;
    if(m.type==='game'){ job.done=m.i; job.results.push(m.sum); job.ms.push(m.ms); }
    if(m.type==='tgame'){ job.done++; }
    if(m.type==='gen'){ job.results.push(...m.sums); if(m.accepted){ job.accepted++; job.best=m.best; }
      job.log.unshift(t('si_genInfo',m.gen,(m.accepted?'✅ '+t('si_accepted'):'✖ '+t('si_rejected'))+' — '+t('si_rate',Math.round(m.rate*100)+'%',Math.round(m.expected*100)+'%',m.rounds.toFixed(1)))); }
    if(m.type==='done'){ await finishJob(); return; }
    if(view==='sim') renderSim(true);
  };
  w.onerror=e=>{ console.error(e); job.running=false; job.log.unshift('⚠ '+(e.message||'error')); renderSim(); };
  if(kind==='batch') w.postMessage({cmd:'batch',games:simCfg.games,players:simCfg.players,countries:cs,depth:simCfg.depth,rule:simCfg.rule,weights:manual?myW():E.getWeights()});
  else w.postMessage({cmd:'train',gens:simCfg.gens,perGen:simCfg.perGen,players:simCfg.tPlayers,countries:cs,depth:simCfg.depth,rule:simCfg.rule,weights:E.getWeights(),sigma:0.25,rush:simCfg.rush,target:11});
  renderSim();
}
async function finishJob(){
  if(!job) return;
  job.running=false; job.saving=true; renderSim();
  try{ job.worker.terminate(); }catch(e){}
  if(!job.manual) await recordGames(job.results,job.kind==='batch'?'sim':'train');
  if(job.kind==='train' && job.best){ job.saveMsg=await saveWeights(job.best,((AIW&&typeof AIW.gen==='number'&&AIW.gen)||0)+job.accepted); }
  job.saving=false; renderSim();
}
function stopJob(){ if(job&&job.running){ job.worker.postMessage({cmd:'stop'}); setTimeout(()=>{ if(job&&job.running) finishJob(); },1500); } }
function renderSim(light){
  const box=$('#sim');
  if(light && job && box.querySelector('#simLive')){ box.querySelector('#simLive').replaceWith(simLive()); return; }
  box.innerHTML='';
  box.appendChild(el('div',{class:'orn'},el('span',{},t('si_title'))));
  const num=(k,min,max)=>el('input',{type:'number',min,max,value:simCfg[k],style:'width:90px',onchange:e=>{ simCfg[k]=Math.max(min,Math.min(max,+e.target.value||min)); }});
  const seg=(k,vals,lab)=>el('div',{class:'tog'},vals.map(([v,l])=>el('button',{class:simCfg[k]===v?'on':'',onclick:()=>{ simCfg[k]=v; renderSim(); }},l)));
  const busy=job&&(job.running||job.saving);
  const cbox=el('div',{class:'cbox',id:'cboxS'});
  // lot
  box.appendChild(el('div',{class:'pcard'},el('h3',{},t('si_batch')),el('p',{class:'muted',style:'margin-top:0'},t('si_batchSub')),
    el('div',{class:'ctrls'},
      el('label',{},t('si_games'),el('select',{onchange:e=>{simCfg.games=+e.target.value;}},[50,100,500,1000].map(v=>el('option',{value:v,selected:simCfg.games===v?'':null},String(v))))),
      el('label',{},t('si_players'),seg('players',[[2,'2'],[3,'3'],[4,'4']])),
      el('label',{},t('si_speed'),seg('depth',[[2,t('si_normal')],[1,t('si_fast')],[3,t('si_mcts')]])),
      el('label',{},t('ui_rule'),seg('rule',[['classic',t('ui_rule8')],['six',t('ui_rule6')]])),
      el('button',{class:'primary',disabled:busy?'':null,onclick:()=>{ simCfg.countries=pickedCountries('#cboxS'); runJob('batch'); }},t('si_run')),
      busy&&job.kind==='batch'?el('button',{onclick:stopJob},t('si_stop')):null),
    el('div',{class:'flab row-f',style:'justify-content:space-between'},el('span',{},t('si_countries')),el('button',{class:'dice',onclick:()=>randomCountries('#cboxS')},el('span',{class:'die'},'⚄'),el('span',{},t('si_random')))),
    cbox));
  countryBoxes('#cboxS'); document.querySelectorAll('#cboxS input').forEach(x=>{ if(simCfg.countries.includes(x.value)) x.checked=true; }); limitCountries('#cboxS');
  // entraînement
  box.appendChild(el('div',{class:'pcard'},el('h3',{},t('si_train')),el('p',{class:'muted',style:'margin-top:0'},t('si_trainSub')),
    el('div',{class:'ctrls'},
      el('label',{},t('si_gens'),num('gens',1,200)),
      el('label',{},t('si_perGen'),num('perGen',2,100)),
      el('label',{},t('si_players'),seg('tPlayers',[[2,'2'],[3,'3'],[4,'4']])),
      el('button',{class:'primary',disabled:busy?'':null,onclick:()=>{ simCfg.countries=pickedCountries('#cboxS'); runJob('train'); }},t('si_startTrain')),
      busy&&job.kind==='train'?el('button',{onclick:stopJob},t('si_stop')):null)));
  box.appendChild(simLive());
  // poids
  const cur=E.getWeights(), def=E.DEFAULT_W, my=myW();
  const genTxt=AIW&&AIW.gen==='manual'?' — '+t('si_aiManual'):(AIW&&AIW.gen?' — '+t('si_aiGen',AIW.gen):'');
  box.appendChild(el('div',{class:'pcard'},el('h3',{},t('si_weights')+genTxt),el('div',{class:'muted',style:'margin-bottom:6px'},t('si_weightsNote')),
    el('table',{class:'stbl'},el('tr',{},el('th',{},t('si_param')),el('th',{class:'num'},t('si_current')),el('th',{class:'num'},t('si_default')),el('th',{class:'num'},t('si_mine'))),
      Object.keys(def).map(k=>{ const inp=el('input',{type:'number',step:'0.01',value:String(Math.round(my[k]*1000)/1000),style:'width:84px;text-align:right'+(Math.abs(my[k]-cur[k])>1e-9?';font-weight:700;color:var(--wine2)':'')});
        inp.onchange=()=>{ const v=parseFloat(inp.value); if(isFinite(v)){ const m=myW(); m[k]=v; store.set('mag_myw4',JSON.stringify(m)); inp.style.fontWeight=Math.abs(v-cur[k])>1e-9?'700':''; inp.style.color=Math.abs(v-cur[k])>1e-9?'var(--wine2)':''; } };
        return el('tr',{},el('td',{},k.endsWith('_')?t('w_'+k.slice(0,-1))+' '+t('w_earlySfx'):t('w_'+k)),el('td',{class:'num',style:cur[k]!==def[k]?'font-weight:700;color:var(--wine2)':''},String(Math.round(cur[k]*100)/100)),el('td',{class:'num muted'},String(def[k])),el('td',{class:'num'},inp)); })),
    el('p',{class:'muted',style:'margin:8px 0 4px'},t('si_mineNote')),
    el('div',{class:'actions',style:'justify-content:flex-start;flex-wrap:wrap;gap:6px'},
      el('button',{class:'primary small',disabled:busy?'':null,onclick:()=>{ simCfg.countries=pickedCountries('#cboxS'); runJob('batch',true); }},t('si_testMine',simCfg.games)),
      el('button',{class:'small',disabled:busy?'':null,onclick:async()=>{ if(!confirm(t('si_applyMineQ'))) return; const msg=await saveWeights(myW(),'manual'); alertBox(msg); renderSim(); }},t('si_applyMine')),
      el('button',{class:'small',disabled:busy?'':null,onclick:()=>{ store.set('mag_myw4',JSON.stringify(E.getWeights())); renderSim(); }},t('si_mineFromCur')),
      el('button',{class:'small',disabled:busy?'':null,onclick:()=>{ store.set('mag_myw4',JSON.stringify(Object.assign({},def))); renderSim(); }},t('si_mineFromDef')),
      el('button',{class:'small',disabled:busy?'':null,onclick:async()=>{ const msg=await saveWeights(Object.assign({},def),0); alertBox(msg); renderSim(); }},t('si_reset')))));
}
function myW(){ let m=null; try{ m=JSON.parse(store.get('mag_myw4')||'null'); }catch(e){} return Object.assign({},E.getWeights(),m||{}); }
function simLive(){
  const wrap=el('div',{id:'simLive'});
  if(!job) return wrap;
  const card=el('div',{class:'pcard'});
  card.appendChild(el('h3',{},job.manual?t('si_batchMine'):job.kind==='batch'?t('si_batch'):t('si_train')));
  card.appendChild(el('div',{},(job.running?t('si_running')+' ':'')+(job.saving?t('si_saving'):'')+' '+t('si_progress',job.done,job.total)));
  card.appendChild(el('div',{class:'prog'},el('i',{style:'width:'+Math.round(job.done/job.total*100)+'%'})));
  const res=job.results;
  if(res.length){
    const r=avg(res.map(g=>g.rounds)); const flag=r<10?['warn',t('si_low')]:r>12?['warn',t('si_high')]:['ok',t('si_inRange')]; const at11=res.filter(g=>Math.round(g.rounds)===11).length;
    const wins=[]; res.forEach(g=>g.players.forEach(p=>{ if(p.win) wins.push(p); }));
    const kp=[[r.toFixed(1),t('si_avgRounds')],[avg(wins.map(p=>p.vp)).toFixed(1),t('si_avgVP')]];
    kp.push([pct(at11,res.length),t('si_at11')]);
    if(job.ms.length) kp.push([(avg(job.ms)/1000).toFixed(1)+' s',t('si_avgTime')]);
    card.appendChild(el('div',{class:'kpis'},kp.map(([v,l,x])=>el('div',{class:'kpi'},el('div',{class:'v'},v),el('div',{class:'l'},l,x?el('br'):null,x||null)))));
    if(job.kind==='batch'){ const n=res[0].n; const sw=[...Array(n)].map((_,k)=>res.filter(g=>g.players[k].win).length);
      card.appendChild(el('div',{style:'margin-top:10px'},el('b',{},t('si_seatWins')+' : '),sw.map((w,k)=>el('span',{style:'margin-right:14px'},'#'+(k+1)+' '+pct(w,res.length))))); }
  }
  if(job.log.length) card.appendChild(el('div',{class:'glog'},job.log.map(l=>el('div',{},l))));
  if(job.saveMsg) card.appendChild(el('div',{class:'note',style:'margin-top:8px'},job.saveMsg));
  wrap.appendChild(card);
  return wrap;
}

// =========== APERÇU AU SURVOL ===========
(function(){
  if(window.matchMedia && !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const pv=document.createElement('div'); pv.id='hoverPrev'; document.body.appendChild(pv);
  const OK=/(^|\/)(cards|book|rect|obj|city|let)\//;
  let cur=null;
  function srcOf(t){
    if(!t||t.closest('#zoom')||t.closest('#hoverPrev')||t.classList&&t.classList.contains('nopv')) return null;
    if(t.tagName==='IMG'){ const s=t.getAttribute('src')||''; return OK.test(s)&&!/\/back\d*\.webp/.test(s)?s:null; }
    const c=t.closest('.cell.city'); if(c){ const m=(c.style.backgroundImage||'').match(/url\("?([^")]+)"?\)/); return m?m[1]:null; }
    return null;
  }
  function place(el,src){
    const isCard=/cards\/|book\//.test(src);
    const w=isCard?210:/city\//.test(src)?170:190;
    pv.innerHTML=''; const r=el.getBoundingClientRect(), vw=innerWidth, vh=innerHeight;
    const cm=src.match(/cards\/(\d+)\.webp/), cid=cm?+cm[1]:0;
    const big=r.width>=w*0.65; // déjà assez grande : on n'affiche que le récapitulatif
    if(big&&!cid){ pv.style.display='none'; return; }
    if(!big){ const im=document.createElement('img'); im.src=src; im.style.width=w+'px'; pv.appendChild(im); }
    let tw=big?0:w;
    if(cid&&CARD[cid]){ const rc=cardRecap(cid); pv.appendChild(rc); tw+=250; }
    const cym=src.match(/city\/(\w+)\.webp/);
    if(cym&&t('CE_'+cym[1])!=='CE_'+cym[1]){ const rc=document.createElement('div'); rc.className='crecap'; const b=document.createElement('b'); b.textContent=t('CY_'+cym[1]); rc.appendChild(b); rc.appendChild(document.createElement('br')); rc.appendChild(document.createTextNode(t('CE_'+cym[1]))); pv.appendChild(rc); tw+=250; }
    const ro=src.match(/(rect|obj)\/(\w+)\.webp/);
    if(ro&&ro[2]!=='back'){ const tx=ro[1]==='rect'?t('R_'+ro[2]):t('O_'+ro[2]); if(tx&&tx!=='R_'+ro[2]&&tx!=='O_'+ro[2]){ const rc=document.createElement('div'); rc.className='crecap'; rc.textContent=tx; pv.appendChild(rc); tw+=250; } }
    pv.style.display='flex';
    const h=Math.max(isCard&&!big?w*1.48:0, pv.offsetHeight||200);
    const ww=tw||w;
    let x=r.right+12; if(x+ww>vw-8) x=r.left-12-ww; if(x<8) x=Math.min(vw-w-8,Math.max(8,r.left));
    let y=r.top+r.height/2-h/2; y=Math.max(8,Math.min(vh-h-8,y));
    pv.style.left=x+'px'; pv.style.top=y+'px'; pv.style.display='flex';
  }
  document.addEventListener('mouseover',e=>{ const src=srcOf(e.target); if(!src){ if(cur&&!e.target.closest('.cell.city')){ cur=null; pv.style.display='none'; } return; } const el=e.target.closest('.cell.city')||e.target; if(el===cur) return; cur=el; place(el,src); });
  document.addEventListener('scroll',()=>{ cur=null; pv.style.display='none'; },true);
  document.addEventListener('click',()=>{ cur=null; pv.style.display='none'; },true);
})();

// init
applyStatic(); renderSeats(); countryBoxes('#cboxL'); checkResume(); setView('play'); setTimeout(()=>{ if(!db) loadWeights(); },11000);
window.__mag={get S(){return S}, act, E, setLang};
})();

// garde le bas de la page visible au-dessus du bandeau de décision (hauteur variable)
(function(){ const d=document.getElementById('decide'); if(!d||!window.ResizeObserver) return; const fit=()=>{ const h=d.classList.contains('hidden')?0:d.offsetHeight; document.body.style.paddingBottom=(h+24)+'px'; }; new ResizeObserver(fit).observe(d); new MutationObserver(fit).observe(d,{attributes:true,attributeFilter:['class']}); fit(); })();
