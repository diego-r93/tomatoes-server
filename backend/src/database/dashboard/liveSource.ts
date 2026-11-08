import { HttpError } from '../../users/types';
export function validateLiveSource(value:any) {
 if(!value || !['connection','driver'].includes(value.kind) || !/^esp32[A-Za-z0-9]*-[A-Za-z0-9][A-Za-z0-9._-]{0,100}$/.test(value.host)) throw new HttpError(400,'Invalid live board source.');
 if(value.kind==='driver' && (!Number.isInteger(value.pump)||value.pump<1||value.pump>4)) throw new HttpError(400,'Invalid pump number.');
 return {kind:value.kind,host:value.host,pump:value.pump};
}
