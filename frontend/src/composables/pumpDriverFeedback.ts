import type { DiscoveredDevice } from './deviceInventoryUtils';
import type { DeviceDriverReport, DriverResult } from './deviceReportTypes';

const messages = {
  actuated: 'Actuated', 'supply-missing': 'Not actuated: pump power supply absent',
  short: 'Driver fault: short circuit', temperature: 'Driver fault: overtemperature',
  'supply-low': 'Driver fault: pump supply undervoltage', 'not-actuated': 'Not actuated',
  missing: 'No driver feedback', incomplete: 'Incomplete driver feedback',
  waiting: 'Waiting for driver feedback', unobserved: 'No pulse observed',
};
export const driverMessage = (result: DriverResult) => messages[result] || messages.unobserved;
export const driverProblem = (result: DriverResult) => ['supply-missing','short','temperature','supply-low','not-actuated','missing','incomplete'].includes(result);
export function driverIssues(devices: DiscoveredDevice[]) {
  return devices.flatMap(device => (device.driverPulses || []).filter(pulse => driverProblem(pulse.result)).map(pulse => ({...pulse, host:device.host, deviceKey:device.key})));
}
export function mergeDriverFeedback(devices: DiscoveredDevice[], feedback: DeviceDriverReport[]): DiscoveredDevice[] {
  if (!Array.isArray(feedback)) throw new Error('Invalid driver feedback response');
  const byHost = new Map(feedback.filter(entry => typeof entry?.host === 'string' && Array.isArray(entry.pumps)).map(entry => [entry.host, entry.pumps]));
  return devices.map(device => byHost.has(device.host) ? {...device, driverPulses:byHost.get(device.host)} : device);
}
