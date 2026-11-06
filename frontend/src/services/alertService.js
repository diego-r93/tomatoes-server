import { formatDateTime } from '@/composables/dateTime.mjs';
import { http } from './http-common';
const root='/api/alerts';
export const alertService={
 get: (path,params)=>http.get(`${root}/${path}`,{params,timeout:15000}).then(response=>response.data),
 save: (path,item)=>http[item.id?'put':'post'](`${root}/${path}${item.id?`/${item.id}`:''}`,item).then(response=>response.data),
 remove:(path,id)=>http.delete(`${root}/${path}/${id}`),
 enabled:(id,enabled)=>http.patch(`${root}/rules/${id}`,{enabled}),
};
export const alertError=error=>error.response?.data?.message||'The alert service is unavailable. Please try again.';
export const stateColor=state=>({'Normal':'success','Pending':'warning','Firing':'error','No data':'warning','Error':'error','Paused':'muted'}[state]||'muted');
export const dateLabel=value=>formatDateTime(value, 'Browser', 'Never');
export const sourceLabel=source=>({'device_age':'Device last seen','wifi':'Wi-Fi signal','output_on':'GPIO ON duration','cpu_temperature':'CPU temperature','disk_usage':'Disk usage','metric_age':'Telemetry age','metric':source.measurement||'Sensor metric'}[source.kind]);
export const ruleUnit=source=>({'device_age':'sec','wifi':'dBm','output_on':'sec','cpu_temperature':'°C','disk_usage':'%','metric_age':'sec','metric':source.unit||''}[source.kind]);
