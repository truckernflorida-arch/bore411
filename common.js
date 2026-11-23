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

/* ---- FEMA National Flood Hazard Layer + USFWS National Wetlands Inventory (public ArcGIS REST, no key; both allow browser CORS). Checked 2026-11-18. ---- */
const NFHL='https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer',NWI='https://fwspublicservices.wim.usgs.gov/wetlandsmapservice/rest/services/Wetlands/MapServer/0/query';
const inFL=(lat,lon)=>isFinite(lat)&&isFinite(lon)&&lat>=24&&lat<=31.1&&lon>=-87.7&&lon<=-79.8;
function agsGet(u,params,tag){return fetch(u+'?'+new URLSearchParams(Object.assign({f:'json',where:'1=1',returnGeometry:'false'},params))).then(r=>{if(!r.ok)throw new Error(tag+' '+r.status);return r.json()}).then(j=>{if(j.error)throw new Error(tag+' '+(j.error.message||'error'));return {rows:(j.features||[]).map(f=>f.attributes),more:!!j.exceededTransferLimit}})}
function ptq(lat,lon,m){const q={geometry:lon.toFixed(5)+','+lat.toFixed(5),geometryType:'esriGeometryPoint',inSR:'4326',spatialRel:'esriSpatialRelIntersects'};if(m){q.distance=String(m);q.units='esriSRUnit_Meter'}return q}
/* FEMA flood zone(s) at a point, distinct zones within `ft` feet, and the FIRM panel. */
function floodAt(lat,lon,ft=1000){lat=+lat;lon=+lon;if(!inFL(lat,lon))return Promise.reject(new Error('Point is outside Florida'));const Z='FLD_ZONE,ZONE_SUBTY,SFHA_TF,STATIC_BFE,V_DATUM,DEPTH',L=NFHL+'/28/query';
 return Promise.all([agsGet(L,Object.assign(ptq(lat,lon),{outFields:Z}),'FEMA'),agsGet(L,Object.assign(ptq(lat,lon,(ft*0.3048).toFixed(1)),{outFields:Z,resultRecordCount:'300'}),'FEMA'),agsGet(NFHL+'/3/query',Object.assign(ptq(lat,lon),{outFields:'FIRM_PAN,EFF_DATE,PANEL_TYP'}),'FEMA').catch(()=>({rows:[]}))])
 .then(([a,n,p])=>{const seen={},zones=[];for(const z of n.rows){const k=z.FLD_ZONE+'|'+(z.ZONE_SUBTY||'');if(!seen[k]){seen[k]=1;zones.push(z)}}
  const ua={},at=a.rows.filter(z=>{const k=z.FLD_ZONE+'|'+(z.ZONE_SUBTY||'')+'|'+z.STATIC_BFE;return ua[k]?false:(ua[k]=1)});
  return {ft,at,zones,sfhaAt:at.some(z=>z.SFHA_TF==='T'),sfhaNear:n.rows.some(z=>z.SFHA_TF==='T'),panel:p.rows[0]||null}})}
/* NWI wetland and deepwater polygons at a point and within `ft` feet, grouped by type. */
function wetAt(lat,lon,ft=1000){lat=+lat;lon=+lon;if(!inFL(lat,lon))return Promise.reject(new Error('Point is outside Florida'));const F='ATTRIBUTE,WETLAND_TYPE';
 return Promise.all([agsGet(NWI,Object.assign(ptq(lat,lon),{outFields:F}),'NWI'),agsGet(NWI,Object.assign(ptq(lat,lon,(ft*0.3048).toFixed(1)),{outFields:F,resultRecordCount:'500'}),'NWI')])
 .then(([a,n])=>{const g={};for(const w of n.rows){const t=w.WETLAND_TYPE||'Unclassified';(g[t]=g[t]||{type:t,n:0,codes:new Set()}).n++;if(w.ATTRIBUTE)g[t].codes.add(w.ATTRIBUTE)}
  return {ft,at:a.rows,types:Object.values(g).sort((x,y)=>y.n-x.n),count:n.rows.length,capped:n.more||n.rows.length>=500}})}
