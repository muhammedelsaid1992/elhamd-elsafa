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
const api={TOTAL,norm,compare,ymd,weekOf,weeksNeeded,planRange,locate,weekDays};
if(typeof module!=='undefined')module.exports=api;else root.Core=api;
})(this);
