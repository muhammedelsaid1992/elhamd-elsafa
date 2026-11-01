'use strict';
const $=(s,r=document)=>r.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ar=n=>Number(n).toLocaleString('ar-EG');
const today=()=>Core.ymd(new Date());
const API='https://api.alquran.cloud/v1/quran/';
const SRC_TAFSIR='التفسير الميسر — مجمع الملك فهد لطباعة المصحف الشريف (عبر alquran.cloud، الإصدار ar.muyassar)';
const SRC_QURAN='المصحف بالرسم العثماني (نسخة Tanzil عبر alquran.cloud، الإصدار quran-uthmani)';
const RECITERS={'ar.alafasy':'مشاري العفاسي','ar.husary':'محمود خليل الحصري','ar.minshawi':'محمد صديق المنشاوي','ar.abdulbasit':'عبد الباسط عبد الصمد (مرتل)'};
const CATS={morning:'الصباح والمساء',sleep:'النوم',afterPrayer:'بعد الصلاة'};
const IA='https://api.islamic.app/v1/';
const DHIKR=['سبحان الله','الحمد لله','الله أكبر','لا إله إلا الله','أستغفر الله'];
const DEF={progress:{mem:{},bm:null,logs:{}},plan:{perWeek:120,start:null,review:20},tasbih:{dhikr:DHIKR[0],session:0,totals:{}},settings:{theme:'auto',font:26},listen:{reciter:'ar.alafasy',s:1,i:0},speechOk:false,custom:{adhkar:[],hadith:[]}};
const S={};
const DB=(()=>{let p;const open=()=>p||(p=new Promise((res,rej)=>{const r=indexedDB.open('hamd-safa',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}));
const tx=async(m,f)=>{const db=await open();return new Promise((res,rej)=>{const q=f(db.transaction('kv',m).objectStore('kv'));q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)})};
return{get:async(k,d)=>{const v=await tx('readonly',s=>s.get(k));return v===undefined?d:v},set:(k,v)=>tx('readwrite',s=>s.put(v,k)),clear:()=>tx('readwrite',s=>s.clear())}})();
const save=k=>DB.set(k,S[k]);
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('on'),2600)}
async function load(){
  for(const k in DEF)S[k]=await DB.get(k,structuredClone(DEF[k]));
  S.quran=await DB.get('quran',null);S.tafsir=await DB.get('tafsir',null);S.bism=await DB.get('bism','');
  if(!S.plan.start){S.plan.start=today();await save('plan')}
  S.dl={adhkar:await DB.get('dl_adhkar',[]),hadith:await DB.get('dl_hadith',[])};S.files={adhkar:[],hadith:[]};
  for(const k in S.files){try{const r=await fetch('data/'+k+'.json');if(r.ok)S.files[k]=await r.json()}catch{}}
  if(S.listen.reciter==='ar.abdulbasitmurattal')S.listen.reciter='ar.abdulbasit';index();applySettings();
}
const index=()=>{S.starts=S.quran?S.quran.map(s=>s.ayahs[0].g):[];S.pages=S.quran&&S.quran[0].ayahs[0].p?Core.buildPages(S.quran):[]};
const all=k=>[...S.files[k],...(S.dl[k]||[]),...S.custom[k]];
function applySettings(){const r=document.documentElement;S.settings.theme==='auto'?r.removeAttribute('data-theme'):r.dataset.theme=S.settings.theme;r.style.setProperty('--fs',S.settings.font+'px')}
const memCount=()=>Object.keys(S.progress.mem).length;
function touch(kind,n){const d=today(),l=S.progress.logs[d]||(S.progress.logs[d]={hifz:0,review:0,active:1});if(kind)l[kind]+=n;return save('progress')}
const surahSel=(id,sel)=>`<select id="${id}">${S.quran.map(s=>`<option value="${s.n}"${s.n===sel?' selected':''}>${ar(s.n)}. ${esc(s.name)}</option>`).join('')}</select>`;
const ayahOpts=(s,sel)=>S.quran[s-1].ayahs.map(a=>`<option value="${a.n}"${a.n===sel?' selected':''}>${ar(a.n)}</option>`).join('');
function needData(el){el.innerHTML=`<div class="card"><h2>تنزيل المصحف</h2><p>لم يتم تنزيل نص المصحف بعد. يتم التنزيل مرة واحدة (حوالي ١ ميجابايت) ثم يُحفظ على جهازك ويعمل التطبيق دونه بلا إنترنت.</p><p class="src">المصدر: ${SRC_QURAN}</p><button id="dl">تنزيل المصحف الآن</button></div>`;
  $('#dl').onclick=async e=>{e.target.disabled=true;e.target.textContent='جارٍ التنزيل...';try{await dlQuran();toast('تم تنزيل المصحف وحفظه');route()}catch(x){e.target.disabled=false;e.target.textContent='إعادة المحاولة';toast('تعذر التنزيل: '+x.message)}}}
async function fetchEd(ed){const r=await fetch(API+ed);if(!r.ok)throw new Error('رمز الاستجابة '+r.status);const j=await r.json();if(j.code!==200)throw new Error('استجابة غير صالحة');return j.data.surahs}
async function dlQuran(){
  const raw=await fetchEd('quran-uthmani');let bism='';
  const q=raw.map(s=>({n:s.number,name:s.name,ayahs:s.ayahs.map(a=>{let t=a.text;
    if(a.numberInSurah===1&&s.number!==1&&s.number!==9){const w=t.split(' ');if(Core.norm(w.slice(0,4).join(' '))==='بسم الله الرحمن الرحيم'){bism=bism||w.slice(0,4).join(' ');t=w.slice(4).join(' ')}}
    return{g:a.number,n:a.numberInSurah,t,p:a.page,j:a.juz}})}));
  if(q.some(s=>s.ayahs.some(a=>!(a.p>=1&&a.p<=604))))throw new Error('أرقام الصفحات غير مكتملة');
  if(q.length!==114||q.reduce((n,s)=>n+s.ayahs.length,0)!==Core.TOTAL)throw new Error('البيانات المنزّلة غير مكتملة');
  await DB.set('quran',q);await DB.set('bism',bism);S.quran=q;S.bism=bism;index();
}
async function dlTafsir(){const raw=await fetchEd('ar.muyassar');const m={};raw.forEach(s=>s.ayahs.forEach(a=>m[a.number]=a.text));
  if(Object.keys(m).length!==Core.TOTAL)throw new Error('بيانات التفسير غير مكتملة');await DB.set('tafsir',m);S.tafsir=m}
