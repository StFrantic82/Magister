(function(){
const D=window.MAG, E=window.MagEngine, CARD=E.CARD, BOOK=E.BOOK, DICT=window.MAG_I18N;
const $=s=>document.querySelector(s);
const el=(tag,attrs,...kids)=>{ const e=document.createElement(tag); if(attrs) for(const k in attrs){ if(k==='class') e.className=attrs[k]; else if(k==='style') e.style.cssText=attrs[k]; else if(k.startsWith('on')) e.addEventListener(k.slice(2),attrs[k]); else if(attrs[k]!==undefined&&attrs[k]!==null&&attrs[k]!==false) e.setAttribute(k,attrs[k]); } kids.flat().forEach(c=>{ if(c==null||c===false) return; e.appendChild(typeof c==='string'||typeof c==='number'?document.createTextNode(String(c)):c); }); return e; };
const COUNTRY_IMG={ITA:'ita',FRA:'fra',ENG:'eng',POR:'por',SPA:'spa',GER:'ger',BYZ:'byz',MOR:'mor'};
const SEATCOL=['#c0392b','#2471a3','#d4ac0d','#7d3c98'];
const PALETTE=['#c0392b','#2471a3','#d4ac0d','#7d3c98','#27864a','#e67e22','#2b2b2b','#f4f1ea'];
const tokTxt=c=>(c==='#d4ac0d'||c==='#f4f1ea')?'#2b1405':'#fff';
let palOpen=-1;
const store={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}},del(k){try{localStorage.removeItem(k)}catch(e){}}};

// =========== TRADUCTION ===========
let LANG=store.get('mag_lang'); if(!DICT[LANG]){ const n=(navigator.language||'fr').slice(0,2); LANG=DICT[n]?n:'fr'; }
function tm(x){
  if(x==null) return ''; if(typeof x==='string'||typeof x==='number') return String(x);
  if(Array.isArray(x)) return x.map(tm).join(', ');
  if(x.m==='+') return x.a.map(tm).join(' + ');
  const d=DICT[LANG][x.m]!==undefined?DICT[LANG][x.m]:(DICT.fr[x.m]!==undefined?DICT.fr[x.m]:x.m);
  const a=(x.a||[]).map(tm);
  return typeof d==='function'?d(a):d.replace(/\{(\d)\}/g,(_,i)=>a[i]!==undefined?a[i]:'');
}
const t=(k,...a)=>tm({m:k,a});
const TN=ty=>t('T_'+ty), LN=l=>t('L_'+l), WN=w=>t('W_'+w);
function applyStatic(){
  document.documentElement.lang=LANG;
  document.querySelectorAll('[data-i18n]').forEach(n=>n.textContent=t(n.dataset.i18n));
  document.querySelectorAll('[data-i18n-html]').forEach(n=>n.innerHTML=t(n.dataset.i18nHtml));
  document.querySelectorAll('.langbar button').forEach(b=>b.classList.toggle('on',b.dataset.lang===LANG));
  $('#langSel').value=LANG;
  if(!db && !onlineFailed) $('#onlineOff').textContent=t('ui_onlineWait');
  if(onlineFailed) $('#onlineOff').textContent=t('ui_onlineNo');
}
function setLang(l){ LANG=l; store.set('mag_lang',l); 
applyStatic(); renderSeats(); countryBoxes('#cboxL',true); if(table&&table.status==='lobby') renderTable(); if(S) render(); if(view==='tuto') renderTuto(); if(view==='stats'&&STATS) renderStats(); if(view==='sim') renderSim(); }
document.querySelectorAll('.langbar button').forEach(b=>b.onclick=()=>setLang(b.dataset.lang));
$('#langSel').onchange=e=>setLang(e.target.value);

let hist=[], myLastVer=-1;
let S=null, mode=null, mySeats=[], tab=null, filter=null, aiTimer=null, busy=false;
let db=null, myUid=null, table=null, tableUnsub=null, tableCode=null, onlineFailed=false;

