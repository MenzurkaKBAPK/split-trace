# Validation record

Validated on 2026-10-29:

- Node tests: 7 passed (IP parsing, country range search, deduplication,
  mixed-country exports, complete bundled data, capture lifecycle and alarms).
- Built Chrome and Firefox Manifest V3 ZIP packages.
- Firefox web-ext 10.8.0 lint: 0 errors, 0 warnings, 0 notices.
- Real Chromium 156 isolated-profile smoke test: passed. Used only a local
  HTTP fixture. Verified real IP capture, background clone, popup close/reopen,
  stop, downloaded JSON content, unknown-country file, clone cleanup and clear.
- Visual review of the Russian popup screenshot: passed.
- ASCII-only source check: passed.
- Runtime dependencies: none; npm audit --omit=dev reports 0 vulnerabilities.
- Development audit: 3 low-severity findings through web-ext/addons-linter/
  deepmerge. No current compatible patched tool release was available; these
  development tools are excluded from extension packages.

Not performed: live Firefox interaction, import into an installed Amnezia
client, authenticated store submission or GitHub Actions execution. Store
credentials and initial listings are owner setup; see store/RELEASING.md.
The workflow and packages are prepared, but nothing has been pushed or published.
