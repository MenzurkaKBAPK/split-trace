import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../extension/core.js';
const { ipNumber, lookup, record, exportsFor } = globalThis.SplitTrace;
const db = {v4:[['1','10','RU'],['20','30','NL']],v6:[['42540766411282592856903984951653826560','42540766411282592875350729025363378175','US']]};
test('IPv4 and IPv6 parsing and invalid input', () => {
  assert.equal(ipNumber('255.255.255.255'),4294967295n);
  assert.equal(ipNumber('::1'),1n);
  assert.equal(ipNumber('[2001:db8::1]'),42540766411282592856903984951653826561n);
  assert.equal(ipNumber('::ffff:192.0.2.1'),281473902969345n);
  for(const ip of ['256.0.0.1','1.2.3',':::','1::2::3','1:2:3:4:5:6:7']) assert.equal(ipNumber(ip),null);
});
test('binary search includes endpoints and preserves gaps', () => {
  assert.equal(lookup('0.0.0.1',db),'ru'); assert.equal(lookup('0.0.0.10',db),'ru');
  assert.equal(lookup('0.0.0.11',db),'unknown'); assert.equal(lookup('0.0.0.20',db),'nl');
  assert.equal(lookup('2001:db8::1',db),'us');
});
test('capture excludes paths, deduplicates and splits a mixed-country hostname', () => {
  const rows = {};
  record(rows,{url:'https://example.com/secret?token=hidden',ip:'0.0.0.1'});
  record(rows,{url:'https://example.com/other',ip:'0.0.0.20'});
  record(rows,{url:'https://example.com/',ip:'0.0.0.1'});
  record(rows,{url:'https://unknown.example/'});
  record(rows,{url:'data:text/plain,hello'});
  const groups = exportsFor(rows,db,true);
  assert.deepEqual(groups.ru,[{hostname:'example.com',ip:'0.0.0.1',ips:['0.0.0.1']}]);
  assert.equal(groups.nl[0].ips.length,1); assert.equal(groups.all[0].ips.length,2);
  assert.deepEqual(groups.unknown,[{hostname:'unknown.example',ip:'',ips:[]}]);
  assert.equal(JSON.stringify(groups).includes('secret'),false);
  assert.deepEqual(Object.keys(exportsFor(rows,null,false)),['all']);
});
test('bundled database is valid and supports both address families', async () => {
  const {readFile} = await import('node:fs/promises');
  const index = JSON.parse(await readFile(new URL('../extension/data/index.json',import.meta.url)));
  const real = {};
  for (const [family,files] of Object.entries(index)) real[family] = (await Promise.all(files.map(async name => JSON.parse(await readFile(new URL('../extension/data/' + name,import.meta.url)))))).flat();
  for (const family of ['v4','v6']) {
    assert.ok(real[family].length > 1000);
    let end = -1n;
    for (const [a,b,c] of real[family]) { assert.ok(BigInt(a)>end); assert.ok(BigInt(b)>=BigInt(a)); assert.match(c,/^[A-Z]{2}$/); end=BigInt(b); }
  }
});
