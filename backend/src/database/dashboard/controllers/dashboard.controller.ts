import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import Dashboard from '../models/dashboard.model';
import { validateCharts, validateDashboard } from '../validation';
import { HttpError } from '../../../users/types';
import { listDashboardSummaries } from '../readRepository';
import { readDashboard, readDashboardSchema, readLegacyCharts } from '../readService';

export async function list(_req: Request, res: Response) {
  res.json(await listDashboardSummaries());
}
export async function get(req: Request, res: Response) {
  res.json(await readDashboard(String(req.params.id)));
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
  const item = await readDashboard(String(req.params.id));
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="charts-${item._id}.json"`);
  res.send(JSON.stringify(item.charts, null, 2));
}
export async function getcharts(_req: Request, res: Response) {
  res.json(await readLegacyCharts());
}
export async function saveCharts(req: Request, _res: Response) {
  validateCharts(typeof req.body === 'string' ? JSON.parse(req.body) : req.body);
  throw new HttpError(409, 'Reload the dashboard page. Saving now requires a dashboard ID and revision.');
}
export async function schema(req: Request, res: Response) {
  const bucket = String(req.query.bucket || process.env.DOCKER_INFLUXDB_INIT_BUCKET || '');
  const measurement = String(req.query.measurement || '');
  const tag = String(req.query.tag || '');
  res.json(await readDashboardSchema(bucket, measurement, tag));
}