async function jget(u){const r=await fetch(IA+u);if(!r.ok)throw new Error('رمز الاستجابة '+r.status);const j=await r.json();if(j.code!==200)throw new Error('استجابة غير صالحة');return j.data}
async function dlAdhkar(){let o=[];for(const[ch,cat]of Object.entries(Core.CH)){const l=Core.parseAdhkar(await jget('dhikr/'+ch),cat);if(!l.length)throw new Error('بيانات الباب '+ch+' فارغة');o=o.concat(l)}S.dl.adhkar=o;await DB.set('dl_adhkar',o)}
async function dlHadith(){const o=[];let off=0,tot=1;while(off<tot){const d=await jget('hadith/collections/forty/books/2/hadiths?limit=50&offset='+off);tot=d.total;if(!d.hadiths||!d.hadiths.length)break;o.push(...Core.parseHadith(d));off+=50}if(!o.length)throw new Error('لم تصل أحاديث');S.dl.hadith=o;await DB.set('dl_hadith',o)}
const DL={adhkar:dlAdhkar,hadith:dlHadith};
/* ---------- views ---------- */
const V={};
V.home=el=>{
  const m=memCount(),wk=Core.weekOf(S.plan.start,today()),r=Core.planRange(wk,S.plan.perWeek),days=Object.keys(S.progress.logs).length;
  const lbl=g=>{if(!S.quran)return ar(g);const p=Core.locate(S.starts,g);return `${esc(S.quran[p.s-1].name)} آية ${ar(p.a)}`};
  const l=S.progress.logs[today()]||{hifz:0,review:0};
  el.innerHTML=`<div class="grid"><div class="card stat"><b>${ar(m)}</b>آية محفوظة</div><div class="card stat"><b>${ar(days)}</b>يوم متابعة</div><div class="card stat"><b>${ar(Math.round(100*m/Core.TOTAL))}٪</b>من المصحف</div></div>
  <div class="card"><div class="prog"><i style="width:${100*m/Core.TOTAL}%"></i></div></div>
  <div class="card"><h3>خطة هذا الأسبوع (الأسبوع ${ar(wk)} من ${ar(Core.weeksNeeded(S.plan.perWeek))})</h3>${r?`<p>${S.quran?`من ${lbl(r[0])} إلى ${lbl(r[1])}`:`الآيات ${ar(r[0])} – ${ar(r[1])}`}</p>`:'<p>انتهت أسابيع الخطة، يمكنك تعديلها من قسم الخطة.</p>'}
  <p class="src">اليوم: حفظ ${ar(l.hifz)} آية، مراجعة ${ar(l.review)} آية</p></div>
  ${S.progress.bm&&S.quran?`<div class="card"><a class="btn" href="#/mushaf?s=${S.progress.bm.s}&a=${S.progress.bm.a}">أكمل من موضع التوقف: ${esc(S.quran[S.progress.bm.s-1].name)} آية ${ar(S.progress.bm.a)}</a></div>`:''}
  ${S.quran?'':'<div class="note">لم يُنزَّل المصحف بعد. افتح قسم «المصحف» لتنزيله مرة واحدة.</div>'}
  <div class="card"><h3>اختصارات</h3>${Object.entries(NAV).filter(([k])=>k!=='home').map(([k,v])=>`<a class="btn alt" href="#/${k}">${v}</a>`).join('')}</div>`;
};
V.mushaf=(el,q)=>{
  if(!S.quran)return needData(el);
  let sn=+(q.get('s')||S.progress.bm?.s||1);const focus=+(q.get('a')||0);
  el.innerHTML=`<div class="bar"><input id="sf" placeholder="ابحث عن سورة" aria-label="بحث عن سورة"><span id="sw"></span>${S.progress.bm?'<button class="alt" id="gb">موضع التوقف</button>':''}</div><div id="ays" class="card"></div><p class="src">${SRC_QURAN}</p>`;
  const sw=()=>{const f=Core.norm($('#sf').value);$('#sw').innerHTML=surahSel('ss',sn);if(f){[...$('#ss').options].forEach(o=>{if(!Core.norm(o.textContent).includes(f)&&o.value!=sn)o.remove()})}$('#ss').onchange=e=>{sn=+e.target.value;draw()}};
  $('#sf').oninput=sw;if($('#gb'))$('#gb').onclick=()=>{sn=S.progress.bm.s;sw();draw(S.progress.bm.a)};
  function draw(f){const s=S.quran[sn-1],bm=S.progress.bm;
    $('#ays').innerHTML=`<h2>${esc(s.name)}</h2>${S.bism&&sn!==1&&sn!==9?`<div class="bism">${esc(S.bism)}</div>`:''}`+s.ayahs.map(a=>`<div class="ay${S.progress.mem[a.g]?' m':''}${bm&&bm.s===sn&&bm.a===a.n?' s':''}" id="a${a.n}" data-g="${a.g}" data-n="${a.n}"><span class="t">${esc(a.t)} <b class="num">﴿${ar(a.n)}﴾</b></span><div class="acts"><button class="alt" data-k="mem">${S.progress.mem[a.g]?'✓ محفوظة':'حفظتها'}</button><button class="alt" data-k="bm">توقفت هنا</button><a class="btn alt" href="#/tafsir?s=${sn}&a=${a.n}">تفسير</a></div></div>`).join('');
    if(f||focus){const t=$('#a'+(f||focus));t&&t.scrollIntoView({block:'center'})}}
  $('#ays').onclick=async e=>{const b=e.target.closest('button[data-k]');if(!b)return;const row=b.closest('.ay'),g=row.dataset.g,n=+row.dataset.n;
    if(b.dataset.k==='mem'){S.progress.mem[g]?delete S.progress.mem[g]:S.progress.mem[g]=today();await touch();toast(S.progress.mem[g]?'تم تسجيل الآية محفوظة':'أُزيلت من المحفوظ')}
    else{S.progress.bm={s:sn,a:n};await touch();toast('تم تحديد موضع التوقف')}
    const y=scrollY;draw();scrollTo(0,y)};
  sw();draw();
};
V.tafsir=(el,q)=>{
  if(!S.quran)return needData(el);
  let s=+(q.get('s')||1),a=+(q.get('a')||1);
  el.innerHTML=`<div class="bar">${surahSel('ts',s)}<select id="ta">${ayahOpts(s,a)}</select></div><div id="out"></div>`;
  const show=()=>{const ay=S.quran[s-1].ayahs[a-1];
    $('#out').innerHTML=`<div class="card"><div class="t">${esc(ay.t)} <b class="num">﴿${ar(a)}﴾</b></div></div>
    <div class="card"><h3>التفسير</h3>${S.tafsir?`<p>${esc(S.tafsir[ay.g])}</p><p class="src">المصدر: ${SRC_TAFSIR}</p>`:`<p>لم يُنزَّل التفسير بعد.</p><button id="dt">تنزيل التفسير الميسر</button>`}</div>`;
    if($('#dt'))$('#dt').onclick=async e=>{e.target.disabled=true;e.target.textContent='جارٍ التنزيل...';try{await dlTafsir();show();toast('تم تنزيل التفسير')}catch(x){e.target.disabled=false;e.target.textContent='إعادة المحاولة';toast('تعذر التنزيل: '+x.message)}}};
  $('#ts').onchange=e=>{s=+e.target.value;a=1;$('#ta').innerHTML=ayahOpts(s,1);show()};$('#ta').onchange=e=>{a=+e.target.value;show()};show();
};
V.plan=el=>{
  const P=S.plan,wk=Core.weekOf(P.start,today()),n=Core.weeksNeeded(P.perWeek),lg=S.progress.logs,wd=Core.weekDays(P.start,wk);
  const sum=(days,k)=>days.reduce((t,d)=>t+(lg[d]?lg[d][k]:0),0),wDone=sum(wd,'hifz'),wRev=sum(wd,'review'),t=lg[today()]||{hifz:0,review:0};
  const lbl=g=>{if(!S.quran)return ar(g);const p=Core.locate(S.starts,g);return `${esc(S.quran[p.s-1].name)} ${ar(p.a)}`};
  const rows=Array.from({length:n},(_,i)=>{const r=Core.planRange(i+1,P.perWeek),d=sum(Core.weekDays(P.start,i+1),'hifz');return `<tr${i+1===wk?' style="font-weight:700"':''}><td>${ar(i+1)}</td><td>${lbl(r[0])} ← ${lbl(r[1])}</td><td>${ar(Math.min(100,Math.round(100*d/P.perWeek)))}٪</td></tr>`}).join('');
  el.innerHTML=`<div class="card"><h3>إنجاز اليوم</h3><div class="bar"><label>حفظ جديد (آيات) <input id="h" type="number" min="0" value="0" style="width:80px"></label><label>مراجعة (آيات) <input id="r" type="number" min="0" value="0" style="width:80px"></label><button id="lg">تسجيل</button></div><p class="src">سُجّل اليوم: حفظ ${ar(t.hifz)}، مراجعة ${ar(t.review)} — هدف اليوم تقريبًا: حفظ ${ar(Math.ceil(P.perWeek/7))}، مراجعة ${ar(P.review)}</p></div>
  <div class="card"><h3>إنجاز الأسبوع ${ar(wk)}</h3><div class="prog"><i style="width:${Math.min(100,100*wDone/P.perWeek)}%"></i></div><p>حفظ ${ar(wDone)} من ${ar(P.perWeek)} آية، مراجعة ${ar(wRev)} آية (${ar(Math.min(100,Math.round(100*wDone/P.perWeek)))}٪)</p></div>
  <div class="card"><h3>تعديل الخطة</h3><div class="bar"><label>آيات الحفظ أسبوعيًا <input id="pw" type="number" min="5" max="600" value="${P.perWeek}" style="width:90px"></label><label>آيات المراجعة يوميًا <input id="pr" type="number" min="0" value="${P.review}" style="width:90px"></label><label>بداية الخطة <input id="ps" type="date" value="${P.start}"></label><button id="sv">حفظ التعديل</button></div><p class="src">تعديل الخطة لا يمسّ الآيات المحفوظة ولا سجل الإنجاز السابق. المصحف ٦٢٣٦ آية؛ بمعدل ${ar(P.perWeek)} أسبوعيًا تنتهي الخطة في ${ar(n)} أسبوعًا.</p></div>
  <div class="card"><h3>جدول الأسابيع</h3><div style="overflow-x:auto"><table><tr><th>الأسبوع</th><th>المقرر</th><th>الإنجاز</th></tr>${rows}</table></div></div>`;
  $('#lg').onclick=async()=>{const h=Math.max(0,+$('#h').value|0),r=Math.max(0,+$('#r').value|0);if(!h&&!r)return toast('أدخل عددًا أولًا');await touch('hifz',h);await touch('review',r);toast('تم التسجيل');V.plan(el)};
  $('#sv').onclick=async()=>{const pw=+$('#pw').value,st=$('#ps').value;if(!(pw>=5&&pw<=600)||!st)return toast('تحقق من القيم المدخلة');S.plan={perWeek:pw,review:Math.max(0,+$('#pr').value|0),start:st};await save('plan');toast('تم تعديل الخطة');V.plan(el)};
};
V.adhkar=(el,q)=>{
  const cat=q.get('c')||'morning',list=all('adhkar').filter(x=>x.cat===cat);
  el.innerHTML=`<div class="bar">${Object.entries(CATS).map(([k,v])=>`<a class="btn${k===cat?'':' alt'}" href="#/adhkar?c=${k}">${v}</a>`).join('')}</div>`+
  (list.length?list.map((x,i)=>`<div class="card"><p class="quran" style="font-size:calc(var(--fs)*.85)">${esc(x.text)}</p><p class="src">التكرار: ${x.count?ar(x.count):'كما ورد في نص الذكر'} | المصدر: ${esc(x.source)}</p><button class="alt" data-c="${x.count||1}">عدّ (${ar(x.count||1)})</button></div>`).join(''):noData('الأذكار','adhkar'));
  el.onclick=e=>{const b=e.target.closest('button[data-c]');if(!b)return;let c=+b.dataset.c-1;b.dataset.c=Math.max(c,0);b.textContent=c>0?`عدّ (${ar(c)})`:'✓ تم'};
};
function noData(name,kind){return DL[kind]?`<div class="card"><p>لم تُنزَّل بيانات ${name} بعد. تُنزَّل مرة واحدة من islamic.app (نسخة من sunnah.com) وتُحفظ على جهازك، ثم تعمل دون إنترنت. التطبيق لا يضيف أي نص من عنده.</p><button data-dl="${kind}">تنزيل ${name}</button></div>`:`<div class="note">لا توجد بيانات ${name}. لم يضف التطبيق نصوصًا غير موثقة؛ استورد ملف JSON موثقًا من الإعدادات (انظر README).</div>`}
V.tasbih=el=>{
  const T=S.tasbih,tot=T.totals[T.dhikr]||0;
  el.innerHTML=`<div class="card"><select id="dk">${DHIKR.map(d=>`<option${d===T.dhikr?' selected':''}>${d}</option>`).join('')}</select><button class="big" id="tap" aria-live="polite">${ar(T.session)}</button><p>إجمالي «${esc(T.dhikr)}»: ${ar(tot)} — إجمالي كل الأذكار: ${ar(Object.values(T.totals).reduce((a,b)=>a+b,0))}</p><button class="alt" id="rs">تصفير الجلسة</button></div>`;
  $('#dk').onchange=async e=>{T.dhikr=e.target.value;T.session=0;await save('tasbih');V.tasbih(el)};
  $('#tap').onclick=async()=>{T.session++;T.totals[T.dhikr]=(T.totals[T.dhikr]||0)+1;await save('tasbih');V.tasbih(el);if(navigator.vibrate)navigator.vibrate(15)};
  $('#rs').onclick=async()=>{T.session=0;await save('tasbih');V.tasbih(el)};
};
V.hadith=el=>{
  const list=all('hadith');
  if(!list.length){el.innerHTML=noData('الأحاديث القدسية','hadith');return}
  const cats=[...new Set(list.map(x=>x.cat).filter(Boolean))];
  el.innerHTML=`<div class="bar"><input id="hq" placeholder="بحث في الأحاديث"><select id="hc"><option value="">كل التصنيفات</option>${cats.map(c=>`<option>${esc(c)}</option>`).join('')}</select></div><div id="hl"></div>`;
  const f=()=>{const t=Core.norm($('#hq').value),c=$('#hc').value;$('#hl').innerHTML=list.filter(x=>(!c||x.cat===c)&&(!t||Core.norm(x.text).includes(t))).map(x=>`<div class="card"><p>${esc(x.text)}</p><p class="src">المصدر: ${esc(x.source)}${x.grade?' | الدرجة: '+esc(x.grade):''}${x.cat?' | '+esc(x.cat):''}</p></div>`).join('')||'<p>لا نتائج.</p>'};
  $('#hq').oninput=f;$('#hc').onchange=f;f();
};
let audio,furl;
const IAUD='https://api.islamic.app/v1/audio/';
const ayahUrl=(rc,g)=>`${IAUD}ayah/${encodeURIComponent(rc)}/${g}`,surahUrl=(rc,n)=>`${IAUD}surah/${encodeURIComponent(rc)}/${n}`;
let acache;const AC=async()=>acache||(acache=await caches.open('hamd-audio-v2'));
const adl=async()=>S.adl||(S.adl=await DB.get('audiodl2',{}));
const ent=(A,rc,n)=>A[rc]&&A[rc][n];
const ABORT=()=>new DOMException('تم الإلغاء','AbortError');
const FALLBACK=[{id:'ar.alafasy',name:'مشاري العفاسي',levels:['ayah','surah']}];
const PREF=['alafasy','abdulbasit','husary','minshawi'];
const probe=(u,ms=15000)=>new Promise(res=>{const x=new Audio();let d=0;const f=ok=>{if(d)return;d=1;clearTimeout(t);x.onloadedmetadata=x.oncanplay=x.onerror=null;x.removeAttribute('src');x.load();res(ok)};const t=setTimeout(()=>f(false),ms);x.preload='auto';x.onloadedmetadata=x.oncanplay=()=>f(true);x.onerror=()=>f(false);x.src=u;x.load()});
async function recs(){
  const bad=await DB.get('badrec',[]);
  const clean=r=>{const m=new Map();for(const x of r){if(bad.includes(x.id))continue;const k=String(x.name).trim(),o=m.get(k);if(!o||x.levels.length>o.levels.length)m.set(k,x)}
    const o=[...m.values()],f=x=>{const k=PREF.findIndex(w=>x.id.includes(w));return k<0?99:k};o.sort((p,q)=>f(p)-f(q));return o.length?o:FALLBACK};
  const pull=async()=>{const ac=new AbortController(),t=setTimeout(()=>ac.abort(),8000);try{const j=await(await fetch(IAUD+'reciters',{signal:ac.signal})).json();
    if(j.code===200&&Array.isArray(j.data)){const r=j.data.filter(x=>x.type!=='translation'&&x.language==='ar'&&Array.isArray(x.audioLevels)&&x.audioLevels.length).map(x=>({id:x.identifier,name:x.name||x.englishName||x.identifier,levels:x.audioLevels}));if(r.length){await DB.set('reciters',r);return r}}}catch{}finally{clearTimeout(t)}return null};
  const st=await DB.get('reciters',null);if(st&&st.length){pull();return clean(st)}
  return clean((await pull())||FALLBACK)}
