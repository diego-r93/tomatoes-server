import { Express, Router } from 'express';
import * as controller from '../database/dashboard/controllers/dashboard.controller';
import { authenticate, endpoint } from '../users/http';
export default function dashboardRoutes(app: Express) {
  const router = Router();
  router.use(authenticate);
  router.get('/', endpoint(controller.getcharts));
  router.post('/saveCharts', endpoint(controller.saveCharts));
  router.get('/library', endpoint(controller.list));
  router.post('/library', endpoint(controller.create));
  router.get('/schema', endpoint(controller.schema));
  router.get('/library/:id/export', endpoint(controller.exportCharts));
  router.get('/library/:id', endpoint(controller.get));
  router.put('/library/:id', endpoint(controller.update));
  router.delete('/library/:id', endpoint(controller.remove));
  app.use('/dashboards', router);
}
