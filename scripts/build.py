from pathlib import Path
import json, shutil, zipfile, struct, zlib
root = Path(__file__).resolve().parents[1]
version = json.loads((root / 'package.json').read_text())['version']
def icon(size):
    raw = b''.join(b'\0' + b''.join(bytes((94,224,174,255)) if (size//5 <= x < size*4//5 and size//5 <= y < size*4//5 and (x < size*2//5 or y < size*2//5 or y >= size*3//5)) else bytes((16,24,39,255)) for x in range(size)) for y in range(size))
    def chunk(kind, data):
        return struct.pack('!I', len(data)) + kind + data + struct.pack('!I', zlib.crc32(kind + data))
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('!2I5B',size,size,8,6,0,0,0)) + chunk(b'IDAT',zlib.compress(raw)) + chunk(b'IEND',b'')
for browser in ['chrome', 'firefox']:
    out = root / 'dist' / browser
    if out.exists(): shutil.rmtree(out)
    shutil.copytree(root / 'extension', out)
    (out / 'icons').mkdir()
    for size in [16,32,48,128]: (out / 'icons' / f'{size}.png').write_bytes(icon(size))
    manifest = dict(manifest_version=3, name='Split Trace', version=version,
      description='Locally collect page domains and server IPs for Amnezia split tunneling, with offline country exports.',
      permissions=['activeTab','tabs','storage','webRequest','alarms'],
      host_permissions=['<all_urls>'], action={'default_popup':'popup.html','default_title':'Split Trace'},
      icons={str(s):f'icons/{s}.png' for s in [16,32,48,128]},
      content_security_policy={'extension_pages':"script-src 'self'; object-src 'none'; connect-src 'self'"})
    if browser == 'chrome': manifest['background'] = {'service_worker':'background.js'}
    else:
        manifest['background'] = {'scripts':['core.js','background.js']}
        manifest['browser_specific_settings'] = {'gecko':{'id':'split-trace@menzurkakbapk.github.io','strict_min_version':'142.0','data_collection_permissions':{'required':['none']}}}
    if not (out / 'data/index.json').exists(): raise SystemExit('Run npm run geo:update before building')
    (out / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='ascii')
    shutil.copy(root / 'THIRD_PARTY.md',out)
    artifacts = root / 'artifacts'; artifacts.mkdir(exist_ok=True)
    with zipfile.ZipFile(artifacts / f'split-trace-{browser}-{version}.zip','w',zipfile.ZIP_DEFLATED) as archive:
        for file in sorted(out.rglob('*')):
            if file.is_file(): archive.write(file,file.relative_to(out).as_posix())
    print(f'Built {browser} {version}')
