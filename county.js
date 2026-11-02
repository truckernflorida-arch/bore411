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
sp.innerHTML=C.pts.map((p,i)=>`<option value="${i}">${esc(p[0])}</option>`).join('');
const v=x=>x==null||x===''?'—':esc(x);
function run(){const p=C.pts[+sp.value];if(!p)return;const [lab,lat,lon]=p;
so.innerHTML='<p class="mut">Asking USDA Soil Data Access…</p>';ko.innerHTML='<p class="mut">Asking Florida Geological Survey…</p>';
B.soilAt(lat,lon).then(M=>{if(!M.length){so.innerHTML='<p class="mut">No mapped soil unit at that point.</p>';return}
so.innerHTML=M.map(m=>{const wt=B.cmFt(m.wtdepannmin),rk=B.cmFt(m.brockdepmin);return `<div class="tbl"><table><tr><th colspan="2">${esc(m.muname)}<div class="mut" style="font-weight:400">${esc(m.areaname||'')} · map unit ${esc(m.mukey)} · ${esc(lab)} (${lat.toFixed(4)}, ${lon.toFixed(4)})</div></th></tr>
<tr><td>Major soils</td><td>${m.comps.length?m.comps.map(c=>`${esc(c.compname)} ${v(c.comppct_r)}%`).join('<br>'):'—'}</td></tr>
<tr><td>Drainage class</td><td>${v(m.drclassdcd)}</td></tr><tr><td>Hydrologic soil group</td><td>${v(m.hydgrpdcd)}</td></tr>
<tr><td>Shallowest annual water table</td><td>${wt?wt+' ft ('+esc(m.wtdepannmin)+' cm)':'None reported within 200 cm'}</td></tr>
<tr><td>Depth to bedrock</td><td>${rk?rk+' ft ('+esc(m.brockdepmin)+' cm)':'None reported within 200 cm'}</td></tr>
<tr><td>Flooding frequency</td><td>${v(m.flodfreqdcd)}</td></tr></table></div>`}).join('')+`<p class="mut" style="font-size:.8rem">Source: USDA NRCS Soil Data Access (SSURGO), live query ${esc(new Date().toLocaleDateString('en-US'))}. One point only; soils change across a bore path.</p>`})
.catch(e=>{so.innerHTML='<p class="mut">Soil lookup failed ('+esc(e.message)+'). Try again later or use <a href="https://websoilsurvey.nrcs.usda.gov/" target="_blank" rel="noopener">Web Soil Survey</a>.</p>'});
B.sinkAt(lat,lon,10).then(r=>{const w=r.within;ko.innerHTML=`<div class="tbl"><table><tr><th colspan="2">Reported subsidence incidents near ${esc(lab)}</th></tr>
<tr><td>Within 1 mile</td><td><b>${w[1]}</b></td></tr><tr><td>Within 3 miles</td><td><b>${w[3]}</b></td></tr><tr><td>Within 5 miles</td><td><b>${w[5]}</b></td></tr><tr><td>Within 10 miles</td><td><b>${w[10]}</b>${r.capped?' (1,000+; list capped)':''}</td></tr>
<tr><td>Field-verified sinkholes (10 mi)</td><td>${r.verified}</td></tr></table></div><p class="mut" style="font-size:.8rem">Source: Florida Geological Survey Subsidence Incident Reports (FDEP open data), live query ${esc(new Date().toLocaleDateString('en-US'))}${r.revised?'; newest reported event '+esc(B.fgsDate(r.revised)):''}. Most reports are not field-checked, and no reports is not a clearance.</p>`})
.catch(e=>{ko.innerHTML='<p class="mut">Sinkhole lookup failed ('+esc(e.message)+'). See <a href="https://floridadep.gov/fgs/sinkholes" target="_blank" rel="noopener">FGS sinkholes</a>.</p>'})}
sp.addEventListener('change',run);run()})();
