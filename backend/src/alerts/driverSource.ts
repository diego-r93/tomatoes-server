import { Source, Sample } from './types';
import { Pulse, pulseResult } from '../mqtt/pumpDriverState';

// Pulse results persist until the next pulse. A stored success is not water-flow proof.
export function driverSample(source:Source, snapshot:{latest:(Pulse & {result?:string})|null}|undefined,time=Date.now()):Sample {
 const pulse=snapshot?.latest;
 if(!pulse) return {health:'missing',reason:'No pulse has been observed for this pump.'};
 const at=pulse.startAt ?? pulse.expectedAt;
 if(at === undefined || at === null || at > time+5000) return {health:'missing',reason:'No valid pulse timestamp is available.'};
 const result=pulseResult(pulse,time);
 if(['waiting','unobserved'].includes(result)) return {health:'missing',at,reason:'Waiting for driver feedback.'};
 const noFeedback=['missing','incomplete'].includes(result);
 if(noFeedback && source.condition !== 'missing') return {health:'missing',at,reason:'The expected driver feedback is missing or incomplete.'};
 const matches=source.condition==='missing'?noFeedback:source.condition==='failure'?result!=='actuated':source.condition==='supply'?['supply-missing','supply-low'].includes(result):source.condition===result;
 return {health:'ok',value:matches?1:0,at,reason:`Latest pulse: ${result}. End ${pulse.endAt === null?'not received':'received'}.`};
}
