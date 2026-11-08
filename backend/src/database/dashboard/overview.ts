// Explicit installation migration: never called during normal server startup.
// Original panels and queries remain below the new overview rows.
export function dashboardOverview(dashboard:any) {
 const original=structuredClone(dashboard.charts);
 if(original.some((p:any)=>String(p.id).startsWith('overview-'))) return null;
 const charts:any[]=[];let x=0,y=0,height=0;
 const place=(panel:any,w:number,h:number)=>{if(x+w>12){x=0;y+=height;height=0;}panel.layout={...panel.layout,x,y,w,h,i:String(panel.id)};charts.push(panel);x+=w;height=Math.max(height,h);};
 const row=()=>{if(x){x=0;y+=height;height=0;}};
 const find=(title:string)=>original.find((p:any)=>p.options.chartTitle===title);
 const add=(base:any,type:string,title:string,settings:any={},w=3)=>{
  if(!base) return;
  const panel=structuredClone(base);panel.id='overview-'+type+'-'+base.id;panel.options.chartTitle=title;panel.data=[];
  // Summaries use last actual processed sample, never the last average bucket.
  panel.query=panel.query.replace(/\|> aggregateWindow[^\n]+/g,'|> last()');
  panel.visualization={type,reducer:'last',series:null,min:0,max:100,color:'#5794f2',showThresholds:true,thresholds:[],sparkline:false,staleAfterSeconds:180,mappings:[],...settings};
  place(panel,w,type==='stat'?8:9);
 };
 if(dashboard._id==='existing-charts') {
  add(find('CPU temperature'),'stat','CPU temperature — latest',{color:'#ff9830'});
  add(find('Memory used'),'stat','Memory used — latest',{color:'#73bf69'});
  const free=structuredClone(find('Storage used'));if(free){free.query=free.query.replace(/== "used"/g,'== "free"');add(free,'stat','Storage available',{color:'#80cbc4'});}
  add(find('System load (1 min)'),'stat','System load (1 min) — latest',{color:'#b877d9'});row();
  const cpu=structuredClone(find('CPU user usage'));if(cpu){cpu.query=cpu.query.replace('usage_user','usage_idle').replace('|> yield(name: "mean")','|> map(fn:(r)=>({r with _value:100.0-r._value}))');add(cpu,'gauge','CPU busy',{color:'#5794f2'},4);}
  add(find('Memory usage'),'gauge','Memory usage',{color:'#73bf69'},4);
  const disk=structuredClone(find('Storage used'));if(disk){disk.query=disk.query.replace(/== "used"/g,'== "used_percent"');disk.options.axes=[{},{}];if(disk.options.series?.[1])delete disk.options.series[1].scale;disk.options.unit='%';add(disk,'gauge','Storage usage',{color:'#b877d9'},4);}
 } else if(dashboard.name.startsWith('Hydroponics')) {
  add(find('pH (CN0326)'),'stat','pH (CN0326) — latest',{color:'#b877d9'});
  add(find('Conductivity'),'stat','Conductivity — latest',{color:'#5794f2'});
  add(find('NTC Temperature'),'stat','NTC Temperature — latest',{color:'#f2cc0c'});
  add(find('Air humidity (SHT35)'),'stat','Air humidity (SHT35) — latest',{color:'#80cbc4'});row();
  add(find('pH (CN0326)'),'gauge','pH (CN0326)',{min:0,max:14,color:'#b877d9'},4);
  add(find('NTC Temperature'),'gauge','NTC Temperature',{min:0,max:60,color:'#f2cc0c'},4);
  add(find('Air humidity (SHT35)'),'gauge','Air humidity (SHT35)',{min:0,max:100,color:'#80cbc4'},4);

  row();
  const host=/sensors\/([^/]+)\//.exec(original.map((p:any)=>p.query).join(' '))?.[1];
  if(host) for(const [key,pump] of [['connection',0],['driver',1],['driver',3]] as const){
   const id=`overview-live-${key}-${pump}`;
   place({id,data:[],query:'Live board status — ignores dashboard time range',liveSource:{kind:key,host,...(pump?{pump}:{})},options:{chartTitle:pump?`Pump ${String(pump).padStart(2,'0')} — latest driver result`:'Board connection',series:[{label:'Time'},{label:host}],axes:[{},{}]},processing:{multiplier:1,offset:0,minimum:'',maximum:'',decimals:0,gaps:'Gaps'},visualization:{type:'stat',reducer:'last',series:null,sparkline:false,staleAfterSeconds:pump?86400:90,color:'#5794f2',thresholds:pump?[{value:1,color:'#73bf69'},{value:2,color:'#f2495c'}]:[{value:1,color:'#73bf69'}],mappings:pump?[{value:0,text:'Not actuated'},{value:1,text:'Driver active'},{value:2,text:'Supply absent'},{value:3,text:'Short circuit'},{value:4,text:'Overtemperature'},{value:5,text:'Supply low'},{value:6,text:'No feedback'},{value:7,text:'Incomplete feedback'}]:[{value:0,text:'No recent reply'},{value:1,text:'Online'}]}},4,8);
  }
 } else if(dashboard._id.startsWith('battery-')) {
  const byId=(id:string)=>original.find((p:any)=>p.id==='battery-'+id);
  for(const [id,title,color] of [['voltage','Battery voltage','#5794f2'],['current','Charge / discharge current','#b877d9'],['power','Power (calculated)','#ff9830'],['age','Age of last valid reading','#80cbc4']]) add(byId(id),'stat',title,{color,thresholds:[],sparkline:false});
  row();
  add(byId('soc'),'gauge','State of charge',{min:0,max:100,color:'#73bf69',thresholds:[]},4);
  const temp=structuredClone(byId('temperatures'));if(temp){temp.query=temp.query.replace(/\|> aggregateWindow[^\n]+/g,'|> last()\n  |> group()\n  |> max()');add(temp,'gauge','Highest BMS probe temperature',{min:0,max:80,color:'#ff9830'},4);}
  add(byId('capacity'),'gauge','Remaining capacity',{min:0,max:50,color:'#80cbc4'},4);row();
  add(byId('connection'),'stat','Bluetooth connection',{sparkline:false,color:'#f2495c',thresholds:[{value:1,color:'#73bf69'}],mappings:[{value:0,text:'Disconnected'},{value:1,text:'Connected'}]},4);
  add(byId('protection'),'stat','BMS protection',{sparkline:false,color:'#73bf69',thresholds:[{value:1,color:'#f2495c'}],mappings:[{value:0,text:'Inactive'},{value:1,text:'Active'}]},4);
  add(byId('delta'),'stat','Cell voltage difference',{color:'#b877d9'},4);
  // Replace the original overview gauges; retain the historical and detail panels.
  const replaced=new Set(['soc','voltage','current','power','connection','age','protection','capacity','delta'].map(id=>'battery-'+id));
  row();for(const panel of original.filter((p:any)=>!replaced.has(p.id))){panel.visualization={...(panel.visualization||{}),type:panel.visualization?.type==='gauge'?'stat':'time-series',thresholds:[],sparkline:false,staleAfterSeconds:180};place(panel,6,12);}
  return {...dashboard,charts};
 } else return null;
 row();for(const panel of original)place(panel,6,12);
 return {...dashboard,charts};
}
