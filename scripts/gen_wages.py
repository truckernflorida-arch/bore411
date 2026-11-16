#!/usr/bin/env python3
"""Rebuild wages.json (Davis-Bacon wage determinations for the 10 counties around Arcadia).

Source: U.S. Department of Labor general wage determinations as published on SAM.gov
(public, no key): https://sam.gov/api/prod/wdol/v1/wd/<WD number>/<revision>
Scans FL<year>0001..FL<year>0300, keeps the latest revision of each Heavy and Highway
determination that names one of our counties (dredging-only determinations skipped),
and writes the rate tables as published. Python 3 standard library only.

Usage: python3 scripts/gen_wages.py [year]      (default: current year)
"""
import json, re, sys, os, time, datetime, urllib.request, urllib.error

R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..') + '/'
YEAR = int(sys.argv[1]) if len(sys.argv) > 1 else datetime.date.today().year
API = 'https://sam.gov/api/prod/wdol/v1/wd/{}/{}'
# site name -> name as written in DOL determinations
COUNTIES = {'DeSoto': 'De Soto', 'Charlotte': 'Charlotte', 'Hardee': 'Hardee', 'Highlands': 'Highlands',
            'Sarasota': 'Sarasota', 'Manatee': 'Manatee', 'Lee': 'Lee', 'Glades': 'Glades',
            'Hendry': 'Hendry', 'Polk': 'Polk'}
TYPES = ('Heavy', 'Highway')

def get(wd, rev):
    req = urllib.request.Request(API.format(wd, rev), headers={'User-Agent': 'Mozilla/5.0 (Bore411 wage refresh)'})
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        if e.code in (400, 404):
            return None
        raise

def latest(wd):
    last = None
    for rev in range(0, 10):
        d = get(wd, rev)
        time.sleep(0.15)
        if d:
            last = d
        elif last:
            break
    return last

def text(d):
    s = d['document']
    if s.startswith('"') and s.endswith('"'):
        s = s[1:-1]
    return s.replace('\\n', '\n').replace('\\"', '"').replace('""', '"')

def parse(s):
    head = re.search(r'General Decision Number: (\S+) (\S+)', s)
    cm = re.search(r'Counties:(.*?)Modification Number', s, re.S)
    counties = ' '.join(cm.group(1).split()) if cm else ''
    counties = re.sub(r'^Florida Count(y|ies) of ', '', counties)
    mods = re.findall(r'^\s+(\d+)\s+(\d\d/\d\d/\d{4})\s*$', s.split('Modification Number')[1].split('\n\n\n')[0], re.M)
    body = s.split('Publication Date', 1)[1].split('WELDERS - ')[0]
    rows = []
    for blk in body.split('-' * 64):
        m = re.search(r'^\s*([A-Z]{2,5}[A-Z0-9]*-[\w-]+)\s+(\d\d/\d\d/\d{4})', blk, re.M)
        if not m:
            continue
        rest = re.sub(r'^\s*Rates\s+Fringes\s*$', '', blk[m.end():], flags=re.M)
        buf = ''
        for line in rest.split('\n'):
            if not line.strip():
                continue
            mm = re.match(r'(.*?)\.{2,}\s*\$\s*([\d.]+)(?:\s+([\d.]+))?\s*$', line)
            if mm:
                rows.append([m.group(1), m.group(2), ' '.join((buf + ' ' + mm.group(1)).split()),
                             float(mm.group(2)), float(mm.group(3)) if mm.group(3) else None])
                buf = ''
            else:
                buf += ' ' + line.strip()
        if buf.strip():
            rows.append([m.group(1), m.group(2), ' '.join(buf.split()), None, None])
    n_rates = len(re.findall(r'\.{2,}\s*\$\s*[\d.]+', body))
    if n_rates != sum(1 for r in rows if r[3] is not None):
        raise SystemExit('rate count mismatch in %s: %d in text, %d parsed' % (head.group(1), n_rates, len(rows)))
    return {'pub': head.group(2), 'mods': [list(x) for x in mods], 'counties': counties, 'rows': rows}

def main():
    out = {'source': 'U.S. Department of Labor, Davis-Bacon general wage determinations, SAM.gov (sam.gov/api/prod/wdol/v1/wd)',
           'fetched': datetime.date.today().isoformat(), 'year': YEAR,
           'counties': {c: {} for c in COUNTIES}, 'wd': {}}
    for n in range(1, 301):
        wd = 'FL%d%04d' % (YEAR, n)
        d = latest(wd)
        if not d:
            continue
        typ = [t for t in d.get('constructionType', []) if t in TYPES]
        if not typ:
            continue
        s = text(d)
        if re.search(r'dredging', s.split('Modification Number')[0], re.I):
            continue
        cm = re.search(r'Counties:(.*?)Modification Number', s, re.S)
        hit = [c for c, w in COUNTIES.items() if cm and re.search(r'\b' + w + r'\b', ' '.join(cm.group(1).split()))]
        if not hit:
            continue
        p = parse(s)
        p.update({'type': typ[0], 'rev': d['revisionNumber']})
        out['wd'][wd] = p
        for c in hit:
            if typ[0] in out['counties'][c]:
                print('note: %s %s already has %s, also %s' % (c, typ[0], out['counties'][c][typ[0]], wd))
                out['counties'][c].setdefault(typ[0] + '_also', []).append(wd)
            else:
                out['counties'][c][typ[0]] = wd
        print(wd, 'rev', d['revisionNumber'], typ[0], ','.join(hit), len(p['rows']), 'rates')
    with open(R + 'wages.json', 'w') as f:
        json.dump(out, f, separators=(',', ':'))
    print('wrote wages.json:', len(out['wd']), 'determinations')

if __name__ == '__main__':
    main()