/* Screening card body (HTML) for both lookups; each source fails on its own. */
function envHtml(lat,lon,lab){lat=+lat;lon=+lon;const ft=1000,day=new Date().toLocaleDateString('en-US'),pt=esc(lab)+' ('+lat.toFixed(4)+', '+lon.toFixed(4)+')';
 const zl=z=>'<b>'+esc(z.FLD_ZONE)+'</b>'+(z.ZONE_SUBTY?' ('+esc(String(z.ZONE_SUBTY).toLowerCase())+')':'');
 const fl=floodAt(lat,lon,ft).then(f=>{const bfe=f.at.filter(z=>z.STATIC_BFE!=null&&z.STATIC_BFE>-9000),dep=f.at.filter(z=>z.DEPTH!=null&&z.DEPTH>-9000),p=f.panel;
  return `<div class="tbl"><table><caption>FEMA flood zone at ${pt}</caption>
<tr><td>Flood zone at the point</td><td>${f.at.length?f.at.map(zl).join('<br>'):'No zone mapped in the NFHL here'}</td></tr>
<tr><td>Special Flood Hazard Area (1%-annual-chance flood)</td><td><b>${f.sfhaAt?'Yes':'No'}</b> at the point · <b>${f.sfhaNear?'Yes':'No'}</b> within ${ft.toLocaleString('en-US')} ft</td></tr>
${bfe.length?`<tr><td>Base flood elevation</td><td>${bfe.map(z=>esc(z.STATIC_BFE)+' ft'+(z.V_DATUM?' ('+esc(z.V_DATUM)+')':'')).join(', ')}</td></tr>`:''}${dep.length?`<tr><td>Flood depth (zone AO)</td><td>${dep.map(z=>esc(z.DEPTH)+' ft').join(', ')}</td></tr>`:''}
<tr><td>Zones within ${ft.toLocaleString('en-US')} ft</td><td>${f.zones.length?f.zones.map(zl).join('<br>'):'—'}</td></tr>
<tr><td>FIRM panel</td><td>${p?esc(p.FIRM_PAN)+(p.EFF_DATE?', effective '+esc(fgsDate(p.EFF_DATE)):''):'—'}</td></tr></table></div>`+
  (f.sfhaAt||f.sfhaNear?`<p class="mut" style="font-size:.85rem"><b>Special Flood Hazard Area at or near this point.</b> Under National Flood Insurance Program rules, "development" includes excavation or drilling operations and storage of equipment or materials (<a href="https://www.ecfr.gov/current/title-44/chapter-I/subchapter-B/part-59/subpart-A/section-59.1" target="_blank" rel="noopener">44 CFR 59.1</a>), and participating communities must require permits for development in Zone A areas (<a href="https://www.ecfr.gov/current/title-44/chapter-I/subchapter-B/part-60/subpart-A/section-60.3" target="_blank" rel="noopener">44 CFR 60.3(b)(1)</a>). Ask the county or city floodplain administrator whether your ROW permit covers pits, spoil and staging.</p>`:'')})
 .catch(e=>'<p class="mut">FEMA flood lookup failed ('+esc(e.message)+'). Try again later or use the <a href="https://msc.fema.gov/portal/home" target="_blank" rel="noopener">FEMA Flood Map Service Center</a>.</p>');
 const wt=wetAt(lat,lon,ft).then(w=>{const at=w.at.length?w.at.map(x=>esc(x.WETLAND_TYPE||'Unclassified')+' ('+esc(x.ATTRIBUTE||'')+')').join('<br>'):'Not inside a mapped NWI polygon';
  return `<div class="tbl"><table><caption>Mapped wetlands &amp; water within ${ft.toLocaleString('en-US')} ft (NWI)</caption>
<tr><td>At the point</td><td>${at}</td></tr>
${w.types.length?'<tr><th>Type</th><th>Polygons (NWI codes)</th></tr>'+w.types.map(t=>`<tr><td>${esc(t.type)}</td><td>${t.n}${w.capped?'+':''} <span class="mut">(${[...t.codes].slice(0,6).map(esc).join(', ')}${t.codes.size>6?', …':''})</span></td></tr>`).join(''):'<tr><td>Within '+ft.toLocaleString('en-US')+' ft</td><td>No mapped NWI wetland or water polygons</td></tr>'}</table></div>`+
  (w.count||w.at.length?`<p class="mut" style="font-size:.85rem"><b>Wetlands or surface water mapped near this point.</b> If pits, the bore path or drilling fluid could reach wetlands or surface waters, ask FDEP or the water management district whether an <a href="https://floridadep.gov/water/submerged-lands-environmental-resources-coordination/content/environmental-resource-permitting" target="_blank" rel="noopener">Environmental Resource Permit</a> or exemption applies (<a href="https://flrules.org/gateway/ChapterHome.asp?Chapter=62-330" target="_blank" rel="noopener">Ch. 62-330, F.A.C.</a>), and plan how you will contain an inadvertent return (frac-out).</p>`:'')})
 .catch(e=>'<p class="mut">Wetlands lookup failed ('+esc(e.message)+'). Try again later or use the <a href="https://www.fws.gov/program/national-wetlands-inventory/wetlands-mapper" target="_blank" rel="noopener">USFWS Wetlands Mapper</a>.</p>');
 return Promise.all([fl,wt]).then(([a,b])=>a+b+`<p class="mut" style="font-size:.8rem">Live query ${esc(day)}. Sources: <a href="https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer" target="_blank" rel="noopener">FEMA National Flood Hazard Layer</a> (official answer: the effective FIRM at the <a href="https://msc.fema.gov/portal/home" target="_blank" rel="noopener">Flood Map Service Center</a>) and <a href="https://www.fws.gov/program/national-wetlands-inventory/wetlands-mapper" target="_blank" rel="noopener">USFWS National Wetlands Inventory</a>, which maps wetlands by a biological definition and, per USFWS, does not show the extent of wetlands regulated under federal, state or local law. Polygon counts include every mapped piece that touches the ${ft.toLocaleString('en-US')} ft circle around the point.</p>`)}

/* FDOT road ownership & traffic near a point (FDOT TDA open data, Roadway Characteristics Inventory). */
const TDA='https://services1.arcgis.com/O1JpcwDW8sjYuddV/ArcGIS/rest/services/',TDAL=n=>TDA+n+'_TDA/FeatureServer/0';
function tdaGet(n,params){return fetch(TDAL(n)+'/query?'+new URLSearchParams(Object.assign({f:'json',where:'1=1',returnGeometry:'true',outSR:'4326',geometryPrecision:'6',maxAllowableOffset:'0.00003',resultRecordCount:'60'},params))).then(r=>{if(!r.ok)throw new Error('FDOT '+r.status);return r.json()}).then(j=>{if(j.error)throw new Error('FDOT '+(j.error.message||'error'));return j.features||[]})}
function lineFt(lat,lon,g){const kx=364567.2*Math.cos(lat*Math.PI/180),ky=364567.2;let best=Infinity;for(const p of (g&&g.paths)||[])for(let i=0;i<p.length;i++){const ax=(p[i][0]-lon)*kx,ay=(p[i][1]-lat)*ky;if(i===0){best=Math.min(best,Math.hypot(ax,ay));continue}
 const bx=(p[i-1][0]-lon)*kx,by=(p[i-1][1]-lat)*ky,dx=ax-bx,dy=ay-by,L=dx*dx+dy*dy,t=L?Math.max(0,Math.min(1,-(bx*dx+by*dy)/L)):0;best=Math.min(best,Math.hypot(bx+t*dx,by+t*dy))}return best}
function roadAt(lat,lon,ft=1000){lat=+lat;lon=+lon;if(!inFL(lat,lon))return Promise.reject(new Error('Point is outside Florida'));const q=f=>Object.assign(ptq(lat,lon,(ft*0.3048).toFixed(1)),{outFields:f});
 const sys=n=>tdaGet(n,q('ROADWAY,ROAD_STATU,COUNTY,DISTRICT'));
 return Promise.all([sys('On_System'),sys('Off_System')]).then(([on,off])=>{const R={};
  for(const [fs,shs] of [[on,true],[off,false]])for(const f of fs){const a=f.attributes,d=lineFt(lat,lon,f.geometry),k=a.ROADWAY;if(!R[k]||d<R[k].ft)R[k]={id:k,ft:d,shs,status:a.ROAD_STATU,county:a.COUNTY,district:a.DISTRICT}}
  const roads=Object.values(R).filter(r=>isFinite(r.ft)).sort((a,b)=>a.ft-b.ft).slice(0,6);if(!roads.length)return {ft,roads};
  const w='ROADWAY IN ('+roads.map(r=>"'"+String(r.id).replace(/[^0-9A-Za-z]/g,'')+"'").join(',')+')';
  const L=[['State_Roads','ROADWAY,ROUTE','sr'],['US_Routes','ROADWAY,ROUTE','us'],['County_Roads','ROADWAY,ROUTE','cr'],['Roadways_With_Local_Name','ROADWAY,NAME','name'],['Annual_Average_Daily_Traffic','ROADWAY,YEAR_,AADT,DESC_FRM,DESC_TO','aadt'],['Number_Of_Lanes','ROADWAY,ROAD_SIDE,LANE_CNT','lanes'],['Maximum_Speed_Limit','ROADWAY,ROAD_SIDE,SPEED','speed'],['Maintenance_Boundary','ROADWAY,NAME','mnt']];
  return Promise.all(L.map(([n,f,key])=>tdaGet(n,Object.assign(q(f),{where:w})).then(fs=>{for(const r of roads){let b=null,bs={};for(const x of fs){const a=x.attributes;if(a.ROADWAY!==r.id)continue;const d=lineFt(lat,lon,x.geometry);
    if(a.ROAD_SIDE){const s=a.ROAD_SIDE;if(!bs[s]||d<bs[s].d)bs[s]={d,a}}else if(!b||d<b.d)b={d,a}}
r[key]=b?b.a:(Object.keys(bs).length?bs:null)}}).catch(()=>{for(const r of roads)r[key]=undefined})))
  .then(()=>({ft,roads}))})}
