import { Express, Router } from 'express';
import { fetchData, fetchSavedPanel } from '../database/influxdb/controllers/sensorDataController';
import { authenticate, endpoint, requireAdmin } from '../users/http';

export default function influxRoutes(app: Express) {
  const router = Router();
  router.use(authenticate);
  router.post('/panel', endpoint(fetchSavedPanel));
  router.post('/', requireAdmin, fetchData);
  app.use('/influx', router);
}
