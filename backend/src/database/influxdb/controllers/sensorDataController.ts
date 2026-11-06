import Dashboard from '../../dashboard/models/dashboard.model';
import { HttpError } from '../../../users/types';
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
        res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error querying InfluxDB');
    }
};

function validBound(value: unknown, start: boolean): value is string {
    if (typeof value !== 'string') return false;
    if (start ? /^-[1-9]\d{0,7}[smhdw]$/.test(value) : value === 'now()') return true;
    return /^time\(v: "\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z"\)$/.test(value);
}

export async function fetchSavedPanel(req: Request, res: Response) {
    const { dashboardId, panelId, start, stop, window } = req.body || {};
    if (typeof dashboardId !== 'string' || dashboardId.length > 128 ||
        typeof panelId !== 'string' || panelId.length > 128 ||
        !validBound(start, true) || !validBound(stop, false) ||
        typeof window !== 'string' || !/^[1-9]\d{0,7}(ms|s|m|h)$/.test(window)) {
        throw new HttpError(400, 'Invalid dashboard panel or time range.');
    }
    const dashboard = await Dashboard.findById(dashboardId).select('charts').lean();
    const panel = dashboard?.charts.find(chart => String(chart.id) === panelId);
    if (!panel?.query) throw new HttpError(404, 'The saved dashboard panel does not exist.');
    const query = panel.query
        .replace(/\bv\.timeRangeStart\b/g, () => start)
        .replace(/\bv\.timeRangeStop\b/g, () => stop)
        .replace(/\bv\.windowPeriod\b/g, () => window);
    res.json(await sensorDataModel.getSensorData(query));
}