async function dlSurah(rc,n,lv,sig){const A=await adl(),c=await AC();
  if(lv.includes('surah')){const u=surahUrl(rc,n),r=await fetch(u,{signal:sig});
    if(r.ok){const cl=+r.headers.get('content-length')||0;await c.put(u,r);const b=await(await c.match(u)).blob();
      if(b.size<10000||(cl&&b.size!==cl)){await c.delete(u);throw new Error('الملف المنزّل ناقص، أعد المحاولة')}
      (A[rc]||(A[rc]={}))[n]={t:'surah',u};await DB.set('audiodl2',A);return}
    if(r.status!==404||!lv.includes('ayah'))throw new Error('رمز الاستجابة '+r.status)}
  for(const a of S.quran[n-1].ayahs){if(sig.aborted)throw ABORT();const u=ayahUrl(rc,a.g);if(await c.match(u))continue;
    const r=await fetch(u,{signal:sig});if(!r.ok)throw new Error('الآية '+a.n+': رمز الاستجابة '+r.status);await c.put(u,r)}
  (A[rc]||(A[rc]={}))[n]={t:'ayahs'};await DB.set('audiodl2',A)}
async function delSurah(rc,n){const A=await adl(),c=await AC(),e=ent(A,rc,n);
  if(e&&e.t==='surah')await c.delete(e.u);if(e&&e.t==='ayahs')for(const a of S.quran[n-1].ayahs)await c.delete(ayahUrl(rc,a.g));
  if(A[rc])delete A[rc][n];await DB.set('audiodl2',A)}
