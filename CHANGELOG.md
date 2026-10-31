# Bore411 changelog

## 2026-10-31
- New `calc.html` "Bore calculators" page, linked in the nav on every page: backreamer size for 1 to 7 IPS conduits or a typed bundle OD (minimum 1.5x OD, PPI TN-63 4.3.2); drilling fluid volume (diameter squared / 24.5 gal/ft, 2-3x in sand, 3-5x in clay, The Driller) with gallons and minutes per rod at a pump rate; HDPE conduit safe pull strength from PPI TN-63 (2021) Tables 3-5 (SDR 9-17, Schedule 40/80, standard and higher-strength compound), with time-under-tension and temperature factors. Formulas and sources shown on the page; results labeled estimates.
- Fix: home-page rig-size filter showed leads from other rig classes whenever they had a future due date (operator-precedence bug in the open-lead filter).

## 2026-10-30
- Bid pages: the "Sinkhole screening" card is now live (was "coming soon"). It uses the point picked in the soil card (town/county center or job-site coordinates) and queries the Florida Geological Survey Subsidence Incident Reports database (FDEP open data) live in the browser: reported incidents within 1, 3, 5 and 10 miles, how many are field-verified sinkholes, and the 5 nearest reports with FGS reference number, distance, reported date, verified status and size. Shows the statewide report count and newest event date from the live database. Labeled screening-level, not a geotechnical report; notes that most reports are not field-checked and that no reports is not a clearance. Owner and reporter details are not requested or shown.

## 2026-10-29
- Bid pages: new "Soil screening (USDA)" card. Picks a point from the lead's town or county (U.S. Census Bureau 2024 Gazetteer internal points, new `fl-geo.json`, 949 Florida places and 67 counties) or job-site coordinates the user types in, then queries USDA NRCS Soil Data Access (SSURGO) live in the browser: map unit, major soil components with percent, drainage class, hydrologic soil group, shallowest annual water table, depth to bedrock, flooding frequency. Labeled screening-level, not a geotechnical report.
- Sinkhole screening split into its own card (still coming soon). Permit card now points to the Southwest Florida market-area benchmarks too.

## 2026-10-28
- Price benchmarks: added FDOT market-area averages for Southwest Florida. Area 09 (DeSoto, Glades, Hardee, Hendry, Highlands, Okeechobee), Area 10 (Charlotte, Collier, Lee, Manatee, Sarasota) and Area 08 (Polk, Hillsborough and the rest of Central Florida), side by side with statewide for the same dates. Covers directional-bore and open-trench conduit, aboveground conduit, 2-12 fiber, and four pull box sizes. Source: FDOT Item Average Unit Cost 12-month market-area and statewide reports, lettings 2025/10/01 to 2026/09/30, run 10/26/2026. Items under 5 contracts are flagged as thin data.
- Added a "find your county" picker that maps all 67 Florida counties to their FDOT market area (FDOT Market Areas page).

## 2026-10-27 and earlier
- Rig sizes page, equipment board, rig-class tags and filter, bid package pages, 811 dig-date calculator, statewide FDOT benchmarks, Formspree alert and job-post forms, daily leads feed.
