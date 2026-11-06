import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import Dashboard from '../models/dashboard.model';
import { validateCharts, validateDashboard } from '../validation';
import { HttpError } from '../../../users/types';
import { client, org } from '../../influxdb/config/influxdb';

export async function list(_req: Request, res: Response) {
  res.json(await Dashboard.aggregate([{ $sort: { updatedAt: -1 } }, { $project: { name: 1, description: 1, folder: 1, tags: 1, favorite: 1, revision: 1, createdAt: 1, updatedAt: 1, panelCount: { $size: { $ifNull: ['$charts', []] } } } }]));
}
export async function get(req: Request, res: Response) {
  const item = await Dashboard.findById(req.params.id).lean();
  if (!item) throw new HttpError(404, 'Dashboard not found.');
  res.json(item);
}
export async function create(req: Request, res: Response) {
  res.status(201).json(await Dashboard.create({ _id: randomUUID(), ...validateDashboard(req.body), revision: 1 }));
}
export async function update(req: Request, res: Response) {
  if (!Number.isInteger(req.body.revision)) throw new HttpError(400, 'The dashboard revision is required.');
  const fields = validateDashboard(req.body);
  const item = await Dashboard.findOneAndUpdate({ _id: req.params.id, revision: req.body.revision }, { $set: fields, $inc: { revision: 1 } }, { new: true }).lean();
  if (!item) throw new HttpError(409, 'This dashboard changed in another session. Export your draft, then reload before saving.');
  res.json(item);
}
export async function remove(req: Request, res: Response) {
  const revision = Number(req.query.revision);
  if (!Number.isInteger(revision)) throw new HttpError(400, 'The dashboard revision is required.');
  const result = await Dashboard.deleteOne({ _id: req.params.id, revision });
  if (!result.deletedCount) throw new HttpError(409, 'Dashboard changed or no longer exists. Refresh the library.');
  res.status(204).end();
}
export async function exportCharts(req: Request, res: Response) {
  const item = await Dashboard.findById(req.params.id).lean();
  if (!item) throw new HttpError(404, 'Dashboard not found.');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="charts-${item._id}.json"`);
  res.send(JSON.stringify(item.charts, null, 2));
}
export async function getcharts(_req: Request, res: Response) {
  const item = await Dashboard.findById('existing-charts').lean();
  res.json(item?.charts || []);
}
export async function saveCharts(req: Request, _res: Response) {
  validateCharts(typeof req.body === 'string' ? JSON.parse(req.body) : req.body);
  throw new HttpError(409, 'Reload the dashboard page. Saving now requires a dashboard ID and revision.');
}
export async function schema(req: Request, res: Response) {
  const bucket = String(req.query.bucket || process.env.DOCKER_INFLUXDB_INIT_BUCKET || '');
  const measurement = String(req.query.measurement || '');
  const tag = String(req.query.tag || '');
  if (!bucket || bucket.length > 200 || measurement.length > 200 || tag.length > 100) throw new HttpError(400, 'Select a valid bucket and measurement.');
  const q = client.getQueryApi(org), literal = (value: string) => JSON.stringify(value);
  const query = async (fn: string, args: string) => {
    const rows = await q.collectRows<any>(`import "influxdata/influxdb/schema"\nschema.${fn}(bucket: ${literal(bucket)}, start: -30d${args}) |> limit(n: 300)`);
    return rows.map(row => row._value);
  };
  if (measurement && tag) { res.json({ values: await query('measurementTagValues', `, measurement: ${literal(measurement)}, tag: ${literal(tag)}`) }); return; }
  if (measurement) {
    const args = `, measurement: ${literal(measurement)}`;
    const [fields, tags] = await Promise.all([query('measurementFieldKeys', args), query('measurementTagKeys', args)]);
    res.json({ bucket, measurement, fields, tags: tags.filter(value => !String(value).startsWith('_')) });
  } else res.json({ bucket, measurements: await query('measurements', '') });
}
