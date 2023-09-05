import MQTTService from '../service/mqttService';
import { Request, Response } from 'express';
import { MQTT_HOST_NAME, MQTT_USER_NAME, MQTT_PASSWORD } from '../config/mqtt.config';

const messageCallback = (topic: string, message: Buffer) => {
    console.log(`Message received on ${topic}: ${message.toString()}`);
};

const mqttClient = new MQTTService(MQTT_HOST_NAME!, MQTT_USER_NAME!, MQTT_PASSWORD!, messageCallback);
mqttClient.connect();

export const publishMQTTMessage = async (req: Request, res: Response): Promise<void> => {
    try {
        const topic: string = req.body.topic;
        const message: string = req.body.message;

        console.log(`Request Topic :: ${topic}`);
        console.log(`Request Message :: ${message}`);

        mqttClient.publish(topic, message);
        res.status(200).json({ status: "200", message: "Successfully published MQTT Message" });
    } catch (error: any) {
        res.status(400).json({ status: 400, message: error.message });
    }
}

export const subscribeMQTTMessage = async (req: Request, res: Response): Promise<void> => {
    try {
        const topic: string = req.body.topic;

        console.log(`Request Topic :: ${topic}`);

        mqttClient.subscribe(topic);
        res.status(200).json({ status: "200", message: `Successfully subscribe on MQTT topic ${topic}` });
    } catch (error: any) {
        res.status(400).json({ status: 400, message: error.message });
    }
}

export const updateGPIO = async (req: Request, res: Response): Promise<void> => {
    try {
        const id: string = req.params.id;
        const topic: string = `${id}/output`;
        const message: object = req.body;

        console.log(`Request Topic :: ${topic}`);
        console.log(`Request Message :: ${message}`);

        mqttClient.publish(topic, JSON.stringify(message));
        res.status(200).json({ status: "200", message: "Successfully published MQTT Message" });
    } catch (error: any) {
        res.status(400).json({ status: 400, message: error.message });
    }
}

export const getDevices = async (req: Request, res: Response): Promise<void> => {
    try {
        const devices: any[] = [];
        const topic: string = 'getdevices';
        const message: string = 'get all';

        const devicesPromise: Promise<void> = new Promise((resolve, reject) => {
            mqttClient.setMessageCallback((topic: string, message: Buffer) => {
                console.log(`Successfully subscribe on MQTT topic ${topic}`);
                console.log(`Received Message :: ${message.toString()}`);

                const device = JSON.parse(message.toString());
                devices.push(device);

                setTimeout(resolve, 1000);
            });

            mqttClient.subscribe('devices');
            mqttClient.publish(topic, message);
        });

        await devicesPromise;

        mqttClient.unsubscribe('devices');

        const result = {
            devicesNumber: devices.length,
            devicesInformation: devices,
        };

        res.status(200).json(result);
    } catch (error: any) {
        res.status(400).json({ status: 400, message: error.message });
    }
};
