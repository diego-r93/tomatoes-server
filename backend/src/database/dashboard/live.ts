import { HttpError } from '../../users/types';
import { sourceHealth } from '../../alerts/sources';
import { installedDeviceInventory } from '../../mqtt/deviceRegistry';
import { pumpDriverSnapshots } from '../../mqtt/pumpDrivers';
import { validateLiveSource } from './liveSource';
import { findDashboard } from './readRepository';

const driverCodes: Record<string, number> = {
  actuated: 1, 'not-actuated': 0, 'supply-missing': 2, short: 3,
  temperature: 4, 'supply-low': 5, missing: 6, incomplete: 7,
};

interface LivePanelRequest {
  source?: unknown;
  dashboardId?: string;
  panelId?: string;
}

export async function readLivePanel(
  request: LivePanelRequest,
  isAdmin: boolean,
  dependencies = { inventory: installedDeviceInventory, snapshots: pumpDriverSnapshots },
) {
  let input = request.source;
  if (input) {
    if (!isAdmin) throw new HttpError(403, 'Only administrators can preview a draft source.');
  } else {
    const dashboard = await findDashboard(String(request.dashboardId));
    const panel = dashboard?.charts.find(chart => String(chart.id) === String(request.panelId));
    if (!panel?.liveSource) throw new HttpError(404, 'Live panel not found.');
    input = panel.liveSource;
  }

  const source = validateLiveSource(input);
  if (!sourceHealth.mqttConnected) throw new HttpError(503, 'Live MQTT observations are unavailable.');

  const devices = await dependencies.inventory(true, 0);
  const device = devices.find(entry => entry.host === source.host);
  if (!device) throw new HttpError(403, 'The board is not approved.');

  let value: number | null;
  let timestamp: number | null;
  if (source.kind === 'connection') {
    value = device.online ? 1 : 0;
    timestamp = device.receivedAt;
  } else {
    const pump = String(source.pump).padStart(2, '0');
    const [board] = await dependencies.snapshots([source.host]);
    const snapshot = board?.pumps.find(entry => entry.pump === pump);
    value = snapshot && Object.hasOwn(driverCodes, snapshot.result) ? driverCodes[snapshot.result] : null;
    timestamp = snapshot?.latest?.startAt ?? snapshot?.latest?.expectedAt ?? null;
  }

  if (value === null || timestamp === null) return [];
  return [{ _time: new Date(timestamp).toISOString(), _field: 'value', _value: value, host: source.host }];
}
