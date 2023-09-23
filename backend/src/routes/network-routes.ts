import { Express, Router } from 'express';
import * as networkController from '../network/controllers/networkController';

const networkRoutes = (app: Express) => {
  const router = Router();

  router.get('/config/:type', networkController.getConfig);
  router.post('/config/:type', networkController.updateConfig);

  router.get('/devices', networkController.getDevices);

  app.use("/network", router);
};

export default networkRoutes;
