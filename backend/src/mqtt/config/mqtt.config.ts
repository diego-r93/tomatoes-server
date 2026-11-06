import { createHmac } from 'node:crypto';
import dotenv from 'dotenv';

dotenv.config();

const MQTT_HOST_NAME: string | undefined = process.env.MQTT_HOST_NAME;
export function mqttCredentials() {
  if (process.env.MQTT_DEDICATED_BACKEND !== 'true') {
    return { username: process.env.MQTT_USER_NAME, password: process.env.MQTT_PASSWORD };
  }
  const master = process.env.OTA_MASTER_KEY;
  if (!master || !/^[a-f0-9]{64}$/.test(master)) throw new Error('Dedicated MQTT credentials require OTA_MASTER_KEY.');
  return {
    username: 'tomatoes-backend',
    password: createHmac('sha256', master).update('mqtt|tomatoes-backend').digest('hex'),
  };
}

const { username: MQTT_USER_NAME, password: MQTT_PASSWORD } = mqttCredentials();

export {
  MQTT_HOST_NAME,
  MQTT_USER_NAME,
  MQTT_PASSWORD
};
