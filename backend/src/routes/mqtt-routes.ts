import { authenticate, requireAdmin } from '../users/http';
import { Express, Router } from 'express';
import * as publisherController from '../mqtt/controllers/mqtt.controller';

const mqttRoutes = (app: Express) => {
    const router = Router();

    router.get("/", authenticate, requireAdmin, publisherController.subscribeMQTTMessage);
    router.post("/", authenticate, requireAdmin, publisherController.publishMQTTMessage);
    router.patch("/:id", authenticate, publisherController.updateGPIO);
    router.get("/getdevices", authenticate, publisherController.getDevices);

    app.use("/mqtt", router);
};

export default mqttRoutes;
