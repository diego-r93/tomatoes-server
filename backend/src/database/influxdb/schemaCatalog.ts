import { client, org } from './config/influxdb';

type SchemaFunction = 'measurements' | 'measurementFieldKeys' | 'measurementTagKeys' | 'measurementTagValues';

export function createSchemaCatalog(bucket: string) {
  const query = client.getQueryApi(org);
  const literal = (value: string) => JSON.stringify(value);

  return async (name: SchemaFunction, measurement?: string, tag?: string) => {
    const args = [
      `bucket: ${literal(bucket)}`,
      'start: -30d',
      ...(measurement === undefined ? [] : [`measurement: ${literal(measurement)}`]),
      ...(tag === undefined ? [] : [`tag: ${literal(tag)}`]),
    ];
    const flux = `import "influxdata/influxdb/schema"
schema.${name}(${args.join(', ')}) |> limit(n: 300)`;
    const rows = await query.collectRows<{ _value: unknown }>(flux);
    return rows.map(row => row._value);
  };
}
