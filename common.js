/* Bore411 shared helpers (no build step). */
(function(G){
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
/* Stable id derived from existing fields (bid # + agency, else title + agency). */
function leadId(l){const key=((l.bid||l.title||'')+'|'+(l.agency||'')).toLowerCase().trim();
 let h=2166136261;for(let i=0;i<key.length;i++){h^=key.charCodeAt(i);h=Math.imul(h,16777619)>>>0}
 const slug=(l.bid||l.title||'lead').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40);
 return slug+'-'+h.toString(36).slice(0,5)}
function dueOf(l){return l.due||l.open_until||null}
function fmtET(d){return d.toLocaleString('en-US',{timeZone:'America/New_York',weekday:'short',month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'})+' ET'}

/* ---- Sunshine 811 business-day logic (F.S. 556.105) ----
   Holidays = the days Sunshine 811 lists as closed (sunshine811.com/holidays):
   New Year's, MLK Day, Memorial Day, Independence Day, Labor Day, Thanksgiving,
   Friday after Thanksgiving, Christmas Eve, Christmas Day.
   Fixed-date holidays on Sat are observed Fri, on Sun observed Mon (federal practice;
   matches Sunshine 811 closing Fri Jul 3 2026). */
const pad=n=>String(n).padStart(2,'0');
const ymd=d=>d.getUTCFullYear()+'-'+pad(d.getUTCMonth()+1)+'-'+pad(d.getUTCDate());
const D=(y,m,d)=>new Date(Date.UTC(y,m,d));
const nthDow=(y,m,dow,n)=>{const f=D(y,m,1);return D(y,m,1+((dow-f.getUTCDay()+7)%7)+7*(n-1))};
const lastDow=(y,m,dow)=>{const l=D(y,m+1,0);return D(y,m,l.getUTCDate()-((l.getUTCDay()-dow+7)%7))};
const obs=d=>{const w=d.getUTCDay();return w===6?addDays(d,-1):w===0?addDays(d,1):d};
function addDays(d,n){return new Date(d.getTime()+n*864e5)}
function holidays(y){const t=nthDow(y,10,4,4);const L=[
 ['New Year\u2019s Day',obs(D(y,0,1))],['Martin Luther King Jr. Day',nthDow(y,0,1,3)],['Memorial Day',lastDow(y,4,1)],
 ['Independence Day',obs(D(y,6,4))],['Labor Day',nthDow(y,8,1,1)],['Thanksgiving Day',t],['Friday after Thanksgiving',addDays(t,1)]];
 const xe=D(y,11,24),xd=D(y,11,25);
 // Christmas Eve/Day: if Christmas is Sat, Fri 12/24 is observed for Christmas and Thu 12/23 for Eve;
 // if Christmas is Sun, Eve (Sat) observed Fri 12/23 and Christmas observed Mon 12/26; if Eve is Sun? (Christmas Mon) Eve observed Fri 12/22.
 const w=xd.getUTCDay();
 if(w===6){L.push(['Christmas Eve (observed)',D(y,11,23)],['Christmas Day (observed)',D(y,11,24)])}
 else if(w===0){L.push(['Christmas Eve (observed)',D(y,11,23)],['Christmas Day (observed)',D(y,11,26)])}
 else if(w===1){L.push(['Christmas Eve (observed)',D(y,11,22)],['Christmas Day',xd])}
 else L.push(['Christmas Eve',xe],['Christmas Day',xd]);
 return L.map(([n,d])=>({name:n,date:ymd(d)}))}
const hcache={};const isHol=d=>{const y=d.getUTCFullYear();if(!hcache[y])hcache[y]=new Set([...holidays(y-1),...holidays(y),...holidays(y+1)].map(h=>h.date));return hcache[y].has(ymd(d))};
const isBiz=d=>{const w=d.getUTCDay();return w!==0&&w!==6&&!isHol(d)};
const parse=s=>{const[a,b,c]=s.split('-').map(Number);return D(a,b-1,c)};
/* Notice given on a business day (during business hours). The notice day is not counted.
   Excavation may begin after `n` full business days have passed: i.e. the day after the nth business day. */
function effectiveNotice(d){while(!isBiz(d))d=addDays(d,1);return d} // after-hours/weekend notice = next business day
function earliestDig(callStr,n=2){let d=effectiveNotice(parse(callStr)),c=0;while(c<n){d=addDays(d,1);if(isBiz(d))c++}return ymd(addDays(d,1))}
/* Ticket valid 30 calendar days; notice day not counted; if last day is Sat/Sun/holiday, runs to next business day. */
function ticketExpiry(callStr){let d=addDays(effectiveNotice(parse(callStr)),30);while(!isBiz(d))d=addDays(d,1);return ymd(d)}
/* Latest business day you can call and still legally dig on startStr. */
function lastCallDay(startStr,n=2){let d=addDays(parse(startStr),-1);for(let i=0;i<60;i++){if(isBiz(d)&&earliestDig(ymd(d),n)<=startStr)return ymd(d);d=addDays(d,-1)}return null}
const pretty=s=>parse(s).toLocaleDateString('en-US',{timeZone:'UTC',weekday:'short',month:'short',day:'numeric',year:'numeric'});

/* ---- Estimated rig class from scope text (rule of thumb, see /rigs.html) ---- */
const RIG={small:'Small rig',mid:'Mid rig',large:'Large rig',maxi:'Maxi rig',check:'Check specs'};
function rigFor(d,len,water){ // d = largest pipe in inches (or null), len = LF (or null)
 if(water)return 'maxi';
 if(d==null)return null;
 if(d<=4)return (len&&len>1000)?'mid':'small';
 if(d<=6)return 'mid';
 if(d<=12)return (len&&len>1500)?'large':'mid';
 return 'large'}
function rigClass(l){const s=((l.title||'')+' . '+(l.scope||'')).toLowerCase().replace(/[–—]/g,'-');
 const water=/\b(river|intracoastal|waterway|bay crossing|canal crossing)\b/.test(s);
 let d=null;const re=/(\d{1,2}(?:\s*\/\s*\d{1,2})*)(?:\s*-\s*(\d{1,2}))?\s*(?:-|\s)?(?:in\b|inch|")/g;let m;
 while((m=re.exec(s))){const nums=m[1].split('/').map(Number);if(m[2])nums.push(+m[2]);for(const n of nums)if(n>0&&n<=60)d=Math.max(d||0,n)}
 let len=null;const lr=/([\d,]{2,7})\s*\+?\s*(?:lf|linear f)/g;while((m=lr.exec(s))){const n=+m[1].replace(/,/g,'');if(n>0)len=Math.min(len||9e9,n)}
 // len = shortest stated run (largest bore length usually unknown); conduit/fiber w/o size => small
 let c=rigFor(d,len,water);
 if(!c&&/\b(conduit|fiber|ftth|innerduct|service line|missile)\b/.test(s))c='small';
 return c||'check'}

const API={RIG,rigClass,rigFor,esc,leadId,dueOf,fmtET,holidays,isBiz,earliestDig,ticketExpiry,lastCallDay,pretty,ymd,parse};
if(typeof module!=='undefined')module.exports=API;else G.B411=API;
})(this);
