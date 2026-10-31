'use strict';
const $=(s,r=document)=>r.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ar=n=>Number(n).toLocaleString('ar-EG');
const today=()=>Core.ymd(new Date());
const API='https://api.alquran.cloud/v1/quran/';
const SRC_TAFSIR='التفسير الميسر — مجمع الملك فهد لطباعة المصحف الشريف (عبر alquran.cloud، الإصدار ar.muyassar)';
const SRC_QURAN='المصحف بالرسم العثماني (نسخة Tanzil عبر alquran.cloud، الإصدار quran-uthmani)';
const RECITERS={'ar.alafasy':'مشاري العفاسي','ar.husary':'محمود خليل الحصري','ar.minshawi':'محمد صديق المنشاوي','ar.abdulbasitmurattal':'عبد الباسط عبد الصمد (مرتل)'};
const CATS={morning:'الصباح',evening:'المساء',sleep:'النوم',afterPrayer:'بعد الصلاة'};
const DHIKR=['سبحان الله','الحمد لله','الله أكبر','لا إله إلا الله','أستغفر الله'];
const DEF={progress:{mem:{},bm:null,logs:{}},plan:{perWeek:120,start:null,review:20},tasbih:{dhikr:DHIKR[0],session:0,totals:{}},settings:{theme:'auto',font:26},listen:{reciter:'ar.alafasy',s:1,i:0},speechOk:false,custom:{adhkar:[],hadith:[],asbab:[]}};
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
  S.files={adhkar:[],hadith:[],asbab:[]};
  for(const k in S.files){try{const r=await fetch('data/'+k+'.json');if(r.ok)S.files[k]=await r.json()}catch{}}
  index();applySettings();
}
const index=()=>{S.starts=S.quran?S.quran.map(s=>s.ayahs[0].g):[]};
const all=k=>[...S.files[k],...S.custom[k]];
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
    return{g:a.number,n:a.numberInSurah,t}})}));
  if(q.length!==114||q.reduce((n,s)=>n+s.ayahs.length,0)!==Core.TOTAL)throw new Error('البيانات المنزّلة غير مكتملة');
  await DB.set('quran',q);await DB.set('bism',bism);S.quran=q;S.bism=bism;index();
}
async function dlTafsir(){const raw=await fetchEd('ar.muyassar');const m={};raw.forEach(s=>s.ayahs.forEach(a=>m[a.number]=a.text));
  if(Object.keys(m).length!==Core.TOTAL)throw new Error('بيانات التفسير غير مكتملة');await DB.set('tafsir',m);S.tafsir=m}
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
  const show=()=>{const ay=S.quran[s-1].ayahs[a-1],as=all('asbab').filter(x=>x.s===s&&x.a===a);
    $('#out').innerHTML=`<div class="card"><div class="t">${esc(ay.t)} <b class="num">﴿${ar(a)}﴾</b></div></div>
    <div class="card"><h3>التفسير</h3>${S.tafsir?`<p>${esc(S.tafsir[ay.g])}</p><p class="src">المصدر: ${SRC_TAFSIR}</p>`:`<p>لم يُنزَّل التفسير بعد.</p><button id="dt">تنزيل التفسير الميسر</button>`}</div>
    <div class="card"><h3>أسباب النزول</h3>${as.length?as.map(x=>`<p>${esc(x.text)}</p><p class="src">الكتاب: ${esc(x.book||'—')} | المؤلف: ${esc(x.author||'—')} | المصدر: ${esc(x.source)}</p>`).join(''):'<p>لا يتوفر مصدر موثق لسبب نزول هذه الآية ضمن البيانات المحمّلة، ولم يُضف التطبيق أي معلومة من عنده. يمكنك استيراد ملف أسباب نزول موثق من الإعدادات.</p>'}</div>`;
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
  (list.length?list.map((x,i)=>`<div class="card"><p class="quran" style="font-size:calc(var(--fs)*.85)">${esc(x.text)}</p><p class="src">التكرار: ${ar(x.count||1)} | المصدر: ${esc(x.source)}</p><button class="alt" data-c="${x.count||1}">عدّ (${ar(x.count||1)})</button></div>`).join(''):noData('الأذكار','adhkar'));
  el.onclick=e=>{const b=e.target.closest('button[data-c]');if(!b)return;let c=+b.dataset.c-1;b.dataset.c=Math.max(c,0);b.textContent=c>0?`عدّ (${ar(c)})`:'✓ تم'};
};
function noData(name,kind){return `<div class="note">لا توجد بيانات ${name} بعد. لم يضف التطبيق نصوصًا غير موثقة؛ استورد ملف JSON موثقًا من الإعدادات (انظر README لصيغة الملف).</div>`}
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
let audio;
V.listen=el=>{
  if(!S.quran)return needData(el);
  const L=S.listen;
  el.innerHTML=`<div class="card"><div class="bar"><select id="rc">${Object.entries(RECITERS).map(([k,v])=>`<option value="${k}"${k===L.reciter?' selected':''}>${v}</option>`).join('')}</select>${surahSel('ls',L.s)}</div>
  <p id="st" class="src">متوقف</p><div class="bar"><button id="pl">تشغيل / استكمال</button><button class="alt" id="pa">إيقاف مؤقت</button><button class="alt" id="sp">إيقاف</button></div>
  <div class="note">التشغيل يحتاج إلى اتصال بالإنترنت (الصوت يُبثّ من cdn.islamic.network ولا يُحفظ على الجهاز). نص المصحف والتقدم يعملان دون إنترنت.</div></div>`;
  const ays=()=>S.quran[L.s-1].ayahs,url=a=>`https://cdn.islamic.network/quran/audio/128/${L.reciter}/${a.g}.mp3`;
  const lbl=()=>$('#st').textContent=`${S.quran[L.s-1].name} — الآية ${ar(L.i+1)} من ${ar(ays().length)}`;
  function play(){if(!audio)audio=new Audio();const a=ays()[L.i];if(!a)return stop();audio.src=url(a);audio.onended=()=>{L.i++;save('listen');L.i<ays().length?play():(L.i=0,save('listen'),$('#st')&&($('#st').textContent='انتهت السورة'))};audio.onerror=()=>toast('تعذر تشغيل الصوت. تحقق من الاتصال بالإنترنت.');audio.play().then(()=>{lbl();save('listen')}).catch(()=>toast('تعذر التشغيل'))}
  const stop=()=>{if(audio){audio.pause();audio.removeAttribute('src')}L.i=0;save('listen');if($('#st'))$('#st').textContent='متوقف'};
  $('#rc').onchange=e=>{L.reciter=e.target.value;save('listen')};$('#ls').onchange=e=>{stop();L.s=+e.target.value;save('listen')};
  $('#pl').onclick=()=>{audio&&audio.src&&audio.paused&&audio.currentTime>0?audio.play():play()};$('#pa').onclick=()=>audio&&audio.pause();$('#sp').onclick=stop;
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
  const st=S.settings,cnt=k=>S.custom[k].length+S.files[k].length;
  el.innerHTML=`<div class="card"><h3>المظهر</h3><div class="bar"><select id="th">${[['auto','تلقائي'],['light','فاتح'],['dark','داكن']].map(([k,v])=>`<option value="${k}"${st.theme===k?' selected':''}>${v}</option>`).join('')}</select><label>حجم خط المصحف <input id="fz" type="range" min="18" max="48" value="${st.font}"></label></div></div>
  <div class="card"><h3>النسخ الاحتياطي</h3><button id="ex">تصدير بياناتي</button> <label class="btn alt">استيراد نسخة احتياطية<input id="im" type="file" accept=".json,application/json" hidden></label></div>
  <div class="card"><h3>استيراد محتوى موثق</h3><p class="src">الصيغة في README. الأذكار: ${ar(cnt('adhkar'))}، الأحاديث: ${ar(cnt('hadith'))}، أسباب النزول: ${ar(cnt('asbab'))}.</p>${['adhkar','hadith','asbab'].map(k=>`<label class="btn alt">${{adhkar:'الأذكار',hadith:'الأحاديث القدسية',asbab:'أسباب النزول'}[k]}<input type="file" accept=".json" hidden data-k="${k}"></label>`).join('')}</div>
  <div class="card"><h3>إدارة البيانات المحلية</h3><p class="src">المصحف: ${S.quran?'منزَّل':'غير منزَّل'} | التفسير: ${S.tafsir?'منزَّل':'غير منزَّل'}</p><button class="warn" id="cp">مسح التقدم فقط</button> <button class="warn" id="ca">مسح كل البيانات</button></div>`;
  $('#th').onchange=async e=>{st.theme=e.target.value;applySettings();await save('settings')};$('#fz').oninput=async e=>{st.font=+e.target.value;applySettings();await save('settings')};
  $('#ex').onclick=()=>{const d={app:'hamd-safa',v:1,date:today()};['progress','plan','tasbih','settings','listen','custom'].forEach(k=>d[k]=S[k]);const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(d)],{type:'application/json'}));a.download=`hamd-safa-backup-${today()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1e4)};
  const rd=f=>f.text().then(JSON.parse);
  $('#im').onchange=async e=>{try{const d=await rd(e.target.files[0]);if(d.app!=='hamd-safa'||!d.progress||!d.plan)throw 0;if(!confirm('سيتم استبدال بياناتك الحالية. متابعة؟'))return;for(const k of ['progress','plan','tasbih','settings','listen','custom'])if(d[k]){S[k]=d[k];await save(k)}applySettings();toast('تمت الاستعادة');route()}catch{toast('الملف ليس نسخة احتياطية صالحة')}};
  el.querySelectorAll('input[data-k]').forEach(i=>i.onchange=async e=>{const k=i.dataset.k;try{const d=await rd(e.target.files[0]);const ok=Array.isArray(d)&&d.length&&d.every(x=>x&&typeof x.text==='string'&&x.text.trim()&&typeof x.source==='string'&&x.source.trim()&&(k!=='adhkar'||CATS[x.cat])&&(k!=='asbab'||(x.s>=1&&x.s<=114&&x.a>=1)));if(!ok)throw 0;S.custom[k]=d;await save('custom');toast('تم استيراد '+ar(d.length)+' عنصرًا');V.settings(el)}catch{toast('الملف غير صالح: كل عنصر يلزمه text وsource (والحقول المذكورة في README)')}});
  $('#cp').onclick=async()=>{if(!confirm('حذف الآيات المحفوظة وسجل الإنجاز والتسبيح؟'))return;for(const k of ['progress','plan','tasbih'])S[k]=structuredClone(DEF[k]);S.plan.start=today();for(const k of ['progress','plan','tasbih'])await save(k);toast('تم المسح');route()};
  $('#ca').onclick=async()=>{if(!confirm('حذف كل البيانات بما فيها المصحف المنزَّل؟'))return;await DB.clear();location.reload()};
};
const NAV={home:'الرئيسية',mushaf:'المصحف',tafsir:'التفسير',plan:'الخطة',adhkar:'الأذكار',tasbih:'التسبيح',hadith:'الأحاديث القدسية',listen:'الاستماع',recite:'التسميع',settings:'الإعدادات'};
function route(){const[h,qs]=(location.hash.slice(2)||'home').split('?'),name=V[h]?h:'home';
  if(audio&&name!=='listen'&&0)audio.pause();
  $('#nav').innerHTML=Object.entries(NAV).map(([k,v])=>`<a href="#/${k}"${k===name?' class="on" aria-current="page"':''}>${v}</a>`).join('');
  const m=$('#view');m.onclick=null;V[name](m,new URLSearchParams(qs||''));if(!qs)scrollTo(0,0)}
addEventListener('hashchange',route);
if('serviceWorker' in navigator)addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
load().then(route).catch(e=>{$('#view').innerHTML='<div class="note">تعذر فتح التخزين المحلي: '+esc(e.message||e)+'</div>'});
