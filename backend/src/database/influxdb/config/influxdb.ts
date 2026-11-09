import { InfluxDB } from '@influxdata/influxdb-client';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const token = process.env.DOCKER_INFLUXDB_INIT_ADMIN_TOKEN || '';
const org = process.env.DOCKER_INFLUXDB_INIT_ORG || '';
// const bucket = process.env.DOCKER_INFLUXDB_INIT_BUCKET || '';
const port = process.env.DOCKER_INFLUXDB_INIT_PORT || '';
const host = process.env.DOCKER_INFLUXDB_INIT_HOST || '';
const url = `http://${host}:${port}`;

const client = new InfluxDB({ url: url, token: token });

export { client, org };

type HistoryBucket = {
  id: string;
  retentionRules: { type: string; everySeconds: number; shardGroupDurationSeconds?: number }[];
};

async function bucketRequest<T>(path: string, body?: object): Promise<T> {
  const response = await fetch(url + '/api/v2/buckets' + path, {
    method: body ? 'PATCH' : 'GET',
    headers: { Authorization: 'Token ' + token, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error('History settings request failed with HTTP ' + response.status);
  return await response.json() as T;
}

export async function getHistoryBucket() {
  const name = process.env.DOCKER_INFLUXDB_INIT_BUCKET || 'tomatoes';
  const query = new URLSearchParams({ name, org });
  const { buckets } = await bucketRequest<{ buckets: HistoryBucket[] }>('?' + query);
  if (!buckets?.[0]) throw new Error('History bucket unavailable');
  return buckets[0];
}

export function historyRetentionSeconds(bucket: HistoryBucket) {
  return bucket.retentionRules.find(rule => rule.type === 'expire')?.everySeconds ?? 0;
}

export async function setHistoryRetention(bucket: HistoryBucket, seconds: number) {
  const currentShard = bucket.retentionRules.find(rule => rule.type === 'expire')?.shardGroupDurationSeconds;
  const retentionRules = [{
    type: 'expire',
    everySeconds: seconds,
    ...(currentShard && currentShard > seconds ? { shardGroupDurationSeconds: 3600 } : {}),
  }];
  return bucketRequest<HistoryBucket>('/' + encodeURIComponent(bucket.id), { retentionRules });
}
