import test from 'node:test';
import assert from 'node:assert/strict';
import { approvedSetupBoards, chipPresence, reportedPumpChannels } from '../src/composables/boardSetupInventory.ts';
import { boardSetupMessages } from '../src/locales/boardSetup.ts';

test('only approved registry boards appear, including offline boards with no discovery report', () => {
 const rows = [{ host:'esp32s3-A00001',status:'approved' },{ host:'esp32s3-A00002',status:'pending' },{ host:'esp32s3-A00003',status:'removed' },{host:'esp32s3-A00004',status:'approved'}];
 const result=approvedSetupBoards(rows,[{host:'esp32s3-A00001',sensors:{ph:true}},{host:'unregistered'}]);
 assert.deepEqual(result.map(row=>row.host),['esp32s3-A00001','esp32s3-A00004']);
 assert.equal(result[1].report,null);
 assert.equal(chipPresence(result[0].report,'ph'),'Detected');
 assert.equal(chipPresence(result[1].report,'ph'),'Not reported');
 assert.equal('probeConnected' in result[0],false);
 assert.throws(()=>approvedSetupBoards({},[]));
});
test('chip flags never infer absent probe or false readings from missing telemetry', () => {
 assert.equal(chipPresence({sensors:{ec:false}},'ec'),'Not detected');
 for(const report of [null,{}, {sensors:{ec:'true'}}, {sensors:{ec:1}}]) assert.equal(chipPresence(report,'ec'),'Not reported');
});
test('channel identity comes only from the selected board report', () => {
 const board={host:'esp32s3-A00001',report:{ports:{'esp32s3-A00001#01':{gpio:0,name:'Bench'},'esp32s3-A00002#01':{gpio:1},'esp32s3-A00001#05':{gpio:2}}}};
 assert.deepEqual(reportedPumpChannels(board),[{code:'esp32s3-A00001#01',label:'Bench',gpio:0}]);
 assert.deepEqual(reportedPumpChannels({host:'offline'}),[]);
});
test('both translations cover identical reference/procedure messages without changing units', () => {
 assert.deepEqual(Object.keys(boardSetupMessages['pt-BR']),Object.keys(boardSetupMessages.es));
 for (const language of ['pt-BR','es']) {
  assert.notEqual(boardSetupMessages[language]['Board setup'],'Board setup');
  assert.ok(boardSetupMessages[language]['Use the Akso 1413 µS/cm standard at 25 °C, or its certified value at the measured temperature. First validate excitation, electronics and temperature readings, then calibrate the cell constant.'].includes('1413 µS/cm'));
 }
});