V.listen=async el=>{
  if(!S.quran)return needData(el);
  caches.delete('hamd-audio-v1').catch(()=>{});
  const L=S.listen,A=await adl(),R=await recs(),bad=await DB.get('badrec',[]);let abort=null;
  if(!R.some(x=>x.id===L.reciter)){L.reciter=R[0].id;save('listen')}
  el.innerHTML=`<div class="card"><div class="bar"><select id="rc">${R.map(x=>`<option value="${esc(x.id)}"${x.id===L.reciter?' selected':''}>${esc(x.name)}${x.levels.includes('surah')?'':' (آية بآية)'}</option>`).join('')}</select>${surahSel('ls',L.s)}</div>
  <p id="st" class="src">متوقف</p><div class="bar"><button id="pl">تشغيل / استكمال</button><button class="alt" id="pa">إيقاف مؤقت</button><button class="alt" id="sp">إيقاف</button></div></div>
  <div class="card"><h3>الاستماع بدون إنترنت</h3><p id="ds" class="src"></p>
  <div class="bar"><button id="d1">تنزيل هذه السورة</button><button class="alt" id="dx">حذف هذه السورة</button></div>
  <div class="bar"><button class="alt" id="da">تنزيل القرآن كله لهذا القارئ</button><button class="alt" id="dc" disabled>إلغاء</button><button class="warn" id="dd">حذف تنزيلات هذا القارئ</button></div>
  <div class="note">السور المنزَّلة تعمل من الجهاز بلا إنترنت، وغير المنزَّلة تحتاج إنترنت. كل قارئ يُنزَّل منفصلًا وقد يحتاج القرآن كله لقارئ واحد مئات الميجابايت. بعض القرّاء تُنزَّل سورهم آيةً آية. قد يمسح المتصفح التخزين لو ضاقت مساحة الجهاز. التنزيلات القديمة من النسخ السابقة لا تُستخدم، فأعد تنزيل ما تحتاجه.</div>${bad.length?`<button class="alt" id="rb">إظهار القرّاء المخفيين (${ar(bad.length)})</button>`:''}</div>`;
  const ays=()=>S.quran[L.s-1].ayahs,E=()=>ent(A,L.reciter,L.s),cnt=()=>Object.keys(A[L.reciter]||{}).length,lvl=()=>(R.find(x=>x.id===L.reciter)||{levels:['ayah']}).levels;
  async function stat(){let u='';try{const e=await navigator.storage.estimate();u=` | المساحة المستخدمة: ${ar(Math.round(e.usage/1048576))} ميجا`}catch{}$('#ds').textContent=`منزَّل لهذا القارئ: ${ar(cnt())} من ١١٤ سورة | هذه السورة: ${E()?'✓ منزَّلة':'غير منزَّلة'}${u}`}
  const setSt=t=>{const s=$('#st');if(s)s.textContent=t};
  const blobUrl=async u=>{const r=await(await AC()).match(u);if(!r)return null;const b=await r.blob();if(furl)URL.revokeObjectURL(furl);return furl=URL.createObjectURL(b)};
  async function playFile(){const e=E();if(!e||e.t!=='surah')return false;const src=await blobUrl(e.u);if(!src)return false;if(!audio)audio=new Audio();
    audio.onerror=()=>toast('تعذر تشغيل الملف المحفوظ، أعد تنزيل السورة');audio.onended=()=>setSt('انتهت السورة');let ls=0;audio.ontimeupdate=()=>{if(Date.now()-ls>5000){ls=Date.now();L.t=audio.currentTime;save('listen')}};
    audio.src=src;const key=L.reciter+':'+L.s;if(L.fs===key&&L.t)audio.currentTime=L.t;L.fs=key;await audio.play();setSt(`${S.quran[L.s-1].name} — من الجهاز (بدون إنترنت)`);return true}
  let order=[],oi=0;
  async function failNow(){toast(navigator.onLine?'تعذر تشغيل هذا القارئ':'لا يوجد إنترنت. نزّل السورة أولًا للاستماع بدونه');
    if(!navigator.onLine||L.i>0)return;
    if(!(await probe(surahUrl('ar.alafasy',1))))return;
    const b=await DB.get('badrec',[]);if(!b.includes(L.reciter)){b.push(L.reciter);await DB.set('badrec',b)}
    toast('صوت هذا القارئ غير متاح حاليًا، تم إخفاؤه من القائمة');L.reciter='ar.alafasy';await save('listen');route()}
  function nextMethod(){oi++;oi<order.length?begin():failNow()}
  function begin(){const m=order[oi];if(!audio)audio=new Audio();audio.onended=null;audio.ontimeupdate=null;audio.onloadedmetadata=null;audio.onerror=nextMethod;
    if(m==='surah'){const key=L.reciter+':'+L.s,t0=L.fs===key?L.t:0;L.fs=key;audio.src=surahUrl(L.reciter,L.s);
      audio.onloadedmetadata=()=>{if(t0)audio.currentTime=t0};audio.onended=()=>setSt('انتهت السورة');let ls=0;audio.ontimeupdate=()=>{if(Date.now()-ls>5000){ls=Date.now();L.t=audio.currentTime;save('listen')}};
      audio.play().then(()=>setSt(`${S.quran[L.s-1].name} — بث من الإنترنت`)).catch(()=>{if(!audio.error)toast('تعذر التشغيل')})}
    else playAyah()}
  async function playAyah(){if(!audio)audio=new Audio();const a=ays()[L.i];if(!a)return stop();let src=ayahUrl(L.reciter,a.g),local=false;const e=E();
    if(e&&e.t==='ayahs'){const b=await blobUrl(src);if(b){src=b;local=true}}
    audio.ontimeupdate=null;audio.onloadedmetadata=null;audio.src=src;
    audio.onended=()=>{L.i++;save('listen');L.i<ays().length?playAyah():(L.i=0,save('listen'),setSt('انتهت السورة'))};
    audio.onerror=()=>{L.i===0&&!local?nextMethod():toast('تعذر تشغيل الآية، تحقق من الاتصال')};
    audio.play().then(()=>{setSt(`${S.quran[L.s-1].name} — الآية ${ar(L.i+1)} من ${ar(ays().length)} (${local?'من الجهاز':'بث من الإنترنت'})`);save('listen')}).catch(()=>{if(!audio.error)toast('تعذر التشغيل')})}
  async function play(){if(await playFile().catch(()=>false))return;const e=E(),lv=lvl();
    order=e&&e.t==='ayahs'?['ayah']:[...(lv.includes('surah')?['surah']:[]),...(lv.includes('ayah')?['ayah']:[])];if(!order.length)order=['ayah'];oi=0;begin()}
  function stop(){if(audio){audio.onerror=null;audio.pause();audio.removeAttribute('src')}L.i=0;L.t=0;save('listen');setSt('متوقف')}
  $('#rc').onchange=e=>{stop();L.reciter=e.target.value;save('listen');stat()};$('#ls').onchange=e=>{stop();L.s=+e.target.value;save('listen');stat()};
  $('#pl').onclick=()=>{audio&&audio.src&&audio.paused&&audio.currentTime>0?audio.play():play()};
  $('#pa').onclick=()=>{if(audio){audio.pause();L.t=audio.currentTime;save('listen')}};$('#sp').onclick=stop;
  const busy=b=>{['d1','dx','da','dd'].forEach(i=>$('#'+i).disabled=b);$('#dc').disabled=!b};
  async function run(list){abort=new AbortController();busy(true);try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist();let k=0;
      for(const n of list){if(ent(A,L.reciter,n)){k++;continue}setSt(`جارٍ التنزيل: سورة ${S.quran[n-1].name} (${ar(++k)} من ${ar(list.length)})`);await dlSurah(L.reciter,n,lvl(),abort.signal)}
      toast('تم التنزيل')}catch(e){toast(e.name==='AbortError'?'تم الإلغاء':e instanceof TypeError?'تعذر الاتصال بالإنترنت':'تعذر التنزيل: '+(e.message||e))}finally{busy(false);setSt('متوقف');stat()}}
  $('#d1').onclick=()=>run([L.s]);$('#da').onclick=()=>{if(confirm('تنزيل القرآن كله لهذا القارئ؟ يحتاج مساحة كبيرة واتصالًا ثابتًا.'))run(Array.from({length:114},(_,i)=>i+1))};
  $('#dc').onclick=()=>abort&&abort.abort();
  $('#dx').onclick=async()=>{await delSurah(L.reciter,L.s);toast('تم الحذف');stat()};
  $('#dd').onclick=async()=>{if(!confirm('حذف كل تنزيلات هذا القارئ؟'))return;for(const n of Object.keys(A[L.reciter]||{}))await delSurah(L.reciter,n);toast('تم الحذف');stat()};
  if($('#rb'))$('#rb').onclick=async()=>{await DB.set('badrec',[]);route()};
  stat();
};
V.recite=el=>{
  if(!S.quran)return needData(el);
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;let rec,txt='';
  el.innerHTML=`<div class="note"><b>تنبيه:</b> هذه الميزة تقارن الكلمات المنطوقة بنص المصحف مقارنة تقريبية فقط، ولا تصحح التجويد ولا مخارج الحروف. لا يسجّل التطبيق صوتك ولا يحفظه. لكن التعرف على الكلام في متصفحات مثل Chrome وEdge يتم عبر خدمة المتصفح (قد تُرسل الصوت إلى خوادم Google أو Microsoft) ويحتاج إنترنت.</div>
  ${SR?`<div class="card"><label><input type="checkbox" id="ok"${S.speechOk?' checked':''}> أوافق على استخدام ميكروفون المتصفح للتعرف على الكلام</label>
  <div class="bar">${surahSel('rs',1)}<label>من <select id="rf">${ayahOpts(1,1)}</select></label><label>إلى <select id="rt">${ayahOpts(1,1)}</select></label></div>
  <div class="bar"><button id="go">ابدأ التسميع</button><button class="alt" id="end" disabled>أنهِ وقارن</button></div><p id="live" class="src"></p><div id="res"></div></div>`:'<div class="note">متصفحك لا يدعم التعرف على الكلام. استخدم Chrome أو Edge.</div>'}`;
  if(!SR)return;
  const fill=()=>{const s=+$('#rs').value,o=ayahOpts(s,1);$('#rf').innerHTML=o;$('#rt').innerHTML=o};$('#rs').onchange=fill;
  $('#ok').onchange=e=>{S.speechOk=e.target.checked;save('speechOk')};
  $('#go').onclick=()=>{if(!$('#ok').checked)return toast('وافق على استخدام الميكروفون أولًا');
    rec=new SR();rec.lang='ar-SA';rec.continuous=true;rec.interimResults=true;txt='';$('#res').innerHTML='';
    rec.onresult=e=>{txt=[...e.results].map(r=>r[0].transcript).join(' ');$('#live').textContent=txt};
    rec.onerror=e=>{toast('خطأ في التعرف: '+e.error);fin()};rec.onend=fin;
    try{rec.start();$('#go').disabled=true;$('#end').disabled=false;$('#live').textContent='أنصت إليك...'}catch(x){toast('تعذر بدء الميكروفون')}};
  $('#end').onclick=()=>rec&&rec.stop();
  function fin(){if(!$('#go'))return;$('#go').disabled=false;$('#end').disabled=true;if(!txt.trim())return;
    const s=+$('#rs').value,a=+$('#rf').value,b=Math.max(a,+$('#rt').value),exp=S.quran[s-1].ayahs.slice(a-1,b).map(x=>x.t).join(' '),r=Core.compare(exp,txt);
    $('#res').innerHTML=`<h3>النتيجة التقريبية: ${ar(r.pct)}٪</h3><p class="quran">${r.words.map(w=>`<span class="${w.ok?'ok':'bad'}">${esc(w.w)}</span>`).join(' ')}</p>${r.extra.length?`<p class="src">كلمات منطوقة زائدة أو غير مطابقة: ${esc(r.extra.join('، '))}</p>`:''}<p class="src">الأخضر: مطابقة، الأحمر: لم تُلتقط أو اختلفت.</p>`}
};
V.settings=el=>{
  const st=S.settings,cnt=k=>all(k).length;
  el.innerHTML=`<div class="card"><h3>المظهر</h3><div class="bar"><select id="th">${[['auto','تلقائي'],['light','فاتح'],['dark','داكن']].map(([k,v])=>`<option value="${k}"${st.theme===k?' selected':''}>${v}</option>`).join('')}</select><label>حجم خط المصحف <input id="fz" type="range" min="18" max="48" value="${st.font}"></label></div></div>
  <div class="card"><h3>النسخ الاحتياطي</h3><button id="ex">تصدير بياناتي</button> <label class="btn alt">استيراد نسخة احتياطية<input id="im" type="file" accept=".json,application/json" hidden></label></div>
  <div class="card"><h3>استيراد محتوى موثق</h3><p class="src">الصيغة في README. الأذكار: ${ar(cnt('adhkar'))}، الأحاديث: ${ar(cnt('hadith'))}.</p>${['adhkar','hadith'].map(k=>`<label class="btn alt">${{adhkar:'الأذكار',hadith:'الأحاديث القدسية'}[k]}<input type="file" accept=".json" hidden data-k="${k}"></label>`).join('')}</div>
  <div class="card"><h3>إدارة البيانات المحلية</h3><p class="src">المصحف: ${S.quran?'منزَّل':'غير منزَّل'} | التفسير: ${S.tafsir?'منزَّل':'غير منزَّل'}</p><button class="warn" id="cp">مسح التقدم فقط</button> <button class="warn" id="ca">مسح كل البيانات</button></div>`;
  $('#th').onchange=async e=>{st.theme=e.target.value;applySettings();await save('settings')};$('#fz').oninput=async e=>{st.font=+e.target.value;applySettings();await save('settings')};
  $('#ex').onclick=()=>{const d={app:'hamd-safa',v:1,date:today()};['progress','plan','tasbih','settings','listen','custom'].forEach(k=>d[k]=S[k]);const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(d)],{type:'application/json'}));a.download=`hamd-safa-backup-${today()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1e4)};
  const rd=f=>f.text().then(JSON.parse);
  $('#im').onchange=async e=>{try{const d=await rd(e.target.files[0]);if(d.app!=='hamd-safa'||!d.progress||!d.plan)throw 0;if(!confirm('سيتم استبدال بياناتك الحالية. متابعة؟'))return;for(const k of ['progress','plan','tasbih','settings','listen','custom'])if(d[k]){S[k]=d[k];await save(k)}applySettings();toast('تمت الاستعادة');route()}catch{toast('الملف ليس نسخة احتياطية صالحة')}};
  el.querySelectorAll('input[data-k]').forEach(i=>i.onchange=async e=>{const k=i.dataset.k;try{const d=await rd(e.target.files[0]);const ok=Array.isArray(d)&&d.length&&d.every(x=>x&&typeof x.text==='string'&&x.text.trim()&&typeof x.source==='string'&&x.source.trim()&&(k!=='adhkar'||CATS[x.cat]));if(!ok)throw 0;S.custom[k]=d;await save('custom');toast('تم استيراد '+ar(d.length)+' عنصرًا');V.settings(el)}catch{toast('الملف غير صالح: كل عنصر يلزمه text وsource (والحقول المذكورة في README)')}});
  $('#cp').onclick=async()=>{if(!confirm('حذف الآيات المحفوظة وسجل الإنجاز والتسبيح؟'))return;for(const k of ['progress','plan','tasbih'])S[k]=structuredClone(DEF[k]);S.plan.start=today();for(const k of ['progress','plan','tasbih'])await save(k);toast('تم المسح');route()};
  $('#ca').onclick=async()=>{if(!confirm('حذف كل البيانات بما فيها المصحف المنزَّل؟'))return;await DB.clear();location.reload()};
};
V.quran=(el,q)=>{
  if(!S.quran)return needData(el);
  if(!S.quran[0].ayahs[0].p){el.innerHTML='<div class="card"><h3>تحديث بيانات المصحف</h3><p>لعرض صفحات المصحف تحتاج البيانات إلى أرقام الصفحات. تنزيل واحد، ويبقى تقدمك كما هو.</p><button id="up">تحديث البيانات</button></div>';
    $('#up').onclick=async e=>{e.target.disabled=true;e.target.textContent='جارٍ التحديث...';try{await dlQuran();toast('تم التحديث');route()}catch(x){e.target.disabled=false;e.target.textContent='إعادة المحاولة';toast('تعذر التحديث: '+x.message)}};return}
  const TH={paper:['ورقي','#fbf6e8','#2a2118','#b8923a'],sage:['أخضر هادئ','#e6efe3','#14301f','#2f7d5b'],sand:['رملي','#efe3cf','#3a2a1a','#a0622d'],night:['ليلي','#12161a','#e9e2cf','#d9b25c'],navy:['أزرق ليلي','#0f1c2e','#dce8ff','#7fb2ff'],amber:['كهرماني','#2b1e12','#f1dcae','#e0a43a']};
  let p=Math.min(604,Math.max(1,+(q.get('p')||S.settings.page||1))),sel=null;
  el.innerHTML=`<div class="mtool">${surahSel('ms',0)}<label>صفحة <input id="mpn" type="number" min="1" max="604" style="width:80px"></label><span>${Object.entries(TH).map(([k,v])=>`<button class="sw" data-t="${k}" style="background:${v[1]};border-color:${v[3]}" aria-label="${v[0]}" title="${v[0]}"></button>`).join('')}</span></div>
  <div id="mw" class="mw"><div id="mp" class="mp"></div></div><div id="mac"></div>
  <div class="bar" style="justify-content:space-between"><button class="alt" id="pv">الصفحة السابقة</button><button id="nx">الصفحة التالية</button></div><p class="src">اسحب بإصبعك من اليسار لليمين للصفحة التالية، ومن اليمين لليسار للسابقة. المصدر: ${SRC_QURAN}. حدود الصفحات كما في مصحف المدينة، وتوزيع الأسطر يتكيف مع حجم الشاشة.</p>`;
  const mw=$('#mw');
  function theme(){const t=TH[S.settings.mtheme]||TH.paper;mw.style.setProperty('--mbg',t[1]);mw.style.setProperty('--mfg',t[2]);mw.style.setProperty('--mac',t[3]);el.querySelectorAll('.sw').forEach(b=>b.classList.toggle('on',b.dataset.t===(S.settings.mtheme||'paper')))}
  function draw(dir){
    const pg=S.pages[p]||[];if(!pg.length){$('#mp').textContent='لا بيانات لهذه الصفحة';return}
    const f=pg[0],sf=S.quran[f.s];let h='';
    pg.forEach(b=>{const s=S.quran[b.s];
      if(b.items[0]===0)h+=`<div class="sh">${esc(s.name)}</div>`+(s.n!==1&&s.n!==9&&S.bism?`<div class="bsm">${esc(S.bism)}</div>`:'');
      h+=b.items.map(i=>{const a=s.ayahs[i];return `<span class="ay2${S.progress.mem[a.g]?' mm':''}" data-s="${s.n}" data-n="${a.n}">${esc(a.t)} <span class="am">${ar(a.n)}</span></span>`}).join(' ')+' '});
    const mp=$('#mp');mp.className='mp'+(dir>0?' in-n':dir<0?' in-p':'');
    mp.innerHTML=`<div class="mh"><span>${esc(sf.name)}</span><span>الجزء ${ar(sf.ayahs[f.items[0]].j)}</span></div><div class="mt" id="mt"><div class="mi" id="mi">${h}</div></div><div class="mf">${ar(p)}</div>`;
    $('#ms').value=sf.n;$('#mpn').value=p;theme();fit();$('#mac').innerHTML='';sel=null}
  function fit(){mw.style.height=Math.max(320,innerHeight-mw.getBoundingClientRect().top-70)+'px';const mt=$('#mt'),mi=$('#mi');if(!mt)return;let lo=12,hi=p<=2?30:36;
    for(let k=0;k<9;k++){const m=(lo+hi)/2;mi.style.fontSize=m+'px';mi.offsetHeight>mt.clientHeight?hi=m:lo=m}mi.style.fontSize=lo+'px'}
  function go(n,dir){n=Math.min(604,Math.max(1,n));if(n===p&&dir)return;p=n;S.settings.page=n;save('settings');draw(dir)}
  $('#nx').onclick=()=>go(p+1,1);$('#pv').onclick=()=>go(p-1,-1);
  $('#ms').onchange=e=>go(S.quran[e.target.value-1].ayahs[0].p,0);$('#mpn').onchange=e=>go(+e.target.value||p,0);
  el.querySelectorAll('.sw').forEach(b=>b.onclick=()=>{S.settings.mtheme=b.dataset.t;save('settings');theme()});
  let x0,y0;mw.addEventListener('touchstart',e=>{x0=e.touches[0].clientX;y0=e.touches[0].clientY},{passive:true});
  mw.addEventListener('touchend',e=>{const dx=e.changedTouches[0].clientX-x0,dy=e.changedTouches[0].clientY-y0;if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.5)go(p+(dx>0?1:-1),dx>0?1:-1)});
  document.onkeydown=e=>{if(/INPUT|SELECT/.test(e.target.tagName))return;if(e.key==='ArrowLeft')go(p+1,1);if(e.key==='ArrowRight')go(p-1,-1)};
  onresize=fit;
  mw.onclick=e=>{const t=e.target.closest('.ay2');if(!t)return;const s=+t.dataset.s,n=+t.dataset.n,g=S.quran[s-1].ayahs[n-1].g;
    mw.querySelectorAll('.sel').forEach(x=>x.classList.remove('sel'));t.classList.add('sel');
    $('#mac').innerHTML=`<div class="card"><b>${esc(S.quran[s-1].name)} — آية ${ar(n)}</b><div class="acts"><a class="btn alt" href="#/tafsir?s=${s}&a=${n}">تفسير</a><button class="alt" id="b1">توقفت هنا</button><button class="alt" id="b2">${S.progress.mem[g]?'✓ محفوظة':'حفظتها'}</button></div></div>`;
    $('#b1').onclick=async()=>{S.progress.bm={s,a:n};await touch();toast('تم تحديد موضع التوقف')};
    $('#b2').onclick=async()=>{S.progress.mem[g]?delete S.progress.mem[g]:S.progress.mem[g]=today();await touch();toast(S.progress.mem[g]?'تم تسجيل الآية محفوظة':'أُزيلت من المحفوظ');const k=p;draw(0)}};
  draw(0);
};
const NAV={home:'الرئيسية',mushaf:'حفظ المصحف',quran:'المصحف',tafsir:'التفسير',plan:'الخطة',adhkar:'الأذكار',tasbih:'التسبيح',hadith:'الأحاديث القدسية',listen:'الاستماع',recite:'التسميع',settings:'الإعدادات'};
function route(){const[h,qs]=(location.hash.slice(2)||'home').split('?'),name=V[h]?h:'home';
  document.onkeydown=null;onresize=null;
  $('#nav').innerHTML=Object.entries(NAV).map(([k,v])=>`<a href="#/${k}"${k===name?' class="on" aria-current="page"':''}>${v}</a>`).join('');
  const m=$('#view');m.onclick=null;V[name](m,new URLSearchParams(qs||''));m.querySelectorAll('[data-dl]').forEach(b=>b.onclick=async()=>{b.disabled=true;b.textContent='جارٍ التنزيل...';try{await DL[b.dataset.dl]();toast('تم التنزيل والحفظ');route()}catch(x){b.disabled=false;b.textContent='إعادة المحاولة';toast('تعذر التنزيل: '+x.message)}});if(!qs)scrollTo(0,0)}
addEventListener('hashchange',route);
if('serviceWorker' in navigator)addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
load().then(route).catch(e=>{$('#view').innerHTML='<div class="note">تعذر فتح التخزين المحلي: '+esc(e.message||e)+'</div>'});
