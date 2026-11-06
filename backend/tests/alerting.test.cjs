const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const express=require('express');
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'tomatoes-alerts-'));
process.env.USERS_DB_PATH=path.join(directory,'users.db');
process.env.JWT_SECRET=crypto.randomBytes(32).toString('hex');
process.env.APP_PUBLIC_URL='http://tomatoes.example';
process.env.SMTP_HOST='127.0.0.1';process.env.SMTP_FROM='monitor@example.com';process.env.SMTP_AUTH_TYPE='login';
delete process.env.SMTP_USER;delete process.env.SMTP_PASS;
process.env.WHATSAPP_ENABLED='false';
const {transition,sourceInput}=require('../src/alerts/types');
const {alertsReady}=require('../src/alerts/database');
const {access,run,get,all}=require('../src/users/database');
const store=require('../src/alerts/store');
const {evaluate,dispatchOne}=require('../src/alerts/engine');
const {observedOutputs,ingestDevice,readSource,sourceHealth,metricQuery,metricSample,startDiscovery}=require('../src/alerts/sources');
const {templateBody,whatsappSettings}=require('../src/alerts/providers');
const input={name:'Device not responding',source:{kind:'device_age',host:'esp32-test',freshnessSeconds:180},operator:'>',threshold:120,recovery:60,pendingSeconds:60,intervalSeconds:30,repeatSeconds:900,severity:'Critical',contactIds:[],enabled:true};
test('alert state machine, persistence, outbox and authenticated API',async t=>{
 await alertsReady;
 let server;
 t.after(async()=>{if(server)await new Promise(resolve=>server.close(resolve));await new Promise(resolve=>require('../src/database/sqlite/config/db.config').default.close(resolve));assert(directory.startsWith(path.join(os.tmpdir(),'tomatoes-alerts-')));fs.rmSync(directory,{recursive:true,force:true});});
 const base={...input,id:1,state:'Normal',since:null,latched:false,incidentOpen:false};
 function step(rule,sample,time){return {...rule,...transition(rule,sample,time)};}
 await t.test('continuous pending period, hysteresis and recovery',()=>{
  let rule=step(base,{health:'ok',value:150},1000);assert.equal(rule.state,'Pending');
  rule=step(rule,{health:'ok',value:150},60000);assert.equal(rule.state,'Pending');
  rule=step(rule,{health:'ok',value:150},61000);assert.equal(rule.state,'Firing');assert.equal(rule.notify,'Firing');
  rule=step(rule,{health:'ok',value:100},62000);assert.equal(rule.state,'Firing');
  rule=step(rule,{health:'ok',value:60},63000);assert.equal(rule.state,'Normal');assert.equal(rule.notify,'Resolved');
  const low={...base,operator:'<',threshold:-80,recovery:-72,pendingSeconds:0};assert.equal(step(low,{health:'ok',value:-85},1).state,'Firing');
 });
 await t.test('no data and error are incidents and break pending, but do not clear firing latch',()=>{
  let rule=step(base,{health:'ok',value:150},1);rule=step(rule,{health:'missing'},50000);assert.equal(rule.state,'No data');assert.equal(rule.since,null);
  rule=step(rule,{health:'ok',value:150},61000);assert.equal(rule.state,'Pending');
  rule=step(rule,{health:'error'},62000);assert.equal(rule.state,'Error');
  rule=step({...base,pendingSeconds:0},{health:'ok',value:150},1);rule=step(rule,{health:'missing'},2);rule=step(rule,{health:'ok',value:100},3);assert.equal(rule.state,'Firing');
  assert.equal(step({...rule,enabled:false},{health:'ok',value:0},4).state,'Paused');
 });
 await t.test('validation rejects ambiguous targets and invalid thresholds or recipients',async()=>{
  assert.throws(()=>sourceInput({kind:'metric',host:'host',measurement:'x") |> drop()',field:'value'}));
  await assert.rejects(store.saveRule(null,{...input,recovery:130},'admin'),{status:400});
  await assert.rejects(store.saveContact(null,{name:'Invalid',kind:'whatsapp',recipients:['5511'],enabled:true,consent:false},'admin'),{status:400});
  await assert.rejects(store.saveContact(null,{name:'Invalid',kind:'whatsapp',recipients:['+5511999999999'],enabled:true,consent:false},'admin'),{status:400});
  const s={...input.source,kind:'disk_usage',path:'/") |> die(msg: "test'};assert(metricQuery(s).includes(JSON.stringify(s.path)));
 });
 await t.test('observed GPIO duration resets for OFF, missing reports and restarts',()=>{
  let outputs=observedOutputs({p:{gpio:4,state:true}},{},false,1000);assert.equal(outputs['4'].since,1000);
  outputs=observedOutputs({p:{gpio:4,state:true}},outputs,true,2000);assert.equal(outputs['4'].since,1000);
  outputs=observedOutputs({p:{gpio:4,state:true}},outputs,false,5000);assert.equal(outputs['4'].since,5000);
  outputs=observedOutputs({p:{gpio:4,state:false}},outputs,true,6000);assert.equal(outputs['4'].since,null);
  assert.equal(Object.keys(observedOutputs({},outputs,true,7000)).length,0);
 });
 await t.test('source health distinguishes broker failure, absent devices and stale samples',async()=>{
  sourceHealth.mqttConnected=false;assert.equal((await readSource(input.source)).health,'error');
  sourceHealth.mqttConnected=true;assert.equal((await readSource(input.source)).health,'missing');
  const time=Date.now();await ingestDevice(Buffer.from(JSON.stringify({host:'esp32-test',rssi:-60,ports:{p:{gpio:4,state:1}}})),time);
  assert.equal((await readSource(input.source,time+130000)).value,130);
  assert.equal((await readSource({...input.source,kind:'wifi'},time+181000)).health,'missing');
  assert.equal((await readSource({...input.source,kind:'wifi'},time)).value,-60);
  assert.equal((await readSource({...input.source,kind:'output_on',gpio:4},time+30000)).value,30);
  const missing=await readSource({...input.source,kind:'output_on',gpio:5},time);assert.equal(missing.health,'missing');
 });
 await t.test('Influx CPU conversion, stale metrics and ambiguous series',async()=>{
  const http=require('node:http');let mode='fresh',query='';
  const metricServer=http.createServer((req,res)=>{req.on('data',data=>query+=data);req.on('end',()=>{res.setHeader('Content-Type','text/csv');const time=new Date(Date.now()-(mode==='stale'?3600000:0)).toISOString();const row=`,,0,${time},48700\n`;res.end('#datatype,string,long,dateTime:RFC3339,double\n#group,false,false,false,false\n#default,_result,,,\n,result,table,_time,_value\n'+row+(mode==='multiple'?row:''));});});
  await new Promise(resolve=>metricServer.listen(0,'127.0.0.1',resolve));
  process.env.DOCKER_INFLUXDB_INIT_HOST='127.0.0.1';process.env.DOCKER_INFLUXDB_INIT_PORT=String(metricServer.address().port);process.env.DOCKER_INFLUXDB_INIT_ADMIN_TOKEN='test-token';process.env.DOCKER_INFLUXDB_INIT_ORG='test-org';process.env.DOCKER_INFLUXDB_INIT_BUCKET='test-bucket';
  try{const source={kind:'cpu_temperature',host:'raspberrypi',freshnessSeconds:180};let sample=await readSource(source);assert.equal(sample.health,'ok');assert.equal(sample.value,48.7);assert.match(query,/cpu_temperature/);mode='stale';assert.equal((await readSource(source)).health,'missing');mode='multiple';assert.equal((await readSource(source)).health,'error');}finally{await new Promise(resolve=>metricServer.close(resolve));}
 });
 await t.test('telemetry age selects an exact topic and remains evaluable when stale',()=>{
  const source=sourceInput({kind:'metric_age',host:'raspberrypi',measurement:'mqtt_consumer',field:'value',topic:'sensors/esp32-test/sht35/temperature',freshnessSeconds:180});
  assert(metricQuery(source).includes('r.topic == "sensors/esp32-test/sht35/temperature"'));
  assert.throws(()=>sourceInput({...source,topic:''}));
  const now=Date.now(),rows=[{_time:new Date(now-240000).toISOString(),_value:'25.4'}];
  const sample=metricSample(source,rows,now);assert.equal(sample.health,'ok');assert.equal(sample.value,240);
  const rule={...base,source,threshold:180,recovery:60,pendingSeconds:0};
  assert.equal(step(rule,sample,now).state,'Firing');assert.equal(step({...rule,latched:true,state:'Firing'},metricSample(source,[{...rows[0],_time:new Date(now-10000).toISOString()}],now),now).state,'Normal');
  assert.equal(metricSample(source,[],now).health,'missing');assert.equal(metricSample(source,[...rows,...rows],now).health,'error');assert.equal(metricSample(source,[{...rows[0],_time:new Date(now+120000).toISOString()}],now).health,'missing');
 });
 await t.test('MQTT startup uses the installed named API and only publishes discovery',()=>{
  const {EventEmitter}=require('node:events');const fake=new EventEmitter(),published=[];fake.connected=true;fake.subscribe=(topic,callback)=>{assert.equal(topic,'devices');callback(null);};fake.publish=(...args)=>published.push(args);fake.end=()=>{};
  process.env.MQTT_HOST_NAME='mqtt://test.invalid';let connected=false;
  const stop=startDiscovery((host)=>{connected=true;assert.equal(host,'mqtt://test.invalid');return fake;});fake.emit('connect');assert(connected);assert.equal(sourceHealth.mqttConnected,true);assert.deepEqual(published,[['getdevices','get all']]);stop();delete process.env.MQTT_HOST_NAME;
 });
 let rule,contact;
 await t.test('rules persist without seeded examples; revision guards stale evaluations',async()=>{
  assert.equal((await store.listRules()).length,0);
  contact=await store.saveContact(null,{name:'Operators',kind:'email',recipients:['operator@example.com'],enabled:true,consent:false},'admin');
  rule=await store.saveRule(null,{...input,pendingSeconds:0,contactIds:[contact.id]},'admin');
  const old=rule;rule=await store.saveRule(rule.id,{...rule,name:'Updated rule'},'admin');
  await evaluate(old,{health:'ok',value:150});assert.equal((await store.listRules())[0].evaluatedAt,null);
  assert.equal((await store.listRules())[0].name,'Updated rule');
 });
 await t.test('outbox deduplicates, retries, and records acceptance separately from delivery',async()=>{
  const time=Date.now();await evaluate(rule,{health:'ok',value:150,at:time},time);rule=(await store.listRules())[0];
  await evaluate(rule,{health:'ok',value:150,at:time},time+1000);
  assert.equal((await store.getDeliveries()).length,1);
  let sent=0;await dispatchOne(async()=>{sent++;throw Error('No real network');},time+2000);assert.equal(sent,1);
  assert.equal((await store.getDeliveries())[0].status,'pending');
  await dispatchOne(async()=>{sent++;return 'fake-provider-id';},time+120000);
  const delivery=(await store.getDeliveries())[0];assert.equal(delivery.status,'submitted');assert.equal(delivery.attempts,2);assert.match(delivery.reason,/not confirmed/);
 });
 await t.test('silencing preserves firing evaluation and unexpired jobs are cancelled',async()=>{
  rule=(await store.listRules())[0];await store.createSilence({ruleId:rule.id,minutes:60,reason:'Maintenance'},'admin');
  await evaluate(rule,{health:'ok',value:160},Date.now()+1000);assert.equal((await store.listRules())[0].state,'Firing');
  const count=(await store.getDeliveries()).length;
  rule=(await store.listRules())[0];await evaluate(rule,{health:'error',reason:'Test error'},Date.now()+2000);
  assert.equal((await store.getDeliveries()).length,count);
  const silence=(await store.listSilences())[0];await store.endSilence(silence.id,'admin');
  rule=(await store.listRules())[0];await evaluate(rule,{health:'ok',value:160},Date.now()+3000);
  await store.createSilence({ruleId:rule.id,minutes:60,reason:'Dispatch suppression'},'admin');
  let sends=0;await dispatchOne(async()=>{sends++;return 'forbidden';},Date.now()+10000);assert.equal(sends,0);assert.equal((await store.getDeliveries())[0].status,'cancelled');
 });
 await t.test('pause, changed recipient and unavailable provider block queued sends',async()=>{
  for(const silence of await store.listSilences())await store.endSilence(silence.id,'admin');
  rule=(await store.listRules())[0];await evaluate(rule,{health:'ok',value:0},Date.now());
  await store.enableRule(rule.id,false,'admin');assert.equal((await store.listRules())[0].state,'Paused');
  let sends=0;await dispatchOne(async()=>{sends++;return 'forbidden';},Date.now()+100000);assert.equal(sends,0);
  await store.enableRule(rule.id,true,'admin');rule=(await store.listRules())[0];
  await evaluate(rule,{health:'ok',value:160},Date.now());
  await store.saveContact(contact.id,{...contact,recipients:['new@example.com']},'admin');
  await dispatchOne(async()=>{sends++;return 'forbidden';},Date.now()+100000);assert.equal(sends,0);
  delete process.env.SMTP_FROM;rule=(await store.listRules())[0];await evaluate(rule,{health:'error'},Date.now()+2000000);
  assert.equal((await store.getDeliveries()).filter(row=>row.status==='pending').length,0);
 });
 await t.test('WhatsApp payload uses six approved-template parameters with no token in body',()=>{
  assert.equal(whatsappSettings().configured,false);
  const body=templateBody({template:'tomatoes_alert_status',language:'en_US'},'+5511999999999',{name:'Rule',phase:'Firing',severity:'Critical',target:'esp32',reading:'130 sec',condition:'> 120 sec'});
  assert.equal(body.to,'5511999999999');assert.equal(body.type,'template');assert.equal(body.template.components[0].parameters.length,6);assert(!JSON.stringify(body).includes('ACCESS_TOKEN'));
 });
 await t.test('API rejects anonymous writes and member management; administrators can CRUD',async apiTest=>{
  const app=express();app.use(express.json());require('../src/routes/users-routes').default(app);require('../src/routes/alerts-routes').default(app);const setupOta = require('../src/routes/ota-routes').default;
  setupOta(app);
  const simulatedOta = express.Router();
  setupOta(simulatedOta);
  app.use('/simulation', simulatedOta);
  app.use(require('../src/users/http').userError);
  server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
  const origin=`http://127.0.0.1:${server.address().port}`;
  async function req(method,url,body,token){const r=await fetch(origin+url,{method,headers:{'content-type':'application/json',...(token?{authorization:`Bearer ${token}`}:{})},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,body:r.status===204?null:await r.json()};}
  assert.equal((await req('GET','/api/alerts/rules')).status,401);
  const admin=(await req('POST','/api/users/login',{identifier:'admin',password:'admin'})).body;
  const bcrypt=require('bcryptjs');const password=await bcrypt.hash('member-password',10);
  await access(()=>run("INSERT INTO users(email,password,username,firstName,enabled,is_admin,is_builtin) VALUES (?,?,?,'Member',1,0,0)",['member@example.com',password,'member']));
  const member=(await req('POST','/api/users/login',{identifier:'member',password:'member-password'})).body;
  assert.equal((await req('GET','/api/alerts/rules',undefined,member.accessToken)).status,200);
  assert.equal((await req('GET','/api/alerts/contacts',undefined,member.accessToken)).status,403);
  assert.equal((await req('POST','/api/alerts/rules',input,member.accessToken)).status,403);
   await apiTest.test('OTA signing vector and route permissions without contacting a board', async () => {
   const { createHash } = require('node:crypto');
   const { deriveBoardKey, signFirmware } = require('../src/ota/controllers/otaControllers');
   const masterKey = '0123456789abcdef'.repeat(4);
   const host = 'esp32s3-07945C';
   const nonce = '00112233445566778899aabbccddeeff';
   const image = Buffer.concat([Buffer.from([0xe9]), Buffer.from('tomatoes'.repeat(4))]);
   const sha256 = createHash('sha256').update(image).digest('hex');
   assert.equal(sha256, '8dd65144d75367decdcd12419b523ef9c35f3f03ef7fc68d51d06c2f45c4e82b');
   const boardKey = deriveBoardKey(masterKey, host);
   assert.equal(boardKey, 'cf96f173783861c02782d29b77f5e503ca5532d0a7b048bf6568cf0907e486ab');
   assert.equal(signFirmware(boardKey, host, nonce, image.length, sha256), '9fcb55dd3b9bcbab5fbeb75db89a1c47970144858454ce10d7be5bb95037a8ab');
   const url = origin + '/ota/' + host + '/firmware';
   const send = async token => {
    const body = new FormData();
    body.append('file', new Blob([Buffer.from([0])]), 'firmware.bin');
    return (await fetch(url, { method: 'POST', headers: token ? { authorization: 'Bearer ' + token } : {}, body })).status;
   };
   const originalKey = process.env.OTA_MASTER_KEY;
   try {
    delete process.env.OTA_MASTER_KEY;
    assert.equal(await send(), 401);
    assert.equal(await send(member.accessToken), 403);
    assert.equal(await send(admin.accessToken), 503);
    process.env.OTA_MASTER_KEY = masterKey.toUpperCase();
    assert.equal(await send(admin.accessToken), 503);
    process.env.OTA_MASTER_KEY = masterKey;
    assert.equal(await send(admin.accessToken), 400);
   } finally {
    if (originalKey === undefined) delete process.env.OTA_MASTER_KEY;
    else process.env.OTA_MASTER_KEY = originalKey;
   }
  });
  await apiTest.test('OTA forwards a signed upload only to the verified board and audits the result', async test => {
   const mongoose = require('mongoose');
   const masterKey = '0123456789abcdef'.repeat(4);
   const originalKey = process.env.OTA_MASTER_KEY;
   const originalConnection = sourceHealth.mqttConnected;
   const host = 'esp32s3-07945C';
   const nonce = '00112233445566778899aabbccddeeff';
   const sha256 = '8dd65144d75367decdcd12419b523ef9c35f3f03ef7fc68d51d06c2f45c4e82b';
   const signature = '9fcb55dd3b9bcbab5fbeb75db89a1c47970144858454ce10d7be5bb95037a8ab';
   const image = Buffer.concat([Buffer.from([0xe9]), Buffer.from('tomatoes'.repeat(4))]);
   const inserted = [], completed = [];
   const realFetch = globalThis.fetch;
   let mode = 'success', uploads = 0, requests = 0;
   test.mock.method(mongoose.connection, 'collection', name => {
    assert.equal(name, 'ota_logs');
    return {
     async insertOne(entry) { inserted.push(entry); return { insertedId: inserted.length }; },
     async updateOne(filter, update) { completed.push({ id: filter._id, ...update.$set }); },
    };
   });
   test.mock.method(globalThis, 'fetch', async (url, options) => {
    if (url.startsWith(origin + '/')) return realFetch(url, options);
    requests++;
    if (url === 'http://192.168.0.250/update/nonce') {
     if (mode === 'nonce-503') return new Response(null, { status: 503 });
     return Response.json({ host: mode === 'wrong-host' ? 'unexpected-board' : host, nonce });
    }
    assert.equal(url, 'http://192.168.0.250/update');
    assert.equal(options.method, 'POST');
    assert.equal(options.redirect, 'error');
    assert.deepEqual(options.headers, {
     'X-OTA-Nonce': nonce, 'X-OTA-Size': '33', 'X-OTA-SHA256': sha256, 'X-OTA-Signature': signature,
    });
    const file = options.body.get('file');
    assert.equal(file.name, 'firmware.bin');
    assert.deepEqual(Buffer.from(await file.arrayBuffer()), image);
    uploads++;
    if (mode === 'upload-503') return new Response(null, { status: 503 });
    if (mode === 'busy') return Response.json({ ok: false, error: 'Pump is running' }, { status: 409 });
    return Response.json({ ok: true, restart_in_ms: 2000 });
   });
   try {
    process.env.OTA_MASTER_KEY = masterKey;
    sourceHealth.mqttConnected = true;
    await ingestDevice(Buffer.from(JSON.stringify({ host, ip: '192.168.0.250' })));
    for (const [scenario, status, expected] of [
     ['success', 200, { ok: true, restart_in_ms: 2000 }],
     ['wrong-host', 502, { ok: false, error: 'The board returned an invalid identity or nonce.' }],
     ['nonce-503', 503, { ok: false, error: 'Placa sem chave de OTA; grave a chave pela USB' }],
     ['upload-503', 503, { ok: false, error: 'Placa sem chave de OTA; grave a chave pela USB' }],
     ['busy', 409, { ok: false, error: 'Pump is running' }],
    ]) {
     mode = scenario;
     const body = new FormData();
     body.append('file', new Blob([image]), 'local-test.bin');
     const response = await fetch(origin + '/simulation/ota/' + host + '/firmware', {
      method: 'POST', headers: { authorization: 'Bearer ' + admin.accessToken }, body,
     });
     assert.equal(response.status, status, scenario);
     assert.deepEqual(await response.json(), { ...expected, sha256 });
    }
    assert.equal(requests, 8);
    assert.equal(uploads, 3);
    assert.deepEqual(completed.map(entry => entry.status), [200, 502, 503, 503, 409]);
    for (const entry of inserted) {
     assert.equal(entry.host, host);
     assert.equal(entry.username, 'admin');
     assert.equal(entry.sha256, sha256);
     assert.equal(entry.size, image.length);
     assert.deepEqual(Object.keys(entry).sort(), ['date', 'host', 'result', 'sha256', 'size', 'userId', 'username']);
    }
   } finally {
    sourceHealth.mqttConnected = originalConnection;
    if (originalKey === undefined) delete process.env.OTA_MASTER_KEY;
    else process.env.OTA_MASTER_KEY = originalKey;
   }
  });
 const settings=(await req('GET','/api/alerts/settings',undefined,admin.accessToken)).body;assert(settings.canManage);assert(!JSON.stringify(settings).includes(process.env.JWT_SECRET));
  const created=await req('POST','/api/alerts/rules',{...input,enabled:false},admin.accessToken);assert.equal(created.status,201);
  assert.equal((await req('DELETE',`/api/alerts/rules/${created.body.id}`,undefined,admin.accessToken)).status,204);
  await assert.rejects(store.removeContact(contact.id,'admin'),{status:409});
  assert((await store.getHistory(0)).some(row=>row.kind==='Firing'));
 });
});
