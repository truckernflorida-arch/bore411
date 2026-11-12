import json,re,subprocess,html
import os
R=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..')+'/'
P=open(R+'permits.html').read(); G=json.load(open(R+'fl-geo.json'))
gis=json.loads(subprocess.check_output(['node','-e',"const B=require('%scommon.js');const o={};for(const k in B.GIS)o[k]=B.gisHtml(k);console.log(JSON.stringify(o))"%R]))
# key, name, seat, FDOT area, regex (same as bid.html PC), towns for screening points
CT=[('desoto','DeSoto','Arcadia','09',r'\bde ?soto\b',['Arcadia']),
('charlotte','Charlotte','Punta Gorda','10',r'\bcharlotte\b|punta gorda|port charlotte',['Punta Gorda','Port Charlotte']),
('hardee','Hardee','Wauchula','09',r'\bhardee\b|wauchula',['Wauchula','Bowling Green','Zolfo Springs']),
('highlands','Highlands','Sebring','09',r'\bhighlands\b|sebring|avon park|lake placid',['Sebring','Avon Park','Lake Placid']),
('sarasota','Sarasota','Sarasota','10',r'\bsarasota\b|north port|venice',['Sarasota','North Port','Venice']),
('manatee','Manatee','Bradenton','10',r'\bmanatee\b|bradenton|palmetto',['Bradenton','Palmetto']),
('lee','Lee','Fort Myers','10',r'\blee county\b|\blee co\b|fort myers|cape coral|lehigh acres|bonita springs',['Fort Myers','Cape Coral','Lehigh Acres','Bonita Springs']),
('glades','Glades','Moore Haven','09',r'\bglades\b|moore haven',['Moore Haven']),
('hendry','Hendry','LaBelle','09',r'\bhendry\b|labelle|la belle|clewiston',['LaBelle','Clewiston']),
('polk','Polk','Bartow','08',r'\bpolk\b|lakeland|winter haven|bartow',['Bartow','Lakeland','Winter Haven'])]
AREA={'09':'Area 09 (inland: DeSoto, Glades, Hardee, Hendry, Highlands, Okeechobee)','10':'Area 10 (Gulf coast: Charlotte, Collier, Lee, Manatee, Sarasota)','08':'Area 08 (Tampa Bay / Central, including Polk)'}
head=re.search(r'<div class="apwa".*?</header></div>',P,re.S).group(0).replace(' class="on" href="/permits.html"',' href="/permits.html"')
foot=re.search(r'<footer>.*?</footer>',P,re.S).group(0)
def meta(title,desc,url):
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title><meta name="description" content="{desc}">
<link rel="canonical" href="{url}"><meta property="og:type" content="website"><meta property="og:site_name" content="Bore411"><meta property="og:title" content="{title}"><meta property="og:description" content="{desc}"><meta property="og:url" content="{url}"><meta property="og:image" content="https://bore411.com/images/hero-hdd-rig-v3.jpg"><meta property="og:image:width" content="1280"><meta property="og:image:height" content="720"><meta name="twitter:card" content="summary_large_image">
<link rel="stylesheet" href="/style.css"><style>.jump{{display:flex;flex-wrap:wrap;gap:6px;margin:12px 0 0}}.jump a{{font-size:.85rem;padding:4px 10px;border:1px solid var(--line);border-radius:6px;text-decoration:none}}.jump a.on{{border-color:var(--or)}}.card ul{{margin:6px 0 8px;padding-left:20px}}.card li{{margin:3px 0}}.src{{font-size:.8rem;color:var(--mut)}}</style></head><body>
'''
def jump(cur=None):
    return '<nav class="jump" aria-label="Other counties">'+''.join(f'<a{" class=\"on\" aria-current=\"page\"" if k==cur else ""} href="/county/{k}.html">{n}</a>' for k,n,*_ in CT)+'</nav>'
for k,n,seat,area,rx,towns in CT:
    i=P.index(f'<div class="card" id="{k}">'); j=P.index('</div>',i)+6
    pc=P[i:j].replace(f' id="{k}"','').replace(f'<h3>{n} County</h3>','<h3>Right-of-way permit cheat sheet</h3>')
    pts=[[f'{n} County (county center)']+G['counties'][n]]+[[t+' (town center)']+G['places'][t] for t in towns]
    cty=dict(k=k,name=n,rx=rx,lat=G['counties'][n][0],lon=G['counties'][n][1],radius=50,pts=pts)
    url=f'https://bore411.com/county/{k}.html'
    title=f'{n} County, FL HDD &amp; underground utility bids — Bore411'
    desc=f'Open directional drilling, boring and underground utility bids in and near {n} County, Florida ({seat}), with the county right-of-way permit route, GIS maps, FDOT price area, and live soil and sinkhole screening.'
    ld=json.dumps({"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Bore411","item":"https://bore411.com/"},{"@type":"ListItem","position":2,"name":"Counties","item":"https://bore411.com/counties.html"},{"@type":"ListItem","position":3,"name":f"{n} County","item":url}]})
    body=f'''{head}
