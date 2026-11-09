import { Request, Response } from 'express';
import { discoverDevices } from '../../alerts/sources';
import { pumpDriverSnapshots } from '../pumpDrivers';
import { scheduleVersions } from '../schedules';

export const getDevices = async (_req: Request, res: Response): Promise<void> => {
    try {
        const devices = await discoverDevices();
        const versions = devices.length ? await scheduleVersions(devices.map(device => String(device.host))) : {};
        const driver = new Map((await pumpDriverSnapshots(devices.map(device => String(device.host)))).map(entry => [entry.host, entry.pumps]));
        res.json({
            devicesNumber: devices.length,
            devicesInformation: devices.map(device => ({
                ...device,
                driverPulses: driver.get(String(device.host)) || [],
                scheduleVersions: Object.fromEntries(Object.entries(versions).filter(([code]) => code.startsWith(String(device.host) + '#'))),
            })),
        });
    } catch {
        res.status(503).json({ message: 'Device discovery is unavailable.' });
    }
};
