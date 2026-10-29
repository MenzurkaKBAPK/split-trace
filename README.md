# Split Trace

Local Chrome / Firefox extension exporting page network destinations for Amnezia.
Manifest V3, no runtime dependencies or external services. Russian popup.

## Use

1. Open an HTTP(S) page and click the extension icon.
2. Enable country grouping if needed, choose 5-120 seconds (UI offers presets).
3. Start the scan. A background copy opens using your current browser session.
4. Keep the popup open or reopen it later. Stop early if desired.
5. Download amnezia-sites.json or amnezia-sites-ru.json, -nl.json, -us.json, etc.
   Unclassified destinations are in amnezia-sites-unknown.json.
6. Import the JSON into Amnezia's split tunneling site list.

Example output, matching the supplied format:

```json
[{"hostname":"example.com","ip":"192.0.2.1","ips":["192.0.2.1"]}]
```

Each hostname is deduplicated; all observed IPs are retained. Country files
partition a hostname's IPs; a hostname with servers in multiple countries occurs
in multiple country files. The all-country file always retains every destination.
The unknown file includes missing-IP domains with empty ip and ips fields.
Results are session-only; settings are local. Clear removes the last scan.

## Build and install

Requires Node 24 and Python 3.14. From the repository root:

```sh
npm ci --ignore-scripts
npm test
npm run build
npm run lint:firefox
python scripts/check_ascii.py
# Optional real Chromium smoke test (isolated profile, local fixture):
npx playwright install --no-shell chromium
npm run smoke:chrome
```

The bundled database is checked in: normal builds do not download it.
Chrome: chrome://extensions, Developer mode, Load unpacked, select dist/chrome.
Firefox: about:debugging#/runtime/this-firefox, Load Temporary Add-on,
select dist/firefox/manifest.json. Normal Firefox installs require store signing.
Store ZIPs are in artifacts/ after building.

Maintainer-only database refresh (network access required): npm run geo:update.
Downloads IPv4 and IPv6 IPtoASN PDDL country ranges and verifies upstream SHA-256
checksums. Review provenance.json and commit updates before releasing. No GeoIP
downloads run inside the extension or in normal CI builds.

## Limits

This loads a real background page, not a sandbox simulation. Site scripts may
perform actions with existing login cookies. Only scan trusted pages; avoid
URLs that perform actions when visited. Source tab stays open and unmodified.
Only requests observed in the scan tab during the capture window are included.
Cross-tab popups, browser/internal pages, service-worker initiated requests,
background-throttled loads and resources requiring scrolling/clicking may be
missing. Cached or failed requests may have no IP. No external DNS fallback is
used. The extension does not bypass caches or browser security controls.
Country is an offline allocation estimate, not proof of physical location;
VPNs, proxies, CDN anycast and stale allocations can change interpretation.
Host limit: 10,000. Scan deadlines use browser alarms, which may run late when
the browser sleeps. A delayed alarm will still close the scan tab on wake.

## Automated store submission

See store/RELEASING.md, store/LISTING.md and PRIVACY.md. The workflow submits
both stores on a v* tag or manual dispatch, after tests and Firefox lint.
It does not guarantee approval or immediate publication. Store credentials
and initial store listings are required. Nothing has been pushed or published.

## Text policy

All checked-in source and documentation use ASCII only. Russian UI strings are
encoded with JavaScript Unicode escapes and render as ordinary Cyrillic letters.
No decorative Unicode or symbols requiring Alt codes are used.
