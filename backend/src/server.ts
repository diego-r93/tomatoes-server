import dotenv from 'dotenv';

dotenv.config();

import express, { Router, Request, Response } from 'express';

const app = express();

import cors from 'cors';
import path from 'path';
import setupUsersRoutes from './routes/users-routes';
import setupMqttRoutes from './routes/mqtt-routes';

const host: string = process.env.BACKEND_HOST || '127.0.0.0';
const port: number = Number(process.env.BACKEND_PORT) || 3333;

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
  res.json({ message: 'hello world with Typescript' })
})

// Serve Vue.js as SPA in production
app.use(express.static('public'))

app.get('/', (req, res, next) => {
  res.sendFile(path.resolve(__dirname, './public/index.html'))
})

// app.get('*', (req, res, next) => {
//   res.sendFile(path.resolve(__dirname, './public/index.html'))
// })

app.use(route);

// Users
setupUsersRoutes(app)

// MQTT
setupMqttRoutes(app)

// Listen the server
app.listen(port, host, () => {
  console.log('Server listening on ' + host + ':' + port)
})
