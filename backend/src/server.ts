import dotenv from 'dotenv';

dotenv.config();

import express, { Router, Request, Response } from 'express';

const app = express();

import cors from 'cors';
import path from 'path';
import setupAlerts from './routes/alerts-routes';
import { startAlerts, monitor } from './alerts/engine';
import { alertsReady } from './alerts/database';
import setupUsersRoutes from './routes/users-routes';
import setupGroupsRoutes from './routes/groups-routes';
import setupInvitationsRoutes from './routes/invitations-routes';
import { usersReady } from './users/database';
import { validatePresentedSession, userError } from './users/http';
import { emailSettings } from './users/mail';
import setupBoardsRoutes from './routes/boards-routes';
import { migrateCharts } from './database/dashboard/migrate';
import setupDashBoardsRoutes from './routes/dashboards-routes';
import setupMqttRoutes from './routes/mqtt-routes';
import setupInfluxRoutes from './routes/influxdb-routes';
import setupNetworkRoutes from './routes/network-routes';
import OTARoutes from './routes/ota-routes';

const host: string = process.env.BACKEND_HOST || '127.0.0.0';
const port: number = Number(process.env.BACKEND_PORT) || 3333;

import db from "./database/mongodb/models";

const { mongoose, url } = db;

const mongoReady = mongoose
  .connect(url)
  .then(() => {
    console.log("Connected to the database!");
    return migrateCharts();
  })
  .catch((err: Error) => {
    console.log("Cannot connect to the database!", err);
    throw err;
  });

// The backend is reached through the single Nginx hop in Compose.
app.set('trust proxy', 1);
const publicUrl = emailSettings().publicUrl;
const corsOptions = { origin: publicUrl ? new URL(publicUrl).origin : `http://${host}` };
app.use(cors(corsOptions));

const route = Router();

// Parse requests of content-type - application/json
app.use(express.json({ limit: '2mb' }));

// Parse requests of content-type - application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));

route.get('/', (req: Request, res: Response) => {
  res.json({ message: 'hello world with Typescript' });
})

// Serve Vue.js as SPA in production
app.use(express.static('public'));

app.get('/', (req, res, next) => {
  res.sendFile(path.resolve(__dirname, './public/index.html'));
})

// app.get('*', (req, res, next) => {
//   res.sendFile(path.resolve(__dirname, './public/index.html'));
// })

app.use(route);

// Users
setupUsersRoutes(app);
setupGroupsRoutes(app);
setupInvitationsRoutes(app);
setupAlerts(app);

// Keep legacy device clients unchanged; a presented web token is always checked.
app.use(['/boards', '/dashboards', '/mqtt', '/influx', '/network', '/ota'], validatePresentedSession);

// Boards
setupBoardsRoutes(app);

// Dashboards
setupDashBoardsRoutes(app);

// MQTT
setupMqttRoutes(app);

// InfluxDB
setupInfluxRoutes(app);

// Network
setupNetworkRoutes(app);

// OTA
OTARoutes(app);

// Listen the server
app.use(userError);
Promise.all([usersReady, alertsReady, mongoReady]).then(async () => {
  try { await startAlerts(); }
  catch (error) {
    monitor.running=false;
    monitor.error='The alert monitor could not start. Check the backend MQTT configuration.';
    console.error('Alert monitor startup failed:', error instanceof Error ? error.name : 'Unknown error');
  }
  app.listen(port, host, () => console.log('Server listening on ' + host + ':' + port));
}).catch((error: unknown) => {
  console.error('Backend initialization failed:', error instanceof Error ? error.name : 'Unknown error');
  if(error instanceof Error)console.error(error.stack?.split('\n').slice(1,5).join('\n'));
  console.error('Check the user database and alert monitor configuration.');
  process.exitCode = 1;
});
