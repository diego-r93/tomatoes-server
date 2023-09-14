import { Express, Router } from 'express';
import * as sensorDataController from '../database/influxdb/controllers/sensorDataController';

const influxRoutes = (app: Express) => {
    const router = Router();

    router.post("/", sensorDataController.fetchData);    

    app.use("/influx", router);
};

export default influxRoutes;
