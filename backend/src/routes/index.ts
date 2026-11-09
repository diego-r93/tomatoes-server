import type { Express } from 'express';
import { validatePresentedSession } from '../users/http';
import setupUsers from './users-routes';
import setupGroups from './groups-routes';
import setupInvitations from './invitations-routes';
import setupAlerts from './alerts-routes';
import setupBoards from './boards-routes';
import setupDashboards from './dashboards-routes';
import setupMqtt from './mqtt-routes';
import setupInflux from './influxdb-routes';
import setupNetwork from './network-routes';
import setupOta from './ota-routes';

export function mountRoutes(app: Express): void {
  setupUsers(app);
  setupGroups(app);
  setupInvitations(app);
  setupAlerts(app);

  app.use('/boards', validatePresentedSession);
  setupBoards(app);
  setupDashboards(app);
  setupMqtt(app);
  setupInflux(app);
  setupNetwork(app);
  setupOta(app);
}
