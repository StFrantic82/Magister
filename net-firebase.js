// Magister — connexion en ligne hors de claude.ai, via Firebase (Firestore + connexion anonyme).
// Expose window.MAG_NET.init() -> {db, uid} avec la même interface que la base de claude.ai.
window.MAG_NET=(function(){
  const cfg=window.MAG_FIREBASE_CONFIG;
  function loadScript(src){ return new Promise((ok,ko)=>{ const s=document.createElement('script'); s.src=src; s.onload=ok; s.onerror=ko; document.head.appendChild(s); }); }
  function wrapSnap(s){ return {id:s.id, exists:s.exists, data:()=>s.data()}; }
  function wrapDoc(fs,ref){
    return {
      id:ref.id, path:ref.path,
      get:async()=>wrapSnap(await ref.get()),
      set:d=>ref.set(d), update:d=>ref.update(d), delete:()=>ref.delete(),
      onSnapshot:(next,err)=>ref.onSnapshot(s=>next(wrapSnap(s)),e=>err&&err({code:e.code||'unavailable',message:e.message})),
      acquire:async({holder,ttlMs})=>{
        const now=Date.now();
        return fs.runTransaction(async tx=>{
          const s=await tx.get(ref); const l=s.exists&&s.data()._lease;
          if(l&&l.until>now&&l.holder!==holder) return {acquired:false};
          tx.set(ref,{_lease:{holder,until:now+(ttlMs||30000)}},{merge:true}); return {acquired:true};
        });
      },
      collection:p=>wrapCol(fs,ref.collection(p)),
    };
  }
  function wrapQuery(fs,q){
    return {
      where:(f,o,v)=>wrapQuery(fs,q.where(f,o,v)), orderBy:(f,d)=>wrapQuery(fs,q.orderBy(f,d)), limit:n=>wrapQuery(fs,q.limit(n)),
      get:async()=>{ const r=await q.get(); const docs=r.docs.map(wrapSnap); return {docs,size:docs.length,empty:!docs.length}; },
      onSnapshot:(next,err)=>q.onSnapshot(r=>{ const docs=r.docs.map(wrapSnap); next({docs,size:docs.length,empty:!docs.length}); },e=>err&&err(e)),
    };
  }
  function wrapCol(fs,col){ const q=wrapQuery(fs,col); return Object.assign(q,{path:col.path, doc:id=>wrapDoc(fs,id?col.doc(id):col.doc()), add:async d=>wrapDoc(fs,await col.add(d))}); }
  async function init(){
    if(!cfg||!cfg.apiKey) return null;
    const v='10.12.2', base='https://www.gstatic.com/firebasejs/'+v+'/';
    await loadScript(base+'firebase-app-compat.js');
    await loadScript(base+'firebase-auth-compat.js');
    await loadScript(base+'firebase-firestore-compat.js');
    const app=firebase.initializeApp(cfg);
    const cred=await firebase.auth().signInAnonymously();
    const fs=firebase.firestore();
    const db={doc:p=>wrapDoc(fs,fs.doc(p)), collection:p=>wrapCol(fs,fs.collection(p))};
    return {db, uid:cred.user.uid};
  }
  return {init};
})();
