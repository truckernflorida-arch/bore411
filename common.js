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

/* ---- Location -> screening point (Census 2024 Gazetteer internal points, /fl-geo.json) ---- */
function geoCandidates(loc,G){const o0=String(loc||'').toLowerCase();let s=' '+String(loc||'').toLowerCase().replace(/\s+/g,' ')+' ';const out=[],seen=new Set();
 const rx=n=>n.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/ /g,'\\s?');
 const cn=Object.keys(G.counties).sort((a,b)=>b.length-a.length),cHits=[];
 for(const n of cn){const r=new RegExp('\\b'+rx(n)+'(?=\\s*(?:county|counties|co\\b|(?:&|and|,)\\s*[a-z. -]+\\s(?:county|counties|co\\b)))','i');const m=s.match(r);if(m){cHits.push(n);s=s.replace(r,' ')}}
 s=s.replace(/\b(county|counties|co\.)/g,' ');
 const pn=Object.keys(G.places).filter(n=>n.length>3).sort((a,b)=>b.length-a.length);
 for(const n of pn){const r=new RegExp('(^|[^a-z])'+rx(n)+'(?![a-z])','i');if(r.test(s)){s=s.replace(r,'$1 ');if(!seen.has('p'+n)){seen.add('p'+n);out.push({i:o0.indexOf(n.toLowerCase()),label:n+' (town center)',lat:G.places[n][0],lon:G.places[n][1]})}}}
 for(const n of cHits)out.push({label:n+' County (county center)',lat:G.counties[n][0],lon:G.counties[n][1]});
 out.sort((a,b)=>a.i-b.i);return out}
/* ---- USDA NRCS Soil Data Access (SSURGO) point query ---- */
const SDA='https://sdmdataaccess.sc.egov.usda.gov/Tabular/post.rest';
function sdaQuery(q){return fetch(SDA,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({format:'JSON+COLUMNNAME',query:q})}).then(r=>{if(!r.ok)throw new Error('SDA '+r.status);return r.json()}).then(j=>{const t=j.Table||[];const h=t[0]||[];return t.slice(1).map(r=>Object.fromEntries(h.map((k,i)=>[k,r[i]])))})}
function soilAt(lat,lon){lat=+lat;lon=+lon;if(!isFinite(lat)||!isFinite(lon)||lat<24||lat>31.1||lon<-87.7||lon>-79.8)return Promise.reject(new Error('Point is outside Florida'));
 const pt=`point(${lon.toFixed(5)} ${lat.toFixed(5)})`,sub=`SELECT * FROM SDA_Get_Mukey_from_intersection_with_WktWgs84('${pt}')`;
 return Promise.all([sdaQuery(`SELECT mu.mukey, mu.muname, l.areaname, a.wtdepannmin, a.brockdepmin, a.drclassdcd, a.flodfreqdcd, a.hydgrpdcd FROM mapunit mu INNER JOIN legend l ON l.lkey=mu.lkey LEFT JOIN muaggatt a ON a.mukey=mu.mukey WHERE mu.mukey IN (${sub})`),
  sdaQuery(`SELECT c.mukey, c.compname, c.comppct_r, c.drainagecl, c.hydgrp, c.taxorder FROM component c WHERE c.majcompflag='Yes' AND c.mukey IN (${sub}) ORDER BY c.comppct_r DESC`)]).then(([mu,co])=>mu.map(m=>Object.assign(m,{comps:co.filter(c=>c.mukey===m.mukey)})))}
const cmFt=cm=>cm==null||cm===''?null:(cm/30.48).toFixed(1);

/* ---- Florida Geological Survey subsidence incident reports (FDEP open data, ArcGIS REST) ---- */
const FGS='https://ags.dep.state.fl.us/arcgis/rest/services/OpenData/FGS_SUBSIDENCE/MapServer/0/query';
const FGS_FIELDS='REF_NUM,EVENT_DATE,TRUE_SINK,LATDD,LONGDD,SINLNGTH,SINWIDTH,SINDEPTH,COUNTY,ACCURACY'; // no owner/reporter fields
function miles(a,b,c,d){const R=3958.8,r=x=>x*Math.PI/180,dl=r(c-a),dn=r(d-b),h=Math.sin(dl/2)**2+Math.cos(r(a))*Math.cos(r(c))*Math.sin(dn/2)**2;return 2*R*Math.asin(Math.min(1,Math.sqrt(h)))}
function fgsGet(params){const u=FGS+'?'+new URLSearchParams(Object.assign({f:'json'},params));return fetch(u).then(r=>{if(!r.ok)throw new Error('FGS '+r.status);return r.json()}).then(j=>{if(j.error)throw new Error('FGS '+(j.error.message||'error'));return j})}
/* Reports within `radius` miles of a point, sorted by distance, plus database last-revised date. */
function sinkAt(lat,lon,radius=10){lat=+lat;lon=+lon;if(!isFinite(lat)||!isFinite(lon)||lat<24||lat>31.1||lon<-87.7||lon>-79.8)return Promise.reject(new Error('Point is outside Florida'));
 const geo={geometry:lon.toFixed(5)+','+lat.toFixed(5),geometryType:'esriGeometryPoint',inSR:'4326',spatialRel:'esriSpatialRelIntersects',distance:String(radius),units:'esriSRUnit_StatuteMile',where:'1=1'};
 return Promise.all([fgsGet(Object.assign({},geo,{outFields:FGS_FIELDS,returnGeometry:'false',resultRecordCount:'1000'})),
  fgsGet({where:'1=1',outStatistics:JSON.stringify([{statisticType:'max',onStatisticField:'EVENT_DATE',outStatisticFieldName:'m'},{statisticType:'count',onStatisticField:'OBJECTID',outStatisticFieldName:'n'}])}).catch(()=>null)])
 .then(([j,st])=>{const R=(j.features||[]).map(f=>f.attributes).filter(a=>isFinite(a.LATDD)&&isFinite(a.LONGDD)).map(a=>Object.assign(a,{mi:miles(lat,lon,a.LATDD,a.LONGDD)})).filter(a=>a.mi<=radius+0.05).sort((x,y)=>x.mi-y.mi);
  const sa=st&&st.features&&st.features[0]?st.features[0].attributes:{};const g=k=>sa[k]!=null?sa[k]:sa[k.toUpperCase()];
  const cnt=r=>R.filter(a=>a.mi<=r).length;
  return {radius,reports:R,within:{1:cnt(1),3:cnt(3),5:cnt(5),[radius]:R.length},verified:R.filter(a=>a.TRUE_SINK==='Y').length,capped:(j.features||[]).length>=1000||!!j.exceededTransferLimit,revised:g('m')||null,total:g('n')||null}})}
const fgsDate=ms=>ms==null?null:new Date(ms).toLocaleDateString('en-US',{timeZone:'UTC',year:'numeric',month:'short',day:'numeric'});

const API={geoCandidates,soilAt,sinkAt,miles,fgsDate,cmFt,RIG,rigClass,rigFor,esc,leadId,dueOf,fmtET,holidays,isBiz,earliestDig,ticketExpiry,lastCallDay,pretty,ymd,parse};
if(typeof module!=='undefined')module.exports=API;else G.B411=API;
})(this);
