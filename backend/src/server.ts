import dotenv from 'dotenv';

dotenv.config();

import express, { Router, Request, Response } from 'express';

const app = express();

import cors from 'cors';
import path from 'path';
import setupUsersRoutes from './routes/users-routes';
import setupBoardsRoutes from './routes/boards-routes';
import setupMqttRoutes from './routes/mqtt-routes';
import setupInfluxRoutes from './routes/influxdb-routes';
import setupNetworkRoutes from './routes/network-routes';

const host: string = process.env.BACKEND_HOST || '127.0.0.0';
const port: number = Number(process.env.BACKEND_PORT) || 3333;

import db from "./database/mongodb/models";

const { mongoose, url } = db;

mongoose
  .connect(url)
  .then(() => {
    console.log("Connected to the database!");
  })
  .catch((err: Error) => {
    console.log("Cannot connect to the database!", err);
    process.exit();
  });

const corsOptions = {
  origin: `http://${host}`
};
app.use(cors(corsOptions));

const route = Router();

// Parse requests of content-type - application/json
app.use(express.json());

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

// Boards
setupBoardsRoutes(app);

// MQTT
setupMqttRoutes(app);

// InfluxDB
setupInfluxRoutes(app);

// Network
setupNetworkRoutes(app);

// Listen the server
app.listen(port, host, () => {
  console.log('Server listening on ' + host + ':' + port);
});
