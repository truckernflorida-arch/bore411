#!/usr/bin/env python3
"""Check that every Formspree form action in the site's HTML points at a form that exists.

Run from the repo root: python3 scripts/check_forms.py
Only sends a GET to each form endpoint (no submissions, nothing counted against the
monthly cap). Formspree answers a GET to a missing form ID with JSON error
FORM_NOT_FOUND; an existing form answers with its HTML page / 405. Exits 1 if any
form ID is missing.
"""
import pathlib, re, sys, urllib.request, urllib.error

ids = {}
for p in sorted(pathlib.Path('.').rglob('*.html')):
    for m in re.finditer(r'formspree\.io/f/([A-Za-z0-9]+)', p.read_text(encoding='utf-8')):
        ids.setdefault(m.group(1), set()).add(str(p))
for p in sorted(pathlib.Path('.').rglob('*.js')):
    if 'node_modules' in p.parts: continue
    for m in re.finditer(r'formspree\.io/f/([A-Za-z0-9]+)', p.read_text(encoding='utf-8')):
        ids.setdefault(m.group(1), set()).add(str(p))

bad = 0
for fid, files in sorted(ids.items()):
    url = 'https://formspree.io/f/' + fid
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'bore411-check'}), timeout=20) as r:
            body = r.read(4000).decode('utf-8', 'replace'); code = r.status
    except urllib.error.HTTPError as e:
        body = e.read(4000).decode('utf-8', 'replace'); code = e.code
    missing = 'FORM_NOT_FOUND' in body or 'No form exists' in body
    bad += missing
    print(('MISSING ' if missing else 'ok      ') + fid, code, ', '.join(sorted(files)))
sys.exit(1 if bad else 0)
