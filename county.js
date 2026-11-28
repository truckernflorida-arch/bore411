/* Bore411 county landing pages: live leads + soil/sinkhole screening for window.CTY. Needs common.js (B411). */
(function(){const B=B411,esc=B.esc,C=window.CTY;if(!C)return;const rx=new RegExp(C.rx,'i');
const card=(l,now,extra)=>{const d=B.dueOf(l)?new Date(B.dueOf(l)):null,days=d?(d-now)/864e5:null,href='/bid.html?id='+encodeURIComponent(B.leadId(l)),rc=B.rigClass(l);
return `<div class="card"><span class="tag">${l.type==='bid'?'Public bid':'Sub work'}</span><a class="tag rig r-${rc}" href="/rigs.html" title="Estimated from the scope text. Rough estimate.">${B.RIG[rc]}${rc==='check'?'':' (est.)'}</a>${l.bid?`<span class="mut">#${esc(l.bid)}</span>`:''}
<h3><a href="${href}" style="color:var(--txt);text-decoration:none">${esc(l.title)}</a></h3><div class="mut">${esc(l.agency)} · ${esc(l.location)}${extra?' · '+extra:''}</div><p>${esc(l.scope)}</p>
<div class="due ${days!==null&&days<7?'soon':''}">${l.type==='bid'?'Due':'Open until'}: ${d?B.fmtET(d):'Ongoing'}</div><p style="margin:8px 0 0"><a href="${href}">Bid package →</a></p></div>`};
const cl=document.getElementById('cl'),nl=document.getElementById('nl');
Promise.all([fetch('/leads.json').then(r=>r.json()),fetch('/fl-geo.json').then(r=>r.json())]).then(([L,G])=>{const now=new Date(),t=l=>B.dueOf(l)?new Date(B.dueOf(l)).getTime():9e15;
const open=L.filter(l=>!B.dueOf(l)||new Date(B.dueOf(l))>now).sort((a,b)=>t(a)-t(b));
const txt=l=>[l.title,l.agency,l.location,l.scope].join(' . ');const inC=open.filter(l=>rx.test(txt(l)));
cl.innerHTML=inC.length?inC.map(l=>card(l,now)).join(''):`<p class="mut">No open leads name ${esc(C.name)} County today. The board updates every morning; <a href="/#alerts">get alerts</a> or see nearby work below.</p>`;
const near=[];for(const l of open){if(inC.includes(l))continue;const c=B.geoCandidates(l.location,G)[0];if(!c)continue;const mi=B.miles(C.lat,C.lon,c.lat,c.lon);if(mi<=C.radius)near.push([l,mi])}
near.sort((a,b)=>a[1]-b[1]);
nl.innerHTML=near.length?near.map(([l,mi])=>card(l,now,'about '+Math.round(mi)+' mi from the county center')).join(''):`<p class="mut">No other open leads within ${C.radius} miles today. <a href="/#leads">See all Florida leads</a>.</p>`})
.catch(()=>{cl.innerHTML=nl.innerHTML='<p class="mut">Leads failed to load. <a href="/#leads">Try the home page</a>.</p>'});
const sp=document.getElementById('pt'),so=document.getElementById('soilout'),ko=document.getElementById('sinkout');
const kg=ko&&ko.closest('.grid');if(kg&&!document.getElementById('envout'))kg.insertAdjacentHTML('afterend','<div class="card" style="margin-top:14px"><h3>Flood zone &amp; wetlands (FEMA / USFWS)</h3><p class="mut" style="font-size:.85rem"><b>Screening-level, not a flood zone determination or wetland delineation.</b> Town or county center, not a job site.</p><div id="envout" aria-live="polite"></div></div>');
const eo=document.getElementById('envout');
const eg=document.getElementById('envout');if(eg&&!document.getElementById('roadout'))eg.closest('.card').insertAdjacentHTML('afterend','<div class="card" style="margin-top:14px"><h3>Road owner &amp; traffic (FDOT)</h3><p class="mut" style="font-size:.85rem"><b>Screening-level, not a right-of-way survey.</b> Roads within 1,000 ft of the town or county center (not a job site): state or county/city road, route numbers, traffic, lanes and speed.</p><div id="roadout" aria-live="polite"></div></div>');
const ro=document.getElementById('roadout');
if(ro&&!document.getElementById('geoout'))ro.closest('.card').insertAdjacentHTML('afterend','<div class="card" style="margin-top:14px"><h3>Geology &amp; rock (FGS)</h3><p class="mut" style="font-size:.85rem"><b>Screening-level, not a geotechnical report.</b> Mapped geologic unit, near-surface rock or sediment, sinkhole type and favorability, and nearby FGS wells with logs, at the town or county center (not a job site).</p><div id="geoout" aria-live="polite"></div></div>');
const go=document.getElementById('geoout');
if(go&&!document.getElementById('contout'))go.closest('.card').insertAdjacentHTML('afterend','<div class="card" style="margin-top:14px"><h3>Contamination &amp; cleanup sites (FDEP)</h3><p class="mut" style="font-size:.85rem"><b>Screening-level, not an environmental site assessment.</b> Open, active or on-hold FDEP cleanup sites (leaking petroleum tanks, drycleaners, PFAS, brownfields, Superfund) within 1/2 mile of the town or county center (not a job site).</p><div id="contout" aria-live="polite"></div></div>');
const co=document.getElementById('contout');
if(co&&!document.getElementById('utilout'))co.closest('.card').insertAdjacentHTML('afterend','<div class="card" style="margin-top:14px"><h3>Buried &amp; overhead hazards (electric &amp; pipelines)</h3><p class="mut" style="font-size:.85rem"><b>Screening-level, not a locate.</b> Mapped high-voltage electric transmission lines and major gas, petroleum, HGL and crude pipelines within 1/2 mile of the town or county center (not a job site). Distribution and service lines are not shown. Always call Sunshine 811.</p><div id="utilout" aria-live="polite"></div></div>');
const uo=document.getElementById('utilout');
if(uo&&!document.getElementById('railout'))uo.closest('.card').insertAdjacentHTML('afterend','<div class="card" style="margin-top:14px"><h3>Railroads &amp; rail crossings (FRA)</h3><p class="mut" style="font-size:.85rem"><b>Screening-level, not a survey or a railroad permit.</b> Mapped rail lines and FRA-inventoried rail crossings within 1 mile of the town or county center (not a job site), plus CSX\'s published utility crossing rules when a CSX line is close.</p><div id="railout" aria-live="polite"></div></div>');
const rlo=document.getElementById('railout');
sp.innerHTML=C.pts.map((p,i)=>`<option value="${i}">${esc(p[0])}</option>`).join('');
const v=x=>x==null||x===''?'—':esc(x);
function run(){const p=C.pts[+sp.value];if(!p)return;const [lab,lat,lon]=p;
so.innerHTML='<p class="mut">Asking USDA Soil Data Access…</p>';ko.innerHTML='<p class="mut">Asking Florida Geological Survey…</p>';
if(go){go.innerHTML='<p class="mut">Asking Florida Geological Survey…</p>';B.geoHtml(lat,lon,lab).then(h=>{go.innerHTML=h}).catch(e=>{go.innerHTML='<p class="mut">FGS geology lookup failed ('+esc(e.message)+').</p>'})}
if(uo){uo.innerHTML='<p class="mut">Asking HIFLD and EIA…</p>';B.utilHtml(lat,lon,lab).then(h=>{uo.innerHTML=h}).catch(e=>{uo.innerHTML='<p class="mut">Utility hazard lookup failed ('+esc(e.message)+').</p>'})}
if(rlo){rlo.innerHTML='<p class="mut">Asking FRA / BTS…</p>';B.railHtml(lat,lon,lab).then(h=>{rlo.innerHTML=h}).catch(e=>{rlo.innerHTML='<p class="mut">Railroad lookup failed ('+esc(e.message)+').</p>'})}
if(co){co.innerHTML='<p class="mut">Asking FDEP…</p>';B.contamHtml(lat,lon,lab).then(h=>{co.innerHTML=h}).catch(e=>{co.innerHTML='<p class="mut">FDEP contamination lookup failed ('+esc(e.message)+').</p>'})}
if(ro){ro.innerHTML='<p class="mut">Asking FDOT…</p>';B.roadHtml(lat,lon,lab).then(h=>{ro.innerHTML=h}).catch(e=>{ro.innerHTML='<p class="mut">FDOT road lookup failed ('+esc(e.message)+').</p>'})}
if(eo){eo.innerHTML='<p class="mut">Asking FEMA and USFWS…</p>';B.envHtml(lat,lon,lab).then(h=>{eo.innerHTML=h}).catch(e=>{eo.innerHTML='<p class="mut">Flood and wetlands lookup failed ('+esc(e.message)+').</p>'})}
B.soilAt(lat,lon).then(M=>{if(!M.length){so.innerHTML='<p class="mut">No mapped soil unit at that point.</p>';return}
so.innerHTML=M.map(m=>{const wt=B.cmFt(m.wtdepannmin),rk=B.cmFt(m.brockdepmin);return `<div class="tbl"><table><caption>${esc(m.muname)}<div class="mut" style="font-weight:400">${esc(m.areaname||'')} · map unit ${esc(m.mukey)} · ${esc(lab)} (${lat.toFixed(4)}, ${lon.toFixed(4)})</div></caption>
<tr><td>Major soils</td><td>${m.comps.length?m.comps.map(c=>`${esc(c.compname)} ${v(c.comppct_r)}%`).join('<br>'):'—'}</td></tr>
<tr><td>Drainage class</td><td>${v(m.drclassdcd)}</td></tr><tr><td>Hydrologic soil group</td><td>${v(m.hydgrpdcd)}</td></tr>
<tr><td>Shallowest annual water table</td><td>${wt?wt+' ft ('+esc(m.wtdepannmin)+' cm)':'None reported within 200 cm'}</td></tr>
<tr><td>Depth to bedrock</td><td>${rk?rk+' ft ('+esc(m.brockdepmin)+' cm)':'None reported within 200 cm'}</td></tr>
<tr><td>Flooding frequency</td><td>${v(m.flodfreqdcd)}</td></tr></table></div>`}).join('')+`<p class="mut" style="font-size:.8rem">Source: USDA NRCS Soil Data Access (SSURGO), live query ${esc(new Date().toLocaleDateString('en-US'))}. One point only; soils change across a bore path.</p>`})
.catch(e=>{so.innerHTML='<p class="mut">Soil lookup failed ('+esc(e.message)+'). USDA Soil Data Access may be down for maintenance. Try again later or use <a href="https://websoilsurvey.nrcs.usda.gov/" target="_blank" rel="noopener">Web Soil Survey</a>.</p>'});
B.sinkAt(lat,lon,10).then(r=>{const w=r.within;ko.innerHTML=`<div class="tbl"><table><caption>Reported subsidence incidents near ${esc(lab)}</caption>
<tr><td>Within 1 mile</td><td><b>${w[1]}</b></td></tr><tr><td>Within 3 miles</td><td><b>${w[3]}</b></td></tr><tr><td>Within 5 miles</td><td><b>${w[5]}</b></td></tr><tr><td>Within 10 miles</td><td><b>${w[10]}</b>${r.capped?' (1,000+; list capped)':''}</td></tr>
<tr><td>Field-verified sinkholes (10 mi)</td><td>${r.verified}</td></tr></table></div><p class="mut" style="font-size:.8rem">Source: Florida Geological Survey Subsidence Incident Reports (FDEP open data), live query ${esc(new Date().toLocaleDateString('en-US'))}${r.revised?'; newest reported event '+esc(B.fgsDate(r.revised)):''}. Most reports are not field-checked, and no reports is not a clearance.</p>`})
.catch(e=>{ko.innerHTML='<p class="mut">Sinkhole lookup failed ('+esc(e.message)+'). See <a href="https://floridadep.gov/fgs/sinkholes" target="_blank" rel="noopener">FGS sinkholes</a>.</p>'})}
sp.addEventListener('change',run);run();
/* Bid sources card (bids.js), inserted after the leads section. */
(function(){const ls=document.getElementById('leads');if(!ls||document.getElementById('bidsrc'))return;const sc=document.createElement('script');sc.src='/bids.js';sc.onload=()=>{const D=window.B411BIDS;if(!D)return;const L=D.forCounty(C.k);if(!L.length)return;
ls.insertAdjacentHTML('afterend','<section id="bidsrc"><h2>Where '+esc(C.name)+' County work gets posted</h2><p class="mut">The official bid portals for the county and its main cities. Register on them to get the agency\'s own notices. Links checked '+esc(D.checked)+'.</p><div class="grid two">'+L.map(D.card).join('')+'</div><p class="mut" style="margin-top:10px">FDOT lettings, state agencies, water districts and the other 13 counties: <a href="/bids.html#g-'+esc(C.k)+'">all bid sources</a>.</p></section>')};document.head.appendChild(sc)})();
})();
