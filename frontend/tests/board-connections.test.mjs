import test from 'node:test';
import assert from 'node:assert/strict';
import { boardHost, boardConnection } from '../src/composables/boardConnectionUtils.ts';
const now = 1793674800000;
const snapshot = (changes = {}) => ({ devices: [{host:'esp32s3-07945C',received_at:now-30000}], monitorRunning:true, mqttConnected:true, lastDiscovery:now-30000, checkedAt:now, ...changes });
test('all pump channels share their exact board connection, without confusing similar IDs', () => {
 assert.equal(boardHost(' esp32s3-07945C#01 '),'esp32s3-07945C');
 for(const channel of ['01','02','03','04']) assert.equal(boardConnection('esp32s3-07945C#'+channel,snapshot(),now).label,'Online');
 assert.equal(boardConnection('esp32s3-07945C-extra#01',snapshot(),now).label,'Unknown');
 assert.equal(boardConnection('',snapshot(),now).label,'Unknown');
});
test('freshness expires at 90 seconds and can recover on a new response', () => {
 const before = snapshot({devices:[{host:'esp32s3-07945C',received_at:now-89999}]});
 assert.equal(boardConnection('esp32s3-07945C#01',before,now).label,'Online');
 const stale = snapshot({devices:[{host:'esp32s3-07945C',received_at:now-90000}]});
 const result = boardConnection('esp32s3-07945C#01',stale,now);
 assert.equal(result.label,'Not seen'); assert.match(result.detail,/Last response: 1 min ago/);
 assert.equal(boardConnection('esp32s3-07945C#01',snapshot(),now).label,'Online');
});
test('missing reports and monitor/API failures remain unknown rather than claiming a board is offline', () => {
 for(const data of [null,snapshot({devices:[]}),snapshot({error:true}),snapshot({monitorRunning:false}),snapshot({mqttConnected:false}),snapshot({lastDiscovery:null}),snapshot({lastDiscovery:now-90000}),snapshot({checkedAt:now-90000}),snapshot({devices:[{host:'esp32s3-07945C',received_at:now+60000}]})]) assert.equal(boardConnection('esp32s3-07945C#01',data,now).label,'Unknown');
 assert.match(boardConnection('esp32s3-07945C#01',snapshot({error:true}),now).detail,/Last response:/);
});
