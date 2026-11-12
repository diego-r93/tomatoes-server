import sensorData from './models/sensorDataModel';

export function ecMeasurementHost(topic?: string) {
  return /^sensors\/([A-Za-z0-9._-]+)\/cn0411\/(?:cond|compensatedCond|tds)$/.exec(topic ?? '')?.[1];
}

export async function latestEcState(host: string, now = Date.now()) {
  const bucket = JSON.stringify(process.env.DOCKER_INFLUXDB_INIT_BUCKET || 'tomatoes');
  const topic = JSON.stringify(`sensors/${host}/cn0411/state`);
  const rows = await sensorData.getSensorData(`from(bucket: ${bucket})
    |> range(start: -45s)
    |> filter(fn: (r) => r._measurement == "mqtt_consumer" and r._field == "value" and r.topic == ${topic})
    |> group()
    |> sort(columns: ["_time"], desc: true)
    |> limit(n: 1)`);
  const at = Date.parse(rows[0]?._time);
  const code = Number(rows[0]?._value);
  if (!Number.isInteger(code) || code < 1 || code > 5 || !Number.isFinite(at) || at > now + 5000 || now - at > 45000) return null;
  return { code, at };
}