const RST={'02':'Active on the State Highway System','12':'Active on the SHS (combination)','09':'Active, off the State Highway System','17':'Active off exclusive','07':'Active exclusive'};
/* RCI maintenance unit names are cut at 20 characters; expand a cut last word. */
const mntName=n=>String(n).trim().replace(/\bOPERATIONS? C\w*$/,'OPERATIONS CENTER').replace(/\bOPERA\w*$/,'OPERATIONS').replace(/\bMAINT\w*$/,'MAINTENANCE').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
function roadHtml(lat,lon,lab){lat=+lat;lon=+lon;const day=new Date().toLocaleDateString('en-US'),pt=esc(lab)+' ('+lat.toFixed(4)+', '+lon.toFixed(4)+')';
 const rt=s=>s?esc(String(s).replace(/\s+/g,' ')):'',sides=(o,f)=>{if(!o)return '—';if(o[f]!=null)return esc(o[f]);const m=Object.values(o).reduce((x,y)=>!x||(y&&y.d<x.d)?y:x,null);if(m&&m.a.ROAD_SIDE==='C')return esc(m.a[f]);const e=Object.entries(o).filter(([s,v])=>s!=='C'&&v&&v.a[f]!=null).sort((x,y)=>x[0]<y[0]?-1:1).map(([s,v])=>[s,v.a]);return e.length?e.map(([s,a])=>esc(a[f])+(s==='C'?'':' ('+({L:'left',R:'right'}[s]||esc(s))+' side)')).join(', '):'—'};
 return roadAt(lat,lon).then(r=>{if(!r.roads.length)return `<p>No FDOT-inventoried road within ${r.ft.toLocaleString('en-US')} ft of ${pt}.</p><p class="mut" style="font-size:.85rem">FDOT's inventory covers state roads and many county and city roads, not every local, subdivision or private road. Confirm ownership with the county or city.</p>`;
  const anyS=r.roads.some(x=>x.shs),near=r.roads[0];
  const rows=r.roads.map(x=>{const nm=x.name&&x.name.NAME?esc(x.name.NAME):'',nk=nm.replace(/\s/g,'').toUpperCase(),names=[x.us&&rt(x.us.ROUTE),x.sr&&rt(x.sr.ROUTE),x.cr&&rt(x.cr.ROUTE)].filter(v=>v&&v.replace(/\s/g,'').toUpperCase()!==nk).join(' / ');
   const own=x.shs?'<b>State (FDOT)</b>':'Off the state system <span class="mut">(county or city)</span>',ad=x.aadt?esc(Number(x.aadt.AADT).toLocaleString('en-US'))+' <span class="mut">('+esc(x.aadt.YEAR_)+')</span>':'—';
   return `<tr><td>${nm||names||'Roadway '+esc(x.id)}${nm&&names?'<div class="mut">'+names+'</div>':''}<div class="mut" style="font-size:.8rem">FDOT roadway ID ${esc(x.id)}</div></td><td>${Math.round(x.ft).toLocaleString('en-US')} ft</td><td>${own}${x.shs&&x.mnt&&x.mnt.NAME?'<div class="mut" style="font-size:.8rem">FDOT D'+esc(x.district)+' maintenance: '+esc(mntName(x.mnt.NAME))+'</div>':''}</td><td>${ad}</td><td>${sides(x.lanes,'LANE_CNT')}</td><td>${x.speed?sides(x.speed,'SPEED')+' mph':'—'}</td></tr>`}).join('');
  return `<div class="tbl"><table><caption>Roads within ${r.ft.toLocaleString('en-US')} ft of ${pt}, nearest first</caption><tr><th>Road</th><th>Distance</th><th>System</th><th>Traffic (AADT)</th><th>Lanes</th><th>Max speed</th></tr>${rows}</table></div>`+
  (near.shs?`<p style="margin:10px 0"><b>Nearest road is on the State Highway System.</b> Utility work in FDOT right-of-way needs an FDOT utility permit (<a href="https://www.flrules.org/gateway/ruleno.asp?id=14-46.001" target="_blank" rel="noopener">Rule 14-46.001, F.A.C.</a>), applied for through <a href="https://osp.fdot.gov/" target="_blank" rel="noopener">One Stop Permitting</a>. Cover and bore rules: <a href="/marks.html">FDOT Utility Accommodation Manual figures</a>. FDOT contract bores: <a href="/fdot-bore.html">Section 555 desk</a>.</p>`:`<p style="margin:10px 0"><b>Nearest road is off the State Highway System</b>, so the county or city is the usual permitting agency: see the <a href="/permits.html">county ROW cheat sheets</a>.${anyS?' A state road is also within '+r.ft.toLocaleString('en-US')+' ft: if the bore path crosses or runs along it, that part needs an FDOT permit through <a href="https://osp.fdot.gov/" target="_blank" rel="noopener">One Stop Permitting</a> (<a href="https://www.flrules.org/gateway/ruleno.asp?id=14-46.001" target="_blank" rel="noopener">Rule 14-46.001</a>).':''}</p>`)+
  `<p class="mut" style="font-size:.8rem">Live query ${esc(day)}. Source: <a href="https://gis-fdot.opendata.arcgis.com/" target="_blank" rel="noopener">FDOT Transportation Data &amp; Analytics open data</a> (Roadway Characteristics Inventory: on/off State Highway System, state, U.S. and county route numbers, local names, lanes, maximum speed limit, maintenance area; Traffic Characteristics Inventory: AADT = annual average daily traffic, year shown). FDOT says the inventory reflects the most recent survey and may not match current conditions. "County or city" is our reading of "off the State Highway System"; some of those roads are private, toll-authority or other agency roads. Traffic, lanes and speed are for planning maintenance of traffic, not a traffic control plan. Distances are straight-line from the point to the road centerline.</p>`})
 .catch(e=>'<p class="mut">FDOT road lookup failed ('+esc(e.message)+'). Try again later or use the county GIS map.</p>')}
