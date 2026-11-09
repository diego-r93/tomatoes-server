import express, { type ErrorRequestHandler, type Express, Router } from 'express';
import cors from 'cors';
import path from 'node:path';

interface AppOptions {
  origin: string;
  mountRoutes: (app: Express) => void;
  errorHandler: ErrorRequestHandler;
}

export function createApp({ origin, mountRoutes, errorHandler }: AppOptions): Express {
  const app = express();
  // The backend is reached through the single Nginx hop in Compose.
  app.set('trust proxy', 1);
  app.use(cors({ origin }));
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  const root = Router();
  root.get('/', (_req, res) => res.json({ message: 'hello world with Typescript' }));
  app.use(express.static('public'));
  app.get('/', (_req, res) => res.sendFile(path.resolve(__dirname, './public/index.html')));
  app.use(root);

  mountRoutes(app);
  app.use(errorHandler);
  return app;
}
