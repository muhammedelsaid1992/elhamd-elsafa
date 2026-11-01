(function(root){
const TOTAL=6236;
const norm=s=>String(s).replace(/[\u0640\u064B-\u065F\u0670\u06D6-\u06ED\u08D3-\u08FF]/g,'').replace(/[\u0671\u0622\u0623\u0625]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/[^\u0621-\u064A\s]/g,' ').replace(/\s+/g,' ').trim();
function compare(expected,spoken){
  const orig=expected.split(/\s+/).filter(w=>norm(w)), e=orig.map(norm);
  const s=norm(spoken).split(' ').filter(Boolean);
  const n=e.length,m=s.length,L=Array.from({length:n+1},()=>new Array(m+1).fill(0));
  for(let i=n-1;i>=0;i--)for(let j=m-1;j>=0;j--)L[i][j]=e[i]===s[j]?L[i+1][j+1]+1:Math.max(L[i+1][j],L[i][j+1]);
  const ok=new Array(n).fill(false),used=new Array(m).fill(false);
  let i=0,j=0;
  while(i<n&&j<m){if(e[i]===s[j]){ok[i]=used[j]=true;i++;j++}else if(L[i+1][j]>=L[i][j+1])i++;else j++}
  return{words:orig.map((w,k)=>({w,ok:ok[k]})),extra:s.filter((_,k)=>!used[k]),pct:n?Math.round(100*ok.filter(Boolean).length/n):0};
}
const ymd=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const parse=s=>{const[a,b,c]=s.split('-').map(Number);return new Date(a,b-1,c)};
const weekOf=(start,today)=>Math.max(1,Math.floor(Math.round((parse(today)-parse(start))/864e5)/7)+1);
const weeksNeeded=pw=>Math.ceil(TOTAL/pw);
const planRange=(w,pw)=>{const a=(w-1)*pw+1;return a>TOTAL?null:[a,Math.min(TOTAL,w*pw)]};
function locate(starts,g){let k=0;for(let i=0;i<starts.length;i++)if(starts[i]<=g)k=i;return{s:k+1,a:g-starts[k]+1}}
function weekDays(start,w){const d=parse(start);d.setDate(d.getDate()+(w-1)*7);return Array.from({length:7},(_,i)=>{const x=new Date(d);x.setDate(x.getDate()+i);return ymd(x)})}
const CH={27:'morning',28:'sleep',25:'afterPrayer'};
function parseAdhkar(d,cat){const out=[];((d&&d.duas)||[]).forEach(x=>{const t=x.ar&&x.ar.text&&x.ar.text.trim();if(!t)return;const c=x.category||{};out.push({cat,text:t,count:x.repeatCount||null,source:'حصن المسلم — '+(c.ar||'')+' — رقم '+x.number+(x.source&&x.source.ar?' — '+x.source.ar:'')})});return out}
function parseHadith(d){const out=[];((d&&d.hadiths)||[]).forEach(h=>{const t=h.ar&&h.ar.text&&h.ar.text.trim();if(!t)return;const g=((h.ar.grades)||[]).concat((h.en&&h.en.grades)||[]);const grade=g.length?[...new Set(g.map(x=>x.grade+' ('+x.graded_by+')'))].join('، '):'';out.push({text:t,cat:'الأربعون القدسية',grade,source:'الأربعون القدسية — حديث رقم '+h.hadithNumber+' (sunnah.com عبر islamic.app)'})});return out}
function buildPages(q){const pages=[];q.forEach((s,si)=>s.ayahs.forEach((a,ai)=>{if(!a.p)return;const pg=pages[a.p]||(pages[a.p]=[]);let l=pg[pg.length-1];if(!l||l.s!==si){l={s:si,items:[]};pg.push(l)}l.items.push(ai)}));return pages}
const PM={egypt:{f:19.5,i:17.5},mwl:{f:18,i:17},makkah:{f:18.5,im:90},karachi:{f:18,i:18},isna:{f:15,i:15}};
const R=Math.PI/180,sn=d=>Math.sin(d*R),cs=d=>Math.cos(d*R),tn=d=>Math.tan(d*R),asn=x=>Math.asin(x)/R,acs=x=>Math.acos(x)/R,at2=(y,x)=>Math.atan2(y,x)/R,acot=x=>Math.atan(1/x)/R;
const fx=(a,b)=>{a=a-b*Math.floor(a/b);return a<0?a+b:a};
function julian(y,m,d){if(m<=2){y-=1;m+=12}const A=Math.floor(y/100),B=2-A+Math.floor(A/4);return Math.floor(365.25*(y+4716))+Math.floor(30.6001*(m+1))+d+B-1524.5}
function sunPos(jd){const D=jd-2451545.0,g=fx(357.529+0.98560028*D,360),q=fx(280.459+0.98564736*D,360),L=fx(q+1.915*sn(g)+0.020*sn(2*g),360),e=23.439-0.00000036*D,RA=fx(at2(cs(e)*sn(L),cs(L))/15,24);return{decl:asn(sn(e)*sn(L)),eq:q/15-RA}}
function prayerTimes(date,lat,lng,tz,opt){opt=opt||{};const M=PM[opt.method]||PM.egypt,jd0=julian(date.getFullYear(),date.getMonth()+1,date.getDate())-lng/(15*24);
  const sp=t=>sunPos(jd0+t),mid=t=>fx(12-sp(t).eq,24);
  const ang=(a,t,ccw)=>{const dc=sp(t).decl,v=(-sn(a)-sn(dc)*sn(lat))/(cs(dc)*cs(lat));if(v<-1||v>1)return NaN;return mid(t)+(ccw?-1:1)*acs(v)/15};
  const asr=(f,t)=>ang(-acot(f+tn(Math.abs(lat-sp(t).decl))),t);
  const T={fajr:ang(M.f,5/24,true),sunrise:ang(0.833,6/24,true),dhuhr:mid(12/24),asr:asr(opt.asr||1,13/24),maghrib:ang(0.833,18/24)};
  T.isha=M.im?T.maghrib+M.im/60:ang(M.i,18/24);const add=tz-lng/15;for(const k in T)T[k]+=add;return T}
function qibla(lat,lng){const p=21.4225,l=39.8262-lng;return fx(at2(sn(l),cs(lat)*tn(p)-sn(lat)*cs(l)),360)}
const api={prayerTimes,qibla,buildPages,CH,parseAdhkar,parseHadith,TOTAL,norm,compare,ymd,weekOf,weeksNeeded,planRange,locate,weekDays};
if(typeof module!=='undefined')module.exports=api;else root.Core=api;
})(this);
