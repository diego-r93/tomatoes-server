const test=require('node:test'),assert=require('node:assert/strict');
const {driverSample}=require('../src/alerts/driverSource');
const {sourceInput}=require('../src/alerts/types');
const {metricQuery}=require('../src/alerts/sources');
const {validateCharts}=require('../src/database/dashboard/validation');
const {dashboardOverview}=require('../src/database/dashboard/overview');
const source=condition=>sourceInput({kind:'pump_driver',host:'esp32s3-07945C',pump:1,condition});
const pulse=(active,fault)=>({latest:{startAt:1000,endAt:null,start:{active,fault},end:{}}});
test('driver alerts distinguish actual actuation, missing supply, short, thermal and absent feedback',()=>{
 for(const [active,fault,failed] of [[1,0,0],[0,104,1],[1,4,1],[1,2,1]])assert.equal(driverSample(source('failure'),pulse(active,fault),10000).value,failed);
 assert.equal(driverSample(source('supply'),pulse(0,104),10000).value,1);
 assert.equal(driverSample(source('short'),pulse(0,104),10000).value,0);
 assert.equal(driverSample(source('temperature'),pulse(1,2),10000).value,1);
 assert.equal(driverSample(source('failure'),undefined,10000).health,'missing');
 const expected={latest:{startAt:null,endAt:null,expectedAt:1000,start:{},end:{}}};
 assert.equal(driverSample(source('missing'),expected,5999).health,'missing');
 assert.equal(driverSample(source('missing'),expected,6000).value,1);
 assert.equal(driverSample(source('failure'),expected,6000).health,'missing');
 assert.equal(driverSample(source('failure'),pulse(1,0),86400000).value,0);
 for(const input of [{pump:0},{pump:5},{condition:'unknown'}])assert.throws(()=>sourceInput({...source('failure'),...input}));
});
test('battery metric filters use exact escaped device tag and reject ambiguous or injected tags',()=>{
 const src=sourceInput({kind:'metric',host:'raspberrypi',device:'mega_energy',measurement:'battery',field:'soc'});
 assert.ok(metricQuery(src).includes('r.device == "mega_energy"'));
 assert.equal(sourceInput({...src,kind:'metric_age',topic:''}).device,'mega_energy');
 assert.throws(()=>sourceInput({...src,kind:'metric_age',device:'',topic:''}));
 assert.throws(()=>sourceInput({...src,device:'" or true'}));
});
const panel=(title,id)=>({id,data:[],query:'from(bucket:"tomatoes")\n|> range(start:v.timeRangeStart,stop:v.timeRangeStop)\n|> filter(fn:(r)=>r._field == "used")\n|> aggregateWindow(every:v.windowPeriod,fn:mean,createEmpty:false)',options:{chartTitle:title,axes:[{},{}],series:[{},{}]},layout:{x:0,y:0,w:4,h:10,i:String(id)}});
test('overview preserves original histories/queries, is idempotent, and validates mapped/live panels',()=>{
 const d={_id:'existing-charts',name:'Raspberry Pi',charts:['CPU temperature','Memory used','Storage used','System load (1 min)','CPU user usage','Memory usage'].map(panel)};const before=structuredClone(d);
 const next=dashboardOverview(d);assert.deepEqual(d,before);validateCharts(next.charts);
 for(const p of d.charts)assert.equal(next.charts.find(c=>c.id===p.id).query,p.query);
 assert.equal(next.charts.filter(p=>p.visualization?.type==='stat').length,4);
 assert.equal(dashboardOverview(next),null);
 const mapped={...panel('State',1),visualization:{type:'stat',mappings:[{value:0,text:'Off'},{value:1,text:'On'}]},liveSource:{kind:'connection',host:'esp32s3-07945C'}};
 validateCharts([mapped]);assert.throws(()=>validateCharts([{...mapped,liveSource:{kind:'connection',host:'*'}}]));
 assert.throws(()=>validateCharts([{...mapped,visualization:{type:'stat',mappings:[{value:0,text:'Off'},{value:0,text:'On'}]}}]));
});


test('live panels preserve offline and stale observations and reject unavailable sources', async t => {
 const Dashboard = require('../src/database/dashboard/models/dashboard.model').default;
 const { sourceHealth } = require('../src/alerts/sources');
 const { readLivePanel } = require('../src/database/dashboard/live');
 const host = 'esp32s3-07945C';
 const source = { kind: 'connection', host };
 const saved = { dashboardId: 'saved', panelId: 'live' };
 t.mock.method(Dashboard, 'findById', () => ({ lean: async () => ({ charts: [{ id: 'live', liveSource: source }] }) }));
 const connected = sourceHealth.mqttConnected;
 let inventory = [{ host, online: true, receivedAt: Date.now() }];
 const dependencies = { inventory: async () => inventory, snapshots: async () => [] };
 try {
  sourceHealth.mqttConnected = true;
  await assert.rejects(readLivePanel({ source }, false, dependencies), error => error.status === 403);
  assert.equal((await readLivePanel(saved, false, dependencies))[0]._value, 1);
  const stale = Date.now() - 120000;
  inventory = [{ host, online: false, receivedAt: stale }];
  const offline = await readLivePanel(saved, false, dependencies);
  assert.equal(offline[0]._value, 0);
  assert.equal(offline[0]._time, new Date(stale).toISOString());
  inventory = [{ host, online: false, receivedAt: null }];
  assert.deepEqual(await readLivePanel(saved, false, dependencies), []);
  inventory = [];
  await assert.rejects(readLivePanel(saved, false, dependencies), error => error.status === 403);
  sourceHealth.mqttConnected = false;
  await assert.rejects(readLivePanel(saved, false, dependencies), error => error.status === 503);
 } finally {
  sourceHealth.mqttConnected = connected;
 }
});
