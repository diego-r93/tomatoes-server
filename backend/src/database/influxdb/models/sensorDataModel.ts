import { client, org } from '../config/influxdb';
import { QueryApi } from '@influxdata/influxdb-client';

class SensorDataModel {
    private queryApi: QueryApi;

    constructor() {
        this.queryApi = client.getQueryApi(org);
    }

    public getSensorData(query: string): Promise<any[]> {
        const fluxQuery = query;

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
