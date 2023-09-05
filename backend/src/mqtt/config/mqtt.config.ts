import dotenv from 'dotenv';

dotenv.config();

const MQTT_HOST_NAME: string | undefined = process.env.MQTT_HOST_NAME;
const MQTT_USER_NAME: string | undefined = process.env.MQTT_USER_NAME;
const MQTT_PASSWORD: string | undefined = process.env.MQTT_PASSWORD;

export {
  MQTT_HOST_NAME,
  MQTT_USER_NAME,
  MQTT_PASSWORD
};
