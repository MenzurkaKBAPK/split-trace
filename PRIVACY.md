# Privacy policy - Split Trace

Split Trace does not transmit collected data to its developer or a third party.
There are no analytics, advertisements, remote geolocation, external DNS calls
or remotely hosted scripts. Country data is included in the extension package.

Only the scan tab is observed, and only during a user-started scan. Hostnames
and server IP addresses are retained in browser session storage until cleared,
replaced by a new scan, or the browser session ends. Page URLs, query strings,
request bodies, headers, cookies and response bodies are not stored by the
extension. The source page URL is used transiently to open the background copy.
Settings (duration and country grouping) are stored locally, not in sync storage.
Exports are local JSON files downloaded at the user's explicit request.

The background page copy makes normal website requests using the current browser
session. Those requests follow the website's own privacy policy. The extension
does not make independent external requests. Browser-managed extension updates
and store distribution are controlled by the browser and its store.

Clear results in the popup to delete captured addresses. Uninstalling deletes
extension settings. Downloaded JSON files must be deleted separately.
Support: https://github.com/MenzurkaKBAPK/split-trace/issues
