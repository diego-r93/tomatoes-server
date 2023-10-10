import { Express, Router } from 'express';
import * as dashboardController from '../database/dashboard/controllers/dashboard.controller';

const dashboardRoutes = (app: Express) => {
  const router = Router();

  router.get("/", dashboardController.getcharts);

  router.post("/saveCharts", dashboardController.saveCharts);

  app.use("/dashboards", router);
};

export default dashboardRoutes;