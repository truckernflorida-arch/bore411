# Bore411 — bore411.com

Free load board and Florida HDD bid desk for underground work (HDD, boring, trenching). Static site on GitHub Pages, no build step.

- `index.html` — home: hero, how it works, daily leads (from `leads.json`), alert + post-a-bore forms (Formspree).
- `bid.html?id=…` — bid package for each lead, generated in the browser from `leads.json`. The id is derived from existing fields (bid # or title + agency), so the daily routine needs no new field.
- `tools.html` — Florida 811 dig-date calculator (F.S. 556.105; Sunshine 811 holidays). Logic in `common.js`.
- `benchmarks.html` — FDOT statewide 12-month item average prices (published figures only).
- `leads.json` — rewritten daily: `type, title, agency, location, bid, due` (or `open_until`), `scope, source, url`.

Images in `/images` are illustrative AI-generated pictures, not real Bore411 jobs or crews.
Bore411 does not bid work, take a percentage of any job, or hold or share contractor licenses. Public information only.
