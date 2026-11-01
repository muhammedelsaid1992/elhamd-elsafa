const V='hamd-safa-v9',FILES=['./','index.html','style.css','core.js','app.js','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png','data/adhkar.json','data/hadith.json'];
self.addEventListener('install',e=>e.waitUntil(caches.open(V).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x.startsWith('hamd-safa-')&&x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const r=e.request,u=new URL(r.url);if(r.method!=='GET')return;
if(u.origin!==location.origin)return;
e.respondWith(caches.open(V).then(async c=>{const h=await c.match(r,{ignoreSearch:true});const n=fetch(r).then(x=>{if(x.ok)c.put(r,x.clone());return x}).catch(()=>null);return h||(await n)||(r.mode==='navigate'?c.match('index.html'):Response.error())}))});
