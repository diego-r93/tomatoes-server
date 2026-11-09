import { pipeline } from 'node:stream/promises';
import { pulseHistoryCursor, pumpHistoryCsv, pumpHistoryImported, readHistoryRetention, updateHistoryRetention } from '../mqtt/pumpHistory';
import { HttpError } from '../users/types';
import { pumpDriverSnapshots } from '../mqtt/pumpDrivers';
import { changeRegistration, deviceAdmission, listRegisteredDevices } from '../mqtt/deviceRegistry';
import { queueScheduleSync } from "../mqtt/schedules";
import { authenticate, context, endpoint, requireAdmin } from '../users/http';
import { Express, Router } from 'express';
import { getDevices } from '../mqtt/controllers/deviceDiscovery.controller';
import * as publisherController from '../mqtt/controllers/mqtt.controller';

const mqttRoutes = (app: Express) => {
    const router = Router();

    router.get("/", authenticate, requireAdmin, publisherController.subscribeMQTTMessage);
    router.post("/", authenticate, requireAdmin, publisherController.publishMQTTMessage);
    router.patch("/:id/outputs/off", authenticate, publisherController.turnOffAllOutputs);
    router.patch("/:id", authenticate, publisherController.updateGPIO);
    router.get("/pump-driver", authenticate, endpoint(async (_req, res) => { res.json({ devices: await pumpDriverSnapshots(), observedAt: Date.now() }); }));
    router.get("/pump-history/:host", authenticate, endpoint(async (req, res) => {
        const host = String(req.params.host);
        if (await deviceAdmission(host) !== 'approved') throw new HttpError(404, 'Device not found.');
        const cursor = await pulseHistoryCursor(host, req.query);
        res.set('Cache-Control', 'no-store');
        if (req.query.format === 'csv') {
            res.type('text/csv').attachment(host + '-pump-history.csv');
            await pipeline(pumpHistoryCsv(cursor), res).catch(error => {
                if (!res.destroyed) throw error;
            });
            return;
        }
        const page = Number(req.query.page ?? 1);
        if (!Number.isSafeInteger(page) || page < 1 || page > 100000) {
            throw new HttpError(400, 'Choose a valid page.');
        }
        const pageSize = 50;
        const [records, imported] = await Promise.all([
            cursor.skip((page - 1) * pageSize).limit(pageSize + 1).toArray(),
            pumpHistoryImported(),
        ]);
        res.json({ records: records.slice(0, pageSize), hasNext: records.length > pageSize, imported });
    }));
    router.get("/history-retention", authenticate, requireAdmin, endpoint(async (_req, res) => {
        res.set('Cache-Control', 'no-store').json(await readHistoryRetention());
    }));
    router.put("/history-retention", authenticate, requireAdmin, endpoint(async (req, res) => {
        const { days, previousDays, confirmReduction } = req.body ?? {};
        res.set('Cache-Control', 'no-store').json(await updateHistoryRetention(days, previousDays, confirmReduction));
    }));
    router.get("/getdevices", authenticate, getDevices);

    router.get("/registry", authenticate, requireAdmin, endpoint(async (_req, res) => { res.json(await listRegisteredDevices()); }));
    router.patch("/registry/:host", authenticate, requireAdmin, endpoint(async (req, res) => {
        await changeRegistration(req.params.host as string, req.body?.action, context(res).user.username);
        queueScheduleSync();
        res.status(204).end();
    }));
    app.use("/mqtt", router);
};

export default mqttRoutes;