// =========== ACCUEIL ===========
const AINAMES=['Flaminia (IA)','Virginio (IA)','Marco (IA)'];
let seats=[{name:store.get('mag_name')||'',ai:false},{name:AINAMES[0],ai:true}];
function renderSeats(){
  const box=$('#localSeats'); box.innerHTML='';
  document.querySelectorAll('#nSeg button').forEach(b=>b.classList.toggle('on',+b.dataset.n===seats.length));
  seats.forEach((s,k)=>{
    if(!s.color||seats.some((o,j)=>j<k&&o.color===s.color)) s.color=PALETTE.find(c=>!seats.some((o,j)=>j!==k&&o.color===c));
    box.appendChild(el('div',{class:'pseat'},
      el('button',{class:'tok',title:t('ui_color'),style:'background:'+s.color+';color:'+tokTxt(s.color),onclick:()=>{ palOpen=palOpen===k?-1:k; renderSeats(); }},k+1),
      el('input',{value:s.name,placeholder:k===0?t('ui_me'):t('ui_player1')+' '+(k+1),maxlength:18,oninput:e=>{s.name=e.target.value;}}),
      el('div',{class:'tog'},
        el('button',{class:s.ai?'':'on',onclick:()=>{ if(s.ai){ s.ai=false; if(/\(IA\)/.test(s.name)) s.name=''; renderSeats(); } }},t('ui_human')),
        el('button',{class:s.ai?'on':'',onclick:()=>{ if(!s.ai){ s.ai=true; if(!s.name) s.name=AINAMES[Math.max(0,k-1)]||'IA'; renderSeats(); } }},t('ui_ai')))));
    if(palOpen===k) box.appendChild(colorRow(s.color,seats.filter((o,j)=>j!==k).map(o=>o.color),c=>{ s.color=c; palOpen=-1; renderSeats(); }));
  });
}
function colorRow(cur,taken,pick){
  return el('div',{class:'pal'},PALETTE.map(c=>el('button',{class:c===cur?'on':'',style:'background:'+c,disabled:taken.includes(c)?'':null,title:c,onclick:()=>pick(c)})));
}
document.querySelectorAll('#nSeg button').forEach(b=>b.onclick=()=>{ const n=+b.dataset.n; while(seats.length<n) seats.push({name:AINAMES[seats.length-1]||'IA',ai:true}); seats.length=n; renderSeats(); });
function countryBoxes(id,keep){
  const box=$(id); if(!box) return;
  const prev=keep?[...box.querySelectorAll('input:checked')].map(x=>x.value):[];
  box.innerHTML='';
  Object.keys(D.countries).forEach(k=>{
    const inp=el('input',{type:'checkbox',value:k,checked:prev.includes(k)?'':null});
    inp.addEventListener('change',()=>limitCountries(id));
    box.appendChild(el('label',{},inp,el('img',{src:'tok/country_'+COUNTRY_IMG[k]+'.webp',alt:''}),el('span',{},t('C_'+k)),el('span',{class:'ctr'},D.countries[k].cities.map(c=>t('CY_'+c[1])).join(' · '))));
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
  S=E.newGame({players:seats.map((s,k)=>({name:s.name||(k===0?t('ui_me'):t('ui_player1')+' '+(k+1)),ai:s.ai,color:s.color})),countries:cs.length?cs:null,seed:(Math.random()*2**32)>>>0});
  startLocal();
};
$('#resumeLocal').onclick=()=>{ try{ S=JSON.parse(store.get('mag_local')); if(S.v!==2) throw 0; startLocal(); }catch(e){ store.del('mag_local'); checkResume(); } };
function startLocal(){ hist=[]; mode='local'; mySeats=S.players.map((p,k)=>p.ai?-1:k).filter(k=>k>=0); tab=null; showGame(); afterChange(); }
function goHome(){ $('#coach').classList.add('hidden'); hist=[]; if(tableUnsub){ tableUnsub(); tableUnsub=null; } clearTimeout(aiTimer); S=null; mode=null; $('#game').classList.add('hidden'); $('#decide').classList.add('hidden'); $('#lobby').classList.remove('hidden'); checkResume(); if(table) renderTable(); setView('play'); }
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


function canUndo(){
  if(!hist.length||!S||S.over) return false;
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
function zoomCard(id){
  const c=CARD[id];
  const then = c.act ? (c.act==='any'?t('ui_zActAny'):t('ui_zAct',TN(c.act))) : (c.id<=16?t('ui_zStart'):t('ui_zNoAct'));
  zoomShow(el('img',{src:'cards/'+id+'.webp'}), el('div',{class:'zt'},
    el('h3',{},c.name),
    el('div',{},el('span',{class:'tbadge b-'+c.type}),TN(c.type)+' — '+LN(c.lvl)+(c.woa?' — '+t('ui_zWoa',WN(c.woa)):'')),
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
  $('#tinfo').textContent=(S.endTriggered?t('ui_last')+' · ':'')+t('ui_round',Math.max(1,Math.ceil(S.turnNo/S.players.length)))+(mode==='online'&&tableCode?' · '+t('ui_table',tableCode):'');
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
      const cell=el('div',{class:'cell'+(cy?' city':'')+(n===12?' finish':''),title:cy?t('CY_'+cy[1])+' : '+t('CE_'+cy[1]):t('ui_cell',n)});
      if(moveOpt[ti]!==undefined && n===mePl.trav[ti]+1){ cell.classList.add('target'); const k=moveOpt[ti]; cell.addEventListener('click',ev=>{ ev.stopImmediatePropagation(); act(k); }); }
      if(cy){ cell.style.backgroundImage='url(city/'+cy[1]+'.webp)'; cell.addEventListener('click',()=>zoomImg('city/'+cy[1]+'.webp',t('CY_'+cy[1])+' ('+n+')',t('CE_'+cy[1]))); }
      else cell.appendChild(el('span',{class:'n'},n||'⚑'));
      const tv=el('div',{class:'travs'}); S.players.forEach(pl=>{ if(pl.trav[ti]===n) tv.appendChild(el('span',{class:'dot',style:'background:'+pl.color,title:pl.name})); });
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
    box.appendChild(el('div',{},el('b',{},el('span',{class:'tbadge b-'+ty}),TN(ty)),el('br'),id?t('R_'+id):t('ui_takenBy',owner?owner.name:'?')));
    rs.appendChild(box);
  });
  // objectifs
  const os=$('#oslots'); os.innerHTML='';
  ['N','R','A','M'].forEach(ty=>{
    const o=S.objSlots[ty]; const who=S.players.filter(pl=>pl.emTok[ty]!==undefined).map(pl=>pl.name+' ('+pl.emTok[ty]+')');
    const im=el('img',{src:'obj/'+o.tile+'.webp',alt:''}); im.onclick=()=>zoomImg('obj/'+o.tile+'.webp',t('ui_objOf',TN(ty)),t('ui_objTxt',t('O_'+o.tile),TN(ty)));
    os.appendChild(el('div',{class:'tslot t-'+ty},im,el('div',{},el('b',{},el('span',{class:'tbadge b-'+ty}),TN(ty)),el('br'),t('O_'+o.tile),
      el('div',{class:'vps'},o.stack.map(v=>el('img',{src:'tok/vp'+v+'.webp',alt:v+' '+t('ui_vp')}))), who.length?el('div',{class:'muted'},t('ui_claimed',who.join(', '))):null)));
  });
  // lettres & jetons
  const lt=$('#letters'); lt.innerHTML='';
  S.letters.forEach(id=>{ const L=D.letters.find(x=>x.id===id); lt.appendChild(el('img',{src:'let/'+id+'.webp',title:L.woa?WN(L.woa):tm(E.effsTxt(L.g))})); });
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
    el('span',{},el('span',{class:'coin'},pl.coins),t('ui_coins')), el('span',{},el('span',{class:'seal'},pl.infl),t('ui_infl')),
    el('span',{},'🏛 '+E.vp(S,tab)+' '+t('ui_vp')+(vpB.length?' ('+vpB.join(', ')+')':'')),
    el('span',{},'🐎 '+pl.trav.map((x,i)=>E.TR[i]+':'+x).join(' ')+' · '+pl.cities+' '+t('ui_cities')),
    pl.virt?el('span',{},'+1 '+TN(pl.virt.t)+' '+LN(pl.virt.l)):null));
  const rowEl=(label,arr,extra)=>{
    const cs=el('div',{class:'ucards'});
    arr.forEach((co,k)=>{ const w=el('div',{class:'ucard'}); const im=cardImg(co.id); if(sel.has(co.id)) im.classList.add('sel'); w.appendChild(im); w.appendChild(el('span',{class:'pos'},k+1));
      if(co.letters&&co.letters.length){ const l=el('div',{class:'lt'}); co.letters.forEach(wo=>l.appendChild(el('img',{src:'let/'+({ARC:'arch',MUS:'mus',PAI:'pai',SCU:'scu',THE:'thea'})[wo]+'.webp',title:WN(wo)}))); w.appendChild(l); }
      cs.appendChild(w); });
    if(extra) cs.appendChild(extra);
    if(!arr.length&&!extra) cs.appendChild(el('span',{class:'muted'},'—'));
    return el('div',{class:'urow'},el('div',{class:'rl'},label),cs);
  };
  if(pl.rector){ const ri=el('img',{src:'rect/'+pl.rector.tile+'.webp',style:'width:80px;border-radius:6px;cursor:zoom-in'}); ri.onclick=()=>zoomImg('rect/'+pl.rector.tile+'.webp',t('ui_rRector'),t('R_'+pl.rector.tile)); u.appendChild(rowEl(t('ui_rRector'),[pl.rector.card],ri)); }
  u.appendChild(rowEl(t('ui_rEmer'),pl.emer)); u.appendChild(rowEl(t('ui_rProf'),pl.profs)); u.appendChild(rowEl(t('ui_rStu'),pl.students));
  const showHand = mode==='local' ? !pl.ai : isMine(tab);
  const h=el('div',{class:'hand'});
  if(showHand) pl.hand.forEach(b=>{ const ok=E.bookOk(S,tab,b); const im=el('img',{src:'book/'+b+'.webp',class:ok?'ok':'',title:t('B_'+b)}); im.onclick=()=>zoomImg('book/'+b+'.webp',t('ui_book'),t('B_'+b)+(ok?t('ui_bookOk'):'')+t('ui_bookDisc',tm(E.effsTxt(BOOK[b].disc)))); h.appendChild(im); });
  else pl.hand.forEach(()=>h.appendChild(el('img',{src:'book/back.webp'})));
  if(!pl.hand.length) h.appendChild(el('span',{class:'muted'},'—'));
  u.appendChild(el('div',{},el('b',{},t('ui_books')+' '),el('span',{class:'muted'},t('ui_booksSub',pl.hand.length)),h));
  if(pl.played.length){ const pp=el('div',{class:'hand'}); pl.played.forEach(b=>{ const im=el('img',{src:'book/'+b+'.webp',style:'width:56px'}); im.onclick=()=>zoomImg('book/'+b+'.webp',t('ui_book'),t('B_'+b)); pp.appendChild(im); }); u.appendChild(el('div',{},el('b',{},t('ui_played')),pp)); }
}
function renderLog(){ const lg=$('#log'); lg.innerHTML=''; S.log.slice().reverse().forEach(l=>lg.appendChild(el('div',{},tm(l)))); }
function renderDecide(){
  const d=$('#decide'); d.innerHTML='';
  if(S.over){
    const tb=el('table',{},el('tr',{},el('th',{},'#'),el('th',{},t('ui_player')),el('th',{},t('ui_vp')),el('th',{},t('ui_rector')),el('th',{},t('ui_emer')),el('th',{},t('ui_profs'))));
    S.ranking.forEach((r,i)=>tb.appendChild(el('tr',{},el('td',{},i+1),el('td',{},S.players[r.k].name),el('td',{},r.vp),el('td',{},r.r?t('ui_yes'):'—'),el('td',{},r.e),el('td',{},r.pr))));
    const names=S.winners.map(k=>S.players[k].name).join(' & ');
    d.appendChild(el('div',{class:'endbox'},el('div',{class:'q'},t(S.winners.length>1?'ui_winsN':'ui_wins',names)),tb,
      el('button',{class:'primary',onclick:goHome},t('ui_menu'))));
    return;
  }
  const pd=S.pending; if(!pd) return;
  if(!isMine(pd.p)){
    d.appendChild(el('div',{class:'wait'},el('span',{class:'spin'}),t(S.players[pd.p].ai?'ui_thinking':'ui_waiting',S.players[pd.p].name),canUndo()?el('button',{class:'small undo',onclick:undo},'↶ '+t('ui_undo')):null));
    return;
  }
  d.appendChild(el('div',{class:'q'},tm(pd.prompt),canUndo()?el('button',{class:'small undo',onclick:undo},'↶ '+t('ui_undo')):null));
  const opts=el('div',{class:'opts'});
  if(pd.kind==='move'){ d.appendChild(el('div',{class:'hint'},'👉 '+t('ui_clickTrack'))); const tb=document.querySelector('.cell.target'); if(tb) tb.scrollIntoView({block:'nearest',behavior:'smooth'}); return; }
  const THUMB={pair:1,place:1,lisboa:1,take:1,fes:1,meknes:1,elim:1,sale:1,freePromo:1,reorg:1};
  pd.opts.forEach((o,k)=>{ if(filter&&!filter.includes(k)) return;
    const b=el('button',{class:(o.endTurn?'primary':'')+(THUMB[pd.kind]&&o.cards?' cbtn':''),onclick:()=>act(k)});
    if(THUMB[pd.kind]&&o.cards){ const row=el('div',{class:'cthumbs'}); o.cards.forEach(id=>row.appendChild(el('img',{src:'cards/'+id+'.webp',alt:CARD[id].name}))); b.appendChild(row); }
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
  try{ await db.doc('tables/'+code).set({code,host:myUid,status:'lobby',seats:[{name:myName(),uid:myUid,ai:false}],state:null,rev:0,created:Date.now()}); subscribe(code); }
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
    host&&k>0?el('button',{class:'small',onclick:async()=>{ await db.doc('tables/'+table.code).update({seats:table.seats.filter((_,j)=>j!==k)}); }},t('ui_remove')):null));
    if(palOpen===100+k && table.status==='lobby') b.appendChild(colorRow(col,table.seats.filter((o,j)=>j!==k).map((o,j)=>o.color||SEATCOL[j]),async c=>{ palOpen=-1; const ns=table.seats.map((o,j)=>j===k?Object.assign({},o,{color:c}):o); await db.doc('tables/'+table.code).update({seats:ns}); })); });
  if(table.status==='lobby'){
    if(host){
      b.appendChild(el('div',{class:'row-f',style:'margin-top:6px'},
        el('button',{disabled:table.seats.length>=4?'':null,onclick:async()=>{ const n=AINAMES.find(x=>!table.seats.some(s=>s.name===x))||'IA'; await db.doc('tables/'+table.code).update({seats:[...table.seats,{name:n,uid:null,ai:true}]}); }},t('ui_addAI')),
        el('button',{class:'primary',disabled:table.seats.length<2?'':null,onclick:startOnline},t('ui_start'))));
      b.appendChild(el('div',{style:'margin-top:8px'},el('div',{class:'flab row-f',style:'justify-content:space-between'},el('span',{},t('ui_tracks')),el('button',{class:'dice',onclick:()=>randomCountries('#cboxO')},el('span',{class:'die'},'⚄'),el('span',{},t('ui_random')))),el('div',{class:'muted'},t('ui_tracksSub')),el('div',{class:'cbox',id:'cboxO'})));
      countryBoxes('#cboxO');
    } else b.appendChild(el('div',{class:'muted',style:'margin-top:6px'},t('ui_waitHost')));
  } else b.appendChild(el('button',{class:'primary',onclick:()=>{ mode=null; subscribe(table.code); }},t('ui_backGame')));
}
async function startOnline(){
  const cs=pickedCountries('#cboxO');
  if(cs.length && cs.length!==3){ $('#onlineMsg').textContent=t('ui_pick3'); return; }
  const st=E.newGame({players:table.seats.map((s,k)=>({name:s.name,ai:s.ai,uid:s.uid,color:s.color||SEATCOL[k]})),countries:cs.length?cs:null,seed:(Math.random()*2**32)>>>0});
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
  ['play','tuto','stats','sim'].forEach(x=>$('#v-'+x).classList.toggle('hidden',x!==v));
  document.querySelectorAll('.lnav button').forEach(b=>b.classList.toggle('on',b.dataset.v===v));
  if(v==='tuto') renderTuto();
  if(v==='stats') loadStats();
  if(v==='sim') renderSim();
  const nav=document.querySelector('.lnav'); if(nav && window.scrollY>nav.offsetTop) window.scrollTo({top:nav.offsetTop});
}
document.querySelectorAll('.lnav button').forEach(b=>b.onclick=()=>setView(b.dataset.v));
const icon=(n,h,extra)=>el('img',{src:'ic/'+n+'.png',alt:'',style:'height:'+(h||20)+'px;max-height:none;vertical-align:middle;box-shadow:none;border-radius:0;'+(extra||'')});

