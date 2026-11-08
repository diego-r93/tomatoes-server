const test = require('node:test');
const assert = require('node:assert/strict');
const { batteryDashboardDefinition, provisionBatteryDashboard } = require('../src/database/dashboard/battery-dashboard');
const { validateDashboard } = require('../src/database/dashboard/validation');
const Dashboard = require('../src/database/dashboard/models/dashboard.model').default;

test('battery dashboard uses existing validated chart JSON, exact device filters and separate reported/calculated measurements', () => {
  const definition = batteryDashboardDefinition('tomatoes','mega_energy');
  assert.equal(definition.folder,'Energy');
  assert.equal(definition.charts.length,20);
  assert.doesNotThrow(()=>validateDashboard(definition));
  assert.equal(new Set(definition.charts.map(chart=>chart.id)).size,20);
  for(const chart of definition.charts){assert.deepEqual(chart.data,[]);assert.ok(chart.query.includes('r.device == "mega_energy"'));assert.ok(chart.query.includes('v.timeRangeStart'));assert.ok(chart.query.includes('v.timeRangeStop'));assert.ok(chart.layout.x + chart.layout.w <=12);}
  assert.ok(definition.charts.find(chart=>chart.id==='battery-energy').query.includes('battery_calculated'));
  assert.ok(definition.charts.find(chart=>chart.id==='battery-cells').query.includes('battery_cell'));
  assert.ok(definition.description.includes('not measured usable energy'));
  assert.throws(()=>batteryDashboardDefinition('tomatoes','bad"device'));
});

test('optional provisioning is idempotent and never replaces dashboards edited by the user', async () => {
  const original=Dashboard.updateOne;
  let saved=null,writes=0;
  Dashboard.updateOne=async(filter,operation,options)=>{writes++;assert.deepEqual(options,{upsert:true});assert.deepEqual(Object.keys(operation),['$setOnInsert']);if(saved)return {upsertedCount:0};saved={_id:filter._id,...operation.$setOnInsert};return {upsertedCount:1};};
  try{
    assert.deepEqual(await provisionBatteryDashboard({}),{created:false,count:0});assert.equal(writes,0);
    const env={BATTERY_BLE_ENABLED:'true',BATTERY_DEVICE_ID:'mega_energy',DOCKER_INFLUXDB_INIT_BUCKET:'tomatoes'};
    assert.deepEqual(await provisionBatteryDashboard(env),{created:true,count:20});
    saved.name='User edited battery';saved.charts=[];
    assert.deepEqual(await provisionBatteryDashboard(env),{created:false,count:20});
    assert.equal(saved.name,'User edited battery');assert.deepEqual(saved.charts,[]);
  }finally{Dashboard.updateOne=original;}
});
