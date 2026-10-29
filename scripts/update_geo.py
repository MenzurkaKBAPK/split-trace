# Development-only downloader. Never shipped inside the extension.
from pathlib import Path
import csv, datetime, hashlib, io, ipaddress, json, urllib.request
root = Path(__file__).resolve().parents[1]
db = {}; sources = []
base = 'https://github.com/sapics/ip-location-db/releases/download/'
for family in [4,6]:
    name = f'iptoasn-country-ipv{family}.csv'
    url = base + 'latest/' + name
    raw = urllib.request.urlopen(url, timeout=120).read()
    expected = urllib.request.urlopen(base + 'checksum/' + name + '.sha256', timeout=60).read().decode().split()[0]
    digest = hashlib.sha256(raw).hexdigest()
    if digest != expected: raise SystemExit('Upstream checksum mismatch; retry after upstream finishes updating')
    rows = []
    for start,end,country in csv.reader(io.StringIO(raw.decode())):
        if len(country) != 2 or not country.isalpha() or country == 'ZZ': continue
        a,b = int(ipaddress.ip_address(start)),int(ipaddress.ip_address(end))
        rows.append([str(a),str(b),country.upper()])
    rows.sort(key=lambda r:int(r[0]))
    for prev,cur in zip(rows, rows[1:]):
        if int(prev[1]) >= int(cur[0]): raise SystemExit('Overlapping GeoIP ranges')
    db[f'v{family}'] = rows
    sources.append({'url':url,'sha256':digest,'ranges':len(rows)})
out = root / 'extension/data'; out.mkdir(exist_ok=True,parents=True)
index = {}
for family, rows in db.items():
    index[family] = []
    for offset in range(0,len(rows),25000):
        name = f'{family}-{offset//25000}.json'
        (out / name).write_text(json.dumps(rows[offset:offset+25000],separators=(',',':')),encoding='ascii')
        index[family].append(name)
(out / 'index.json').write_text(json.dumps(index,indent=2)+'\n',encoding='ascii')
(out / 'provenance.json').write_text(json.dumps({'retrieved':datetime.datetime.now(datetime.timezone.utc).isoformat(),'license':'PDDL-1.0','sources':sources},indent=2)+'\n',encoding='ascii')
print('Updated offline IPv4 and IPv6 country database')