// =========== TUTORIEL ===========
let tutoStep=0;
const TUTO=[
 {k:'s1',vis:()=>[el('img',{src:'tok/box.webp'}),el('div',{style:'display:flex;flex-direction:column;gap:8px;align-items:center'},icon('laurel',70),el('div',{class:'fell',style:'font-size:40px;color:var(--wine2)'},'8'))]},
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
 {k:'s8',vis:()=>[el('img',{src:'obj/A1.webp',class:'sm',style:'max-height:140px'}),el('img',{src:'obj/D2.webp',class:'sm',style:'max-height:140px'}),el('div',{style:'display:flex;gap:6px'},el('img',{src:'tok/vp3.webp',style:'width:56px;box-shadow:none'}),el('img',{src:'tok/vp2.webp',style:'width:56px;box-shadow:none'}))]},
];
function renderTuto(){
  const box=$('#tuto'); box.innerHTML='';
  const st=TUTO[tutoStep];
  box.appendChild(el('div',{class:'orn'},el('span',{},t('tu_title'))));
  const card=el('div',{class:'pcard'},
    el('div',{class:'tuto'},el('div',{class:'vis'},st.vis()),el('div',{},el('div',{class:'muted'},t('tu_step',tutoStep+1,TUTO.length)),el('h3',{},t('tu_'+st.k+'_t')),el('p',{},t('tu_'+st.k+'_x')))),
    el('div',{class:'dots'},TUTO.map((_,i)=>el('span',{class:i===tutoStep?'on':'',onclick:()=>{tutoStep=i;renderTuto();}}))),
    el('div',{class:'tnav'},
      el('button',{disabled:tutoStep===0?'':null,onclick:()=>{tutoStep--;renderTuto();}},t('tu_prev')),
      tutoStep<TUTO.length-1?el('button',{class:'primary',onclick:()=>{tutoStep++;renderTuto();}},t('tu_next')):el('button',{class:'primary',onclick:startTutoGame},t('tu_start'))));
  box.appendChild(card);
}
function startTutoGame(){
  const me=seats[0]&&seats[0].name||t('ui_me');
  S=E.newGame({players:[{name:me,ai:false,color:seats[0]&&seats[0].color||PALETTE[0]},{name:'Flaminia (IA)',ai:true,color:PALETTE[1]}],countries:['ITA','FRA','ENG'],seed:(Math.random()*2**32)>>>0});
  S.tutorial=true; coachSeen={}; coachOn=true;
  startLocal();
}
let coachSeen={}, coachOn=true;
function renderCoach(){
  const c=$('#coach');
  const pd=S&&!S.over&&S.pending;
  if(!S||!S.tutorial||!coachOn||!pd||!isMine(pd.p)||coachSeen[pd.kind]||!DICT.fr['tip_'+pd.kind]){ c.classList.add('hidden'); return; }
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
let STATS=null, stFilter={src:'all',n:'all'}, stSort={}, STRESET=0;
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
  return el('div',{class:'scroll'},tb);
}
const barCell=(v,max,label)=>el('span',{},label,el('span',{class:'bar',style:'width:'+Math.round((max?v/max:0)*70)+'px'}));
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
    el('span',{class:'muted',style:'color:#e9d7b0'},STATS.shared?t('st_shared'):t('st_localOnly')),
    el('span',{class:'spacer',style:'flex:1'}),
    el('button',{class:'small',onclick:async()=>{ try{ await navigator.clipboard.writeText(JSON.stringify(games)); alertBox(t('st_copied')); }catch(e){} }},t('st_copy')),
    el('button',{class:'small',onclick:resetStats},t('st_reset'))));
  if(STRESET) box.appendChild(el('div',{class:'muted',style:'color:#e9d7b0;margin-top:6px'},t('st_since',new Date(STRESET).toLocaleString(LANG))));
  const games=STATS.all.filter(g=>(stFilter.src==='all'||g.src===stFilter.src)&&(stFilter.n==='all'||g.n===+stFilter.n));
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
  const cs={}; D.cards.filter(c=>c.id>16).forEach(c=>cs[c.id]={c,h:0,hw:0,p:0,e:0,r:0,cost:[]});
  games.forEach(g=>g.players.forEach(p=>{
    new Set(p.hires).forEach(id=>{ if(cs[id]){ cs[id].h++; if(p.win) cs[id].hw++; } });
    (p.hcost||[]).forEach((c,i)=>{ const id=p.hires[i]; if(cs[id]) cs[id].cost.push(c); });
    p.fin.p.forEach(id=>{ if(cs[id]) cs[id].p++; }); p.fin.e.forEach(id=>{ if(cs[id]) cs[id].e++; }); if(p.fin.r&&cs[p.fin.r]) cs[p.fin.r].r++;
  }));
  const crow=Object.values(cs);
  const lv=[1,2,3].map(l=>{ const rs=crow.filter(r=>r.c.lvl===l); const h=rs.reduce((a,r)=>a+r.h,0), hw=rs.reduce((a,r)=>a+r.hw,0), cost=[].concat(...rs.map(r=>r.cost)); return {l,h,hw,cost,per:h/N}; });
  box.appendChild(el('div',{class:'pcard'},el('h3',{},t('st_levels')),
    sortable([{h:t('st_level'),f:r=>r.l,r:r=>el('span',{},icon('lv_'+r.l,22),' '+t('L_'+r.l))},
      {h:t('st_hiresPerGame'),num:1,f:r=>r.per,r:r=>el('span',{},r.per.toFixed(1))},
      {h:t('st_cost'),num:1,f:r=>r.cost.length?avg(r.cost):-1,r:r=>barCell(r.cost.length?avg(r.cost):0,5,r.cost.length?avg(r.cost).toFixed(2):'—')},
      {h:t('st_paid5'),num:1,f:r=>r.cost.length?r.cost.filter(c=>c>=5).length/r.cost.length:-1,r:r=>el('span',{},pct(r.cost.filter(c=>c>=5).length,r.cost.length))},
      {h:t('st_hiredWin'),num:1,f:r=>r.h?r.hw/r.h:-1,r:r=>el('span',{},pct(r.hw,r.h))}],lv,'levels')));
  const thumb=id=>{ const im=el('img',{class:'th',src:'cards/'+id+'.webp'}); im.onclick=()=>zoomCard(id); return im; };
  box.appendChild(el('div',{class:'pcard'},el('h3',{},t('st_cards')),el('div',{class:'muted',style:'margin-bottom:6px'},t('st_note')),
    sortable([
      {h:t('st_card'),f:r=>r.c.name,r:r=>el('span',{},thumb(r.c.id),r.c.name)},
      {h:t('st_type'),f:r=>r.c.type,r:r=>el('span',{},icon('t_'+r.c.type,20),' ',icon('lv_'+r.c.lvl,18))},
      {h:t('st_hired'),num:1,f:r=>r.h/N,r:r=>barCell(r.h/N,1,pct(r.h,N))},
      {h:t('st_cost'),num:1,f:r=>r.cost.length?avg(r.cost):-1,r:r=>el('span',{},r.cost.length?avg(r.cost).toFixed(1):'—')},
      {h:t('st_hiredWin'),num:1,f:r=>r.h?r.hw/r.h:-1,r:r=>el('span',{},pct(r.hw,r.h))},
      {h:t('st_prof'),num:1,f:r=>r.p/N,r:r=>el('span',{},pct(r.p,N))},
      {h:t('st_emer'),num:1,f:r=>r.e/N,r:r=>el('span',{},pct(r.e,N))},
      {h:t('st_rect'),num:1,f:r=>r.r,r:r=>el('span',{},String(r.r))}],crow,'cards')));
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
  const os={}; ['A1','A2','B1','B2','C1','C2','D1','D2'].forEach(o=>os[o]={id:o,app:0,n:0});
  games.forEach(g=>{ Object.entries(g.objs||{}).forEach(([ty,o])=>{ os[o].app++; os[o].n+=g.players.filter(p=>p.em[ty]!==undefined).length; }); });
  const ct={}; Object.keys(D.countries).forEach(c=>ct[c]={id:c,n:0,r:[]});
  games.forEach(g=>g.cs.forEach(c=>{ if(ct[c]){ ct[c].n++; ct[c].r.push(g.rounds); } }));
  const cy={}; Object.entries(D.countries).forEach(([c,C])=>C.cities.forEach(x=>cy[x[1]]={k:x[1],c,app:0,n:0}));
  games.forEach(g=>{ g.cs.forEach(c=>D.countries[c].cities.forEach(x=>cy[x[1]].app++)); g.players.forEach(p=>p.cities.forEach(k=>{ if(cy[k]) cy[k].n++; })); });
  box.appendChild(el('div',{class:'two'},
    el('div',{class:'pcard'},el('h3',{},t('st_objs')),sortable([
      {h:t('st_obj'),f:r=>t('O_'+r.id),r:r=>{ const im=el('img',{class:'th',src:'obj/'+r.id+'.webp'}); im.onclick=()=>zoomImg('obj/'+r.id+'.webp',t('st_obj'),t('O_'+r.id)); return el('span',{},im,t('O_'+r.id)); }},
      {h:t('st_games'),num:1,f:r=>r.app},
      {h:t('st_claimed'),num:1,f:r=>r.app?r.n/r.app:-1,r:r=>el('span',{},r.app?(r.n/r.app).toFixed(2):'—')}],Object.values(os),'objs')),
    el('div',{class:'pcard'},el('h3',{},t('st_countries')),sortable([
      {h:t('st_country'),f:r=>t('C_'+r.id),r:r=>el('span',{},el('img',{class:'th',src:'tok/country_'+COUNTRY_IMG[r.id]+'.webp',style:'width:22px'}),t('C_'+r.id))},
      {h:t('st_games'),num:1,f:r=>r.n},
      {h:t('st_rounds'),num:1,f:r=>avg(r.r),r:r=>el('span',{},r.r.length?avg(r.r).toFixed(1):'—')}],Object.values(ct),'countries'))));
  box.appendChild(el('div',{class:'pcard'},el('h3',{},t('st_cities')),sortable([
      {h:t('st_city'),f:r=>t('CY_'+r.k),r:r=>el('span',{},el('img',{class:'th',src:'city/'+r.k+'.webp'}),t('CY_'+r.k),el('span',{class:'muted'},' — '+t('C_'+r.c)))},
      {h:t('st_games'),num:1,f:r=>r.app},
      {h:t('st_reached'),num:1,f:r=>r.app?r.n/r.app:-1,r:r=>barCell(r.app?r.n/r.app:0,Math.max(...Object.values(cy).map(x=>x.app?x.n/x.app:0)),r.app?(r.n/r.app).toFixed(2):'—')}],Object.values(cy).filter(x=>x.app),'cities')));
}