/* ---- Florida Geological Survey geology at a point (FDEP open data ArcGIS REST, no key, browser CORS open). Checked 2026-11-20. ----
   FGS_PUBLIC/MapServer: 9 STATEMAP Geology (1:24,000), 6 Stratigraphic Geology (statewide), 0 Environmental Geology (rock & sediment), 5 Sinkhole Types (Map Series 110, 1985).
   FGS_FAV_SINK_FORMATION/ImageServer: sinkhole favorability (Weights of Evidence), pixel value -> REL_FAV via rasterAttributeTable.
   FGS_WELLS/MapServer/0: FGS core & cuttings repository wells. Well names and owner/driller fields are never requested (names can be private people). */
const FGSD='https://ags.dep.state.fl.us/arcgis/rest/services/OpenData',FGSP=FGSD+'/FGS_PUBLIC/MapServer',FAV=FGSD+'/FGS_FAV_SINK_FORMATION/ImageServer',FGW=FGSD+'/FGS_WELLS/MapServer/0/query';
let favRat=null;
function favAt(lat,lon){const g=JSON.stringify({x:+lon.toFixed(5),y:+lat.toFixed(5),spatialReference:{wkid:4326}}),J=u=>fetch(u).then(r=>{if(!r.ok)throw new Error('FGS '+r.status);return r.json()}).then(j=>{if(j.error)throw new Error('FGS '+(j.error.message||'error'));return j});
 favRat=favRat||J(FAV+'/rasterAttributeTable?f=json').then(j=>{const m={};for(const f of j.features||[])m[f.attributes.VALUE]=f.attributes.REL_FAV;return m}).catch(e=>{favRat=null;throw e});
 return Promise.all([J(FAV+'/identify?'+new URLSearchParams({f:'json',geometry:g,geometryType:'esriGeometryPoint',returnGeometry:'false',returnCatalogItems:'false'})),favRat]).then(([i,m])=>{const v=parseInt(i.value,10);return isFinite(v)&&m[v]?{value:v,cls:m[v]}:null})}
function geoAt(lat,lon,wellMi=3){lat=+lat;lon=+lon;if(!inFL(lat,lon))return Promise.reject(new Error('Point is outside Florida'));const at=(L,f)=>agsGet(FGSP+'/'+L+'/query',Object.assign(ptq(lat,lon),{outFields:f}),'FGS').then(r=>r.rows[0]||null);
 const W='OBJECTID,BOREHOLE_NUMBER,TOTAL_DEPTH,DRILL_YEAR,BOREHOLE_TYPE,FGS_LITHOLOG_AVAIL,DRILLERS_LOG_AVAIL,HYDROGEOLOGIST_LOG_AVAIL,FIELD_LITHOLOGY_AVAIL,REPORT_LINK,LATITUDE_DECIMAL_DEGREES,LONGITUDE_DECIMAL_DEGREES,ACCURACY,DATA_CONFIDENTIAL_INDICATOR';
 const wq=Object.assign(ptq(lat,lon,(wellMi*1609.344).toFixed(0)),{outFields:W,resultRecordCount:'500'});
 const S=x=>x.catch(e=>({err:e.message}));
 return Promise.all([S(at(9,'NAME,DESCRIPTION,LITHOLOGY,GEOLOGIC_HISTORY,SOURCE')),S(at(6,'GEOLOGICUNITNAME,GEOLOGICUNITCODE,LITHOLOGY,GEOLOGICHISTORY')),S(at(0,'CATEGORY')),S(at(5,'AREA_DESC,DESC_1,DESC_2')),S(favAt(lat,lon)),
  S(agsGet(FGW,wq,'FGS wells').then(r=>{const R=r.rows.filter(a=>a.DATA_CONFIDENTIAL_INDICATOR!=='Y'&&isFinite(a.LATITUDE_DECIMAL_DEGREES)&&isFinite(a.LONGITUDE_DECIMAL_DEGREES)).map(a=>Object.assign(a,{mi:miles(lat,lon,a.LATITUDE_DECIMAL_DEGREES,a.LONGITUDE_DECIMAL_DEGREES)})).filter(a=>a.mi<=wellMi+0.05).sort((x,y)=>x.mi-y.mi);return {mi:wellMi,rows:R,more:r.more}}))])
 .then(([sm,st,env,typ,fav,wells])=>({statemap:sm,strat:st,env,type:typ,fav,wells}))}
