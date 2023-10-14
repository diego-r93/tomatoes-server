import { Request, Response } from 'express';
import sensorDataModel from '../models/sensorDataModel';

export const fetchData = async (req: Request, res: Response) => {
    const { query } = req.body;

    // Verifique se o bucket e a query foram fornecidos.
    if (!query) {
        res.status(400).send('Query is required in the request body.');
        return;
    }

    try {
        const data = await sensorDataModel.getSensorData(query);
        // console.log(data);
        res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error querying InfluxDB');
    }
};