// =========== SIMULATIONS ===========
let simCfg={games:20,players:3,depth:2,countries:[],gens:10,perGen:12,tPlayers:3,rush:true};
let job=null; // {kind, total, done, results:[], log:[], worker}
function makeWorker(){
  try{ return new Worker('sim-worker.js'); }catch(e){ return null; }
}
function runJob(kind){
  if(job&&job.running) return;
  const w=makeWorker();
  if(!w){ alertBox(t('si_noWorker')); return; }
  job={kind,running:true,done:0,total:kind==='batch'?simCfg.games:simCfg.gens*simCfg.perGen,results:[],log:[],ms:[],worker:w,best:null,startW:E.getWeights(),accepted:0};
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
  if(kind==='batch') w.postMessage({cmd:'batch',games:simCfg.games,players:simCfg.players,countries:cs,depth:simCfg.depth,weights:E.getWeights()});
  else w.postMessage({cmd:'train',gens:simCfg.gens,perGen:simCfg.perGen,players:simCfg.tPlayers,countries:cs,depth:simCfg.depth,weights:E.getWeights(),sigma:0.25,rush:simCfg.rush,target:11});
  renderSim();
}
async function finishJob(){
  if(!job) return;
  job.running=false; job.saving=true; renderSim();
  try{ job.worker.terminate(); }catch(e){}
  await recordGames(job.results,job.kind==='batch'?'sim':'train');
  if(job.kind==='train' && job.best){ job.saveMsg=await saveWeights(job.best,((AIW&&AIW.gen)||0)+job.accepted); }
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
      el('label',{},t('si_games'),num('games',1,500)),
      el('label',{},t('si_players'),seg('players',[[2,'2'],[3,'3'],[4,'4']])),
      el('label',{},t('si_speed'),seg('depth',[[2,t('si_normal')],[1,t('si_fast')]])),
      el('button',{class:'primary',disabled:busy?'':null,onclick:()=>{ simCfg.countries=pickedCountries('#cboxS'); runJob('batch'); }},t('si_run')),
      busy&&job.kind==='batch'?el('button',{onclick:stopJob},t('si_stop')):null),
    el('div',{class:'flab row-f',style:'justify-content:space-between'},el('span',{},t('si_countries')),el('button',{class:'dice',onclick:()=>randomCountries('#cboxS')},el('span',{class:'die'},'⚄'),el('span',{},t('si_random')))),
    el('div',{class:'muted'},t('ui_tracksSub')),cbox));
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
  const cur=E.getWeights(), def=E.DEFAULT_W;
  box.appendChild(el('div',{class:'pcard'},el('h3',{},t('si_weights')+(AIW&&AIW.gen?' — '+t('si_aiGen',AIW.gen):'')),el('div',{class:'muted',style:'margin-bottom:6px'},t('si_weightsNote')),
    el('table',{class:'stbl'},el('tr',{},el('th',{},t('si_param')),el('th',{class:'num'},t('si_current')),el('th',{class:'num'},t('si_default'))),
      Object.keys(def).map(k=>el('tr',{},el('td',{},t('w_'+k)),el('td',{class:'num',style:cur[k]!==def[k]?'font-weight:700;color:var(--wine2)':''},String(Math.round(cur[k]*100)/100)),el('td',{class:'num muted'},String(def[k]))))),
    el('div',{class:'actions',style:'justify-content:flex-start'},el('button',{class:'small',disabled:busy?'':null,onclick:async()=>{ const msg=await saveWeights(Object.assign({},def),0); alertBox(msg); renderSim(); }},t('si_reset')))));
}
function simLive(){
  const wrap=el('div',{id:'simLive'});
  if(!job) return wrap;
  const card=el('div',{class:'pcard'});
  card.appendChild(el('h3',{},job.kind==='batch'?t('si_batch'):t('si_train')));
  card.appendChild(el('div',{},(job.running?t('si_running')+' ':'')+(job.saving?t('si_saving'):'')+' '+t('si_progress',job.done,job.total)));
  card.appendChild(el('div',{class:'prog'},el('i',{style:'width:'+Math.round(job.done/job.total*100)+'%'})));
  const res=job.results;
  if(res.length){
    const r=avg(res.map(g=>g.rounds)); const flag=r<10?['warn',t('si_low')]:r>12?['warn',t('si_high')]:['ok',t('si_inRange')]; const at11=res.filter(g=>Math.round(g.rounds)===11).length;
    const wins=[]; res.forEach(g=>g.players.forEach(p=>{ if(p.win) wins.push(p); }));
    const kp=[[r.toFixed(1),t('si_avgRounds'),el('span',{class:'flag '+flag[0]},flag[1])],[avg(wins.map(p=>p.vp)).toFixed(1),t('si_avgVP')]];
    kp.push([pct(at11,res.length),t('si_at11')]);
    if(job.ms.length) kp.push([(avg(job.ms)/1000).toFixed(1)+' s',t('si_avgTime')]);
    card.appendChild(el('div',{class:'kpis'},kp.map(([v,l,x])=>el('div',{class:'kpi'},el('div',{class:'v'},v),el('div',{class:'l'},l,x?el('br'):null,x||null)))));
    card.appendChild(el('div',{class:'muted',style:'margin-top:6px'},t('si_target')));
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
    if(!t||t.closest('#zoom')||t.closest('#hoverPrev')) return null;
    if(t.tagName==='IMG'){ const s=t.getAttribute('src')||''; return OK.test(s)?s:null; }
    const c=t.closest('.cell.city'); if(c){ const m=(c.style.backgroundImage||'').match(/url\("?([^")]+)"?\)/); return m?m[1]:null; }
    return null;
  }
  function place(el,src){
    const isCard=/cards\/|book\//.test(src);
    const w=isCard?210:/city\//.test(src)?170:190;
    pv.innerHTML=''; const im=document.createElement('img'); im.src=src; im.style.width=w+'px'; pv.appendChild(im);
    const r=el.getBoundingClientRect(), vw=innerWidth, vh=innerHeight;
    if(r.width>=w*0.65){ pv.style.display='none'; return; } // déjà assez grande
    const h=isCard?w*1.48:w*1.1;
    let x=r.right+12; if(x+w>vw-8) x=r.left-12-w; if(x<8) x=Math.min(vw-w-8,Math.max(8,r.left));
    let y=r.top+r.height/2-h/2; y=Math.max(8,Math.min(vh-h-8,y));
    pv.style.left=x+'px'; pv.style.top=y+'px'; pv.style.display='block';
  }
  document.addEventListener('mouseover',e=>{ const src=srcOf(e.target); if(!src){ if(cur&&!e.target.closest('.cell.city')){ cur=null; pv.style.display='none'; } return; } const el=e.target.closest('.cell.city')||e.target; if(el===cur) return; cur=el; place(el,src); });
  document.addEventListener('scroll',()=>{ cur=null; pv.style.display='none'; },true);
  document.addEventListener('click',()=>{ cur=null; pv.style.display='none'; },true);
})();

// init
applyStatic(); renderSeats(); countryBoxes('#cboxL'); checkResume(); setView('play'); setTimeout(()=>{ if(!db) loadWeights(); },11000);
window.__mag={get S(){return S}, act, E, setLang};
})();

