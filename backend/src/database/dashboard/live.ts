import { validateLiveSource } from './liveSource';
import { Request,Response } from 'express';
import Dashboard from './models/dashboard.model';
import { HttpError } from '../../users/types';
import { context } from '../../users/http';
import { sourceHealth } from '../../alerts/sources';
import { installedDeviceInventory } from '../../mqtt/deviceRegistry';
import { pumpDriverSnapshots } from '../../mqtt/pumpDrivers';
export async function livePanel(req:Request,res:Response,dependencies={inventory:installedDeviceInventory,snapshots:pumpDriverSnapshots}) {
 let input=req.body.source;
 if(input) {if(!context(res).user.is_admin) throw new HttpError(403,'Only administrators can preview a draft source.');}
 else {const dashboard=await Dashboard.findById(req.body.dashboardId).lean();const panel=dashboard?.charts.find((p:any)=>String(p.id)===String(req.body.panelId));if(!panel?.liveSource) throw new HttpError(404,'Live panel not found.'); input=panel.liveSource;}
 const source=validateLiveSource(input);
 if(!sourceHealth.mqttConnected) throw new HttpError(503,'Live MQTT observations are unavailable.');
 const devices=await dependencies.inventory(true,0);const device=devices.find(d=>d.host===source.host);
 if(!device) throw new HttpError(403,'The board is not approved.');
 let value:number|null=null,at:number|null=null;
 if(source.kind==='connection'){value=device.online?1:0;at=device.receivedAt;}
 else {const snapshot=(await dependencies.snapshots([source.host]))[0]?.pumps.find(p=>p.pump===String(source.pump).padStart(2,'0'));const codes:Record<string,number>={actuated:1,'not-actuated':0,'supply-missing':2,short:3,temperature:4,'supply-low':5,missing:6,incomplete:7};value=snapshot&&Object.hasOwn(codes,snapshot.result)?codes[snapshot.result]:null;at=snapshot?.latest?.startAt??snapshot?.latest?.expectedAt??null;}
 res.json(value===null||at===null?[]:[{_time:new Date(at).toISOString(),_field:'value',_value:value,host:source.host}]);
}