<div class="wrap"><section style="border-top:0"><p class="mut"><a href="/counties.html">Counties</a> › {n} County</p>
<h1>HDD &amp; underground utility bids in {n} County, FL</h1>
<p class="mut">Open directional drilling, boring and trenching work in {n} County (county seat: {seat}) and within {cty['radius']} miles, plus where to pull the right-of-way permit, the county's public maps, the FDOT price area for bore and conduit work, and a live soil and sinkhole screen. Free; Bore411 does not bid work or take a cut.</p>
{jump(k)}
<div class="grid g3" style="margin-top:18px">
<div class="card"><h3>County seat</h3><p class="mut">{seat}</p></div>
<div class="card"><h3>State roads</h3><p class="mut">FDOT District One. Utility permits on state right-of-way go through <a href="https://osp.fdot.gov/" target="_blank" rel="noopener">One Stop Permitting</a>.</p></div>
<div class="card"><h3>FDOT price area</h3><p class="mut">Market {AREA[area]}. <a href="/benchmarks.html#swfl">Bore &amp; conduit averages</a></p></div>
<div class="card"><h3>Before you dig</h3><p class="mut">Call Sunshine 811 at least 2 full business days ahead (F.S. 556). <a href="/tools.html">811 dig-date calculator</a></p></div>
</div></section>
<section id="leads"><h2>Open leads in {n} County</h2><div id="cl" class="grid"><p class="mut">Loading leads…</p></div>
<h2 style="margin-top:28px">Nearby open leads (within {cty['radius']} miles)</h2><p class="mut">Distance is straight-line from the county center to the town or county named in each posting.</p><div id="nl" class="grid"><p class="mut">Loading…</p></div></section>
<section id="permit"><h2>Permits and maps</h2><div class="warn"><b>Informational only.</b> Not legal advice. Confirm with the permitting office before you bid or start work. Cities usually permit their own streets. County maps are not locates; your Sunshine 811 ticket and field verification govern.</div>
<div class="grid two" style="margin-top:14px">{pc}
<div class="card"><h3>{n} County GIS maps</h3>{gis[k]}</div></div>
<p class="mut" style="margin-top:10px">All ten counties side by side: <a href="/permits.html#{k}">ROW permit cheat sheets</a>.</p></section>
<section id="ground"><h2>Ground screening</h2><p class="mut">Pick a point. Results come live from USDA and the Florida Geological Survey. <b>Screening-level, not a geotechnical report.</b></p>
<p><label for="pt" class="mut">Point:</label> <select id="pt" style="max-width:360px"></select></p>
<div class="grid two"><div class="card"><h3>Soil (USDA)</h3><div id="soilout"></div></div><div class="card"><h3>Sinkhole reports (FGS)</h3><div id="sinkout"></div></div></div>
<p class="mut" style="margin-top:10px">Point coordinates: U.S. Census Bureau 2024 Gazetteer internal points. For a specific job site, open a lead's bid package and type the coordinates. Sizing the job: <a href="/calc.html">bore calculators</a> · <a href="/rigs.html">rig sizes</a>.</p></section>
<section><h2>Need a sub or available to sub in {n} County?</h2><p class="mut">Post it on the board. Bore411 connects crews; it does not bid, take a percentage, or share licenses.</p><a class="btn p" href="/#post">Post a bore</a><a class="btn s" href="/#alerts">Get lead alerts</a></section></div>
{foot}
<script type="application/ld+json">{ld}</script>
<script>window.CTY={json.dumps(cty)};</script><script src="/common.js"></script><script src="/county.js"></script>
<!-- Cloudflare Web Analytics --><script type='module' src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{{"token": "6996884592ac45e8816a84907f9ebea2"}}'></script><!-- End Cloudflare Web Analytics -->
</body></html>
'''
    open(R+f'county/{k}.html','w').write(meta(title,desc,url)+body)
# hub
cards=''.join(f'<div class="card"><h3><a href="/county/{k}.html" style="color:var(--txt);text-decoration:none">{n} County</a></h3><p class="mut">County seat {seat} · FDOT market area {area}</p><p style="margin:6px 0 0"><a href="/county/{k}.html">Leads, permits &amp; ground screen →</a></p></div>' for k,n,seat,area,*_ in CT)
hub=meta('Florida county HDD bid pages near Arcadia — Bore411','County pages for HDD and underground utility work in DeSoto, Charlotte, Hardee, Highlands, Sarasota, Manatee, Lee, Glades, Hendry and Polk counties: open leads, right-of-way permits, GIS maps and soil and sinkhole screening.','https://bore411.com/counties.html')+f'''{head}
<div class="wrap"><section style="border-top:0"><h1>County pages</h1><p class="mut">One page per county around Arcadia: open leads in and near the county, the right-of-way permit route, official GIS maps, the FDOT price area, and a live soil and sinkhole screen.</p>
<div class="grid two" style="margin-top:14px">{cards}</div>
<p class="mut" style="margin-top:14px">Working outside these ten counties? Every lead still gets a <a href="/#leads">bid package</a> with soil and sinkhole screening anywhere in Florida.</p></section></div>
{foot}
<!-- Cloudflare Web Analytics --><script type='module' src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{{"token": "6996884592ac45e8816a84907f9ebea2"}}'></script><!-- End Cloudflare Web Analytics -->
</body></html>
'''
open(R+'counties.html','w').write(hub)
