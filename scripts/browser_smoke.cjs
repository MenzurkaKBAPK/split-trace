const {chromium} = require('playwright');
const http = require('node:http');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
(async()=> {
 const requests=[];
 const server=http.createServer((req,res)=> {
  requests.push(req.url);
  if(req.url==='/') {res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Split Trace fixture</title><img src="/pixel"><iframe src="http://localhost:'+server.address().port+'/frame"></iframe><script>fetch("/api?private=1")</script>');}
  else if(req.url==='/pixel') {res.writeHead(302,{Location:'/image'});res.end();}
  else {res.setHeader('Content-Type','text/plain');res.end('fixture');}
 });
 await new Promise(resolve=>server.listen(0,'0.0.0.0',resolve));
 const extension=path.resolve(__dirname,'../dist/chrome');
 const context=await chromium.launchPersistentContext('',{channel:'chromium',headless:true,viewport:{width:420,height:900},args:['--disable-extensions-except='+extension,'--load-extension='+extension],ignoreDefaultArgs:['--disable-extensions'],acceptDownloads:true});
 try {
  const errors=[];
  const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');
  worker.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text());});
  const id=new URL(worker.url()).host;
  const source=await context.newPage();
  await source.goto('http://127.0.0.1:'+server.address().port+'/');
  const sourceId=await worker.evaluate(async()=> (await chrome.tabs.query({active:true}))[0].id);
  const popup=await context.newPage();
  popup.on('pageerror',err=>errors.push(err.message));
  await popup.goto('chrome-extension://'+id+'/popup.html');
  await popup.locator('#split').check();
  await worker.evaluate(async tabId=>{await chrome.tabs.update(tabId,{active:true});},sourceId);
  await popup.locator('#start').click();
  await popup.locator('#stop').waitFor({state:'visible'});
  await popup.close();
  // Reopening a popup must not lose the scan or its captured IP addresses.
  await new Promise(resolve=>setTimeout(resolve,1500));
  const reopened=await context.newPage();
  reopened.on('pageerror',err=>errors.push(err.message));
  await reopened.goto('chrome-extension://'+id+'/popup.html');
  await reopened.locator('#stop').click();
  await reopened.locator('a.download').first().waitFor();
  const pending=reopened.waitForEvent('download');
  await reopened.locator('a.download').first().click();
  const download=await pending;
  assert.equal(download.suggestedFilename(),'amnezia-sites.json');
  const data=JSON.parse(await fs.readFile(await download.path(),'utf8'));
  assert.ok(data.some(row=>row.hostname==='127.0.0.1'&&row.ips.includes('127.0.0.1')));
  assert.ok(data.some(row=>row.hostname==='localhost'));
  assert.ok(!JSON.stringify(data).includes('private'));
  const links=await reopened.locator('a.download').evaluateAll(nodes=>nodes.map(n=>n.download));
  assert.ok(links.includes('amnezia-sites-unknown.json'));
  assert.equal((await worker.evaluate(async()=> (await chrome.storage.session.get('scan')).scan)).status,'done');
  assert.equal((await worker.evaluate(async()=> (await chrome.tabs.query({})).filter(t=>t.url?.startsWith('http://')).length)),1);
  await fs.mkdir(path.join(__dirname,'../artifacts'),{recursive:true});
  await reopened.screenshot({path:path.join(__dirname,'../artifacts/chrome-results.png'),clip:{x:0,y:0,width:370,height:800}});
  await reopened.locator('#clear').click();
  await reopened.locator('#results').waitFor({state:'hidden'});
  assert.equal(errors.length,0,errors.join('\n'));
  console.log('PASS: real Chromium extension, background scan, popup reopen, IP capture, country export, JSON download, clone cleanup and clear.');
  console.log(JSON.stringify({hosts:data.map(r=>r.hostname),files:links,fixtureRequests:requests.length}));
 } finally {await context.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exit(1);});
