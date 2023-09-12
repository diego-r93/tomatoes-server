import { InfluxDB } from '@influxdata/influxdb-client';
import dotenv from 'dotenv';

dotenv.config();

const token = process.env.DOCKER_INFLUXDB_INIT_USER_TOKEN || '';
const org = process.env.DOCKER_INFLUXDB_INIT_ORG || '';
const bucket = process.env.DOCKER_INFLUXDB_INIT_BUCKET || '';
const port = process.env.DOCKER_INFLUXDB_INIT_PORT || '';
const host = process.env.DOCKER_INFLUXDB_INIT_HOST || '';
const url = `http://${host}:${port}`;

const client = new InfluxDB({ url: url, token: token });

export { client, org, bucket };
