# Bore411 — bore411.com

Free load board and Florida HDD bid desk for underground work (HDD, boring, trenching). Static site on GitHub Pages, no build step.

- `index.html` — home: hero, how it works, daily leads (from `leads.json`), alert + post-a-bore forms (Formspree).
- `bid.html?id=…` — bid package for each lead, generated in the browser from `leads.json`. The id is derived from existing fields (bid # or title + agency), so the daily routine needs no new field.
- Bid pages include a USDA soil screening card: the lead's `location` text is matched to a town or county point in `fl-geo.json` (U.S. Census 2024 Gazetteer internal points), then the browser queries USDA NRCS Soil Data Access (SSURGO) live for map unit, major soils, drainage class, hydrologic group, water table, bedrock depth and flooding. Users can enter job-site coordinates instead. Screening-level only. Logic in `geoCandidates()` / `soilAt()` in `common.js`.
- Bid pages also include a sinkhole screening card: for the same point, the browser queries the Florida Geological Survey Subsidence Incident Reports layer (FDEP open data ArcGIS REST, `OpenData/FGS_SUBSIDENCE/MapServer/0`) for reports within 10 miles and shows counts at 1/3/5/10 mi, field-verified count, and the 5 nearest reports (ref #, distance, date, verified, size). Owner/reporter fields are never requested. Screening-level only. Logic in `sinkAt()` in `common.js`.
- `tools.html` — Florida 811 dig-date calculator (F.S. 556.105; Sunshine 811 holidays). Logic in `common.js`.
- `benchmarks.html` — FDOT statewide 12-month item average prices plus Southwest Florida market areas 09, 10 and 08 with a county-to-market-area lookup (published figures only).
- `rigs.html` — HDD rig size classes with sourced specs, a rough rig picker, support-equipment checklist.
- `equipment.html` — free equipment for-sale/rent board (starter); form posts to the job-post Formspree with `form_type=equipment`.
- Rig-class tags (est.) on leads come from `rigClass()` in `common.js`, parsed from the scope text; no extra leads.json field.
- `leads.json` — rewritten daily: `type, title, agency, location, bid, due` (or `open_until`), `scope, source, url`.

Changes are logged in `CHANGELOG.md`.

Images in `/images` are illustrative AI-generated pictures, not real Bore411 jobs or crews.
Bore411 does not bid work, take a percentage of any job, or hold or share contractor licenses. Public information only.
