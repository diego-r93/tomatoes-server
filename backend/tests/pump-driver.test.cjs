const {test}=require('node:test');
const assert=require('node:assert/strict');
const {PumpDriverTracker,parseDriverEvent,pulseResult,recentlyDue}=require('../src/mqtt/pumpDriverState');
const host='esp32s3-07945C', code=host+'#01';
const event=(item,value,at=1000,stage='start',pump='01')=>parseDriverEvent(`sensors/${host}/pump/${pump}/${stage}/${item}`,Buffer.from(String(value)),false,at);

test('strict topic, payload and non-retained numeric feedback validation',()=>{
 assert.equal(event('fault',104).value,104);
 for(const [topic,value,retained] of [[`sensors/${host}/pump/05/start/active`,'1',false],[`sensors/${host}/pump/01/start/active`,'2',false],[`sensors/${host}/pump/01/start/fault`,'256',false],[`sensors/${host}/pump/01/start/status`,'NaN',false],[`sensors/${host}/pump/01/start/status`,'16',true],[`sensors/../../pump/01/start/status`,'16',false]]) assert.equal(parseDriverEvent(topic,Buffer.from(value),retained),null);
});
test('actual driver vectors, POR alone, severe faults and partial messages',()=>{
 for(const [active,fault,status,result] of [[1,0,16,'actuated'],[0,104,0,'supply-missing'],[1,64,16,'actuated'],[1,4,16,'short'],[1,2,16,'temperature'],[0,0,0,'not-actuated']]) {
  const tracker=new PumpDriverTracker();tracker.ingest(event('status',status));tracker.ingest(event('active',active,1001));
  assert.equal(tracker.snapshot(code,1002).result,'waiting');tracker.ingest(event('fault',fault,1002));assert.equal(tracker.snapshot(code,1003).result,result);
 }
 const tracker=new PumpDriverTracker();tracker.ingest(event('active',1));assert.equal(tracker.snapshot(code,6000).result,'incomplete');
});
test('five-second deadline, late feedback, pulse boundaries and paired channels stay separate',()=>{
 const tracker=new PumpDriverTracker();tracker.expect(code,1000,'schedule');assert.equal(tracker.snapshot(code,5999).result,'waiting');assert.equal(tracker.snapshot(code,6000).result,'missing');
 tracker.ingest(event('active',1,7000));tracker.ingest(event('fault',0,7001));assert.equal(tracker.snapshot(code,7002).result,'actuated');
 tracker.ingest(event('active',1,15000,'end'));assert.equal(tracker.snapshot(code).latest.endReceived,true);
 tracker.ingest(event('active',0,30000));tracker.ingest(event('fault',104,30001));assert.equal(tracker.snapshot(code).result,'supply-missing');assert.equal(tracker.snapshot(code).history[0].endReceived,true);
 tracker.ingest(event('active',1,30002,'start','02'));tracker.ingest(event('fault',0,30003,'start','02'));assert.equal(tracker.snapshot(host+'#02').result,'actuated');assert.equal(tracker.snapshot(code).result,'supply-missing');
 assert.equal(tracker.ingest(event('fault',0,100)),false);
});
test('end-only messages never invent a start or a successful pulse; end faults are highlighted',()=>{
 const tracker=new PumpDriverTracker();tracker.ingest(event('active',1,1000,'end'));tracker.ingest(event('fault',0,1001,'end'));assert.equal(tracker.snapshot(code).result,'unobserved');assert.equal(tracker.snapshot(code).latest.startAt,null);
 tracker.ingest(event('active',1,2000));tracker.ingest(event('fault',0,2001));tracker.ingest(event('fault',2,3000,'end'));assert.equal(tracker.snapshot(code).result,'temperature');
});
test('history stays bounded and snapshots can be restored without changing acquisition times',()=>{
 const tracker=new PumpDriverTracker();for(let i=1;i<=20;i++){tracker.ingest(event('active',1,i*10000));tracker.ingest(event('fault',0,i*10000+1));}
 const restored=new PumpDriverTracker();restored.states.set(code,JSON.parse(JSON.stringify(tracker.states.get(code))));assert.deepEqual(restored.snapshot(code,999999),tracker.snapshot(code,999999));assert.equal(restored.snapshot(code).history.length,9);assert.equal(restored.snapshot(code).latest.startAt,200000);
});
test('scheduled expectations use configured board wall time, ignore disabled entries and downtime',()=>{
 const now=Date.parse('2026-11-08T20:00:04Z'),times=[{time:'17:00:00',state:true},{time:'17:00:02',state:false}];
 assert.deepEqual(recentlyDue(times,now,'America/Sao_Paulo',now-10000),[now-4000]);assert.deepEqual(recentlyDue(times,now,'UTC',now-10000),[]);assert.deepEqual(recentlyDue(times,now,'America/Sao_Paulo',now-1000),[]);
 assert.deepEqual(recentlyDue([{time:'00:00:00',state:true}],Date.parse('2026-11-09T03:00:02Z'),'America/Sao_Paulo',0),[Date.parse('2026-11-09T03:00:00Z')]);
});
