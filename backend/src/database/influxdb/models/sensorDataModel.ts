import { client, org, bucket } from '../config/influxdb';
import { QueryApi } from '@influxdata/influxdb-client';

class SensorDataModel {
    private queryApi: QueryApi;

    constructor() {
        this.queryApi = client.getQueryApi(org);
    }

    public getSensorData(bucket: string, query: string): Promise<any[]> {
        const fluxQuery = `
            from(bucket: "${bucket}")
            ${query}       
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
