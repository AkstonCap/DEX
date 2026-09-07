const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const target = path.resolve(__dirname, '../../src/swap/persistence.js');
const implementation = fs.existsSync(target) ? require(target) : {};

test('module journal waits for acknowledged persistence and survives hydration', async () => {
  assert.equal(typeof implementation.createModulePersistence, 'function');
  let disk;
  const service = implementation.createModulePersistence(async data => { disk = JSON.parse(JSON.stringify(data)); });
  service.hydrate({settings: {timeSpan: '1h'}, custom: 'preserved'});
  await service.writeJournal({version: 1, jobs: [{id: 'job-1'}]});
  assert.equal(disk.custom, 'preserved');
  assert.equal(disk.settings.timeSpan, '1h');
  const reopened = implementation.createModulePersistence(async () => {});
  reopened.hydrate(disk);
  assert.equal(reopened.readJournal().jobs[0].id, 'job-1');
});


test('legacy fire-and-forget settings keep saving while unavailable acknowledged journal blocks funding', async () => {
 const writes=[];
 const p=implementation.createModulePersistence(undefined,{writeSettings:value=>{writes.push(value);}});
 p.hydrate({settings:{timespan:1},swapJournal:{version:1,jobs:[]}});
 await p.saveSettings({timespan:2});
 await assert.rejects(()=>p.writeJournal({version:1,jobs:[]}),/acknowledge|capability/i);
 await p.saveSettings({timespan:3});
 assert.equal(writes.length,2); assert.equal(writes[1].settings.timespan,3);
 assert.deepEqual(writes[1].swapJournal,{version:1,jobs:[]});
});
