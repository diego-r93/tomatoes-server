import { Express, Router } from 'express';
import * as publisherController from '../mqtt/controllers/mqtt.controller';

const mqttRoutes = (app: Express) => {
    const router = Router();

    router.get("/", publisherController.subscribeMQTTMessage);
    router.post("/", publisherController.publishMQTTMessage);
    router.patch("/:id", publisherController.updateGPIO);
    router.get("/getdevices", publisherController.getDevices);

    app.use("/mqtt", router);
};

export default mqttRoutes;
