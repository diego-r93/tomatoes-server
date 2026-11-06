import { recentDevice } from '../../alerts/sources';
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
        const host = req.params.id;
        const values = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? Object.entries(req.body) : [];
        if (!/^[a-zA-Z0-9._-]{1,128}$/.test(host) || values.length !== 1 || !/^\d{1,3}$/.test(values[0][0]) || Number(values[0][0]) > 255 || typeof values[0][1] !== 'boolean') {
            res.status(400).json({ message: 'Select one device output and a boolean state.' });
            return;
        }
        const [gpio, state] = values[0];
        const device = await recentDevice(host);
        if (!device || !Object.values(device.ports || {}).some(port => port?.gpio != null && port.gpio !== '' && Number(port.gpio) === Number(gpio))) {
            res.status(409).json({ message: 'The device or output has not been confirmed by discovery.' });
            return;
        }
        const topic = `${host}/output`;
        const message = { [Number(gpio)]: state };
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

        const timeout = 1000; // Tempo em milissegundos para aguardar respostas

        const devicesPromise: Promise<void> = new Promise((resolve, reject) => {
            mqttClient.setMessageCallback((topic: string, message: Buffer) => {
                console.log(`Successfully subscribe on MQTT topic ${topic}`);
                console.log(`Received Message :: ${message.toString()}`);

                const device = JSON.parse(message.toString());
                devices.push(device);

                setTimeout(resolve, timeout);
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

        console.log(JSON.stringify(result, null, 2));

        res.status(200).json(result);
    } catch (error: any) {
        res.status(400).json({ status: 400, message: error.message });
    }
};
