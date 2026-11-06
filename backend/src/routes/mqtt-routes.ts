import { listRegisteredDevices } from '../mqtt/deviceRegistry';
import { authenticate, endpoint, requireAdmin } from '../users/http';
import { Express, Router } from 'express';
import * as publisherController from '../mqtt/controllers/mqtt.controller';

const mqttRoutes = (app: Express) => {
    const router = Router();

    router.get("/", authenticate, requireAdmin, publisherController.subscribeMQTTMessage);
    router.post("/", authenticate, requireAdmin, publisherController.publishMQTTMessage);
    router.patch("/:id/outputs/off", authenticate, publisherController.turnOffAllOutputs);
    router.patch("/:id", authenticate, publisherController.updateGPIO);
    router.get("/getdevices", authenticate, publisherController.getDevices);

    router.get("/registry", authenticate, requireAdmin, endpoint(async (_req, res) => { res.json(await listRegisteredDevices()); }));
    app.use("/mqtt", router);
};

export default mqttRoutes;
