# Store release setup

## One-time steps

1. Register Chrome Web Store and Mozilla Add-ons developer accounts.
2. Upload artifacts/split-trace-chrome-0.1.0.zip manually to create the Chrome
   item. Fill store listing and privacy tabs, add screenshots, supply a hosted
   privacy-policy URL, enable account two-step verification and complete any
   account verification requested by the store. Save the item and publisher IDs.
3. Enable Chrome Web Store API in Google Cloud; create OAuth credentials and
   obtain a refresh token for https://www.googleapis.com/auth/chromewebstore.
4. Create the initial Firefox listing manually using the Firefox ZIP. Use the
   manifest ID split-trace@menzurkakbapk.github.io consistently. Fill required
   metadata, screenshots, privacy text and license. Create AMO API credentials.
5. Create a GitHub Actions environment named stores. Optionally add reviewers
   for release control. Add these environment secrets:

   CWS_PUBLISHER_ID, CWS_EXTENSION_ID, CWS_CLIENT_ID, CWS_CLIENT_SECRET,
   CWS_REFRESH_TOKEN, AMO_JWT_ISSUER, AMO_JWT_SECRET.

Never commit credentials or paste them into workflow logs. Store contacts must
be supplied by the owner, not derived from the configured Git identity.

## Each release

1. Optionally refresh the bundled database, review provenance and licenses.
2. Increment package.json version (also update package-lock.json with npm
   install --package-lock-only). Manifests inherit the package version.
3. Update store/amo-metadata.json release notes and store listing if needed.
4. Run tests, build, lint, ASCII check and the manual browser smoke checklist.
5. Commit with Conventional Commits, e.g. feat: add offline country exports.
6. When ready, push your commits and a matching vVERSION tag yourself. A manual
   workflow dispatch also submits the current version; do not submit a version
   already published. The agent does not push.

Chrome and Firefox submit in independent jobs; one failure does not roll back
the other store. Retry only the failed job after checking store status. Store
moderation may require further metadata or corrections. Secrets missing from
GitHub prevent publication; building and local use still work.

## Browser smoke checklist

- Install unpacked Chrome and temporary Firefox builds.
- On a trusted fixture page with redirects, images, iframe and fetch resources,
  start a scan, close/reopen popup, stop it, verify only clone-tab hosts captured.
- Check countdown, automatic closure, manual clone-tab closure, empty results,
  invalid/internal page error and clear-results behavior.
- Download all-country and individual-country JSONs; inspect in a JSON parser.
- Import an actual exported file into your Amnezia client version.
- Check mixed countries, IPv6, cached resources, unknown IP and offline mode.
- Confirm no extension-origin external traffic in the worker network inspector.
- Record real screenshots for both stores.

## Official references

- https://developer.chrome.com/docs/webstore/using-api
- https://extensionworkshop.com/documentation/develop/getting-started-with-web-ext/
- https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_specific_settings
