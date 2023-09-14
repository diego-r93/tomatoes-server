import { Request, Response } from 'express';
import sensorDataModel from '../models/sensorDataModel';

export const fetchData = async (req: Request, res: Response) => {
    const { bucket, query } = req.body;

    // Verifique se o bucket e a query foram fornecidos.
    if (!bucket || !query) {
        res.status(400).send('Both bucket and query are required in the request body.');
        return;
    }

    try {
        const data = await sensorDataModel.getSensorData(bucket, query);
        console.log(data);
        res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error querying InfluxDB');
    }
};
