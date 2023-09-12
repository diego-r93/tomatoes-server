import { Request, Response } from 'express';
import sensorDataModel from '../models/sensorDataModel';

export const fetchData = async (req: Request, res: Response) => {
    try {
        const data = await sensorDataModel.getSensorData();
        console.log(data);
        res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error querying InfluxDB');
    }
};