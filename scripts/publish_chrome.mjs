import { readFile } from 'node:fs/promises';
function required(name) { const value = process.env[name]; if (!value) throw Error('Missing secret: ' + name); return value; }
async function checked(url, options) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(120000) });
  const body = await response.json();
  if (!response.ok || body.error) throw Error('Store request failed: HTTP ' + response.status);
  return body;
}
const publisher = required('CWS_PUBLISHER_ID'), item = required('CWS_EXTENSION_ID');
const token = await checked('https://oauth2.googleapis.com/token', { method:'POST', body:new URLSearchParams({
  client_id:required('CWS_CLIENT_ID'), client_secret:required('CWS_CLIENT_SECRET'),
  refresh_token:required('CWS_REFRESH_TOKEN'), grant_type:'refresh_token'
}) });
if (!token.access_token) throw Error('OAuth response has no access token');
const headers = { Authorization:'Bearer ' + token.access_token };
const path = 'publishers/' + encodeURIComponent(publisher) + '/items/' + encodeURIComponent(item);
const {version} = JSON.parse(await readFile('package.json','utf8'));
let result = await checked('https://chromewebstore.googleapis.com/upload/v2/' + path + ':upload', {
  method:'POST', headers:{...headers,'Content-Type':'application/zip'}, body:await readFile('artifacts/split-trace-chrome-' + version + '.zip')
});
let state = result.uploadState;
for (let attempt=0; ['IN_PROGRESS','UPLOAD_IN_PROGRESS'].includes(state) && attempt<30; attempt++) {
  await new Promise(resolve => setTimeout(resolve,4000));
  result = await checked('https://chromewebstore.googleapis.com/v2/' + path + ':fetchStatus',{ headers });
  state = result.lastAsyncUploadState;
}
if (state !== 'SUCCEEDED') throw Error('Upload did not succeed: ' + state);
await checked('https://chromewebstore.googleapis.com/v2/' + path + ':publish',{method:'POST',headers});
console.log('Chrome package submitted for store review.');
