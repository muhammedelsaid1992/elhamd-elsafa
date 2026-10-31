const C=require('./core.js'),a=require('assert');
a.equal(C.norm('بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ'),'بسم الله الرحمن الرحيم');
let r=C.compare('الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ','الحمد لله رب العالمين');a.equal(r.pct,100);
r=C.compare('الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ','الحمد رب العالمين زيادة');a.equal(r.pct,75);a.deepEqual(r.extra,['زياده']);a.equal(r.words[1].ok,false);
a.equal(C.weeksNeeded(120),52);a.deepEqual(C.planRange(52,120),[6121,6236]);a.equal(C.planRange(53,120),null);
a.equal(C.weekOf('2026-10-26','2026-10-31'),1);a.equal(C.weekOf('2026-10-24','2026-10-31'),2);
const st=[1,8,294];a.deepEqual(C.locate(st,8),{s:2,a:1});a.deepEqual(C.locate(st,300),{s:3,a:7});
a.equal(C.weekDays('2026-10-26',1)[6],'2026-11-01');
console.log('core tests OK');
