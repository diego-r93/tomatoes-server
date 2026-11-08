import {test} from 'node:test';
import assert from 'node:assert/strict';
import {driverIssues, driverMessage, mergeDriverFeedback} from '../src/composables/pumpDriverFeedback.mjs';
test('merges feedback by immutable hostname without changing GPIO state or connection freshness',()=>{
 const devices=[{host:'esp32s3-A',key:'mac',receivedAt:10,outputs:[{gpio:0,state:false}]}];
 const updated=mergeDriverFeedback(devices,[{host:'esp32s3-A',pumps:[{code:'esp32s3-A#01',pump:'01',result:'supply-missing'}]}]);
 assert.equal(updated[0].outputs[0].state,false);assert.equal(updated[0].receivedAt,10);assert.equal(devices[0].driverPulses,undefined);assert.equal(driverIssues(updated).length,1);assert.equal(driverIssues(updated)[0].deviceKey,'mac');assert.match(driverMessage('supply-missing'),/power supply absent/);assert.throws(()=>mergeDriverFeedback(devices,null));
});
test('waiting or absent history is not reported as a failed actuation',()=>{
 assert.equal(driverIssues([{driverPulses:[{result:'waiting'},{result:'unobserved'},{result:'actuated'}]}]).length,0);
 assert.equal(driverIssues([{driverPulses:[{result:'missing'},{result:'short'},{result:'temperature'}]}]).length,3);
});
