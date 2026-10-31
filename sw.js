const V='hamd-safa-v1',FILES=['./','index.html','style.css','core.js','app.js','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png','data/adhkar.json','data/hadith.json','data/asbab.json'];
self.addEventListener('install',e=>e.waitUntil(caches.open(V).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const r=e.request,u=new URL(r.url);if(r.method!=='GET'||u.origin!==location.origin)return;
e.respondWith(caches.match(r,{ignoreSearch:true}).then(h=>h||fetch(r).catch(()=>r.mode==='navigate'?caches.match('index.html'):Response.error())))});
