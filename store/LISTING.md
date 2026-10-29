# Split Trace

Summary: Export page domains and server IP addresses for Amnezia split tunneling.

Open a page, click Split Trace, choose a scan duration and start. Split Trace
loads a background copy and captures only domains and server IP addresses.
Download amnezia-sites.json, or choose individual country files using the
bundled offline IPv4 and IPv6 country database. Includes unknown-country
export, a JSON preview, manual stop and clear controls.

No telemetry, remote DNS, remote geolocation, remote code or account required.
Country estimates describe network allocation and may differ from the actual
server location. Browsers may omit IPs. Interactive, lazy-loaded resources,
service worker requests and resources suppressed in background tabs may be missed.
Scan pages you trust: the background copy uses your browser session and runs
the site's scripts, which may produce side effects.

Single purpose: collect page network destinations and export Amnezia rules.

Permissions justification:
- webRequest and all_urls: observe cross-origin destinations in the scan tab.
- tabs and activeTab: read the chosen page URL and manage its background copy.
- storage: preferences and session-only captured addresses.
- alarms: terminate scans even when the popup closes or the worker sleeps.

Support: https://github.com/MenzurkaKBAPK/split-trace/issues
Privacy text: PRIVACY.md. Host at a public URL before store submission.
Before submission capture real screenshots in both browsers; do not use mock
screenshots. Include popup settings and results on a local fixture page.
