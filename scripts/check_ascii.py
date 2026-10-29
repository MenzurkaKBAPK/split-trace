from pathlib import Path
root = Path(__file__).resolve().parents[1]
ignored = {'.git','node_modules','dist','artifacts','__pycache__'}
bad = []
for path in root.rglob('*'):
    if not path.is_file() or ignored.intersection(path.relative_to(root).parts): continue
    raw = path.read_bytes()
    if any(byte > 127 for byte in raw): bad.append(str(path.relative_to(root)))
if bad: raise SystemExit('Non-ASCII files: ' + ', '.join(bad))
print('All repository sources use ASCII only; Russian UI uses Unicode escapes.')
