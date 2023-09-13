import { client, org, bucket } from '../config/influxdb';
import { QueryApi } from '@influxdata/influxdb-client';

class SensorDataModel {
    private queryApi: QueryApi;

    constructor() {
        this.queryApi = client.getQueryApi(org);
    }

    public getSensorData(): Promise<any[]> {
        const fluxQuery = `
            from(bucket: "${bucket}")
            |> range(start: -5m)
            |> filter(fn: (r) => r._measurement == "cpu_temperature")            
        `;

        return new Promise((resolve, reject) => {
            const results: any[] = [];
            this.queryApi.queryRows(fluxQuery, {
                next(row, tableMeta) {
                    const tableObject = tableMeta.toObject(row);
                    results.push(tableObject);
                },
                error(error) {
                    reject(error);
                },
                complete() {
                    resolve(results);
                },
            });
        });
    }
}

const sensorDataModel = new SensorDataModel();
export default sensorDataModel;
