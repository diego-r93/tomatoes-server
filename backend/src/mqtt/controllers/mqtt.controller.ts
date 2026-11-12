import { HttpError } from '../../users/types';
import { createOutputCommands } from '../outputCommands';
import { expectPumpPulse } from '../pumpDrivers';
import { observedOutputs, recentDevice } from '../../alerts/sources';
import MQTTService from '../service/mqttService';
import { Request, Response } from 'express';
import { MQTT_HOST_NAME, MQTT_USER_NAME, MQTT_PASSWORD } from '../config/mqtt.config';

const messageCallback = (topic: string, message: Buffer) => {
    console.log(`Message received on ${topic}: ${message.toString()}`);
};

const mqttClient = new MQTTService(MQTT_HOST_NAME!, MQTT_USER_NAME!, MQTT_PASSWORD!, messageCallback);
export function startMqttPublisher(): void {
    mqttClient.connect();
}

export const publishMQTTMessage = async (req: Request, res: Response): Promise<void> => {
    try {
        const topic: string = req.body.topic;
        if (typeof topic !== 'string' || topic.endsWith('/setup/req')) {
            res.status(400).json({ message: 'Use the board setup endpoint for setup commands.' });
            return;
        }
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

const outputCommands = createOutputCommands({
    recentDevice,
    publish: (topic, message) => mqttClient.publish(topic, message),
    publishWhileConnected: (topic, message) => mqttClient.publishWhileConnected(topic, message),
    reportedGpios: device => Object.keys(observedOutputs(device?.ports, {}, false, Date.now())).map(Number),
    expectPulse: (code, time) => expectPumpPulse(code, time, 'command'),
});

export const updateGPIO = async (req: Request, res: Response): Promise<void> => {
    try {
        await outputCommands.setOutput(req.params.id as string, req.body);
        res.status(200).json({ status: "200", message: "Successfully published MQTT Message" });
    } catch (error: any) {
        if (error instanceof HttpError) {
            res.status(error.status).json({ message: error.message });
            return;
        }
        res.status(400).json({ status: 400, message: error.message });
    }
};

export const turnOffAllOutputs = async (req: Request, res: Response): Promise<void> => {
    try {
        const gpios = await outputCommands.turnOffAll(req.params.id as string);
        res.status(202).json({ gpios });
    } catch (error) {
        if (error instanceof HttpError) {
            res.status(error.status).json({ message: error.message });
            return;
        }
        res.status(503).json({ message: 'Could not send the OFF command. Check the MQTT connection.' });
    }
};
