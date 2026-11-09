import { Request, Response } from 'express';
import { validateCharts } from '../validation';
import { HttpError } from '../../../users/types';
import { listDashboardSummaries } from '../readRepository';
import { readDashboard, readDashboardSchema, readLegacyCharts } from '../readService';
import { createDashboard, deleteDashboard, updateDashboard } from '../writeService';

export async function list(_req: Request, res: Response) {
  res.json(await listDashboardSummaries());
}
export async function get(req: Request, res: Response) {
  res.json(await readDashboard(String(req.params.id)));
}
export async function create(req: Request, res: Response) {
  res.status(201).json(await createDashboard(req.body));
}
export async function update(req: Request, res: Response) {
  res.json(await updateDashboard(String(req.params.id), req.body));
}
export async function remove(req: Request, res: Response) {
  await deleteDashboard(String(req.params.id), Number(req.query.revision));
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