const ROCK=/limestone|dolostone|dolomite|dolomitic|chert/i;
function geoHtml(lat,lon,lab){lat=+lat;lon=+lon;const day=new Date().toLocaleDateString('en-US'),pt=esc(lab)+' ('+lat.toFixed(4)+', '+lon.toFixed(4)+')',cap=s=>s?esc(String(s).toLowerCase().replace(/^./,c=>c.toUpperCase())):'—',bad=x=>x&&x.err;
 return geoAt(lat,lon).then(g=>{const sm=bad(g.statemap)?null:g.statemap,st=bad(g.strat)?null:g.strat,env=bad(g.env)?null:g.env,ty=bad(g.type)?null:g.type,fav=bad(g.fav)?null:g.fav,w=bad(g.wells)?null:g.wells;
  if([g.statemap,g.strat,g.env,g.type,g.fav,g.wells].every(bad))throw new Error(g.statemap.err);
  const unit=sm?esc(sm.NAME):st?esc(st.GEOLOGICUNITNAME)+(st.GEOLOGICUNITCODE?' <span class="mut">('+esc(st.GEOLOGICUNITCODE)+')</span>':''):'',lith=(sm&&sm.LITHOLOGY)||(st&&st.LITHOLOGY)||'',age=(sm&&sm.GEOLOGIC_HISTORY)||(st&&st.GEOLOGICHISTORY)||'';
  const rock=ROCK.test(lith)||(env&&/LIMESTONE|DOLOMITE/.test(env.CATEGORY||''));
  const und=sm&&/^(Qu|Qbd)\b|undifferentiated/i.test(sm.NAME||'');
  const wl=w?w.rows.filter(a=>a.FGS_LITHOLOG_AVAIL==='Y'||a.DRILLERS_LOG_AVAIL==='Y'||a.HYDROGEOLOGIST_LOG_AVAIL==='Y'||a.FIELD_LITHOLOGY_AVAIL==='Y'):[];
  const logs=a=>[a.FGS_LITHOLOG_AVAIL==='Y'&&'FGS lithologic',a.DRILLERS_LOG_AVAIL==='Y'&&"driller's",a.HYDROGEOLOGIST_LOG_AVAIL==='Y'&&'hydrogeologist',a.FIELD_LITHOLOGY_AVAIL==='Y'&&'field lithology'].filter(Boolean).join(', ')||'none listed';
  const top=(wl.length?wl:(w?w.rows:[])).slice(0,5);
  return `<div class="tbl"><table><caption>Mapped geology at ${pt}</caption>
<tr><td>Geologic unit at or near the surface</td><td>${unit?'<b>'+unit+'</b>':'No unit mapped here'}${sm?'<div class="mut" style="font-size:.8rem">FGS STATEMAP, 1:24,000</div>':st?'<div class="mut" style="font-size:.8rem">FGS statewide geologic map (no 1:24,000 STATEMAP polygon here)</div>':''}</td></tr>
<tr><td>Lithology</td><td>${lith?esc(lith):'—'}${age?' <span class="mut">('+cap(age)+')</span>':''}</td></tr>
${sm&&sm.DESCRIPTION?`<tr><td>FGS description</td><td><details><summary>Read FGS unit description</summary><p style="font-size:.85rem;margin:6px 0">${esc(sm.DESCRIPTION)}</p></details></td></tr>`:''}
<tr><td>Near-surface rock &amp; sediment</td><td>${env?cap(env.CATEGORY):'—'} <span class="mut" style="font-size:.8rem">(FGS environmental geology, statewide)</span></td></tr>
<tr><td>Sinkhole type area</td><td>${ty?'<b>'+esc(ty.AREA_DESC)+'</b>: '+esc(ty.DESC_1||'')+(ty.DESC_2?'<div class="mut" style="font-size:.85rem">'+esc(ty.DESC_2)+'</div>':''):'—'}</td></tr>
<tr><td>Geology favorable to sinkhole formation</td><td>${fav?'<b>'+esc(fav.cls)+'</b> <span class="mut" style="font-size:.8rem">(FGS model class, 4 classes from least to most favorable)</span>':'—'}</td></tr>
</table></div>`+
  (rock?`<p style="margin:10px 0"><b>Mapped rock in the near-surface unit.</b> FGS maps limestone, dolostone or chert in the unit or near-surface sediment here. Ask the owner for soil borings or a geotechnical report, and price the chance of rock tooling and slower production, before you lock in a per-foot price.</p>`:'')+
  (und?`<p class="mut" style="font-size:.85rem">FGS maps undifferentiated sediments where more than 20 ft of them cover the first recognizable unit, so a typical shallow bore here may stay in sand and clay; borings still govern.</p>`:'')+
  (w?(w.rows.length?`<p class="mut" style="margin:10px 0 4px">FGS repository wells within ${w.mi} miles: <b>${w.rows.length}${w.more?'+':''}</b>, ${wl.length} with a lithologic or driller's log on file. Nearest${wl.length?' with a log':''}:</p><div class="tbl"><table><tr><th>FGS W-number</th><th>Distance</th><th>Total depth</th><th>Drilled</th><th>Logs on file</th></tr>${top.map(a=>`<tr><td style="white-space:nowrap">${a.REPORT_LINK&&/^https:\/\/geodes\.kyrasolutions\.com\//.test(a.REPORT_LINK)?'<a href="'+esc(a.REPORT_LINK)+'" target="_blank" rel="noopener">W-'+esc(a.BOREHOLE_NUMBER)+'</a>':'W-'+esc(a.BOREHOLE_NUMBER)}</td><td>${a.mi.toFixed(1)} mi</td><td>${a.TOTAL_DEPTH!=null?esc(Number(a.TOTAL_DEPTH).toLocaleString('en-US'))+' ft':'—'}</td><td>${a.DRILL_YEAR?esc(a.DRILL_YEAR):'—'}</td><td>${logs(a)}</td></tr>`).join('')}</table></div><p class="mut" style="font-size:.8rem">The W-number opens the public FGS GeoDES borehole summary (sample depths and log entries). FGS says about 60% of repository well locations have been verified, and many come from old paper records. Well names, owners and drillers are not shown.</p>`:`<p class="mut" style="margin-top:8px">No FGS repository wells within ${w.mi} miles.</p>`):`<p class="mut">FGS well lookup failed (${esc(g.wells.err)}).</p>`)+
  `<p class="mut" style="font-size:.8rem">Live query ${esc(day)}. Sources: Florida Geological Survey via <a href="https://geodata.dep.state.fl.us/" target="_blank" rel="noopener">FDEP Geospatial Open Data</a>: <a href="${FGSP}/9" target="_blank" rel="noopener">STATEMAP Geology</a> (1:24,000; FGS maps the first recognizable unit within 20 ft of the surface), <a href="${FGSP}/6" target="_blank" rel="noopener">Stratigraphic Geology</a>, <a href="${FGSP}/0" target="_blank" rel="noopener">Environmental Geology - Rock and Sediment Distribution</a> (published 2001), <a href="${FGSP}/5" target="_blank" rel="noopener">Sinkhole Types</a> (Sinclair &amp; Stewart, 1985, FGS Map Series 110), <a href="${FAV}" target="_blank" rel="noopener">Favorability of Sinkhole Formation</a> (FGS Weights of Evidence model), <a href="${FGSD}/FGS_WELLS/MapServer/0" target="_blank" rel="noopener">FGS Wells</a>. Map polygons are generalized; geology changes along a bore path. The rock note is a Bore411 reading of the mapped lithology, not an FGS finding.</p>`})
 .catch(e=>'<p class="mut">FGS geology lookup failed ('+esc(e.message)+'). Try again later or see <a href="https://floridadep.gov/fgs" target="_blank" rel="noopener">Florida Geological Survey</a>.</p>')}
/* ---- FDEP contamination & cleanup sites near a point (FDEP open data ArcGIS REST, no key, browser CORS open). Checked 2026-11-23. ----
   CLEANUP_SP/MapServer/0 "DEP Cleanup Sites" = the Contamination Locator Map list (open, active or on-hold sites only; STCM petroleum + ERIC waste cleanup).
   DWM_STCM/MapServer/2 PCTS petroleum discharges (cleanup status per discharge), CLEANUP_SP/MapServer/8 ERIC (cleanup phase), BROWNFIELD_AREAS/MapServer/0.
   Operator, phone, staff and manager fields are never requested. */
const DEPC=FGSD+'/CLEANUP_SP/MapServer',DEPT=FGSD+'/DWM_STCM/MapServer/2/query',DEPB=FGSD+'/BROWNFIELD_AREAS/MapServer/0/query';
const CCAT={PETRO:'Petroleum (storage tank discharge)',PFAS:'PFAS',OTHCU:'Waste cleanup',BROWN:'Brownfield site',FED:'Federal facility',SUPER:'Superfund (NPL)'};
function contamAt(lat,lon,mi=0.5){lat=+lat;lon=+lon;if(!inFL(lat,lon))return Promise.reject(new Error('Point is outside Florida'));
 const m=(mi*1609.344).toFixed(0),S=x=>x.catch(e=>({err:e.message}));
 const q=Object.assign(ptq(lat,lon,m),{outFields:'OBJECTID,BUSINESS_NAME,ADDRESS1,CITY,SOURCE_DATABASE_NAME,SOURCE_DATABASE_ID,CLCC_CLEANUP_CATEGORY_KEY,RSC2_REMEDIATION_STATUS_KEY,DOCUMENTS',returnGeometry:'true',outSR:'4326',resultRecordCount:'500'});
 const sites=fetch(DEPC+'/0/query?'+new URLSearchParams(Object.assign({f:'json',where:'1=1'},q))).then(r=>{if(!r.ok)throw new Error('FDEP '+r.status);return r.json()}).then(j=>{if(j.error)throw new Error('FDEP '+(j.error.message||'error'));
  const by={};for(const f of j.features||[]){const a=f.attributes,g=f.geometry;if(!g||!isFinite(g.x)||!isFinite(g.y))continue;const k=(a.SOURCE_DATABASE_NAME||'')+':'+(a.SOURCE_DATABASE_ID||a.OBJECTID);
   if(!by[k])by[k]={id:String(a.SOURCE_DATABASE_ID||''),db:a.SOURCE_DATABASE_NAME,name:a.BUSINESS_NAME,addr:[a.ADDRESS1,a.CITY].filter(Boolean).join(', '),status:a.RSC2_REMEDIATION_STATUS_KEY,docs:a.DOCUMENTS,cats:[],mi:miles(lat,lon,g.y,g.x)};
   const c=a.CLCC_CLEANUP_CATEGORY_KEY;if(c&&!by[k].cats.includes(c))by[k].cats.push(c)}
  return {rows:Object.values(by).filter(s=>s.mi<=mi+0.02).sort((x,y)=>x.mi-y.mi),more:!!j.exceededTransferLimit}});
 return sites.then(s=>{const pet=s.rows.filter(r=>r.db==='STCM'&&/^\d+$/.test(r.id)).slice(0,60).map(r=>r.id),er=s.rows.filter(r=>r.db==='ERIC'&&/^ERIC_\d+$/.test(r.id)).slice(0,60).map(r=>"'"+r.id+"'");
  return Promise.all([
   pet.length?S(agsGet(DEPT,{where:'FACILITY_ID IN ('+pet.join(',')+')',outFields:'FACILITY_ID,DISCHARGE_DATE,GENERAL_CLEANUP_STATUS',resultRecordCount:'1000'},'FDEP tanks')):{rows:[]},
   er.length?S(agsGet(DEPC+'/8/query',{where:'ERIC_ID IN ('+er.join(',')+')',outFields:'ERIC_ID,SITE_STATUS,SITE_PHASE_DSC',resultRecordCount:'200'},'FDEP ERIC')):{rows:[]},
   S(agsGet(DEPB,Object.assign(ptq(lat,lon),{outFields:'AREA_NAME,CITY'}),'FDEP brownfields')),
   S(agsGet(DEPB,Object.assign(ptq(lat,lon,(0.25*1609.344).toFixed(0)),{outFields:'AREA_NAME,CITY'}),'FDEP brownfields'))]).then(([pc,ec,b0,b1])=>{
   const P={},E={};for(const d of pc.rows||[]){const k=String(d.FACILITY_ID);(P[k]=P[k]||[]).push(d)}for(const e of ec.rows||[])E[e.ERIC_ID]=e;
   for(const r of s.rows){if(r.db==='STCM'&&P[r.id]){const open=P[r.id].filter(d=>d.GENERAL_CLEANUP_STATUS&&!/^(CLOSURE|NO CLEANUP REQUIRED)$/.test(d.GENERAL_CLEANUP_STATUS)),yrs=open.map(d=>d.DISCHARGE_DATE).filter(x=>x!=null).sort((a,b)=>a-b);
     r.stage=open.length?[...new Set(open.map(d=>d.GENERAL_CLEANUP_STATUS))].join(', ').toLowerCase()+(open.length>1?' ('+open.length+' open discharges)':''):'all listed discharges closed';r.since=yrs.length?new Date(yrs[0]).getUTCFullYear():null}
    if(r.db==='ERIC'&&E[r.id])r.stage=E[r.id].SITE_PHASE_DSC||E[r.id].SITE_STATUS}
   return {mi,sites:s.rows,more:s.more,detail:{tanks:pc.err||null,eric:ec.err||null},bfAt:b0.err?null:b0.rows,bfNear:b1.err?null:b1.rows,bfErr:b0.err||b1.err||null}})})}
function contamHtml(lat,lon,lab){lat=+lat;lon=+lon;const day=new Date().toLocaleDateString('en-US'),pt=esc(lab)+' ('+lat.toFixed(4)+', '+lon.toFixed(4)+')',FT=5280;
 const dist=x=>x*FT<1000?Math.round(x*FT/10)*10+' ft':x.toFixed(2)+' mi',nm=s=>/residen/i.test(s.name||'')?'<span class="mut">Private residence (name not shown)</span>':esc(s.name||'Unnamed site');
 const docOk=u=>u&&/^https:\/\/prodenv\.dep\.state\.fl\.us\/DepNexus\/public\//.test(u);
 return contamAt(lat,lon).then(c=>{const R=c.sites,n=f=>R.filter(s=>s.mi*FT<=f).length,top=R.slice(0,8),bfA=c.bfAt||[],bfN=c.bfNear||[];
  const close=R.filter(s=>s.mi*FT<=500).length;
  return `<div class="tbl"><table><caption>FDEP cleanup sites near ${pt}</caption>
<tr><td>Within 500 ft</td><td><b>${close}</b></td></tr><tr><td>Within 1/4 mile</td><td><b>${n(1320)}</b></td></tr><tr><td>Within 1/2 mile</td><td><b>${R.length}${c.more?'+':''}</b></td></tr>
<tr><td>Petroleum tank discharges (1/2 mi)</td><td>${R.filter(s=>s.cats.includes('PETRO')).length}</td></tr>
<tr><td>Other waste cleanup, PFAS, brownfield, federal or Superfund (1/2 mi)</td><td>${R.filter(s=>s.cats.some(x=>x!=='PETRO')).length}</td></tr>
<tr><td>Designated brownfield area</td><td>${c.bfAt===null?'<span class="mut">lookup failed</span>':bfA.length?'<b>Yes</b>: '+bfA.map(b=>esc(b.AREA_NAME)).join('; '):bfN.length?'Not at the point; within 1/4 mile: '+bfN.map(b=>esc(b.AREA_NAME)).join('; '):'None at the point or within 1/4 mile'}</td></tr>
</table></div>`+
  (top.length?`<p class="mut" style="margin:10px 0 4px">Nearest listed sites:</p><div class="tbl"><table><tr><th>Site</th><th>Distance</th><th>Type</th><th>Cleanup stage (FDEP)</th><th>FDEP file</th></tr>${top.map(s=>`<tr><td>${nm(s)}${s.addr&&!/residen/i.test(s.name||'')?'<div class="mut" style="font-size:.8rem">'+esc(s.addr)+'</div>':''}</td><td style="white-space:nowrap">${dist(s.mi)}</td><td>${s.cats.map(x=>esc(CCAT[x]||x)).join(', ')||'—'}</td><td>${s.stage?esc(s.stage.charAt(0).toUpperCase()+s.stage.slice(1)):esc(String(s.status||'—').toLowerCase())}${s.since?'<div class="mut" style="font-size:.8rem">oldest open discharge dated '+s.since+'</div>':''}</td><td>${docOk(s.docs)?'<a href="'+esc(s.docs)+'" target="_blank" rel="noopener">Documents</a>':'—'}</td></tr>`).join('')}</table></div>`:`<p class="mut" style="margin-top:8px">No open, active or on-hold FDEP cleanup sites listed within 1/2 mile.</p>`)+
  (close?`<p style="margin:10px 0"><b>Listed cleanup site within 500 ft.</b> Before you price the job, ask the owner or engineer whether contaminated soil or groundwater is expected on the bore path, and who tests, hauls and disposes of drilling returns and spoil from it. If you hit contaminated soil on an FDOT right of way, the FDOT Utility Accommodation Manual (2017, §3.12) says to stop work immediately and notify FDOT.</p>`:'')+
  (c.detail.tanks||c.detail.eric?`<p class="mut" style="font-size:.8rem">Some cleanup-stage details did not load (${esc(c.detail.tanks||c.detail.eric)}).</p>`:'')+
  `<p class="mut" style="font-size:.8rem">Live query ${esc(day)}. Sources: FDEP Division of Waste Management via <a href="https://geodata.dep.state.fl.us/" target="_blank" rel="noopener">FDEP Geospatial Open Data</a>: <a href="${DEPC}/0" target="_blank" rel="noopener">DEP Cleanup Sites</a> (the list behind FDEP's <a href="https://ca.dep.state.fl.us/mapdirect/?focus=contamlocator" target="_blank" rel="noopener">Contamination Locator Map</a>; open, active or on-hold sites only, closed sites are not listed), <a href="${FGSD}/DWM_STCM/MapServer/2" target="_blank" rel="noopener">Petroleum Contamination Monitoring discharges</a>, <a href="${DEPC}/8" target="_blank" rel="noopener">ERIC waste cleanup</a> and <a href="${FGSD}/BROWNFIELD_AREAS/MapServer/0" target="_blank" rel="noopener">Brownfield Areas</a>. "Documents" opens the site's public file in FDEP's document system. Distances are straight-line to the mapped site point (a point, not the extent of contamination). Cleanup standards: <a href="https://flrules.org/gateway/ChapterHome.asp?Chapter=62-780" target="_blank" rel="noopener">Ch. 62-780, F.A.C.</a> (Contaminated Site Cleanup Criteria). A site nearby does not mean contamination under your path, and no listing does not mean clean ground; the 500 ft flag is a Bore411 rule of thumb, not an FDEP or FDOT threshold.</p>`})
 .catch(e=>'<p class="mut">FDEP contamination lookup failed ('+esc(e.message)+'). Try again later or see FDEP\'s <a href="https://ca.dep.state.fl.us/mapdirect/?focus=contamlocator" target="_blank" rel="noopener">Contamination Locator Map</a>.</p>')}
/* County GIS map links (official county / state sites only). Checked 2026-11-01. blocked:true = site blocked our automated check (Cloudflare/firewall); link taken from the official site or search. Edit here only. */
const GIS={
desoto:{name:'DeSoto',links:[['DeSoto Property Appraiser GIS map','https://www.desotopa.com/gis/','Parcel map with search by parcel ID (assessment data, not a survey).'],['DeSoto County interactive map (Skyview)','https://skyview.hornershifrin.com/DesotoCoFL/','County-run interactive map linked from the county GIS page.'],['DeSoto County GIS Hub','https://desotocounty-dcms-gis.hub.arcgis.com/','County GIS hub with maps and data.']],src:['DeSoto County GIS page','https://desotobocc.com/269/Geographic-Information-System-GIS']},
charlotte:{name:'Charlotte',links:[['Charlotte County GIS (CCGIS)','https://agis.charlottecountyfl.gov/ccgis/','County interactive mapping site; county layers include hydrants, road centerlines, outfalls, ditches and engineering projects.']],src:['Charlotte County GIS page','https://www.charlottecountyfl.gov/gis/']},
hardee:{name:'Hardee',links:[['Hardee County InfoMap','https://experience.arcgis.com/experience/991bd3fbd52b4ea48fda046422d63283','County viewer for topo and land information; its map service includes a Utilities layer, owner parcels, elevations and flood zones.'],['Hardee Property Appraiser maps','https://hardeepa.com/maps/','Property Appraiser parcel maps.',true]],src:['Hardee County GIS page','https://www.hardeecountyfl.gov/departments-services/community-development/geographic-information-systems/']},
highlands:{name:'Highlands',links:[['Highlands County GIS Open Data','https://highlands-county-gis-open-data-hcbcc.hub.arcgis.com/','County GIS maps and data, linked from the county GIS &amp; Addressing page.'],['Highlands Property Appraiser GIS','https://www.hcpao.org/gis/','Parcel map with owner, sales and parcel search.',true]],src:['Highlands County GIS &amp; Addressing','https://www.highlandsfl.gov/departments/engineering/gis_addressing.php']},
sarasota:{name:'Sarasota',links:[['Sarasota County Enterprise GIS','https://data-sarco.opendata.arcgis.com/','County map portal: parcel lookup, planning/zoning, flood zones, half-section maps and benchmarks.'],['Sarasota County Utility Locator','https://experience.arcgis.com/experience/b6f8a5bc44e145c48b6d2e06189276cc','County utilities and private franchise service boundaries (service areas, not pipe locations).']],src:['Sarasota County Maps/GIS (redirects to the portal; blocked our automated check)','https://www.scgov.net/residents/maps']},
manatee:{name:'Manatee',links:[['Manatee County GIS interactive map gallery','https://www.mymanatee.org/services-and-amenities/service-listing/service-details/view-gis-interactive-maps-gallery','County gallery of interactive maps (property, aerials, zoning, road closures).'],['Manatee County Open Data interactive maps','https://public-manateegis.opendata.arcgis.com/pages/interactive-maps','County open-data list of interactive maps.']],src:['Manatee County GIS gallery','https://www.mymanatee.org/services-and-amenities/service-listing/service-details/view-gis-interactive-maps-gallery']},
lee:{name:'Lee',links:[['Lee County Maps and Apps','https://maps-leegis.hub.arcgis.com/','County GIS hub of maps and apps (property, zoning, flood, aerials).'],['Lee County GIS','https://www.leegov.com/gis','County GIS office page.',true]],src:['Lee County GIS','https://www.leegov.com/gis']},
glades:{name:'Glades',links:[['Glades County Property Appraiser (qPublic)','https://www.qpublic.net/fl/glades/search.html','Property Appraiser parcel search and map.']],src:['Glades County Property Appraiser','https://www.qpublic.net/fl/glades/search.html']},
hendry:{name:'Hendry',links:[['Hendry County, Florida GIS','https://gis.hendryfla.net/','County GIS site with maps and parcel data.'],['Hendry County Property Appraiser','https://hendryprop.com/','Property Appraiser site with parcel GIS search.',true]],src:['Hendry County GIS','https://gis.hendryfla.net/']},
polk:{name:'Polk',links:[['Polk County GIS portal','https://gis.polkfl.gov/portal/home/','County GIS portal (the old gis.polk-county.net viewer now redirects here).'],['Polk County Public Data Portal','https://polk-county-geoportal-open-data-polk-bocc-gis.hub.arcgis.com/','County open GIS data and maps.']],src:['Polk County GIS redirect notice','https://gis.polk-county.net/portal/apps/mapviewer/index.html']},
hillsborough:{name:'Hillsborough',links:[['Hillsborough County Map Viewer','https://hcfl.gov/businesses/zoning/hillsborough-county-map-viewer','County map viewer: find parcels and run reports on zoning, flood zone and future land use (50+ data sources).'],['Hillsborough County GeoHub','https://hcfl.gov/about-hillsborough/open-data-and-gis/geohub','County open GIS data and maps.']],src:['Hillsborough County Map Viewer','https://hcfl.gov/businesses/zoning/hillsborough-county-map-viewer'],checked:'Nov 21, 2026'},
pinellas:{name:'Pinellas',links:[['Pinellas County Enterprise GIS','https://new-pinellas-egis.opendata.arcgis.com/','County GIS site with public maps and data (linked from the county\'s Find Maps page).'],['Pinellas County EGIS applications','https://egis.pinellas.gov/apps/egis/apps.html','List of the county\'s public web map applications.']],src:['Pinellas County Find Maps (GIS)','https://pinellas.gov/services/maps-gis/'],checked:'Nov 21, 2026'},
collier:{name:'Collier',links:[['Collier County GIS Hub','https://hub-collierbcc.opendata.arcgis.com/','County open GIS data and maps.'],['Growth Management GIS Hub','https://gis-colliercountygmd.hub.arcgis.com/','Growth Management maps (addressing, flood maps, zoning, land use).']],src:['Collier County GIS Hub','https://hub-collierbcc.opendata.arcgis.com/'],checked:'Nov 21, 2026'},
okeechobee:{name:'Okeechobee',links:[['Okeechobee County GIS (Property Appraiser)','https://search.okeechobeepa.com/map','Property Appraiser parcel map.']],src:['Okeechobee County Property Appraiser','https://www.okeechobeepa.com/'],checked:'Nov 21, 2026'},
fdot:{name:'FDOT (state roads)',links:[['FDOT Open Data Hub','https://gis-fdot.opendata.arcgis.com/','Statewide roadway GIS layers: state roads, interstates, route/milepost (LRS), lanes, traffic sites.'],['FDOT GIS (Transportation Data &amp; Analytics)','https://www.fdot.gov/statistics/gis/default.shtm','Downloadable statewide basemap and roadway shapefiles.']],src:['FDOT Transportation Data &amp; Analytics GIS','https://www.fdot.gov/statistics/gis/default.shtm']}};
function gisHtml(k){const c=GIS[k];if(!c)return '';return '<ul>'+c.links.map(x=>'<li><a href="'+x[1]+'" target="_blank" rel="noopener">'+x[0]+'</a>: '+x[2]+(x[3]?' <span class="mut">(site blocked our automated check)</span>':'')+'</li>').join('')+'</ul><p class="src" style="font-size:.8rem">Source: <a href="'+c.src[1]+'" target="_blank" rel="noopener">'+c.src[0]+'</a>. Checked '+(c.checked||'Nov 1, 2026')+'.</p>'}

const API={GIS,gisHtml,geoCandidates,soilAt,sinkAt,floodAt,wetAt,envHtml,roadAt,roadHtml,geoAt,geoHtml,favAt,contamAt,contamHtml,miles,fgsDate,cmFt,RIG,rigClass,rigFor,esc,leadId,dueOf,fmtET,holidays,isBiz,earliestDig,ticketExpiry,lastCallDay,pretty,ymd,parse};
if(typeof module!=='undefined')module.exports=API;else G.B411=API;
})(this);
