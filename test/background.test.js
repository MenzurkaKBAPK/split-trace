import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const base = new URL('../extension/', import.meta.url);
const core = await readFile(new URL('core.js',base),'utf8');
const code = await readFile(new URL('background.js',base),'utf8');
function harness() {
  const values = {}, removed = [], alarmValues = new Map();
  const event = () => ({listeners:[],addListener(fn) {this.listeners.push(fn);},fire(...args) {this.listeners.forEach(fn=>fn(...args));}});
  const events = Object.fromEntries(['onBeforeRequest','onCompleted','onBeforeRedirect','onErrorOccurred'].map(name=>[name,event()]));
  const api = {
    runtime:{id:'test-extension',onMessage:event()},
    webRequest:events,
    storage:{session:{async get(key) {return structuredClone({[key]:values[key]});},async set(next) {Object.assign(values,structuredClone(next));},async remove(key) {delete values[key];}}},
    tabs:{onRemoved:event(), async get() {return {url:'https://source.example/path?secret=1'};},async create(options) {assert.equal(options.url,'about:blank');assert.equal(options.active,false);return {id:99};},async update(id,options) {assert.equal(values.scan.tabId,id);assert.equal(options.url,'https://source.example/path?secret=1');},async remove(id) {removed.push(id);}},
    alarms:{onAlarm:event(),async create(name,details) {alarmValues.set(name,details);},async clear(name) {alarmValues.delete(name);}}
  };
  const context = vm.createContext({browser:api,URL,console,structuredClone});
  vm.runInContext(core,context);vm.runInContext(code,context);
  const message = data=>new Promise(resolve=>api.runtime.onMessage.listeners[0](data,{id:'test-extension'},resolve));
  return {api,values,removed,alarmValues,message};
}
test('scan lifecycle isolates clone tab, preserves redirect IPs and works after popup closure', async()=> {
  const h=harness();
  const started=await h.message({type:'start',tabId:1,split:true,seconds:20});
  assert.equal(started.scan.status,'running');assert.equal(h.alarmValues.size,1);
  assert.ok((await h.message({type:'start',tabId:1})).error);
  h.api.webRequest.onBeforeRequest.fire({tabId:99,url:'https://cdn.example/private?q=1'});
  h.api.webRequest.onCompleted.fire({tabId:2,url:'https://unrelated.example',ip:'1.1.1.1'});
  h.api.webRequest.onBeforeRedirect.fire({tabId:99,url:'https://cdn.example/private',ip:'8.8.8.8'});
  h.api.webRequest.onCompleted.fire({tabId:99,url:'https://cdn.example/end',ip:'1.1.1.1'});
  const stopped=await h.message({type:'stop'});
  assert.deepEqual(Object.keys(stopped.scan.rows),['cdn.example']);
  assert.deepEqual(stopped.scan.rows['cdn.example'].ips,['8.8.8.8','1.1.1.1']);
  assert.equal(JSON.stringify(stopped).includes('private'),false);
  assert.deepEqual(h.removed,[99]);assert.equal(h.alarmValues.size,0);
  assert.equal((await h.message({type:'status'})).scan.status,'done');
  await h.message({type:'clear'});assert.equal(h.values.scan,undefined);
});
test('alarm, scan-tab closure and expired status finalize capture',async()=> {
  for(const mode of ['alarm','closed','expired']) {
    const h=harness(); await h.message({type:'start',tabId:1});
    if(mode==='alarm') h.api.alarms.onAlarm.fire({name:'scan-deadline'});
    if(mode==='closed') h.api.tabs.onRemoved.fire(99);
    if(mode==='expired') h.values.scan.deadline=0;
    assert.equal((await h.message({type:'status'})).scan.status,'done');
    assert.deepEqual(h.removed,[99]);
  }
});
test('browser-internal pages are rejected before a clone is created',async()=> {
  const h=harness();h.api.tabs.get=async()=>({url:'chrome://extensions'});
  assert.ok((await h.message({type:'start',tabId:1})).error);
  assert.equal(h.values.scan,undefined);
});
