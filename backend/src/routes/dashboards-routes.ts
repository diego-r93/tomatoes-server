import { Express, Router } from 'express';
import * as controller from '../database/dashboard/controllers/dashboard.controller';
import { livePanel } from '../database/dashboard/live';
import { authenticate, requireAdmin, endpoint } from '../users/http';
export default function dashboardRoutes(app: Express) {
  const router = Router();
  router.use(authenticate);
  router.get('/', endpoint(controller.getcharts));
  router.post('/saveCharts', requireAdmin, endpoint(controller.saveCharts));
  router.post('/live', endpoint(livePanel));
  router.get('/library', endpoint(controller.list));
  router.post('/library', requireAdmin, endpoint(controller.create));
  router.get('/schema', requireAdmin, endpoint(controller.schema));
  router.get('/library/:id/export', endpoint(controller.exportCharts));
  router.get('/library/:id', endpoint(controller.get));
  router.put('/library/:id', requireAdmin, endpoint(controller.update));
  router.delete('/library/:id', requireAdmin, endpoint(controller.remove));
  app.use('/dashboards', router);
}
