import { startPumpDriverTracking } from './mqtt/pumpDrivers';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

import { createApp } from './app';
import { mountRoutes } from './routes';
import { startMqttPublisher } from './mqtt/controllers/mqtt.controller';
import { startAlerts, monitor } from './alerts/engine';
import { alertsReady } from './alerts/database';
import { usersReady } from './users/database';
import { userError } from './users/http';
import { emailSettings } from './users/mail';
import { migrateCharts } from './database/dashboard/migrate';
import { provisionBatteryDashboard } from './database/dashboard/battery-dashboard';
import { startFactoryAdmission } from './mqtt/factoryAdmission';
import { startScheduleSync } from './mqtt/schedules';
import { migrateRegisteredDevices } from './mqtt/deviceRegistry';

const host: string = process.env.BACKEND_HOST || '127.0.0.0';
const port: number = Number(process.env.BACKEND_PORT) || 3333;

import db from "./database/mongodb/models";

const { mongoose, url } = db;

startMqttPublisher();

const mongoReady = mongoose
  .connect(url)
  .then(() => {
    console.log("Connected to the database!");
    return Promise.all([migrateCharts(), migrateRegisteredDevices(), provisionBatteryDashboard().catch(() => {
      console.error("Battery dashboard provisioning failed. Existing dashboards were preserved.");
    })]);
  })
  .catch((err: Error) => {
    console.log("Cannot connect to the database!", err);
    throw err;
  });

const publicUrl = emailSettings().publicUrl;
const origin = publicUrl ? new URL(publicUrl).origin : `http://${host}`;
const app = createApp({ origin, mountRoutes, errorHandler: userError });

Promise.all([usersReady, alertsReady, mongoReady]).then(async () => {
  try { await startPumpDriverTracking(); }
  catch (error) { console.warn('Pump driver tracking startup failed:', error instanceof Error ? error.name : 'Unknown error'); }
  try { await startAlerts(); }
  catch (error) {
    monitor.running=false;
    monitor.error='The alert monitor could not start. Check the backend MQTT configuration.';
    console.error('Alert monitor startup failed:', error instanceof Error ? error.name : 'Unknown error');
  }
  startScheduleSync();
  startFactoryAdmission();
  app.listen(port, host, () => console.log('Server listening on ' + host + ':' + port));
}).catch((error: unknown) => {
  console.error('Backend initialization failed:', error instanceof Error ? error.name : 'Unknown error');
  if(error instanceof Error)console.error(error.stack?.split('\n').slice(1,5).join('\n'));
  console.error('Check the user database and alert monitor configuration.');
  process.exitCode = 1;
});
